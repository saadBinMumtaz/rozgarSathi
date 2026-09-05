// backend/src/services/followUpEngine.js
// Follow-up question generation engine — builds context-aware follow-ups
// for both behavioral (STAR-based) and technical (rubric-based) interviews.
// Uses AI (via callAI) to generate follow-ups that reference the candidate's
// actual answer, falling back to enhanced static probes if AI fails.

import { callAI } from './ai.js';
import logger from '../utils/logger.js';

// ─── Behavioral (STAR) Follow-ups ─────────────────────────────────────────

const STAR_FOLLOWUPS = {
  situation: "Let's go back to the beginning — what was the specific situation you were in, and what made it particularly challenging?",
  task: 'What exactly was your responsibility in that situation, and how did you clarify what was expected of you?',
  action: 'Walk me through the specific steps you personally took — not the team, but you individually. What was your thought process?',
  result: 'How did it end — what was the concrete result of your actions, and how did you measure whether you succeeded?',
};

const DEEP_PROBES = {
  situation: [
    'What made that situation particularly complex or high-stakes?',
    'Were there any constraints that limited your options at the time?',
  ],
  task: [
    'How did you prioritize what needed to happen first?',
    'Was there ambiguity about who owned the problem? How did you handle that?',
  ],
  action: [
    'What alternatives did you consider before committing to that approach?',
    'What was the biggest risk you took, and how did you mitigate it?',
  ],
  result: [
    'If you could do it again, what would you change and why?',
    'How did this experience change how you approach similar situations now?',
  ],
};

/**
 * Extract a short anchor phrase from the candidate's transcript for
 * context-aware follow-ups ("You mentioned 'X' — ...").
 * Returns the first meaningful sentence, trimmed to 80 chars.
 */
const extractAnchor = (transcript) => {
  if (!transcript) return '';
  const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  if (sentences.length === 0) return '';
  let anchor = sentences[0].trim();
  if (anchor.length > 80) anchor = anchor.substring(0, 77) + '...';
  return anchor;
};

/**
 * STAR coaching folded into a follow-up: target the weakest STAR dimension
 * and anchor it to something the candidate actually said.
 * Also includes a deep probe from the same dimension for richer follow-ups.
 */
export const buildStarFollowUp = (evaluation, transcript) => {
  const dims = evaluation.dimensions || {};
  const keys = Object.keys(STAR_FOLLOWUPS).filter((k) => typeof dims[k] === 'number');
  let dimKey = 'action';
  if (keys.length > 0) {
    keys.sort((a, b) => dims[a] - dims[b]);
    dimKey = keys[0];
  }
  const base = STAR_FOLLOWUPS[dimKey];
  const anchor = extractAnchor(transcript);
  const deepProbes = DEEP_PROBES[dimKey] || [];
  const probe = deepProbes.length > 0 ? deepProbes[Math.floor(Math.random() * deepProbes.length)] : '';
  
  if (anchor) {
    const combined = probe
      ? `You mentioned "${anchor}" — ${base.charAt(0).toLowerCase() + base.slice(1)} Also, ${probe.charAt(0).toLowerCase() + probe.slice(1)}`
      : `You mentioned "${anchor}" — ${base.charAt(0).toLowerCase() + base.slice(1)}`;
    return combined;
  }
  return probe ? `${base} ${probe}` : base;
};

// ─── Technical Follow-ups ─────────────────────────────────────────────────

const TECHNICAL_DEEP_PROBES = {
  correctness: [
    'Can you verify that with a concrete example from your experience?',
    'What edge cases might break that assumption?',
  ],
  depth: [
    'Can you go one level deeper — what are the underlying mechanics?',
    'How does this behave under high load or with large datasets?',
  ],
  practical: [
    'How would you apply this in a real production system?',
    'What monitoring or observability would you add to catch issues early?',
  ],
  relevance: [
    'How does this relate specifically to the role requirements?',
    'Can you connect this to a project you have actually shipped?',
  ],
  communication: [
    'Can you rephrase that more concisely for a junior developer?',
    'What would you include in a design doc about this decision?',
  ],
  reasoning: [
    'What was your reasoning process for arriving at that conclusion?',
    'What alternatives did you consider and why did you reject them?',
  ],
};

