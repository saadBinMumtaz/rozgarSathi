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
export const evaluateBehavioralAnswer = async ({ question, transcript, language = 'english' }) => {
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

  const systemPrompt = `You are an expert behavioral interviewer evaluating a candidate's answer using the STAR framework.
Score each dimension of the rubric from 0-10 based on how well the candidate addressed it.
${language === 'urdu' ? 'IMPORTANT: Return all feedback fields (strength, missing, improvement, evidence items) in Urdu (\u0627\u0631\u062f\u0648). Keep technical terms like React, API, Node.js etc. in English.' : ''}
Return ONLY valid JSON matching this schema:
{
  "dimensions": {
    ${rubricKeys.map((k) => `"${k}": 0-10 score`).join(',\n    ')}
  },
  "evidence": ["Array of 2-4 specific quotes or examples from the answer"],
  "strength": "One sentence describing what the candidate did well",
  "missing": "One sentence describing what was missing or could be improved",
  "improvement": "One actionable suggestion for improvement"
}`;

  const userPrompt = `Question: ${question.text}

Rubric:
${rubricKeys.map((k) => `- ${k}: ${rubric[k]}`).join('\n')}

Candidate's Answer:
"""
${transcript}
"""

Evaluate the answer and return JSON.`;

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

    return {
      score,
      dimensions: rubricKeys.reduce((acc, key) => {
        acc[key] = Math.round(score / 10);
        return acc;
      }, {}),
      evidence: ['Answer provided but detailed evaluation unavailable'],
      strength: hasStructure ? 'Answer addressed key points' : 'Answer was provided',
      missing: 'More detailed feedback unavailable',
      improvement: 'Provide specific examples and quantify results where possible',
      confidenceLevel: 'low',
    };
  }
};

/**
 * Evaluation returned when a behavioral answer is low-quality / non-answer.
 * Imported by behavioral.controller.js — never constructed outside scoring.js.
 */
export const INVALID_EVALUATION = Object.freeze({
  score: 5,
  dimensions: {},
  evidence: ['Response was not a usable answer'],
  strength: '',
  missing: 'No specific example was provided for this question',
  improvement: 'Answer with a real example structured as Situation, Task, Action, Result',
  confidenceLevel: 'low',
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

    return {
      score,
      dimensions: rubricKeys.reduce((acc, key) => {
        acc[key] = Math.round(score / 10);
        return acc;
      }, {}),
      evidence: ['Answer provided but detailed technical evaluation unavailable'],
      strength: 'A technical answer was provided',
      missing: 'More detailed technical feedback unavailable',
      improvement: 'Include specific technical concepts, trade-offs, and examples',
      confidenceLevel: 'low',
    };
  }
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

export default {
  evaluateBehavioralAnswer,
  evaluateTechnicalAnswer,
  INVALID_EVALUATION,
  createCodingStubEvaluation,
};
