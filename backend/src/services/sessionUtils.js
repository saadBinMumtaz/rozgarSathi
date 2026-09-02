// backend/src/services/sessionUtils.js
// Shared session lifecycle utilities — used by both Behavioral and Technical
// controllers to avoid duplicating session completion logic.

/**
 * Complete the session with an overall score.
 * Averages all question scores and marks the session as completed.
 * @param {Object} session - Mongoose session document
 * @param {Object} evaluation - Current evaluation object
 * @param {Object} res - Express response object
 */
export const completeSession = async (session, evaluation, res) => {
  session.status = 'completed';
  session.overallScore = Math.round(
    session.questions.reduce((sum, q) => sum + (q.evaluation?.score || 0), 0) /
      session.questions.length
  );
  await session.save();
  return res.json({ evaluation, nextAction: 'complete' });
};

export default { completeSession };
