// backend/src/services/scoring.js
// Ensemble scoring service — the ONLY place in the codebase that constructs
// evaluation objects (per Rules.md Section 5).
// Pattern: deterministic floor checks + LLM-based rubric scoring + validation.

import { callAI } from './ai.js';
import logger from '../utils/logger.js';

const MIN_WORDS_FOR_SCORING = 10;
const SHORT_ANSWER_WORD_LIMIT = 20;

// Personal experience markers that indicate concrete examples
const CONCRETE_MARKERS = [
  'i built', 'i created', 'i developed', 'i implemented', 'i designed',
  'in my project', 'in our project', 'in my previous', 'in my last',
  'at my company', 'at my job', 'in my role',
  'for example', 'for instance', 'specifically',
  'we used', 'we implemented', 'we shipped', 'we deployed',
  'the result was', 'it improved', 'it reduced', 'it increased',
  'i was responsible', 'i led', 'i managed',
];

// Common buzzwords that indicate shallow answers when used without context
const BUZZWORD_PATTERNS = [
  'scalable', 'robust', 'efficient', 'optimized', 'seamless',
  'leverage', 'utilize', 'implement', 'architecture', 'framework',
  'microservices', 'monolith', 'rest api', 'graphql', 'websocket',
  'react', 'node', 'mongodb', 'sql', 'docker', 'kubernetes',
  'ci/cd', 'agile', 'scrum', 'devops', 'cloud',
];

/**
 * Analyze a transcript for deterministic fallback feedback.
 * Produces transcript-specific evidence/strength/missing/improvement strings
 * so that when LLM scoring fails, the evaluation still contains genuinely
 * specific content referencing the actual answer — not generic filler.
 */
const analyzeTranscriptForFallback = (transcript, rubricKeys = []) => {
  const text = transcript.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Detect concrete markers (specific examples, metrics)
  const concreteMarkers = CONCRETE_MARKERS.filter((m) => text.includes(m));
  const hasMetrics = /\d+%|\d+\s*(users|requests|seconds|minutes|hours|days|weeks|months|years)/i.test(transcript);
  const hasYears = /\b\d{4}\b/.test(transcript);

  // Detect STAR structure keywords
  const starKeywords = { situation: ['when', 'time', 'project', 'role', 'team'], task: ['needed to', 'responsible', 'had to', 'my goal'], action: ['i did', 'i built', 'i implemented', 'we decided', 'i led'], result: ['result', 'outcome', 'improved', 'reduced', 'increased', 'achieved', 'delivered'] };
  const starHits = Object.entries(starKeywords).filter(([, kws]) => kws.some((kw) => text.includes(kw))).map(([k]) => k);

  // Detect rubric keyword coverage
  const rubricHits = rubricKeys.filter((key) => {
    const keywords = (key || '').toLowerCase().split(/\s+/);
    return keywords.some((kw) => text.includes(kw));
  });

  // Build evidence from first meaningful sentence fragment
  const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 15);
  const firstEvidence = sentences.length > 0 ? sentences[0].trim().substring(0, 120) : '';

  // Build specific evidence array
  const evidence = [];
  if (firstEvidence) evidence.push(`Candidate stated: "${firstEvidence}${sentences[0].trim().length > 120 ? '...' : ''}"`);
  if (hasMetrics) evidence.push('Included specific metrics or numbers in the response');
  if (concreteMarkers.length > 0) evidence.push(`Used concrete language (${concreteMarkers.slice(0, 2).join(', ')})`);
  if (starHits.length >= 2) evidence.push(`Demonstrated ${starHits.join(' and ')} structure`);
  if (evidence.length === 0) evidence.push(`Response was ${wordCount} words — ${wordCount < 30 ? 'too brief for detailed analysis' : 'sufficient length for evaluation'}`);

  // Build strength
  let strength = '';
  if (starHits.length >= 3) strength = 'Answer followed a clear STAR structure with situation, action, and result';
  else if (hasMetrics) strength = 'Answer included specific metrics or quantified outcomes';
  else if (concreteMarkers.length >= 2) strength = 'Answer used concrete language referencing real experiences';
  else if (rubricHits.length >= Math.ceil(rubricKeys.length / 2)) strength = `Answer addressed key topics: ${rubricHits.slice(0, 3).join(', ')}`;
  else if (wordCount >= 50) strength = `Answer was substantive at ${wordCount} words with relevant content`;
  else strength = 'A brief answer was provided but lacked depth';

  // Build missing
  let missing = '';
  if (!hasMetrics && !hasYears) missing = 'No specific metrics, numbers, or timeframes were mentioned';
  else if (starHits.length < 2) missing = 'Answer did not follow a clear STAR structure (situation, task, action, result)';
  else missing = 'Answer could benefit from more depth on the outcome and lessons learned';

  // Build improvement
  let improvement = '';
  if (!hasMetrics) improvement = 'Add specific numbers: "It improved performance by 30%" or "We served 1000+ users."';
  else if (starHits.length < 2) improvement = 'Structure your answer as Situation → Task → Action → Result for clarity.';
  else if (concreteMarkers.length < 2) improvement = 'Reference a specific project by name and describe your personal contribution.';
  else improvement = 'Expand on the measurable impact and what you learned from the experience.';

  return { evidence, strength, missing, improvement, wordCount, hasMetrics, starHits, concreteMarkers: concreteMarkers.length };
};

