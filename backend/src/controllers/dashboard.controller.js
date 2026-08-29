// backend/src/controllers/dashboard.controller.js
// Dashboard aggregation — Day 5.
// Queries all completed sessions for a userId, computes per-mode scores,
// weighted overallReadiness, weakest competency, trend, and calls
// insightEngine.js for the cross-mode insight (ONE call, not per-mode).

import Session from '../models/Session.model.js';
import { generateCrossModeInsight } from '../services/insightEngine.js';
import logger from '../utils/logger.js';

// Weights for overallReadiness composite (Master Context §11 Day 5)
const DEFAULT_WEIGHTS = { coding: 0.4, technical: 0.35, behavioral: 0.25 };

// Human-readable reason for the current weight configuration.
// In a JD-aware deployment this would be derived from the JD's seniority/skills;
// for now it reflects the default technical-role weighting.
const WEIGHTS_REASON =
  'Coding (40%) and Technical (35%) are weighted higher because this profile targets a technical engineering role where problem-solving and domain knowledge matter most. Behavioral (25%) ensures communication is not neglected.';

/**
 * Compute average score from an array of evaluation objects.
 */
const avgScore = (evaluations) => {
  if (!evaluations || evaluations.length === 0) return 0;
  const scores = evaluations.map((e) => e.score ?? 0);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
};

/**
 * Collect all evaluations from completed sessions of a given mode.
 */
const collectEvaluations = (sessions, mode) => {
  return sessions
    .filter((s) => s.mode === mode && s.status === 'completed')
    .flatMap((s) =>
      (s.questions || [])
        .map((q) => q.evaluation)
        .filter(Boolean)
    );
};

/**
 * Find the weakest competency by looking at dimension scores across modes.
 */
const findWeakestCompetency = (allEvaluations) => {
  const dimTotals = {};
  const dimCounts = {};

  for (const ev of allEvaluations) {
    if (!ev.dimensions) continue;
    for (const [key, val] of Object.entries(ev.dimensions)) {
      if (typeof val !== 'number') continue;
      dimTotals[key] = (dimTotals[key] || 0) + val;
      dimCounts[key] = (dimCounts[key] || 0) + 1;
    }
  }

  let weakest = null;
  let weakestAvg = Infinity;

  for (const [key, total] of Object.entries(dimTotals)) {
    const avg = total / (dimCounts[key] || 1);
    if (avg < weakestAvg) {
      weakestAvg = avg;
      weakest = key;
    }
  }

  // Prettify the dimension name
  if (!weakest) return 'General Practice';
  return weakest
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
};

/**
 * Build trend data — last sessions sorted by date with their scores.
 */
const buildTrend = (sessions) => {
  return sessions
    .filter((s) => s.status === 'completed' && s.overallScore != null)
    .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
    .slice(-10)
    .map((s) => ({
      sessionDate: new Date(s.updatedAt).toISOString().split('T')[0],
      score: s.overallScore,
      mode: s.mode,
    }));
};

/**
 * GET /api/dashboard/:userId
 * Response shape (Section 8):
 * { overallReadiness, perMode, weakestCompetency, trend, crossModeInsight, weights }
 */
export const getDashboardData = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Fetch all sessions for this user
    const sessions = await Session.find({ userId }).lean().catch((err) => {
      logger.error(`Dashboard DB query failed: ${err.message}`);
      return [];
    });

    const completedSessions = sessions.filter((s) => s.status === 'completed');

    // Per-mode evaluations
    const behavioralEval = collectEvaluations(sessions, 'behavioral');
    const technicalEval = collectEvaluations(sessions, 'technical');
    const codingEval = collectEvaluations(sessions, 'coding');

    // Per-mode scores
    const behavioralScore = avgScore(behavioralEval);
    const technicalScore = avgScore(technicalEval);
    const codingScore = avgScore(codingEval);

    // Weighted composite
    const weights = DEFAULT_WEIGHTS;
    const overallReadiness = Math.round(
      behavioralScore * weights.behavioral +
      technicalScore * weights.technical +
      codingScore * weights.coding
    );

    // Weakest competency across all modes
    const allEvaluations = [...behavioralEval, ...technicalEval, ...codingEval];
    const weakestCompetency = findWeakestCompetency(allEvaluations);

    // Trend
    const trend = buildTrend(sessions);

    // Cross-mode insight — ONE call, only when all three modes completed
    let crossModeInsight = '';
    const hasAllModes =
      behavioralEval.length > 0 && technicalEval.length > 0 && codingEval.length > 0;

    if (hasAllModes) {
      logger.info('Dashboard: all three modes completed — calling insightEngine (ONE call)');
      crossModeInsight = await generateCrossModeInsight({
        behavioralEval,
        technicalEval,
        codingEval,
      });
    } else {
      const completed = [];
      if (behavioralEval.length > 0) completed.push('Behavioral');
      if (technicalEval.length > 0) completed.push('Technical');
      if (codingEval.length > 0) completed.push('Coding');
      crossModeInsight = completed.length > 0
        ? `Complete the remaining modes to unlock cross-mode insight. Currently completed: ${completed.join(', ')}.`
        : 'Complete at least one session in each mode (Behavioral, Technical, Coding) to unlock your personalized cross-mode analysis.';
    }

    return res.json({
      overallReadiness,
      perMode: {
        behavioral: behavioralScore,
        technical: technicalScore,
        coding: codingScore,
      },
      weakestCompetency,
      trend,
      crossModeInsight,
      weights,
      weightsReason: WEIGHTS_REASON,
      sessionCount: completedSessions.length,
    });
  } catch (err) {
    logger.error(`Dashboard error: ${err.message}`);
    next(err);
  }
};

export default { getDashboardData };
