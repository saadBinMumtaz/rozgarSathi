// backend/src/controllers/coding.controller.js
// Live coding interview controller — Day 4.
// Question selection from the curated data/coding-questions.json bank (never
// generated live), sandboxed execution via services/codeExecutor.js, and
// evaluation via services/scoring.js (Rules §5: only scoring.js constructs
// evaluation objects). Raw stack traces never leave codeExecutor.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Session from '../models/Session.model.js';
import { evaluateCodingSubmission } from '../services/scoring.js';
import { runCode, withSessionQueue } from '../services/codeExecutor.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Curated question bank (loaded once at boot, never generated live) ------
let codingBank = [];
try {
  const raw = fs.readFileSync(path.join(__dirname, '../data/coding-questions.json'), 'utf-8');
  codingBank = JSON.parse(raw).map((q, index) => ({ ...q, id: `cq-${index}` }));
  logger.info(`Loaded ${codingBank.length} coding questions from bank`);
} catch (err) {
  logger.error(`Failed to load coding questions: ${err.message}`);
  codingBank = [];
}

/**
 * Link the selected question to the coding session so /run and /submit can
 * resolve it. Persists the question entry (incremental save, per Master
 * Context §7 "save on every step").
 */
const linkQuestionToSession = async (sessionId, question) => {
  console.log('[linkQuestionToSession] sessionId:', sessionId, 'question.id:', question?.id);
  if (!sessionId) {
    console.log('[linkQuestionToSession] SKIP: no sessionId');
    return;
  }
  const session = await Session.findById(sessionId).catch(() => null);
  if (!session) {
    console.log('[linkQuestionToSession] SKIP: session not found');
    return;
  }
  // Mongoose Mixed type fix: replace entire metadata object to ensure change tracking
  session.metadata = {
    ...(session.metadata || {}),
    codingQuestionId: question.id,
  };

  const existing = session.questions.find((q) => q.questionId === question.id);
  if (!existing) {
    session.questions.push({
      questionId: question.id,
      questionText: question.title,
      topic: question.topic,
      difficulty: question.difficulty,
      transcript: '',
      followUps: [],
      evaluation: null,
    });
  }
  try {
    await session.save();
    console.log('[linkQuestionToSession] SUCCESS: linked', question.id, 'to session', sessionId);
  } catch (err) {
    console.error('[linkQuestionToSession] SAVE FAILED:', err.message);
    throw err;
  }
};

/**
 * POST /api/coding/questions
 * Request: { topic?, difficulty?, questionId?, sessionId? }
 * Response: CodingQuestion object (Section 7 schema)
 */
export const getCodingQuestion = async (req, res, next) => {
  try {
    const { topic, difficulty, questionId, sessionId } = req.body || {};
    console.log('[getCodingQuestion] Request body:', { topic, difficulty, questionId, sessionId });

    if (codingBank.length === 0) {
      return res.status(500).json({ error: 'No coding questions available' });
    }

    let question = null;
    if (questionId) {
      question = codingBank.find((q) => q.id === questionId) || null;
    }
    if (!question) {
      const filtered = codingBank.filter(
        (q) => (!topic || q.topic === topic) && (!difficulty || q.difficulty === difficulty)
      );
      const pool = filtered.length > 0 ? filtered : codingBank;
      question = pool[Math.floor(Math.random() * pool.length)];
    }

    console.log('[getCodingQuestion] Selected question:', question.id, 'for sessionId:', sessionId);
    try {
      await linkQuestionToSession(sessionId, question);
    } catch (err) {
      console.error('[getCodingQuestion] Failed to link question to session:', err.message);
      // Don't fail the request — the question is still returned, but linking failed
    }
    return res.json(question);
  } catch (err) {
    next(err);
  }
};

/**
 * Resolve the session + its linked coding question, or return a shaped 400.
 */
const loadSessionQuestion = async (req, res) => {
  const { sessionId } = req.body || {};
  console.log('[loadSessionQuestion] sessionId:', sessionId);
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return null;
  }
  const session = await Session.findById(sessionId).catch(() => null);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return null;
  }
  const questionId = session.metadata?.codingQuestionId;
  console.log('[loadSessionQuestion] session.metadata:', session.metadata);
  console.log('[loadSessionQuestion] questionId:', questionId);
  const question = codingBank.find((q) => q.id === questionId);
  if (!question) {
    res.status(400).json({ error: 'No coding question linked to this session — fetch one via POST /api/coding/questions first.' });
    return null;
  }
  return { session, question };
};

/**
 * Execute one test set for the session's question (serialized per session).
 */
const executeTests = async (sessionId, question, code, language, tests) =>
  withSessionQueue(sessionId, () =>
    runCode({
      code,
      language: language || 'javascript',
      tests,
      starterCode: question.starterCode,
    })
  );

/**
 * POST /api/coding/run
 * Request: { sessionId, code, language }
 * Response: { publicTestResults: [{input, expected, actual, passed}], executionError }
 */
export const runTests = async (req, res, next) => {
  try {
    const pair = await loadSessionQuestion(req, res);
    if (!pair) return;
    const { session, question } = pair;
    const { code, language } = req.body;

    const outcome = await executeTests(session._id.toString(), question, code, language, question.publicTests);

    if (outcome.fatalError) {
      return res.json({ publicTestResults: outcome.results, executionError: outcome.fatalError });
    }
    return res.json({ publicTestResults: outcome.results, executionError: null });
  } catch (err) {
    logger.error(`Coding run error: ${err.message}`);
    next(err);
  }
};

/**
 * POST /api/coding/submit
 * Request: { sessionId, code, language }
 * Response: { hiddenTestResults, evaluation, executionError }
 */
export const submitSolution = async (req, res, next) => {
  try {
    const pair = await loadSessionQuestion(req, res);
    if (!pair) return;
    const { session, question } = pair;
    const { code, language } = req.body;

    const outcome = await executeTests(session._id.toString(), question, code, language, question.hiddenTests);

    if (outcome.fatalError) {
      return res.json({ hiddenTestResults: outcome.results, evaluation: null, executionError: outcome.fatalError });
    }

    // Evaluation is constructed ONLY in scoring.js (Rules §5).
    const evaluation = evaluateCodingSubmission({
      hiddenResults: outcome.results,
      code: code || '',
    });

    // Persist submission + close the coding session (one question per session).
    const entry = session.questions.find((q) => q.questionId === question.id);
    if (entry) {
      entry.transcript = code;
      entry.evaluation = evaluation;
    }
    session.status = 'completed';
    session.overallScore = evaluation.score;
    await session.save();

    return res.json({ hiddenTestResults: outcome.results, evaluation, executionError: null });
  } catch (err) {
    logger.error(`Coding submit error: ${err.message}`);
    next(err);
  }
};

export default { getCodingQuestion, runTests, submitSolution };