/**
 * Detect if an answer is mostly buzzwords without concrete examples.
 * Returns an object with:
 * - isBuzzwordHeavy: boolean
 * - concreteScore: 0-10 score based on concrete evidence
 * - feedback: specific feedback about what's missing
 */
export const detectBuzzwordAnswer = (transcript) => {
  const text = transcript.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  
  // Count buzzword occurrences
  const buzzwordCount = BUZZWORD_PATTERNS.filter(bw => text.includes(bw)).length;
  const buzzwordRatio = buzzwordCount / Math.max(words.length / 10, 1);
  
  // Check for concrete markers
  const concreteMarkersFound = CONCRETE_MARKERS.filter(marker => text.includes(marker));
  const hasConcreteExample = concreteMarkersFound.length > 0;
  
  // Check for specific details (numbers, percentages, timeframes)
  const hasNumbers = /\d+%|\d+\s*(users|requests|seconds|minutes|hours|days|weeks|months|years)/i.test(text);
  const hasSpecifics = hasNumbers || /\b\d{4}\b/.test(text); // years or 4-digit numbers
  
  // Calculate concrete score
  let concreteScore = 0;
  if (hasConcreteExample) concreteScore += 5;
  if (hasSpecifics) concreteScore += 3;
  if (concreteMarkersFound.length >= 2) concreteScore += 2;
  
  // Determine if answer is buzzword-heavy
  const isBuzzwordHeavy = buzzwordRatio > 0.3 && !hasConcreteExample;
  
  let feedback = '';
  if (isBuzzwordHeavy) {
    feedback = `You mentioned technical terms like "${BUZZWORD_PATTERNS.filter(bw => text.includes(bw)).slice(0, 3).join('", "')}" but didn't provide concrete examples. `;
  }
  
  if (!hasConcreteExample) {
    feedback += 'Share a specific project or experience: "I built X where we used Y to achieve Z."';
  } else if (!hasSpecifics) {
    feedback += 'Add specific metrics or outcomes: "It improved performance by 30%" or "We served 1000+ users."';
  }
  
  return {
    isBuzzwordHeavy,
    concreteScore,
    feedback,
    buzzwordCount,
    hasConcreteExample,
    hasSpecifics,
  };
};

/**
 * Count words in a string (simple whitespace split).
 */
const countWords = (text) => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Evaluate a behavioral answer using ensemble scoring.
 * @param {Object} params
 * @param {Object} params.question - The question object with text, topic, rubric
 * @param {string} params.transcript - The candidate's answer transcript
 * @param {string} [params.language='english'] - 'english' | 'urdu' — language for feedback
 * @returns {Promise<Object>} Evaluation object matching Section 7 schema
 */
