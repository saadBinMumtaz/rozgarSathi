// backend/src/services/answerQuality.js
// Shared answer-quality validation — reused by BOTH the Behavioral and
// Technical controllers so invalid-input handling stays consistent across
// every question type and follow-up.
//
// This module only DETECTS unusable answers and holds the fixed feedback
// message. It never constructs an `evaluation` object (Rules §5: that stays
// in scoring.js) and never calls the AI.

// The direct, polite message shown + spoken when a candidate submits random
// strings / gibberish / a non-answer. Used instead of vague "Can you explain?"
// or "I don't understand" phrasing.
export const INVALID_ANSWER_MESSAGE =
  'You did not provide a proper answer; your response appears to be random words or unrelated strings. Please give a real, substantive answer to the question.';

// How many times we re-ask the SAME prompt with the direct message before we
// stop looping and move on (flagging the answer as invalid, never rubric-scored).
// Set to 0 for immediate flagging: show the message once, then move to next question.
export const MAX_INVALID_ATTEMPTS = 0;

// Shared profanity list — single source of truth for both controllers.
const PROFANITY_LIST = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'motherfucker', 'dick', 'piss',
  'damn', 'hell', 'crap', 'slut', 'whore',
];

/**
 * Check if transcript contains profanity.
 * Returns the first profane word found, or null.
 */
export const detectProfanity = (transcript) => {
  const lower = transcript.toLowerCase();
  return PROFANITY_LIST.find((p) => lower.includes(p)) || null;
};

/**
 * Track answer-quality attempts on session metadata so invalid inputs are
 * re-asked with the same direct message instead of being scored.
 */
export const bumpInvalidAttempts = async (session) => {
  if (!session.metadata) session.metadata = {};
  session.metadata.invalidAttempts = (session.metadata.invalidAttempts || 0) + 1;
  await session.save();
  return session.metadata.invalidAttempts;
};

/**
 * Reset the invalid attempt counter after a valid answer.
 */
export const resetInvalidAttempts = (session) => {
  if (session.metadata) session.metadata.invalidAttempts = 0;
};

/**
 * Robustly detect random / gibberish / non-sensical answers.
 * Script-aware: legitimate Urdu (or other non-Latin) answers are NOT flagged
 * just because they lack Latin vowels.
 *
 * @param {string} transcript - raw candidate answer
 * @returns {boolean} true when the answer is unusable / non-substantive
 */
export const isInvalidAnswer = (transcript) => {
  const text = (transcript || '').trim();
  const words = text.split(/\s+/).filter(Boolean);

  // Essentially nothing was answered.
  if (words.length < 3) return true;

  const lower = text.toLowerCase();

  // Long run of the same character ("aaaaaa...", "asdfasdf" collapsed).
  if (/(.)\1{5,}/.test(lower.replace(/\s+/g, ''))) return true;

  // Mostly the same word repeated.
  const normalized = words.map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
  const uniqueRatio = new Set(normalized).size / words.length;
  if (uniqueRatio < 0.35) return true;

  // Keyboard-mash gibberish heuristic — only for Latin script, so Urdu/Arabic,
  // Devanagari, etc. are never falsely flagged for having no a/e/i/o/u.
  const hasNonLatin = /[^\u0000-\u007F]/.test(text);
  if (!hasNonLatin) {
    const letterWords = words.filter((w) => /[a-z]/i.test(w));
    if (letterWords.length > 0) {
      const noVowelCount = letterWords.filter((w) => !/[aeiou]/i.test(w)).length;
      if (noVowelCount / letterWords.length > 0.5) return true;
    }
  }

  return false;
};

export default { INVALID_ANSWER_MESSAGE, MAX_INVALID_ATTEMPTS, isInvalidAnswer, detectProfanity, bumpInvalidAttempts, resetInvalidAttempts };
