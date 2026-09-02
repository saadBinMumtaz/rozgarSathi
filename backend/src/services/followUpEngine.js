// backend/src/services/followUpEngine.js
// Follow-up question generation engine — builds context-aware follow-ups
// for both behavioral (STAR-based) and technical (rubric-based) interviews.
// Moved from controllers to keep business logic in services layer.

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

export default { buildStarFollowUp, buildTechnicalFollowUp };
