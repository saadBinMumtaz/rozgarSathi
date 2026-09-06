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
import JDAnalysis from '../models/JDAnalysis.model.js';
import { evaluateCodingSubmission, evaluateProbeAnswer, generateCodingFeedback } from '../services/scoring.js';
import { runCode, withSessionQueue } from '../services/codeExecutor.js';
import { buildInterviewProfile } from '../services/interviewProfile.js';
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
 *
 * Uses direct mutation + markModified to ensure Mongoose tracks the change
 * on the Mixed-type metadata field, and findOneAndUpdate as a fallback if
 * save() fails (e.g. version-key conflict).
 */
const linkQuestionToSession = async (sessionId, question) => {
  logger.debug(`[linkQuestionToSession] sessionId: ${sessionId}, question.id: ${question?.id}`);
  if (!sessionId) {
    logger.debug('[linkQuestionToSession] SKIP: no sessionId');
    return;
  }
  const session = await Session.findById(sessionId).catch(() => null);
  if (!session) {
    logger.debug('[linkQuestionToSession] SKIP: session not found');
    return;
  }

  // Directly mutate the metadata object so Mongoose's internal reference
  // sees the change, then explicitly mark it modified for save().
  if (!session.metadata) session.metadata = {};
  session.metadata.codingQuestionId = question.id;
  session.markModified('metadata');

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
    logger.debug(`[linkQuestionToSession] SUCCESS: linked ${question.id} to session ${sessionId}`);
  } catch (err) {
    logger.warn(`[linkQuestionToSession] SAVE FAILED: ${err.message} — trying findOneAndUpdate fallback`);
    // Fallback: use atomic update to guarantee persistence
    try {
      await Session.findOneAndUpdate(
        { _id: sessionId },
        {
          $set: { 'metadata.codingQuestionId': question.id },
          $addToSet: {
            questions: {
              questionId: question.id,
              questionText: question.title,
              topic: question.topic,
              difficulty: question.difficulty,
              transcript: '',
              followUps: [],
              evaluation: null,
            },
          },
        }
      );
      logger.debug('[linkQuestionToSession] FALLBACK SUCCESS');
    } catch (fallbackErr) {
      logger.error(`[linkQuestionToSession] FALLBACK FAILED: ${fallbackErr.message}`);
      throw fallbackErr;
    }
  }
};

/**
 * POST /api/coding/probes
 * Return the scripted interviewerProbes for the session's linked question.
 * Probes are pulled from coding-questions.json — never freestyle-generated
 * by an LLM mid-session (Master Context §11 Day 5).
 * Request: { sessionId, persona? }
 * Response: { probes: [String], persona: String }
 */
