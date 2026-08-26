// backend/src/controllers/technical.controller.js
// Technical Q&A interview controller — handles question retrieval, answer processing,
// adaptive difficulty, and incremental session persistence.
// Calls scoring.js for evaluation (Rules §5: only scoring.js constructs evaluations).

import Session from '../models/Session.model.js';
import JDAnalysis from '../models/JDAnalysis.model.js';
import { retrieveTechnicalQuestions, getRandomTechnicalQuestion } from '../services/retrieval.js';
import { evaluateTechnicalAnswer } from '../services/scoring.js';
import { nextDifficulty } from '../services/difficultyEngine.js';
import logger from '../utils/logger.js';

const MAX_QUESTIONS = 5; // technical interview length
const FOLLOW_UP_SCORE_THRESHOLD = 50;

/**
 * Build a technical follow-up based on the weakest rubric dimension.
 */
const buildTechnicalFollowUp = (evaluation, question) => {
  const dims = evaluation.dimensions || {};
  const keys = Object.keys(dims).filter((k) => typeof dims[k] === 'number');
  if (keys.length === 0) {
    return 'Can you elaborate more on that with a specific example?';
  }

  // Find the weakest dimension
  keys.sort((a, b) => dims[a] - dims[b]);
  const weakest = keys[0];

  const prompts = {
    correctness: 'Can you verify that explanation with a concrete example?',
    depth: 'Can you go one level deeper — what are the underlying mechanics?',
    practical: 'How would you apply this in a real production system?',
    relevance: 'How does this relate specifically to the role requirements?',
    communication: 'Can you rephrase that more concisely?',
    reasoning: 'What was your reasoning process for arriving at that conclusion?',
  };

  return prompts[weakest] || 'Can you elaborate more on that with a specific example?';
};

/**
 * Load JD analysis for the session.
 */
const loadJdAnalysis = async (session) => {
  if (session.jdSnapshot?.jdAnalysisId) {
    const jd = await JDAnalysis.findById(session.jdSnapshot.jdAnalysisId);
    if (jd) return jd;
  }
  return { technicalFocus: [], skills: [], keywords: [] };
};

/**
 * Get the first technical question for a session.
 */
const getFirstQuestion = async (session, jdAnalysis) => {
  const questions = retrieveTechnicalQuestions({
    jdAnalysis,
    excludeIds: [],
    limit: 1,
  });

  if (questions.length === 0) {
    const q = getRandomTechnicalQuestion({ excludeIds: [] });
    return q || null;
  }

  return questions[0];
};

/**
 * Get the next technical question, considering adaptive difficulty.
 */
const getNextQuestion = async (session, jdAnalysis, skillHistory) => {
  const excludeIds = session.questions.map((q) => q.questionId);

  // Determine the next difficulty based on the last answer
  const lastQuestion = session.questions[session.questions.length - 1];
  const lastScore = lastQuestion?.evaluation?.score;
  const currentDifficulty = lastQuestion?.difficulty || 'medium';

  // Pick the skill for the next question — rotate through JD skills
  const jdSkills = jdAnalysis.technicalFocus?.length
    ? jdAnalysis.technicalFocus
    : jdAnalysis.skills?.length
      ? jdAnalysis.skills
      : [];

  // Find a skill that hasn't been asked recently, or cycle through
  let targetSkill = null;
  if (jdSkills.length > 0) {
    const askedSkills = session.questions.map((q) => q.topic).filter(Boolean);
    const unaskedSkills = jdSkills.filter(
      (s) => !askedSkills.includes(s) || askedSkills.filter((a) => a === s).length < 2
    );
    targetSkill = unaskedSkills.length > 0 ? unaskedSkills[0] : jdSkills[session.questions.length % jdSkills.length];
  }

  // Compute next difficulty if we have a score — ALWAYS call engine regardless of targetSkill
  let nextDiff = currentDifficulty;
  let updatedSkillHistory = skillHistory;

  if (typeof lastScore === 'number') {
    const engineSkill = targetSkill || lastQuestion?.topic || 'general';
    const result = nextDifficulty({
      currentDifficulty,
      lastScore,
      skillHistory,
      skill: engineSkill,
    });
    nextDiff = result.nextDifficulty;
    updatedSkillHistory = result.updatedSkillHistory;
  }

  // Try to retrieve a question matching the target skill and difficulty
  let questions = [];
  if (targetSkill) {
    questions = retrieveTechnicalQuestions({
      jdAnalysis,
      excludeIds,
      skill: targetSkill,
      difficulty: nextDiff,
      limit: 1,
    });
  }

  // Fallback: try without skill filter
  if (questions.length === 0) {
    questions = retrieveTechnicalQuestions({
      jdAnalysis,
      excludeIds,
      difficulty: nextDiff,
      limit: 1,
    });
  }

  // Fallback: try without difficulty filter
  if (questions.length === 0) {
    questions = retrieveTechnicalQuestions({
      jdAnalysis,
      excludeIds,
      limit: 1,
    });
  }

  // Final fallback: random
  if (questions.length === 0) {
    const q = getRandomTechnicalQuestion({ excludeIds, difficulty: nextDiff });
    if (q) return { question: q, nextDifficulty: nextDiff, updatedSkillHistory };
    const anyQ = getRandomTechnicalQuestion({ excludeIds });
    if (anyQ) return { question: anyQ, nextDifficulty: nextDiff, updatedSkillHistory };
    return null;
  }

  return { question: questions[0], nextDifficulty: nextDiff, updatedSkillHistory };
};