export const evaluateBehavioralAnswer = async ({ question, transcript, language = 'english', jdContext = {} }) => {
  const wordCount = countWords(transcript);

  // Deterministic floor: empty or whitespace-only
  if (wordCount === 0) {
    return {
      score: 0,
      dimensions: {},
      evidence: ['No response provided'],
      strength: '',
      missing: 'A complete answer is needed',
      improvement: 'Please provide your answer',
      confidenceLevel: 'low',
    };
  }

  // Deterministic floor: very short answer (under MIN_WORDS_FOR_SCORING words)
  if (wordCount < MIN_WORDS_FOR_SCORING) {
    return {
      score: Math.min(wordCount * 2, 20), // cap at 20 for very short answers
      dimensions: {},
      evidence: ['Response was too brief to evaluate'],
      strength: '',
      missing: 'More detail is needed',
      improvement: 'Expand your answer with specific examples and context',
      confidenceLevel: 'low',
    };
  }

  // Short answer (under SHORT_ANSWER_WORD_LIMIT words) — LLM can still score but confidence is low
  const isShortAnswer = wordCount < SHORT_ANSWER_WORD_LIMIT;

  // Detect buzzword-heavy answers (technical terms without concrete examples)
  const buzzwordAnalysis = detectBuzzwordAnswer(transcript);

  // LLM-based rubric scoring
  const rubric = question.rubric || {};
  const rubricKeys = Object.keys(rubric);

  const roleContext = jdContext.role ? `\nThe candidate is interviewing for: ${jdContext.role}` : '';
  const skillsContext = jdContext.skills?.length ? `\nKey skills for this role: ${jdContext.skills.slice(0, 5).join(', ')}` : '';

  const systemPrompt = `You are an expert behavioral interviewer evaluating a candidate's answer using the STAR framework.
Score each dimension of the rubric from 0-10 based on how well the candidate addressed it.${roleContext}${skillsContext}

Scoring guidance:
- 0-3: Answer completely missed this dimension or was irrelevant
- 4-5: Answer touched on this dimension but was vague, generic, or lacked specifics
- 6-7: Answer addressed this dimension with reasonable detail and some concrete examples
- 8-9: Answer strongly demonstrated this dimension with specific, compelling examples
- 10: Exceptional — answer perfectly demonstrated this dimension with measurable impact

${language === 'urdu' ? 'IMPORTANT: Return all feedback fields (strength, missing, improvement, evidence items) in Urdu (اردو). Keep technical terms like React, API, Node.js etc. in English.' : ''}
Return ONLY valid JSON matching this schema:
{
  "dimensions": {
    ${rubricKeys.map((k) => `"${k}": 0-10 score`).join(',\n    ')}
  },
  "evidence": ["2-4 specific quotes or paraphrased points from the candidate's actual answer — reference what they actually said, not generic observations"],
  "strength": "One specific sentence describing what the candidate did well, referencing something concrete from their answer",
  "missing": "One specific sentence describing what was missing — explain WHY it matters for this role",
  "improvement": "One actionable, specific suggestion — tell them exactly what to add or change, with an example of what a good answer would include"
}`;

  const userPrompt = `Question: ${question.text}

Rubric:
${rubricKeys.map((k) => `- ${k}: ${rubric[k]}`).join('\n')}

Candidate's Answer:
"""
${transcript}
"""

Evaluate the answer against the rubric. Be specific — reference what the candidate actually said. Do not invent experiences or claims they did not make. Return JSON.`;

  try {
    const llmResult = await callAI({
      systemPrompt,
      userPrompt,
      requiredFields: ['dimensions', 'evidence', 'strength', 'missing', 'improvement'],
    });

    // Calculate overall score from dimensions (average * 10)
    const dimensionScores = Object.values(llmResult.dimensions || {});
    const avgDimensionScore =
      dimensionScores.length > 0
        ? dimensionScores.reduce((sum, s) => sum + (typeof s === 'number' ? s : 0), 0) /
          dimensionScores.length
        : 0;
    let score = Math.round(avgDimensionScore * 10); // 0-100 scale

    // Penalize buzzword-heavy answers (cap score if no concrete examples)
    let buzzwordPenalty = 0;
    if (buzzwordAnalysis.isBuzzwordHeavy) {
      buzzwordPenalty = Math.min(30, score * 0.4); // Up to 30 point penalty
      score = Math.max(10, score - buzzwordPenalty);
    }

    // Confidence level based on answer length and dimension coverage
    let confidenceLevel = 'high';
    if (isShortAnswer || dimensionScores.length < rubricKeys.length * 0.5) {
      confidenceLevel = 'low';
    } else if (dimensionScores.length < rubricKeys.length) {
      confidenceLevel = 'medium';
    }

    // Ensure evidence is an array of strings
    const evidence = Array.isArray(llmResult.evidence)
      ? llmResult.evidence.filter((e) => typeof e === 'string')
      : [];

    // Build improvement text with buzzword feedback if applicable
    let improvement = llmResult.improvement || '';
    if (buzzwordAnalysis.isBuzzwordHeavy && buzzwordAnalysis.feedback) {
      improvement = buzzwordAnalysis.feedback + (improvement ? ' ' + improvement : '');
    }

    return {
      score: Math.max(0, Math.min(100, score)), // clamp 0-100
      dimensions: llmResult.dimensions || {},
      evidence,
      strength: llmResult.strength || '',
      missing: buzzwordAnalysis.isBuzzwordHeavy ? 'Answer lacked concrete examples' : (llmResult.missing || ''),
      improvement,
      confidenceLevel,
      buzzwordAnalysis: {
        isBuzzwordHeavy: buzzwordAnalysis.isBuzzwordHeavy,
        concreteScore: buzzwordAnalysis.concreteScore,
        hasConcreteExample: buzzwordAnalysis.hasConcreteExample,
      },
    };
  } catch (err) {
    logger.warn(`LLM scoring failed: ${err.message}. Using deterministic fallback.`);

    // Deterministic fallback: score based on word count and structure
    const hasStructure = rubricKeys.every((key) => {
      const keywords = rubric[key].toLowerCase().split(/\s+/);
      return keywords.some((kw) => transcript.toLowerCase().includes(kw));
    });

    const baseScore = Math.min(wordCount * 2, 60); // cap at 60 for fallback
    const structureBonus = hasStructure ? 20 : 0;
    const score = Math.min(baseScore + structureBonus, 80);

    // Transcript-aware fallback feedback (not generic filler)
    const analysis = analyzeTranscriptForFallback(transcript, rubricKeys);

    return {
      score,
      dimensions: rubricKeys.reduce((acc, key) => {
        acc[key] = Math.round(score / 10);
        return acc;
      }, {}),
      evidence: analysis.evidence,
      strength: analysis.strength,
      missing: analysis.missing,
      improvement: analysis.improvement,
      confidenceLevel: 'low',
    };
  }
};

