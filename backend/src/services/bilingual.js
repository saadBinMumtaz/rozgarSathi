// backend/src/services/bilingual.js
// Bilingual feedback service — translates evaluation JSON at render time.
// Rule: a "Show in Urdu" toggle reuses the SAME evaluation JSON,
// translated only at render/prompt time — never re-runs the full evaluation.

import { callQwen } from './ai.js';
import logger from '../utils/logger.js';

/**
 * Translate an evaluation object's text fields to the target language.
 * Reuses the same evaluation data — does NOT re-run scoring.
 *
 * @param {Object} evaluation - The original evaluation object (English)
 * @param {string} targetLanguage - 'urdu' | 'english' | 'mixed'
 * @returns {Promise<Object>} Evaluation with translated text fields
 */
export const translateEvaluation = async (evaluation, targetLanguage = 'english') => {
  // English is the default — return as-is
  if (targetLanguage === 'english' || !targetLanguage) {
    return evaluation;
  }

  const fieldsToTranslate = {
    strength: evaluation.strength || '',
    missing: evaluation.missing || '',
    improvement: evaluation.improvement || '',
    evidence: Array.isArray(evaluation.evidence) ? evaluation.evidence : [],
  };

  // If all fields are empty, nothing to translate
  const hasContent = Object.values(fieldsToTranslate).some(
    (v) => (typeof v === 'string' && v.trim().length > 0) || (Array.isArray(v) && v.length > 0)
  );

  if (!hasContent) {
    return evaluation;
  }

  const languageLabel =
    targetLanguage === 'urdu'
      ? 'Urdu (اردو)'
      : targetLanguage === 'mixed'
        ? 'Roman Urdu (mixed English-Urdu)'
        : targetLanguage;

  try {
    const systemPrompt = `You are a professional translator. Translate the following interview feedback fields into ${languageLabel}.
Keep the meaning and tone intact. Do not add or remove information.
Return ONLY valid JSON with the same keys: { "strength", "missing", "improvement", "evidence" }.
Do not translate field names, only values.`;

    const userPrompt = `Translate these fields:
{
  "strength": ${JSON.stringify(fieldsToTranslate.strength)},
  "missing": ${JSON.stringify(fieldsToTranslate.missing)},
  "improvement": ${JSON.stringify(fieldsToTranslate.improvement)},
  "evidence": ${JSON.stringify(fieldsToTranslate.evidence)}
}`;

    const result = await callQwen({
      systemPrompt,
      userPrompt,
      requiredFields: ['strength', 'missing', 'improvement'],
    });

    return {
      ...evaluation,
      strength: result.strength || evaluation.strength,
      missing: result.missing || evaluation.missing,
      improvement: result.improvement || evaluation.improvement,
      evidence: Array.isArray(result.evidence) ? result.evidence : evaluation.evidence,
      _translatedTo: targetLanguage,
    };
  } catch (err) {
    logger.warn(`Translation failed: ${err.message}. Returning original English evaluation.`);
    return evaluation;
  }
};

export default { translateEvaluation };