/**
 * Handle technical answer submission.
 */
export const answerTechnical = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Mode guard: fall through to next handler if not technical
    if (session.mode !== 'technical') {
      return next();
    }

    const { questionId, transcript } = req.body;

    // Read skill history from session metadata (persisted across answers)
    const skillHistory = session.metadata?.skillHistory || {};

    // ─── First call: retrieve and return the first question ──────────
    if (session.questions.length === 0) {
      const jdAnalysis = await loadJdAnalysis(session);
      const question = await getFirstQuestion(session, jdAnalysis);
      if (!question) {
        return res.status(500).json({ error: 'No technical questions available' });
      }

      session.questions.push({
        questionId: question.id,
        questionText: question.text,
        topic: question.skill,
        difficulty: question.difficulty,
        transcript: '',
        followUps: [],
        evaluation: null,
      });

      await session.save();

      return res.json({
        evaluation: null,
        nextAction: 'first_question',
        nextQuestion: {
          questionId: session.questions[0].questionId,
          questionText: question.text,
          topic: question.skill,
          difficulty: question.difficulty,
        },
      });
    }

    // ─── Subsequent calls: process the answer ────────────────────────
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const currentQuestion = session.questions[session.questions.length - 1];

    // Check for pending follow-up answer
    const lastFollowUp = currentQuestion.followUps[currentQuestion.followUps.length - 1];
    const isFollowUpPending =
      Boolean(currentQuestion.evaluation) &&
      currentQuestion.followUps.length > 0 &&
      String(lastFollowUp).startsWith('Q:');

    if (isFollowUpPending) {
      currentQuestion.followUps.push(`A: ${transcript}`);
      await session.save();
      return finalizeTechnicalQuestion(session, currentQuestion.evaluation, res);
    }

    // Defensive: question already closed — advance
    if (currentQuestion.evaluation) {
      return finalizeTechnicalQuestion(session, currentQuestion.evaluation, res);
    }

    // ─── Score the answer via scoring.js (single evaluation factory) ──
    const questionData = {
      text: currentQuestion.questionText,
      skill: currentQuestion.topic,
      rubric: {
        correctness: 'Technical accuracy of the explanation',
        depth: 'Depth of understanding beyond surface-level',
        practical: 'Ability to apply concepts in real scenarios',
        communication: 'Clarity and structure of the explanation',
      },
    };

    const evaluation = await evaluateTechnicalAnswer({ question: questionData, transcript });

    currentQuestion.transcript = transcript;
    currentQuestion.evaluation = evaluation;

    // Adaptive follow-up (once): low score → targeted coaching follow-up
    if (
      evaluation.score < FOLLOW_UP_SCORE_THRESHOLD &&
      currentQuestion.followUps.length === 0
    ) {
      const followUpText = buildTechnicalFollowUp(evaluation, questionData);
      currentQuestion.followUps.push(`Q: ${followUpText}`);
      await session.save();
      return res.json({ evaluation: null, nextAction: 'followup', followUp: followUpText });
    }

    return finalizeTechnicalQuestion(session, evaluation, res);
  } catch (err) {
    logger.error(`Technical answer error: ${err.message}`);
    next(err);
  }
};

/**
 * Finalize the current question and advance to the next one (or complete).
 */
const finalizeTechnicalQuestion = async (session, evaluation, res) => {
  if (session.questions.length >= MAX_QUESTIONS) {
    return completeTechnicalSession(session, evaluation, res);
  }

  const jdAnalysis = await loadJdAnalysis(session);
  const skillHistory = session.metadata?.skillHistory || {};

  const result = await getNextQuestion(session, jdAnalysis, skillHistory);
  if (!result) {
    return completeTechnicalSession(session, evaluation, res);
  }

  const { question, nextDifficulty, updatedSkillHistory } = result;

  // Persist the question
  session.questions.push({
    questionId: question.id,
    questionText: question.text,
    topic: question.skill,
    difficulty: nextDifficulty,
    transcript: '',
    followUps: [],
    evaluation: null,
  });

  // Persist updated skill history in session metadata
  if (!session.metadata) session.metadata = {};
  session.metadata.skillHistory = updatedSkillHistory;

  await session.save();

  return res.json({
    evaluation,
    nextAction: 'next_question',
    nextQuestion: {
      questionId: question.id,
      questionText: question.text,
      topic: question.skill,
      difficulty: nextDifficulty,
    },
    difficultyChange: {
      from: session.questions[session.questions.length - 2]?.difficulty,
      to: nextDifficulty,
    },
  });
};

/**
 * Complete the technical session with an overall score.
 */
const completeTechnicalSession = async (session, evaluation, res) => {
  session.status = 'completed';
  session.overallScore = Math.round(
    session.questions.reduce((sum, q) => sum + (q.evaluation?.score || 0), 0) /
      session.questions.length
  );
  await session.save();
  return res.json({ evaluation, nextAction: 'complete' });
};

export default { answerTechnical };
