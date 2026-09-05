// backend/src/controllers/technical.controller.js
// Technical Q&A interview controller — handles question retrieval, answer processing,
// adaptive difficulty, and incremental session persistence.
// Calls scoring.js for evaluation (Rules §5: only scoring.js constructs evaluations).

import Session from '../models/Session.model.js';
import JDAnalysis from '../models/JDAnalysis.model.js';
import { retrieveTechnicalQuestions, getRandomTechnicalQuestion } from '../services/retrieval.js';
import { evaluateTechnicalAnswer, INVALID_EVALUATION } from '../services/scoring.js';
import { nextDifficulty } from '../services/difficultyEngine.js';
import { detectAnswerLanguage, translateQuestionText } from '../services/bilingual.js';
import {
  INVALID_ANSWER_MESSAGE,
  MAX_INVALID_ATTEMPTS,
  isInvalidAnswer,
  detectProfanity,
  resetInvalidAttempts,
} from '../services/answerQuality.js';
import { completeSession } from '../services/sessionUtils.js';
import { buildTechnicalFollowUp, buildAIContextualFollowUp } from '../services/followUpEngine.js';
import logger from '../utils/logger.js';

const MAX_QUESTIONS = 5; // technical interview length
const FOLLOW_UP_SCORE_THRESHOLD = 50;

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
  const sessionSeed = session.metadata?.sessionSeed || 0;
  const questions = retrieveTechnicalQuestions({
    jdAnalysis,
    excludeIds: [],
    limit: 1,
    randomize: true,
    sessionSeed,
  });

  if (questions.length === 0) {
    const q = getRandomTechnicalQuestion({ excludeIds: [] });
    return q || null;
  }

  return questions[0];
};

/**
 * Get the next technical question, considering adaptive difficulty.
 * Returns null if MAX_QUESTIONS has been reached.
 */