/**
 * Build a technical follow-up based on the weakest rubric dimension.
 * Enhanced with context-aware deep probes anchored to the candidate's answer.
 */
export const buildTechnicalFollowUp = (evaluation, question) => {
  const dims = evaluation.dimensions || {};
  const keys = Object.keys(dims).filter((k) => typeof dims[k] === 'number');
  if (keys.length === 0) {
    return 'Can you elaborate more on that with a specific example?';
  }

  // Find the weakest dimension
  keys.sort((a, b) => dims[a] - dims[b]);
  const weakest = keys[0];

  const prompts = TECHNICAL_DEEP_PROBES[weakest] || [
    'Can you elaborate more on that with a specific example?',
  ];

  // Pick a random deep probe for variety
  return prompts[Math.floor(Math.random() * prompts.length)];
};

/**
 * Build an AI-powered contextual technical follow-up that references the
 * candidate's actual answer. Falls back to static probes if AI fails.
 * @param {Object} params
 * @param {Object} params.evaluation - The evaluation object with dimensions/score
 * @param {Object} params.question - The question data (text, skill, rubric)
 * @param {string} params.transcript - The candidate's answer transcript
 * @param {Object} [params.jdContext] - Optional JD context (role, skills)
 * @returns {Promise<string>} A contextual follow-up question
 */
export const buildAIContextualFollowUp = async ({ evaluation, question, transcript, jdContext = {} }) => {
  const dims = evaluation.dimensions || {};
  const keys = Object.keys(dims).filter((k) => typeof dims[k] === 'number');
  keys.sort((a, b) => dims[a] - dims[b]);
  const weakest = keys.length > 0 ? keys[0] : 'depth';
  const score = evaluation.score || 0;

  // Determine follow-up intent based on score and weakest dimension
  let intent = 'clarify';
  if (score < 30) intent = 'probe_fundamentals';
  else if (score < 50) intent = 'deepen_understanding';
  else if (score >= 75) intent = 'challenge_advanced';

  const roleContext = jdContext.role ? ` for a ${jdContext.role} role` : '';
  const skillContext = jdContext.skills?.length ? ` focusing on ${jdContext.skills.slice(0, 3).join(', ')}` : '';

  const systemPrompt = `You are a professional technical interviewer crafting a follow-up question. The follow-up must build naturally on what the candidate just said — reference specific points from their answer.

Context:
- Original question topic: ${question.skill || 'general'}${roleContext}${skillContext}
- Candidate's score: ${score}/100
- Weakest area: ${weakest} (score: ${dims[weakest] || 'N/A'}/10)
- Follow-up intent: ${intent}

Intent guidance:
- probe_fundamentals: The answer was largely incorrect or missing key concepts. Ask a simpler, foundational question that tests whether they understand the core concept.
- deepen_understanding: The answer was partially correct but shallow. Ask them to go deeper on a specific aspect they mentioned or missed.
- clarify: The answer was vague or incomplete. Ask them to clarify or provide a concrete example.
- challenge_advanced: The answer was strong. Push them with a harder scenario, trade-off analysis, or edge case.

Rules:
- Reference something specific the candidate said (a concept, term, or claim).
- Ask ONE clear question — do not stack multiple questions.
- The question should feel like a natural conversation, not a quiz.
- Keep it to 1-2 sentences max.
- Do NOT repeat the original question.
- CRITICAL: The follow-up MUST remain relevant to the target role${roleContext}. Do NOT introduce technologies, frameworks, or concepts unrelated to the job description. If the JD is for Data Engineer, do not ask about React or Node.js. If the JD is for Frontend, do not ask about ETL pipelines.
- Return ONLY a JSON object: { "followUp": "your follow-up question text here" }`;

  const userPrompt = `Original question: "${question.text}"

Candidate's answer:
"""
${transcript}
"""

Evaluation summary: Score ${score}/100, weakest dimension is "${weakest}" (${dims[weakest] || 'N/A'}/10).
Evidence: ${(evaluation.evidence || []).slice(0, 2).join('; ')}

Generate a contextual follow-up question that builds on their answer (return JSON { "followUp": "..." }):`;

  try {
    const result = await callAI({
      systemPrompt,
      userPrompt,
      requiredFields: ['followUp'],
    });

    // callAI returns a parsed JSON object
    const followUpText = (result?.followUp || '').trim();

    if (followUpText && followUpText.length > 10) {
      return followUpText;
    }

    // If AI returned something unexpected, fall through to static
    throw new Error('Empty follow-up from AI');
  } catch (err) {
    logger.warn(`AI follow-up generation failed: ${err.message}. Using static fallback.`);
    // Fall back to static probe
    return buildTechnicalFollowUp(evaluation, question);
  }
};

