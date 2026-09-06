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
 * Find the strongest competency (inverse of weakest).
 */
const findStrongestCompetency = (allEvaluations) => {
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
  let strongest = null;
  let strongestAvg = -Infinity;
  for (const [key, total] of Object.entries(dimTotals)) {
    const avg = total / (dimCounts[key] || 1);
    if (avg > strongestAvg) { strongestAvg = avg; strongest = key; }
  }
  if (!strongest) return null;
  return {
    key: strongest,
    label: strongest.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim(),
    score: Math.round(strongestAvg),
  };
};

/**
 * Compute per-mode trend by comparing recent sessions to overall mode average.
 */
const computePerModeTrend = (sessions, mode) => {
  const modeSessions = sessions
    .filter((s) => s.mode === mode && s.status === 'completed' && s.overallScore != null)
    .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  if (modeSessions.length < 2) return { direction: 'insufficient', sessionCount: modeSessions.length };
  // Compare last two sessions — works correctly even with exactly 2 sessions
  const lastScore = modeSessions[modeSessions.length - 1].overallScore;
  const prevScore = modeSessions[modeSessions.length - 2].overallScore;
  const diff = lastScore - prevScore;
  let direction = 'stable';
  if (diff > 5) direction = 'up';
  else if (diff < -5) direction = 'down';
  return { direction, sessionCount: modeSessions.length };
};

/**
 * Generate a deterministic, data-driven insight when not all 3 modes are completed.
 * Uses actual per-mode scores and session counts — never fabricates patterns.
 */
const generatePartialModeInsight = (perModeScores, sessionCounts, language) => {
  const completed = Object.entries(perModeScores).filter(([, s]) => s > 0);
  const incomplete = Object.entries(perModeScores).filter(([, s]) => s === 0);
  if (completed.length === 0) {
    return language === 'urdu'
      ? 'ابھی تک کوئی ڈیٹا نہیں۔ اپنا پہلا انٹرویو مکمل کریں۔'
      : 'No data yet. Complete your first interview to see personalized insights.';
  }
  if (completed.length === 1) {
    const [mode, score] = completed[0];
    const label = mode.charAt(0).toUpperCase() + mode.slice(1);
    const remaining = incomplete.map(([m]) => m).join(', ');
    if (score >= 70) {
      return language === 'urdu'
        ? `${label} میں مضبوط آغاز (${score}/100)۔ ${remaining} کی مشق سے مکمل پروفائل بنے گی۔`
        : `Strong start in ${label} (${score}/100). Practicing ${remaining} will build a complete profile and unlock cross-mode analysis.`;
    }
    return language === 'urdu'
      ? `${label} میں شروعات (${score}/100)۔ مزید مشق سے بہتری آئے گی۔ ${remaining} ابھی باقی ہے۔`
      : `Getting started in ${label} (${score}/100). More practice will sharpen your skills. ${remaining} still needs your first session.`;
  }
  // Two modes completed — compare scores
  completed.sort((a, b) => b[1] - a[1]);
  const [strongMode, strongScore] = completed[0];
  const [weakMode, weakScore] = completed[1];
  const strongLabel = strongMode.charAt(0).toUpperCase() + strongMode.slice(1);
  const weakLabel = weakMode.charAt(0).toUpperCase() + weakMode.slice(1);
  const diff = strongScore - weakScore;
  const incompleteLabel = incomplete.length > 0 ? incomplete[0][0] : null;
  if (diff >= 15) {
    const msg = language === 'urdu'
      ? `${strongLabel} (${strongScore}) ${weakLabel} (${weakScore}) سے نمایاں طور پر مضبوط ہے۔`
      : `Your ${strongLabel} score (${strongScore}) is notably stronger than ${weakLabel} (${weakScore}).`;
    if (incompleteLabel) {
      const incLabel = incompleteLabel.charAt(0).toUpperCase() + incompleteLabel.slice(1);
      return msg + (language === 'urdu'
        ? ` ${incLabel} ابھی باقی ہے — مکمل کرنے کے لیے سب سے کم اسکور والے علاقے پر توجہ دیں۔`
        : ` ${incLabel} is still untried — focus on your weakest area for highest-impact practice.`);
    }
    return msg + (language === 'urdu'
      ? ` ${weakLabel} پر توجہ دیں۔`
      : ` Focus on ${weakLabel} to close the gap.`);
  }
  const msg = language === 'urdu'
    ? `${strongLabel} (${strongScore}) اور ${weakLabel} (${weakScore}) مماثل ہیں۔`
    : `${strongLabel} (${strongScore}) and ${weakLabel} (${weakScore}) are performing similarly.`;
  if (incompleteLabel) {
    const incLabel = incompleteLabel.charAt(0).toUpperCase() + incompleteLabel.slice(1);
    return msg + (language === 'urdu'
      ? ` ${incLabel} کی مشق سے مکمل تصویر سامنے آئے گی۔`
      : ` Completing ${incLabel} will give you a full cross-mode picture.`);
  }
  return msg + (language === 'urdu'
    ? ' تمام موڈز مکمل — مشق جاری رکھیں۔'
    : ' All modes complete — keep practicing to improve.');
};