export const getProbes = async (req, res, next) => {
  try {
    const pair = await loadSessionQuestion(req, res);
    if (!pair) return;
    const { question } = pair;
    const persona = req.body?.persona || 'friendly';

    const probes = question.interviewerProbes || [];
    return res.json({ probes, persona });
  } catch (err) {
    logger.error(`Coding probes error: ${err.message}`);
    next(err);
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
    logger.debug(`[getCodingQuestion] Request: topic=${topic}, difficulty=${difficulty}, questionId=${questionId}, sessionId=${sessionId}`);

    if (codingBank.length === 0) {
      return res.status(500).json({ code: 500, message: 'No coding questions available' });
    }

    let question = null;
    if (questionId) {
      question = codingBank.find((q) => q.id === questionId) || null;
    }
    if (!question) {
      // Load JD analysis from session for role-aware question selection
      let interviewProfile = null;
      if (sessionId) {
        try {
          const session = await Session.findById(sessionId);
          if (session?.jdSnapshot?.jdAnalysisId) {
            const jd = await JDAnalysis.findById(session.jdSnapshot.jdAnalysisId);
            if (jd) interviewProfile = buildInterviewProfile(jd);
          }
        } catch (jdErr) {
          logger.warn(`Failed to load JD for coding question selection: ${jdErr.message}`);
        }
      }

      let filtered = codingBank.filter(
        (q) => (!topic || q.topic === topic) && (!difficulty || q.difficulty === difficulty)
      );

      // If we have a JD profile and no explicit topic filter, prefer questions
      // whose topics align with the JD's primary/related skills
      if (interviewProfile && interviewProfile.role && !topic) {
        const primaryTopics = interviewProfile.primarySkills || [];
        const relatedTopics = interviewProfile.relatedSkills || [];
        const allRelevant = [...primaryTopics, ...relatedTopics].map(t => t.toLowerCase());

        // Score each question by JD relevance
        const scored = filtered.map(q => {
          const qTopic = (q.topic || '').toLowerCase();
          const qTitle = (q.title || '').toLowerCase();
          let relevanceBoost = 0;
          // Check if question topic/title mentions JD-relevant terms
          for (const term of allRelevant) {
            if (term.length > 2 && (qTopic.includes(term) || qTitle.includes(term))) {
              relevanceBoost += 1;
            }
          }
          return { question: q, boost: relevanceBoost };
        });

        // Prefer higher-relevance questions, with randomness for variety
        const boosted = scored.filter(s => s.boost > 0);
        const pool = boosted.length > 0 ? boosted : scored;
        question = pool[Math.floor(Math.random() * pool.length)].question;
      } else {
        const pool = filtered.length > 0 ? filtered : codingBank;
        question = pool[Math.floor(Math.random() * pool.length)];
      }
    }

    logger.debug(`[getCodingQuestion] Selected question: ${question.id} for sessionId: ${sessionId}`);
    try {
      await linkQuestionToSession(sessionId, question);
    } catch (err) {
      logger.warn(`[getCodingQuestion] Failed to link question to session: ${err.message}`);
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
  logger.debug(`[loadSessionQuestion] sessionId: ${sessionId}`);
  if (!sessionId) {
    res.status(400).json({ code: 400, message: 'sessionId is required' });
    return null;
  }
  const session = await Session.findById(sessionId).catch(() => null);
  if (!session) {
    res.status(404).json({ code: 404, message: 'Session not found' });
    return null;
  }
  const questionId = session.metadata?.codingQuestionId;
  logger.debug(`[loadSessionQuestion] metadata: ${JSON.stringify(session.metadata)}, questionId: ${questionId}`);
  const question = codingBank.find((q) => q.id === questionId);
  if (!question) {
    logger.error(`[loadSessionQuestion] FAILED: questionId ${questionId} not found in codingBank (size: ${codingBank.length})`);
    res.status(400).json({ code: 400, message: 'No coding question linked to this session — fetch one via POST /api/coding/questions first.' });
    return null;
  }
  logger.debug(`[loadSessionQuestion] SUCCESS: loaded question ${question.id} (${question.title})`);
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

    // Build the enhanced coding report (Day 5 — correctness/complexity/code quality/reasoning)
    const dims = evaluation.dimensions || {};
    const codingReport = {
      correctness: dims.correctness ?? 0,
      complexity: dims.completeness ?? 0,
      codeQuality: dims.codeQuality ?? 0,
      reasoning: Math.round((dims.correctness + dims.codeQuality) / 2) || 0,
    };

    // Generate qualitative LLM feedback (does NOT affect score — purely for display)
    let codingFeedback = {};
    try {
      codingFeedback = await generateCodingFeedback({
        code: code || '',
        evaluation,
        question: { title: question.title, topic: question.topic, difficulty: question.difficulty },
      });
    } catch (fbErr) {
      logger.warn(`Coding feedback generation failed: ${fbErr.message}`);
    }

    return res.json({
      hiddenTestResults: outcome.results,
      evaluation,
      executionError: null,
      codingReport,
      codingFeedback,
    });
  } catch (err) {
    logger.error(`Coding submit error: ${err.message}`);
    next(err);
  }
};

/**
 * POST /api/coding/probes/evaluate
 * Evaluate a candidate's answer to a probe question during practice mode.
 * Request: { sessionId, probeText, answer, questionTitle?, language? }
 * Response: evaluation object (constructed by scoring.js per Rules §5)
 */
export const evaluateProbe = async (req, res, next) => {
  try {
    const { probeText, answer, questionTitle, language } = req.body || {};
    if (!probeText || !answer) {
      return res.status(400).json({ code: 400, message: 'probeText and answer are required' });
    }

    const evaluation = await evaluateProbeAnswer({
      probeText,
      answer,
      questionTitle: questionTitle || '',
      language: language || 'english',
    });

    return res.json({ evaluation });
  } catch (err) {
    logger.error(`Coding probe evaluation error: ${err.message}`);
    next(err);
  }
};

export default { getCodingQuestion, runTests, submitSolution, getProbes, evaluateProbe };