const getNextQuestion = async (session, jdAnalysis, skillHistory) => {
  // Strict limit check: never retrieve more than MAX_QUESTIONS
  if (session.questions.length >= MAX_QUESTIONS) {
    logger.debug(`Max questions (${MAX_QUESTIONS}) reached. Not retrieving more.`);
    return null;
  }

  const excludeIds = session.questions.map((q) => q.questionId);
  const sessionSeed = session.metadata?.sessionSeed || 0;

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
      randomize: true,
      sessionSeed,
    });
  }

  // Fallback: try without skill filter
  if (questions.length === 0) {
    questions = retrieveTechnicalQuestions({
      jdAnalysis,
      excludeIds,
      difficulty: nextDiff,
      limit: 1,
      randomize: true,
      sessionSeed,
    });
  }

  // Fallback: try without difficulty filter
  if (questions.length === 0) {
    questions = retrieveTechnicalQuestions({
      jdAnalysis,
      excludeIds,
      limit: 1,
      randomize: true,
      sessionSeed,
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
      return res.status(404).json({ code: 404, message: 'Session not found' });
    }

    // Mode guard: fall through to next handler if not technical
    if (session.mode !== 'technical') {
      return next();
    }

    const { questionId, transcript, language } = req.body;
    const activeLanguage = language || 'english';

    // Store language preference in session metadata
    if (!session.metadata) session.metadata = {};
    session.metadata.language = activeLanguage;

    // Read skill history from session metadata (persisted across answers)
    const skillHistory = session.metadata?.skillHistory || {};

    // ─── First call: retrieve and return the first question ──────────
    if (session.questions.length === 0) {
      const jdAnalysis = await loadJdAnalysis(session);
      const question = await getFirstQuestion(session, jdAnalysis);
      if (!question) {
        return res.status(500).json({ code: 500, message: 'No technical questions available' });
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

      // Auto-translate question if Urdu mode
      let translatedQuestionText = null;
      if (activeLanguage === 'urdu') {
        try {
          const translation = await translateQuestionText(question.text, [], 'urdu');
          translatedQuestionText = translation.questionText;
        } catch (err) {
          logger.warn(`Failed to translate first technical question to Urdu: ${err.message}`);
        }
      }

      return res.json({
        evaluation: null,
        nextAction: 'first_question',
        nextQuestion: {
          questionId: session.questions[0].questionId,
          questionText: question.text,
          translatedQuestionText,
          topic: question.skill,
          difficulty: question.difficulty,
          matchedTerms: question.matchedTerms || [],
        },
      });
    }

    // ─── Subsequent calls: process the answer ───────────────────────
    if (!transcript) {
      return res.status(400).json({ code: 400, message: 'Transcript is required' });
    }

    // Profanity check — terminate interview if detected
    const profaneWord = detectProfanity(transcript);
    if (profaneWord) {
      session.status = 'terminated';
      session.overallScore = 0;
      await session.save();
      return res.json({
        evaluation: null,
        nextAction: 'complete',
        terminationReason: 'profanity',
        message: 'Interview terminated: Inappropriate language detected. Please maintain professional conduct during the interview.',
      });
    }

    const currentQuestion = session.questions[session.questions.length - 1];

    // Check for pending follow-up answer
    const lastFollowUp = currentQuestion.followUps[currentQuestion.followUps.length - 1];
    const isFollowUpPending =
      Boolean(currentQuestion.evaluation) &&
      currentQuestion.followUps.length > 0 &&
      String(lastFollowUp).startsWith('Q:');

    if (isFollowUpPending) {
      if (isInvalidAnswer(transcript)) {
        // Flag invalid and move to next question with the feedback message.
        currentQuestion.followUps.push('A: (No valid answer provided)');
        await session.save();
        return finalizeTechnicalQuestion(session, currentQuestion.evaluation, res, { nudge: INVALID_ANSWER_MESSAGE });
      }
      currentQuestion.followUps.push(`A: ${transcript}`);
      await session.save();
      return finalizeTechnicalQuestion(session, currentQuestion.evaluation, res);
    }

    // Defensive: question already closed — advance
    if (currentQuestion.evaluation) {
      return finalizeTechnicalQuestion(session, currentQuestion.evaluation, res);
    }

    // Main answer — no scoring until a valid, substantive answer arrives.
    if (isInvalidAnswer(transcript)) {
      // Flag invalid immediately and move to next question with the feedback message.
      const evaluation = INVALID_EVALUATION;
      currentQuestion.transcript = transcript;
      currentQuestion.evaluation = evaluation;
      // Mark the nested evaluation as modified so Mongoose persists it correctly
      session.markModified(`questions.${session.questions.length - 1}.evaluation`);
      await session.save();
      return finalizeTechnicalQuestion(session, evaluation, res, { nudge: INVALID_ANSWER_MESSAGE });
    }

    // Valid answer — reset counter and score via scoring.js (single evaluation factory).
    resetInvalidAttempts(session);

    // Build JD context for scoring — pass role, skills, keywords for role-specific evaluation
    const jdAnalysis = await loadJdAnalysis(session);
    const jdContext = {
      role: jdAnalysis.role || jdAnalysis.jdSnapshot?.role || '',
      skills: jdAnalysis.technicalFocus?.length ? jdAnalysis.technicalFocus : (jdAnalysis.skills || []),
      keywords: jdAnalysis.keywords || [],
    };

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

    const evaluation = await evaluateTechnicalAnswer({ question: questionData, transcript, language: activeLanguage, jdContext });

    // Detect answer language for Urdu auto-translation
    const langDetection = detectAnswerLanguage(transcript);
    session.metadata.lastAnswerLanguage = langDetection.detectedLanguage;
    session.metadata.languageConfidence = langDetection.confidence;

    currentQuestion.transcript = transcript;
    currentQuestion.evaluation = evaluation;
    // Mark the nested evaluation as modified so Mongoose persists it correctly
    session.markModified(`questions.${session.questions.length - 1}.evaluation`);

    // Adaptive follow-up (once): low score → AI-powered contextual coaching follow-up
    if (
      evaluation.score < FOLLOW_UP_SCORE_THRESHOLD &&
      currentQuestion.followUps.length === 0
    ) {
      // Use AI-powered contextual follow-up that references the candidate's answer
      const followUpText = await buildAIContextualFollowUp({
        evaluation,
        question: questionData,
        transcript,
        jdContext,
      });
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
 * @param {Object} extra - Optional extra fields to include in the response (e.g., nudge message)
 */
const finalizeTechnicalQuestion = async (session, evaluation, res, extra = {}) => {
  resetInvalidAttempts(session);

  // IMPORTANT: Save the session BEFORE pushing the new question to ensure
  // the current question's evaluation is persisted correctly.
  await session.save();

  // Strict check: if we've reached MAX_QUESTIONS, complete the session
  if (session.questions.length >= MAX_QUESTIONS) {
    logger.info(`Technical session completed: ${session.questions.length} questions answered.`);
    return completeSession(session, evaluation, res);
  }

  const jdAnalysis = await loadJdAnalysis(session);
  const skillHistory = session.metadata?.skillHistory || {};

  const result = await getNextQuestion(session, jdAnalysis, skillHistory);
  if (!result) {
    return completeSession(session, evaluation, res);
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

  await session.save(); // Save again with the new question

  // Auto-translate next question if language is Urdu
  let questionText = question.text;
  let translatedQuestion = null;
  const sessionLanguage = session.metadata?.language;
  
  if (sessionLanguage === 'urdu') {
    try {
      const translation = await translateQuestionText(question.text, [], 'urdu');
      questionText = translation.questionText;
      translatedQuestion = translation.questionText;
    } catch (err) {
      logger.warn(`Failed to translate question to Urdu: ${err.message}`);
    }
  }

  return res.json({
    evaluation,
    nextAction: 'next_question',
    nextQuestion: {
      questionId: question.id,
      questionText: question.text,
      translatedQuestionText: translatedQuestion,
      topic: question.skill,
      difficulty: nextDifficulty,
      matchedTerms: question.matchedTerms || [],
    },
    difficultyChange: {
      from: session.questions[session.questions.length - 2]?.difficulty,
      to: nextDifficulty,
    },
    ...extra,
    detectedLanguage: sessionLanguage,
    languageConfidence: 1,
  });
};

export default { answerTechnical };