/**
 * Build an AI-powered contextual behavioral follow-up that references the
 * candidate's actual answer. Falls back to static STAR probes if AI fails.
 * @param {Object} params
 * @param {Object} params.evaluation - The evaluation object with dimensions
 * @param {string} params.transcript - The candidate's answer transcript
 * @param {Object} [params.jdContext] - Optional JD context
 * @returns {Promise<string>} A contextual follow-up question
 */
export const buildAIStarFollowUp = async ({ evaluation, transcript, jdContext = {} }) => {
  const dims = evaluation.dimensions || {};
  const keys = Object.keys(STAR_FOLLOWUPS).filter((k) => typeof dims[k] === 'number');
  keys.sort((a, b) => dims[a] - dims[b]);
  const weakestDim = keys.length > 0 ? keys[0] : 'action';
  const score = evaluation.score || 0;

  const systemPrompt = `You are a professional behavioral interviewer crafting a follow-up question. The follow-up must reference something specific the candidate said and push them to provide more detail in their weakest STAR area.

Context:
- Candidate's score: ${score}/100
- Weakest STAR dimension: ${weakestDim} (score: ${dims[weakestDim] || 'N/A'}/10)
${jdContext.role ? `- Role: ${jdContext.role}` : ''}

STAR dimension guidance:
- situation: Ask them to be more specific about the context, constraints, or stakes.
- task: Ask them to clarify their specific responsibility vs the team's.
- action: Ask them to walk through specific steps, decisions, or trade-offs they made.
- result: Ask them for concrete metrics, outcomes, or lessons learned.

Rules:
- Reference something specific the candidate mentioned.
- Ask ONE clear question — do not stack multiple questions.
- The question should feel like a genuine coaching conversation.
- Keep it to 1-2 sentences max.
- The follow-up should relate to the candidate's target role context when applicable. Do not introduce technical concepts from unrelated domains.
- Return ONLY a JSON object: { "followUp": "your follow-up question text here" }`;

  const userPrompt = `Candidate's answer:
"""
${transcript}
"""

Evaluation: Score ${score}/100, weakest STAR dimension is "${weakestDim}" (${dims[weakestDim] || 'N/A'}/10).

Generate a contextual follow-up that references their answer (return JSON { "followUp": "..." }):`;

  try {
    const result = await callAI({
      systemPrompt,
      userPrompt,
      requiredFields: ['followUp'],
    });

    const followUpText = (result?.followUp || '').trim();

    if (followUpText && followUpText.length > 10) {
      return followUpText;
    }

    throw new Error('Empty follow-up from AI');
  } catch (err) {
    logger.warn(`AI behavioral follow-up failed: ${err.message}. Using static fallback.`);
    return buildStarFollowUp(evaluation, transcript);
  }
};

export default { buildStarFollowUp, buildTechnicalFollowUp, buildAIContextualFollowUp, buildAIStarFollowUp };