/**
 * Evaluation returned when a behavioral answer is low-quality / non-answer.
 * Imported by behavioral.controller.js — never constructed outside scoring.js.
 */
export const INVALID_EVALUATION = Object.freeze({
  score: 0,
  dimensions: {},
  evidence: ['Invalid answer — random words or unrelated strings, not a substantive response'],
  strength: '',
  missing: 'No proper answer was provided for this question',
  improvement: 'Answer with a real, specific example structured as Situation, Task, Action, Result',
  confidenceLevel: 'low',
  invalid: true,
});

/**
 * Evaluate a technical Q&A answer using ensemble scoring.
 * Technical dimensions: correctness, depth, practical understanding,
 * relevance to JD, communication, reasoning.
 * @param {Object} params
 * @param {Object} params.question - The question object with text, skill, rubric
 * @param {string} params.transcript - The candidate's answer transcript
 * @param {string} [params.language='english'] - 'english' | 'urdu' — language for feedback
 * @returns {Promise<Object>} Evaluation object matching Section 7 schema
 */
export const evaluateTechnicalAnswer = async ({ question, transcript, language = 'english' }) => {
  const wordCount = countWords(transcript);

  // Deterministic floor: empty or whitespace-only
  if (wordCount === 0) {
    return {
      score: 0,
      dimensions: {},
      evidence: ['No response provided'],
      strength: '',
      missing: 'A technical answer is needed',
      improvement: 'Provide your understanding of the concept, even if incomplete',
      confidenceLevel: 'low',
    };
  }

  // Deterministic floor: very short answer
  if (wordCount < MIN_WORDS_FOR_SCORING) {
    return {
      score: Math.min(wordCount * 2, 20),
      dimensions: {},
      evidence: ['Response was too brief to evaluate technically'],
      strength: '',
      missing: 'More technical detail is needed',
      improvement: 'Expand your answer with specific technical concepts and examples',
      confidenceLevel: 'low',
    };
  }

  const isShortAnswer = wordCount < SHORT_ANSWER_WORD_LIMIT;

  // Detect buzzword-heavy answers (technical terms without concrete examples)
  const buzzwordAnalysis = detectBuzzwordAnswer(transcript);

  const rubric = question.rubric || {};
  const rubricKeys = Object.keys(rubric);

  const systemPrompt = `You are an expert technical interviewer evaluating a candidate's answer.
Score each dimension of the rubric from 0-10 based on how well the candidate addressed it.
${language === 'urdu' ? 'IMPORTANT: Return all feedback fields (strength, missing, improvement, evidence items) in Urdu (\u0627\u0631\u062f\u0648). Keep technical terms like React, API, Node.js etc. in English.' : ''}
Return ONLY valid JSON matching this schema:
{
  "dimensions": {
    ${rubricKeys.map((k) => `"${k}": 0-10 score`).join(',\n    ')}
  },
  "evidence": ["Array of 2-4 specific technical points or quotes from the answer"],
  "strength": "One sentence describing what the candidate explained well technically",
  "missing": "One sentence describing what technical depth or accuracy was missing",
  "improvement": "One actionable technical suggestion for improvement"
}`;

  const userPrompt = `Question: ${question.text}

Rubric:
${rubricKeys.map((k) => `- ${k}: ${rubric[k]}`).join('\n')}

Candidate's Answer:
"""
${transcript}
"""

Evaluate the technical answer and return JSON.`;

  try {
    const llmResult = await callAI({
      systemPrompt,
      userPrompt,
      requiredFields: ['dimensions', 'evidence', 'strength', 'missing', 'improvement'],
    });

    const dimensionScores = Object.values(llmResult.dimensions || {});
    const avgDimensionScore =
      dimensionScores.length > 0
        ? dimensionScores.reduce((sum, s) => sum + (typeof s === 'number' ? s : 0), 0) /
          dimensionScores.length
        : 0;
    let score = Math.round(avgDimensionScore * 10);

    // Penalize buzzword-heavy answers (cap score if no concrete examples)
    let buzzwordPenalty = 0;
    if (buzzwordAnalysis.isBuzzwordHeavy) {
      buzzwordPenalty = Math.min(30, score * 0.4); // Up to 30 point penalty
      score = Math.max(10, score - buzzwordPenalty);
    }

    let confidenceLevel = 'high';
    if (isShortAnswer || dimensionScores.length < rubricKeys.length * 0.5) {
      confidenceLevel = 'low';
    } else if (dimensionScores.length < rubricKeys.length) {
      confidenceLevel = 'medium';
    }

    const evidence = Array.isArray(llmResult.evidence)
      ? llmResult.evidence.filter((e) => typeof e === 'string')
      : [];

    // Build improvement text with buzzword feedback if applicable
    let improvement = llmResult.improvement || '';
    if (buzzwordAnalysis.isBuzzwordHeavy && buzzwordAnalysis.feedback) {
      improvement = buzzwordAnalysis.feedback + (improvement ? ' ' + improvement : '');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      dimensions: llmResult.dimensions || {},
      evidence,
      strength: llmResult.strength || '',
      missing: buzzwordAnalysis.isBuzzwordHeavy ? 'Answer lacked concrete examples' : (llmResult.missing || ''),
      improvement,
      confidenceLevel,
      buzzwordAnalysis: {
        isBuzzwordHeavy: buzzwordAnalysis.isBuzzwordHeavy,
        concreteScore: buzzwordAnalysis.concreteScore,
        hasConcreteExample: buzzwordAnalysis.hasConcreteExample,
      },
    };
  } catch (err) {
    logger.warn(`Technical LLM scoring failed: ${err.message}. Using deterministic fallback.`);

    const baseScore = Math.min(wordCount * 2, 60);
    const score = Math.min(baseScore, 70);

    // Transcript-aware fallback feedback (not generic filler)
    const analysis = analyzeTranscriptForFallback(transcript, rubricKeys);

    // For technical mode, adjust strength/missing to be technically oriented
    const techStrength = analysis.hasMetrics || analysis.starHits.length >= 2
      ? analysis.strength
      : `Answer covered technical concepts at ${analysis.wordCount} words`;
    const techMissing = analysis.hasMetrics
      ? analysis.missing
      : 'Did not include specific technical examples, trade-offs, or performance considerations';
    const techImprovement = analysis.hasMetrics
      ? analysis.improvement
      : 'Include specific technical concepts, trade-offs, and real-world examples with measurable outcomes';

    return {
      score,
      dimensions: rubricKeys.reduce((acc, key) => {
        acc[key] = Math.round(score / 10);
        return acc;
      }, {}),
      evidence: analysis.evidence,
      strength: techStrength,
      missing: techMissing,
      improvement: techImprovement,
      confidenceLevel: 'low',
    };
  }
};

