// backend/src/services/difficultyEngine.js
// Pure function — NO AI calls inside.
// Elo-inspired bounded rating adjustment with per-skill EMA (Exponential Moving Average).
// Used by technical.controller.js and coding.controller.js.

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

// EMA smoothing factor — higher alpha reacts faster to recent answers,
// lower alpha smooths more across the session. 0.3 balances responsiveness
// with stability (one lucky/unlucky answer won't swing the rating wildly).
const EMA_ALPHA = 0.3;

// Maximum swing per step: one answer can move the rating by at most this much.
// This caps the Elo K-factor equivalent so a single outlier doesn't cause
// a wild difficulty jump.
const MAX_RATING_SWING = 15;

// Rating thresholds for difficulty bands (0-100 scale).
const DIFFICULTY_THRESHOLDS = {
  easy: { min: 0, max: 40 },
  medium: { min: 35, max: 70 },
  hard: { min: 65, max: 100 },
};

/**
 * Convert a 0-100 score to an Elo-style rating delta.
 * Strong answer (>70) → positive delta, weak answer (<40) → negative delta.
 * The delta is capped by MAX_RATING_SWING.
 */
const scoreToRatingDelta = (score) => {
  // Center the score around 50: a score of 50 produces 0 delta.
  const raw = (score - 50) * 0.6; // scale factor controls sensitivity
  return Math.max(-MAX_RATING_SWING, Math.min(MAX_RATING_SWING, Math.round(raw)));
};

/**
 * Update the per-skill EMA rating with a new score.
 * EMA = alpha * newScore + (1 - alpha) * previousRating
 * @param {number} previousRating - Current EMA rating for this skill (0-100)
 * @param {number} newScore - Score from the latest answer (0-100)
 * @returns {number} Updated EMA rating (0-100)
 */
const updateEmaRating = (previousRating, newScore) => {
  const updated = EMA_ALPHA * newScore + (1 - EMA_ALPHA) * previousRating;
  return Math.round(Math.max(0, Math.min(100, updated)));
};

/**
 * Determine the next difficulty level based on the updated EMA rating.
 * Uses overlapping thresholds so there's a buffer zone — prevents oscillation
 * at boundary values.
 * @param {number} rating - Updated EMA rating (0-100)
 * @param {string} currentDifficulty - Current difficulty level
 * @returns {string} Next difficulty level
 */
const ratingToDifficulty = (rating, currentDifficulty) => {
  const currentIndex = DIFFICULTY_LEVELS.indexOf(currentDifficulty);

  // Step-up: rating is above the current band's upper threshold
  if (currentIndex < DIFFICULTY_LEVELS.length - 1) {
    const nextLevel = DIFFICULTY_LEVELS[currentIndex + 1];
    if (rating >= DIFFICULTY_THRESHOLDS[nextLevel].min) {
      return nextLevel;
    }
  }

  // Step-down: rating is below the current band's lower threshold
  if (currentIndex > 0) {
    const prevLevel = DIFFICULTY_LEVELS[currentIndex - 1];
    if (rating <= DIFFICULTY_THRESHOLDS[currentDifficulty].min - 5) {
      return prevLevel;
    }
  }

  // Stay at current difficulty
  return currentDifficulty;
};

/**
 * Compute the next difficulty for a technical/coding question.
 *
 * Pure function — no side effects, no AI calls, no database access.
 *
 * @param {Object} params
 * @param {string} params.currentDifficulty - Current question difficulty ('easy'|'medium'|'hard')
 * @param {number} params.lastScore - Score from the latest answer (0-100)
 * @param {Object} params.skillHistory - Per-skill history: { [skill]: { rating: number, scores: number[] } }
 * @param {string} params.skill - The skill for the next question
 * @returns {{ nextDifficulty: string, updatedSkillHistory: Object, ratingDelta: number }}
 */
export const nextDifficulty = ({ currentDifficulty, lastScore, skillHistory = {}, skill }) => {
  if (!currentDifficulty || !DIFFICULTY_LEVELS.includes(currentDifficulty)) {
    currentDifficulty = 'medium';
  }

  if (typeof lastScore !== 'number' || lastScore < 0 || lastScore > 100) {
    // No valid score — stay at current difficulty
    return {
      nextDifficulty: currentDifficulty,
      updatedSkillHistory: skillHistory,
      ratingDelta: 0,
    };
  }

  // Get or initialize the skill's EMA rating
  const skillData = skillHistory[skill] || { rating: 50, scores: [] };
  const previousRating = skillData.rating;

  // Compute the Elo-inspired bounded rating delta
  const rawDelta = scoreToRatingDelta(lastScore);

  // Update the EMA with the new score
  const newRating = updateEmaRating(previousRating, lastScore);

  // Apply the capped swing: the EMA already smooths, but we also cap the
  // effective delta to prevent any single answer from moving too far.
  const effectiveDelta = Math.max(-MAX_RATING_SWING, Math.min(MAX_RATING_SWING, newRating - previousRating));
  const cappedRating = Math.max(0, Math.min(100, previousRating + effectiveDelta));

  // Determine next difficulty from the updated rating
  const nextDifficulty = ratingToDifficulty(cappedRating, currentDifficulty);

  // Update skill history
  const updatedSkillHistory = {
    ...skillHistory,
    [skill]: {
      rating: cappedRating,
      scores: [...(skillData.scores || []), lastScore],
    },
  };

  return {
    nextDifficulty,
    updatedSkillHistory,
    ratingDelta: Math.round(effectiveDelta),
  };
};

export default { nextDifficulty };
