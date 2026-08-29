// backend/src/services/insightEngine.js
// Cross-Mode Insight Engine — Day 5 differentiator.
// Makes ONE LLM call over all three evaluation JSONs looking for a REPEATED
// PATTERN across modes — not a numeric average.  This is multi-document
// pattern synthesis, the single highest-leverage "wow" feature relative to
// build cost (Master Context §9 / §11 Day 5).

import { callAI } from './ai.js';
import logger from '../utils/logger.js';

/**
 * Build a compact summary of one mode's evaluations for the LLM prompt.
 * @param {string} modeName
 * @param {Object[]} evaluations - array of evaluation objects from that mode
 * @returns {string}
 */
const summarizeMode = (modeName, evaluations) => {
  if (!evaluations || evaluations.length === 0) {
    return `${modeName}: No completed sessions.`;
  }
  const scores = evaluations.map((e) => e.score ?? 0);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const strengths = evaluations.map((e) => e.strength).filter(Boolean);
  const weaknesses = evaluations.map((e) => e.missing).filter(Boolean);
  const improvements = evaluations.map((e) => e.improvement).filter(Boolean);
  const allDimensions = evaluations.flatMap((e) =>
    e.dimensions ? Object.entries(e.dimensions).map(([k, v]) => `${k}:${v}`) : []
  );

  return [
    `${modeName} (${evaluations.length} question(s), avg score ${avg}/100):`,
    strengths.length ? `  Strengths: ${strengths.join(' | ')}` : '',
    weaknesses.length ? `  Gaps: ${weaknesses.join(' | ')}` : '',
    improvements.length ? `  Improvements: ${improvements.join(' | ')}` : '',
    allDimensions.length ? `  Dimensions: ${allDimensions.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

/**
 * Deterministic fallback: scan evaluations for overlapping keywords in
 * missing/improvement fields across at least two modes.
 */
const deterministicPattern = (behavioralEval, technicalEval, codingEval) => {
  const modes = [
    { name: 'Behavioral', evals: behavioralEval },
    { name: 'Technical', evals: technicalEval },
    { name: 'Coding', evals: codingEval },
  ];

  // Collect all improvement/strength strings per mode
  const modeTexts = modes.map((m) => ({
    name: m.name,
    text: (m.evals || [])
      .flatMap((e) => [e.missing, e.improvement, e.strength].filter(Boolean))
      .join(' ')
      .toLowerCase(),
  }));

  // Look for shared keywords between any two modes
  const keywordGroups = [
    { keywords: ['complexity', 'optimize', 'efficiency', 'performance', 'time'], label: 'algorithmic efficiency' },
    { keywords: ['example', 'specific', 'detail', 'concrete', 'evidence'], label: 'providing specific examples' },
    { keywords: ['structure', 'star', 'framework', 'approach', 'method'], label: 'structured thinking' },
    { keywords: ['edge', 'corner', 'empty', 'boundary', 'base case'], label: 'handling edge cases' },
    { keywords: ['explain', 'reasoning', 'walk through', 'articulate'], label: 'explaining reasoning out loud' },
    { keywords: ['depth', 'depth', 'surface', 'shallow', 'superficial'], label: 'going deeper than surface-level' },
  ];

  const findings = [];
  for (const group of keywordGroups) {
    const modesHit = modeTexts.filter((mt) =>
      group.keywords.some((kw) => mt.text.includes(kw))
    );
    if (modesHit.length >= 2) {
      findings.push({
        pattern: group.label,
        modes: modesHit.map((m) => m.name),
      });
    }
  }

  if (findings.length === 0) {
    return 'Across all three modes, no single repeated weakness was detected. Keep practicing each mode individually to build consistent habits.';
  }

  const top = findings[0];
  return `Pattern detected across modes: You show a recurring gap in ${top.pattern} — observed in both ${top.modes.join(' and ')}. Suggested focus: dedicate your next practice session to this specific area across all interview types.`;
};

/**
 * Generate a cross-mode insight string by analysing evaluations from all
 * three interview modes.  Makes exactly ONE call to the LLM.
 *
 * @param {Object} params
 * @param {Object[]} params.behavioralEval - evaluation objects from behavioral mode
 * @param {Object[]} params.technicalEval - evaluation objects from technical mode
 * @param {Object[]} params.codingEval   - evaluation objects from coding mode
 * @returns {Promise<string>} A human-readable cross-mode insight paragraph.
 */
export const generateCrossModeInsight = async ({
  behavioralEval = [],
  technicalEval = [],
  codingEval = [],
}) => {
  // Guard: all three modes must have at least one completed evaluation
  const hasBehavioral = behavioralEval.length > 0;
  const hasTechnical = technicalEval.length > 0;
  const hasCoding = codingEval.length > 0;

  if (!hasBehavioral || !hasTechnical || !hasCoding) {
    const completed = [hasBehavioral && 'Behavioral', hasTechnical && 'Technical', hasCoding && 'Coding']
      .filter(Boolean)
      .join(', ');
    return `Cross-mode insight requires all three modes to be completed. Currently completed: ${completed || 'none'}. Finish the remaining modes to unlock your personalized cross-mode analysis.`;
  }

  const behavioralSummary = summarizeMode('Behavioral', behavioralEval);
  const technicalSummary = summarizeMode('Technical', technicalEval);
  const codingSummary = summarizeMode('Coding', codingEval);

  const systemPrompt = `You are an expert career coach and interview analyst.
You are given evaluation summaries from a candidate's Behavioral, Technical, and Coding interview sessions.
Your task: look for ONE genuine REPEATED PATTERN that spans at least two modes — not a numeric average, not generic advice.

IMPORTANT: If the candidate performed consistently across all modes with no real cross-mode pattern (either all strong or all average), say so honestly. Do NOT fabricate a pattern where none exists.

Look for:
- A recurring weakness (e.g. "struggles with edge cases" in both Coding and Technical)
- A recurring strength (e.g. "clear communication" in both Behavioral and Technical)
- A behavioral tendency visible across modes (e.g. "strong first answers but weak under follow-up pressure")

If no genuine cross-mode pattern exists, return:
{
  "patternTitle": "No Strong Cross-Mode Pattern Detected",
  "patternDetail": "The candidate performed consistently across all three modes without a clear repeated weakness or strength. This is a positive sign — keep practicing each mode to build well-rounded skills.",
  "suggestedFocus": "Continue practicing all three modes equally to maintain balanced growth.",
  "modesAffected": [],
  "noPattern": true
}

If a pattern IS found, return:
{
  "patternTitle": "Short 5-8 word title for the pattern",
  "patternDetail": "2-3 sentence explanation referencing specifics from at least two modes",
  "suggestedFocus": "One actionable sentence for the candidate's next practice session",
  "modesAffected": ["array of mode names where the pattern appears"],
  "noPattern": false
}`;

  const userPrompt = `Here are the candidate's evaluation summaries across three interview modes:

${behavioralSummary}

${technicalSummary}

${codingSummary}

Analyse these evaluations and return JSON — remember, if there is no genuine cross-mode pattern, say so honestly using the noPattern response format.`;

  try {
    const result = await callAI({
      systemPrompt,
      userPrompt,
      requiredFields: ['patternTitle', 'patternDetail', 'suggestedFocus'],
    });

    const title = result.patternTitle || 'Cross-Mode Pattern';
    const detail = result.patternDetail || '';
    const focus = result.suggestedFocus || '';

    // If LLM explicitly flagged noPattern, use the deterministic fallback
    // as a second opinion to confirm no keyword-level pattern exists.
    if (result.noPattern === true) {
      logger.info('LLM reported no cross-mode pattern. Running deterministic check as confirmation.');
      const deterministicCheck = deterministicPattern(behavioralEval, technicalEval, codingEval);
      // If deterministic also finds no pattern, return the honest LLM response
      if (deterministicCheck.includes('no single repeated weakness')) {
        return `${title}: ${detail} ${focus ? `\n\nSuggested focus: ${focus}` : ''}`;
      }
      // If deterministic found something, use it (LLM may have missed it)
      logger.info('Deterministic check found a pattern the LLM missed. Using deterministic result.');
      return deterministicCheck;
    }

    return `${title}: ${detail} ${focus ? `\n\nSuggested focus: ${focus}` : ''}`;
  } catch (err) {
    logger.warn(`Cross-mode insight LLM call failed: ${err.message}. Using deterministic fallback.`);
    return deterministicPattern(behavioralEval, technicalEval, codingEval);
  }
};

export default { generateCrossModeInsight };