/**
 * GET /api/dashboard/:userId
 * Response shape (Section 8):
 * { overallReadiness, perMode, weakestCompetency, trend, crossModeInsight, weights }
 */
export const getDashboardData = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const authenticatedUser = req.user || null;

    // For authenticated users, use their real userId
    const effectiveUserId = authenticatedUser ? String(authenticatedUser._id) : userId;

    // Fetch all sessions for this user
    const query = buildUserQuery(effectiveUserId, authenticatedUser);
    const sessions = await Session.find(query).lean().catch((err) => {
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

    // Weakest competency with actionable details
    const allEvaluations = [...behavioralEval, ...technicalEval, ...codingEval];
    const weakestRaw = findWeakestCompetency(allEvaluations);
    const strongestRaw = findStrongestCompetency(allEvaluations);

    // Build enriched weakest competency details
    let weakestCompetencyDetails = { key: weakestRaw, label: weakestRaw, score: 0, mode: null, why: '' };
    if (weakestRaw && weakestRaw !== 'General Practice') {
      const dimKey = weakestRaw.charAt(0).toLowerCase() + weakestRaw.slice(1).replace(/ /g, '');
      const matchingEvals = allEvaluations.filter((ev) => ev.dimensions && typeof ev.dimensions[dimKey] === 'number');
      const avgScore = matchingEvals.length > 0
        ? Math.round(matchingEvals.reduce((sum, ev) => sum + ev.dimensions[dimKey], 0) / matchingEvals.length)
        : 0;
      const modeForDim = ['behavioral', 'technical', 'coding'].find((m) =>
        collectEvaluations(sessions, m).some((ev) => ev.dimensions && typeof ev.dimensions[dimKey] === 'number')
      ) || null;
      const gaps = matchingEvals.map((ev) => ev.missing).filter(Boolean);
      const improvements = matchingEvals.map((ev) => ev.improvement).filter(Boolean);
      // Use the most recent evaluation's feedback (most relevant to current performance)
      const allFeedback = [...gaps, ...improvements];
      let why = '';
      if (allFeedback.length > 0) {
        why = allFeedback[allFeedback.length - 1];
        if (why.length > 200) why = why.substring(0, 197) + '...';
      }
      weakestCompetencyDetails = { key: dimKey, label: weakestRaw, score: avgScore, mode: modeForDim, why };
    }

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
      // Data-driven partial insight based on available mode data
      crossModeInsight = generatePartialModeInsight(
        { behavioral: behavioralScore, technical: technicalScore, coding: codingScore },
        { behavioral: behavioralEval.length, technical: technicalEval.length, coding: codingEval.length },
        req.query?.language || 'english'
      );
    }

    return res.json({
      overallReadiness,
      perMode: {
        behavioral: behavioralScore,
        technical: technicalScore,
        coding: codingScore,
      },
      weakestCompetency: weakestRaw, // backward compat
      weakestCompetencyDetails,
      strongestCompetencyDetails: strongestRaw,
      modeTrends: {
        behavioral: computePerModeTrend(sessions, 'behavioral'),
        technical: computePerModeTrend(sessions, 'technical'),
        coding: computePerModeTrend(sessions, 'coding'),
      },
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

/**
 * Compute a consistency streak from existing Session.createdAt timestamps.
 * Uses MongoDB aggregation to extract unique dates, then counts consecutive
 * days backwards from today (or yesterday if no session today).
 * No new schema field — purely derived from createdAt.
 */
export const getStreak = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const authenticatedUser = req.user || null;
    const effectiveUserId = authenticatedUser ? String(authenticatedUser._id) : userId;

    // Aggregation: get unique dates (YYYY-MM-DD) from createdAt for completed sessions
    const dateResults = await Session.aggregate([
      { $match: { $or: [{ userId: effectiveUserId }, ...(authenticatedUser ? [] : [{ userId: 'guest' }])] } },
      { $match: { status: 'completed' } },
      { $group: { _id: {
        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
      } } },
      { $sort: { _id: -1 } },
    ]);

    const dates = dateResults.map((d) => d._id);
    const streak = computeStreakFromDates(dates);

    return res.json({ streak, totalDays: dates.length });
  } catch (err) {
    logger.error(`Streak error: ${err.message}`);
    next(err);
  }
};

/**
 * Given an array of date strings (YYYY-MM-DD) sorted descending,
 * return the length of the longest consecutive-day run ending at
 * today or yesterday.
 */
const computeStreakFromDates = (sortedDatesDesc) => {
  if (!sortedDatesDesc || sortedDatesDesc.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Streak must start from today or yesterday
  const start = sortedDatesDesc[0];
  if (start !== todayStr && start !== yesterdayStr) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const prev = new Date(sortedDatesDesc[i - 1] + 'T00:00:00Z');
    const curr = new Date(sortedDatesDesc[i] + 'T00:00:00Z');
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (Math.round(diffDays) === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

export default { getDashboardData, getStreak };

// ─── Day 6: Session History + Trend ───────────────────────────────────────

/**
 * Build the userId query for session lookups.
 * For authenticated users: only their own sessions.
 * For guests: broad query including guest/orphan sessions.
 */
const buildUserQuery = (userId, authenticatedUser) => {
  if (authenticatedUser) {
    return { userId: String(authenticatedUser._id) };
  }
  return {
    $or: [
      { userId },
      { userId: 'guest' },
      { userId: { $regex: /^guest_/ } },
      ...(userId.startsWith('user_') ? [{ userId: { $regex: /^user_/ } }] : []),
    ],
  };
};

/**
 * GET /api/dashboard/:userId/history
 * Returns all completed sessions sorted newest-first with full question/evaluation data.
 */
export const getSessionHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const authenticatedUser = req.user || null;
    const effectiveUserId = authenticatedUser ? String(authenticatedUser._id) : userId;
    const sessions = await Session.find(buildUserQuery(effectiveUserId, authenticatedUser))
      .sort({ updatedAt: -1 })
      .lean();

    const history = sessions
      .filter((s) => s.status === 'completed')
      .map((s) => {
        const questions = (s.questions || []).map((q) => ({
          questionId: q.questionId,
          questionText: q.questionText,
          topic: q.topic,
          difficulty: q.difficulty,
          transcript: q.transcript || '',
          score: q.evaluation?.score ?? null,
          dimensions: q.evaluation?.dimensions || {},
          evidence: q.evaluation?.evidence || [],
          strength: q.evaluation?.strength || '',
          missing: q.evaluation?.missing || '',
          improvement: q.evaluation?.improvement || '',
        }));

        const avgScore = questions.filter((q) => q.score != null).length > 0
          ? Math.round(
              questions.filter((q) => q.score != null).reduce((a, q) => a + q.score, 0) /
              questions.filter((q) => q.score != null).length
            )
          : null;

        return {
          sessionId: s._id,
          mode: s.mode,
          date: s.updatedAt || s.createdAt,
          overallScore: s.overallScore ?? avgScore,
          status: s.status,
          jdSnapshot: s.jdSnapshot || null,
          questionCount: questions.length,
          questions,
        };
      });

    return res.json({ history, total: history.length });
  } catch (err) {
    logger.error(`Session history error: ${err.message}`);
    next(err);
  }
};

/**
 * GET /api/dashboard/:userId/trend
 * Returns per-mode trend data — last 5 completed sessions per mode with scores.
 * Used by ProgressTrendChart to draw real historical lines.
 */
export const getSessionTrend = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const authenticatedUser = req.user || null;
    const effectiveUserId = authenticatedUser ? String(authenticatedUser._id) : userId;
    const sessions = await Session.find(buildUserQuery(effectiveUserId, authenticatedUser))
      .sort({ updatedAt: -1 })
      .lean();

    const completed = sessions.filter((s) => s.status === 'completed');

    // Group by mode, take last 5 each, compute per-session score
    const modes = ['behavioral', 'technical', 'coding'];
    const trend = {};

    for (const mode of modes) {
      const modeSessions = completed
        .filter((s) => s.mode === mode)
        .slice(0, 5) // already sorted newest-first
        .reverse(); // oldest-first for chart rendering

      trend[mode] = modeSessions.map((s) => {
        const evals = (s.questions || [])
          .map((q) => q.evaluation?.score)
          .filter((score) => typeof score === 'number');
        const avgScore = evals.length > 0
          ? Math.round(evals.reduce((a, b) => a + b, 0) / evals.length)
          : s.overallScore ?? 0;

        return {
          date: new Date(s.updatedAt || s.createdAt).toISOString().split('T')[0],
          score: avgScore,
          questionCount: (s.questions || []).length,
        };
      });
    }

    return res.json({ trend });
  } catch (err) {
    logger.error(`Session trend error: ${err.message}`);
    next(err);
  }
};
