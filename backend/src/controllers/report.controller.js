// backend/src/controllers/report.controller.js
// Shareable read-only report — Master Context §15.6 / Rules.md §22.
// POST /api/reports/share       — authenticated; generates shareToken on a session.
// GET  /api/reports/shared/:shareToken — unauthenticated; returns ONLY
//   fields already visible on Results.jsx (scores, evidence, evaluation).
//   NEVER returns email, name, userId, or googleId.

import crypto from 'crypto';
import Session from '../models/Session.model.js';
import JDAnalysis from '../models/JDAnalysis.model.js';
import { generateInterviewSummary } from '../services/insightEngine.js';
import logger from '../utils/logger.js';

/**
 * POST /api/reports/share
 * Body: { sessionId }
 * Generates (or returns existing) shareToken for the given session.
 */
export const generateShareToken = async (req, res, next) => {
  try {
    const authenticatedUser = req.user;
    if (!authenticatedUser) {
      return res.status(401).json({ code: 401, message: 'Authentication required' });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ code: 400, message: 'sessionId is required' });
    }

    const session = await Session.findOne({
      _id: sessionId,
      userId: String(authenticatedUser._id),
    });

    if (!session) {
      return res.status(404).json({ code: 404, message: 'Session not found' });
    }

    // Generate token if not already present
    if (!session.shareToken) {
      session.shareToken = crypto.randomBytes(24).toString('hex');
      await session.save();
    }

    const shareUrl = `/reports/shared/${session.shareToken}`;
    return res.json({ shareToken: session.shareToken, shareUrl });
  } catch (err) {
    logger.error(`Share token generation error: ${err.message}`);
    next(err);
  }
};

/**
 * GET /api/reports/shared/:shareToken
 * Unauthenticated. Returns ONLY fields visible on Results.jsx.
 * NEVER returns: email, name, userId, googleId, _id of user.
 */
export const getSharedReport = async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    if (!shareToken) {
      return res.status(400).json({ code: 400, message: 'Share token is required' });
    }

    const session = await Session.findOne({ shareToken, status: 'completed' }).lean();
    if (!session) {
      return res.status(404).json({ code: 404, message: 'Shared report not found or expired' });
    }

    // Build sanitized response — ONLY fields visible on Results.jsx
    const questions = (session.questions || []).map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      topic: q.topic,
      difficulty: q.difficulty,
      transcript: q.transcript || '',
      evaluation: q.evaluation
        ? {
            score: q.evaluation.score,
            dimensions: q.evaluation.dimensions,
            evidence: q.evaluation.evidence || [],
            strength: q.evaluation.strength || '',
            missing: q.evaluation.missing || '',
            improvement: q.evaluation.improvement || '',
            confidenceLevel: q.evaluation.confidenceLevel,
          }
        : null,
    }));

    // Compute per-question scores for overall
    const evalScores = questions
      .map((q) => q.evaluation?.score)
      .filter((s) => typeof s === 'number');
    const overallScore =
      evalScores.length > 0
        ? Math.round(evalScores.reduce((a, b) => a + b, 0) / evalScores.length)
        : session.overallScore ?? 0;

    // Safe response — no userId, email, name, googleId, or session _id
    return res.json({
      mode: session.mode,
      overallScore,
      sessionDate: session.updatedAt || session.createdAt,
      questionCount: questions.length,
      questions,
      engagementSummary: session.engagementSummary || null,
    });
  } catch (err) {
    logger.error(`Shared report error: ${err.message}`);
    next(err);
  }
};

/**
 * POST /api/reports/interview-summary
 * Body: { sessionId }
 * Generates a synthesized interview summary from individual question evaluations.
 */
export const getInterviewSummary = async (req, res, next) => {
  try {
    const authenticatedUser = req.user;
    if (!authenticatedUser) {
      return res.status(401).json({ code: 401, message: 'Authentication required' });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ code: 400, message: 'sessionId is required' });
    }

    const session = await Session.findOne({
      _id: sessionId,
      userId: String(authenticatedUser._id),
    });

    if (!session) {
      return res.status(404).json({ code: 404, message: 'Session not found' });
    }

    const questions = (session.questions || []).map((q) => ({
      questionText: q.questionText || '',
      topic: q.topic || '',
      score: q.evaluation?.score ?? null,
      strength: q.evaluation?.strength || '',
      missing: q.evaluation?.missing || '',
      improvement: q.evaluation?.improvement || '',
      evidence: q.evaluation?.evidence || [],
    }));

    // Load JD context if available
    let jdContext = {};
    if (session.jdSnapshot?.jdAnalysisId) {
      const jd = await JDAnalysis.findById(session.jdSnapshot.jdAnalysisId).catch(() => null);
      if (jd) {
        jdContext = { role: jd.role || '', skills: jd.skills || [] };
      }
    }

    const summary = await generateInterviewSummary({
      questions,
      mode: session.mode || 'behavioral',
      overallScore: session.overallScore ?? 0,
      jdContext,
    });

    return res.json({ summary });
  } catch (err) {
    logger.error(`Interview summary error: ${err.message}`);
    next(err);
  }
};

export default { generateShareToken, getSharedReport, getInterviewSummary };