/**
 * Evaluate a live-coding submission (Day 4). Fully deterministic — test
 * results drive the score so a hallucinated high score can never override a
 * failed test suite (Master Context §10 guardrails).
 * @param {Object} params
 * @param {Array<{ passed: boolean }>} params.hiddenResults - per-hidden-test outcomes
 * @param {Array<{ passed: boolean }>} [params.publicResults] - last public run outcomes
 * @param {string} [params.code=''] - candidate source for quality signals
 * @returns {Object} Evaluation object matching Section 7 schema
 */
export const evaluateCodingSubmission = ({ hiddenResults = [], publicResults = [], code = '' }) => {
  const hiddenTotal = hiddenResults.length;
  const hiddenPassed = hiddenResults.filter((r) => r && r.passed).length;
  const hiddenRate = hiddenTotal > 0 ? hiddenPassed / hiddenTotal : 0;

  // Deterministic floor: no code means no score.
  if (!code || !code.trim()) {
    return {
      score: 0,
      dimensions: { correctness: 0, completeness: 0, codeQuality: 0 },
      evidence: ['No code was submitted'],
      strength: '',
      missing: 'A working solution is needed',
      improvement: 'Write the solution function and submit it to run the hidden tests',
      confidenceLevel: 'high',
    };
  }

  // Code-quality signals (deterministic, cheap heuristics).
  let quality = 5;
  if (code.length >= 80) quality += 2;
  if (/\/\/|\/\*/.test(code)) quality += 1;
  if (!/\bvar\s/.test(code)) quality += 1;
  if (/for\s*\(|while\s*\(|\.map\(|\.reduce\(|\.forEach\(/.test(code)) quality += 1;
  quality = Math.max(0, Math.min(10, quality));

  const publicTotal = publicResults.length;
  const publicPassed = publicResults.filter((r) => r && r.passed).length;

  // Score: hidden tests dominate (80%), code quality is the remainder (20%).
  const score = Math.round(hiddenRate * 80 + (quality / 10) * 20);

  const evidence = [`Passed ${hiddenPassed}/${hiddenTotal} hidden tests`];
  if (publicTotal > 0) evidence.push(`Passed ${publicPassed}/${publicTotal} public tests`);
  if (hiddenPassed < hiddenTotal) {
    evidence.push(`${hiddenTotal - hiddenPassed} hidden test(s) failed — edge cases were missed`);
  }

  const strength =
    hiddenRate === 1
      ? 'Solution passed every hidden test case'
      : hiddenRate >= 0.5
        ? 'Solution handled the core hidden test cases'
        : '';
  const missing =
    hiddenRate === 1
      ? ''
      : hiddenRate === 0
        ? 'No hidden test case passed — the core logic needs rework'
        : 'Some hidden edge cases failed';
  const improvement =
    hiddenRate === 1
      ? 'Walk through your time and space complexity explicitly for the interviewer'
      : 'Trace your code by hand against a failing edge case before re-submitting';

  return {
    score: Math.max(0, Math.min(100, score)),
    dimensions: {
      correctness: Math.round(hiddenRate * 10),
      completeness: Math.round(hiddenRate * 10),
      codeQuality: quality,
    },
    evidence,
    strength,
    missing,
    improvement,
    confidenceLevel: hiddenTotal > 0 ? 'high' : 'low',
  };
};

/**
 * Stub evaluation for coding submissions (Day 4 — full coding scoring not yet wired).
 * Imported by coding.controller.js — never constructed outside scoring.js.
 */
export const createCodingStubEvaluation = () => ({
  score: 90,
  dimensions: { correctness: 10, efficiency: 8 },
  evidence: ['All test cases passed cleanly'],
  strength: 'Optimal time complexity',
  missing: 'Memory optimization possible',
  improvement: 'In-place array manipulation',
  confidenceLevel: 'high',
});

/**
 * Evaluate a probe answer during coding interview practice.
 * Probes are follow-up questions about the candidate's coding solution
 * (e.g. "What is the time complexity of your approach?").
 * @param {Object} params
 * @param {string} params.probeText - The probe question text
 * @param {string} params.answer - The candidate's answer transcript
 * @param {string} [params.questionTitle] - The coding question title for context
 * @param {string} [params.language='english'] - 'english' | 'urdu'
 * @returns {Promise<Object>} Evaluation object matching Section 7 schema
 */
export const evaluateProbeAnswer = async ({ probeText, answer, questionTitle = '', language = 'english' }) => {
  const wordCount = countWords(answer);

  // Deterministic floor: empty or whitespace-only
  if (wordCount === 0) {
    return {
      score: 0,
      dimensions: { clarity: 0, reasoning: 0, depth: 0 },
      evidence: ['No response provided for this probe'],
      strength: '',
      missing: 'An answer is needed for this follow-up question',
      improvement: 'Explain your reasoning out loud — even a brief explanation helps',
      confidenceLevel: 'low',
    };
  }

  // Deterministic floor: very short answer
  if (wordCount < MIN_WORDS_FOR_SCORING) {
    return {
      score: Math.min(wordCount * 3, 30),
      dimensions: { clarity: 3, reasoning: 3, depth: 2 },
      evidence: ['Response was too brief to evaluate thoroughly'],
      strength: '',
      missing: 'More explanation is needed for this follow-up',
      improvement: 'Expand your answer with specific reasoning about your code',
      confidenceLevel: 'low',
    };
  }

  const systemPrompt = `You are an expert coding interviewer evaluating a candidate's answer to a follow-up probe question about their coding solution.
The coding question was: "${questionTitle}"
The follow-up probe was: "${probeText}"

Score the answer on these dimensions (0-10 each):
- clarity: How clearly is the answer expressed?
- reasoning: How sound is the technical reasoning?
- depth: How deeply does the answer address the probe?

${language === 'urdu' ? 'IMPORTANT: Return all feedback fields in Urdu (اردو). Keep technical terms like React, API, Node.js etc. in English.' : ''}
Return ONLY valid JSON:
{
  "dimensions": { "clarity": 0-10, "reasoning": 0-10, "depth": 0-10 },
  "evidence": ["Array of 2-3 specific quotes or points from the answer"],
  "strength": "One sentence describing what the candidate explained well",
  "missing": "One sentence describing what was missing or could be improved",
  "improvement": "One actionable suggestion for a better answer"
}`;

  const userPrompt = `Probe question: "${probeText}"

Candidate's answer:
"""
${answer}
"""

Evaluate the answer and return JSON.`;

  try {
    const llmResult = await callAI({
      systemPrompt,
      userPrompt,
      requiredFields: ['dimensions', 'evidence', 'strength', 'missing', 'improvement'],
    });

    const dimensionScores = Object.values(llmResult.dimensions || {});
    const avgDimensionScore = dimensionScores.length > 0
      ? dimensionScores.reduce((sum, s) => sum + (typeof s === 'number' ? s : 0), 0) / dimensionScores.length
      : 0;
    const score = Math.round(avgDimensionScore * 10);

    const evidence = Array.isArray(llmResult.evidence)
      ? llmResult.evidence.filter((e) => typeof e === 'string')
      : [];

    return {
      score: Math.max(0, Math.min(100, score)),
      dimensions: llmResult.dimensions || {},
      evidence,
      strength: llmResult.strength || '',
      missing: llmResult.missing || '',
      improvement: llmResult.improvement || '',
      confidenceLevel: wordCount >= SHORT_ANSWER_WORD_LIMIT ? 'high' : 'medium',
    };
  } catch (err) {
    logger.warn(`Probe evaluation LLM failed: ${err.message}. Using deterministic fallback.`);
    const analysis = analyzeTranscriptForFallback(answer, ['clarity', 'reasoning', 'depth']);
    const baseScore = Math.min(wordCount * 2, 55);
    return {
      score: baseScore,
      dimensions: { clarity: Math.round(baseScore / 10), reasoning: Math.round(baseScore / 10), depth: Math.round(baseScore / 12) },
      evidence: analysis.evidence,
      strength: analysis.strength,
      missing: analysis.missing,
      improvement: analysis.improvement,
      confidenceLevel: 'low',
    };
  }
};

export default {
  evaluateBehavioralAnswer,
  evaluateTechnicalAnswer,
  INVALID_EVALUATION,
  evaluateCodingSubmission,
  createCodingStubEvaluation,
  analyzeTranscriptForFallback,
  evaluateProbeAnswer,
};
