// backend/src/controllers/behavioral.controller.js
// Behavioral interview controller — handles question retrieval, answer processing,
// follow-ups, and incremental session persistence.

import Session from '../models/Session.model.js';
import JDAnalysis from '../models/JDAnalysis.model.js';
import { retrieveBehavioralQuestions, getRandomQuestion } from '../services/retrieval.js';
import { evaluateBehavioralAnswer, INVALID_EVALUATION } from '../services/scoring.js';
import { detectAnswerLanguage, translateQuestionText } from '../services/bilingual.js';
import {
  INVALID_ANSWER_MESSAGE,
  MAX_INVALID_ATTEMPTS,
  isInvalidAnswer,
  detectProfanity,
  resetInvalidAttempts,
} from '../services/answerQuality.js';
import { completeSession } from '../services/sessionUtils.js';
import { buildStarFollowUp } from '../services/followUpEngine.js';
import logger from '../utils/logger.js';

const FOLLOW_UP_SCORE_THRESHOLD = 50;
const MAX_QUESTIONS = 5; // behavioral interview length

// INVALID_EVALUATION is now imported from scoring.js (Rules §5: only scoring.js constructs evaluations)

/**
 * Close the current question and advance to the next one (or complete).
 * @param {Object} extra - Optional extra fields to include in the response (e.g., nudge message)
 */
const finalizeQuestion = async (session, evaluation, res, extra = {}) => {
  resetInvalidAttempts(session);

  // IMPORTANT: Save the session BEFORE pushing the new question to ensure
  // the current question's evaluation is persisted correctly.
  await session.save();

  if (session.questions.length >= MAX_QUESTIONS) {
    return completeSession(session, evaluation, res);
  }

  const nextQ = await getNextQuestion(session);
  if (!nextQ) {
    return completeSession(session, evaluation, res);
  }

  session.questions.push({
    questionId: nextQ.id,
    questionText: nextQ.text,
    topic: nextQ.topic,
    difficulty: nextQ.difficulty,
    transcript: '',
    followUps: [],
    evaluation: null,
  });

  await session.save(); // Save again with the new question

  // Auto-translate next question if language is Urdu
  let translatedQuestion = null;
  const sessionLanguage = session.metadata?.language;
  
  if (sessionLanguage === 'urdu') {
    try {
      const translation = await translateQuestionText(nextQ.text, [], 'urdu');
      translatedQuestion = translation.questionText;
    } catch (err) {
      logger.warn(`Failed to translate question to Urdu: ${err.message}`);
    }
  }

  return res.json({
    evaluation,
    nextAction: 'next_question',
    nextQuestion: {
      questionId: nextQ.id,
      questionText: nextQ.text,
      translatedQuestionText: translatedQuestion,
      topic: nextQ.topic,
      difficulty: nextQ.difficulty,
      matchedTerms: nextQ.matchedTerms || [],
    },
    ...extra,
    detectedLanguage: sessionLanguage,
    languageConfidence: 1,
  });
};

/**
 * Get the first question for a behavioral session.
 */
const getFirstQuestion = async (session) => {
  // Load JD analysis if jdSnapshot exists
  let jdAnalysis = { behavioralFocus: [], keywords: [] };
  if (session.jdSnapshot?.jdAnalysisId) {
    const jd = await JDAnalysis.findById(session.jdSnapshot.jdAnalysisId);
    if (jd) {
      jdAnalysis = jd;
    }
  }

  // Retrieve top-ranked question with randomization for session variety
  const questions = retrieveBehavioralQuestions({
    jdAnalysis,
    excludeIds: [],
    limit: 1,
    randomize: true,
    sessionSeed: session.metadata?.sessionSeed || 0,
  });

  if (questions.length === 0) {
    // Fallback to random
    const q = getRandomQuestion({ excludeIds: [] });
    if (!q) return null;
    return q;
  }

  return questions[0];
};

/**
 * Get the next question for a behavioral session.
 */
const getNextQuestion = async (session) => {
  const excludeIds = session.questions.map((q) => q.questionId);

  // Load JD analysis
  let jdAnalysis = { behavioralFocus: [], keywords: [] };
  if (session.jdSnapshot?.jdAnalysisId) {
    const jd = await JDAnalysis.findById(session.jdSnapshot.jdAnalysisId);
    if (jd) {
      jdAnalysis = jd;
    }
  }

  const questions = retrieveBehavioralQuestions({
    jdAnalysis,
    excludeIds,
    limit: 1,
    randomize: true,
    sessionSeed: session.metadata?.sessionSeed || 0,
  });

  if (questions.length === 0) {
    const q = getRandomQuestion({ excludeIds });
    if (!q) return null;
    return q;
  }

  return questions[0];
};

/**
 * Handle behavioral answer submission.
 */
export const answerBehavioral = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ code: 404, message: 'Session not found' });
    }

    // Mode guard: fall through to technical handler if not behavioral
    if (session.mode !== 'behavioral') {
      return next();
    }

    const { questionId, transcript, language } = req.body;
    const activeLanguage = language || 'english';

    // Store language preference in session metadata
    if (!session.metadata) session.metadata = {};
    session.metadata.language = activeLanguage;

    // First call: no questions yet, retrieve and return the first question
    if (session.questions.length === 0) {
      const question = await getFirstQuestion(session);
      if (!question) {
        return res.status(500).json({ code: 500, message: 'No behavioral questions available' });
      }

      // Add question entry to session (without transcript/evaluation yet)
      session.questions.push({
        questionId: question.id,
        questionText: question.text,
        topic: question.topic,
        difficulty: question.difficulty,
        transcript: '',
        followUps: [],
        evaluation: null,
      });

      await session.save(); // Incremental save

      // Auto-translate question if Urdu mode
      let translatedQuestionText = null;
      if (activeLanguage === 'urdu') {
        try {
          const translation = await translateQuestionText(question.text, [], 'urdu');
          translatedQuestionText = translation.questionText;
        } catch (err) {
          logger.warn(`Failed to translate first question to Urdu: ${err.message}`);
        }
      }

      return res.json({
        evaluation: null,
        nextAction: 'first_question',
        nextQuestion: {
          questionId: session.questions[0].questionId,
          questionText: question.text,
          translatedQuestionText,
          topic: question.topic,
          difficulty: question.difficulty,
          matchedTerms: question.matchedTerms || [],
        },
      });
    }

    // Subsequent calls: process the answer
    if (!transcript) {
      return res.status(400).json({ code: 400, message: 'Transcript is required' });
    }

    // The active question is always the last entry in the session.
    const currentQuestion = session.questions[session.questions.length - 1];
    const lastFollowUp = currentQuestion.followUps[currentQuestion.followUps.length - 1];
    const isFollowUpPending =
      Boolean(currentQuestion.evaluation) &&
      currentQuestion.followUps.length > 0 &&
      String(lastFollowUp).startsWith('Q:');

    // Profanity (main answer OR follow-up) — terminate immediately.
    const profaneWord = detectProfanity(transcript);
    if (profaneWord) {
      session.status = 'terminated';
      session.overallScore = 0;
      await session.save();
      return res.json({
        evaluation: null,
        nextAction: 'complete',
        terminationReason: 'profanity',
        message: `Interview terminated: Inappropriate language detected. Please maintain professional conduct during the interview.`,
      });
    }

    // Follow-up answer path — validate before accepting.
    if (isFollowUpPending) {
      if (isInvalidAnswer(transcript)) {
        // Flag invalid and move to next question with the feedback message.
        currentQuestion.followUps.push('A: (No valid answer provided)');
        await session.save();
        return finalizeQuestion(session, currentQuestion.evaluation, res, { nudge: INVALID_ANSWER_MESSAGE });
      }
      currentQuestion.followUps.push(`A: ${transcript}`);
      await session.save(); // Incremental save
      return finalizeQuestion(session, currentQuestion.evaluation, res);
    }

    // Defensive: question already closed (stale client state) — advance, don't error.
    if (currentQuestion.evaluation) {
      return finalizeQuestion(session, currentQuestion.evaluation, res);
    }

    // Main answer path — no scoring until a valid, substantive answer arrives.
    if (isInvalidAnswer(transcript)) {
      // Flag invalid immediately and move to next question with the feedback message.
      const evaluation = INVALID_EVALUATION;
      currentQuestion.transcript = transcript;
      currentQuestion.evaluation = evaluation;
      // Mark the nested evaluation as modified so Mongoose persists it correctly
      session.markModified(`questions.${session.questions.length - 1}.evaluation`);
      await session.save();
      return finalizeQuestion(session, evaluation, res, { nudge: INVALID_ANSWER_MESSAGE });
    }

    // Valid answer — reset counter and score normally.
    resetInvalidAttempts(session);
    const questionData = {
      text: currentQuestion.questionText,
      topic: currentQuestion.topic,
      rubric: {
        situation: 'Describe the context and background',
        task: 'Explain your role and responsibility',
        action: 'Detail the specific actions you took',
        result: 'Share the outcome and what you learned',
      },
    };
    const evaluation = await evaluateBehavioralAnswer({ question: questionData, transcript, language: activeLanguage });

    // Detect answer language for Urdu auto-translation
    const langDetection = detectAnswerLanguage(transcript);
    session.metadata.lastAnswerLanguage = langDetection.detectedLanguage;
    session.metadata.languageConfidence = langDetection.confidence;

    currentQuestion.transcript = transcript;
    currentQuestion.evaluation = evaluation;
    // Mark the nested evaluation as modified so Mongoose persists it correctly
    session.markModified(`questions.${session.questions.length - 1}.evaluation`);

    // Adaptive follow-up (once): low score -> STAR coaching folded into a follow-up.
    if (
      evaluation.score < FOLLOW_UP_SCORE_THRESHOLD &&
      currentQuestion.followUps.length === 0
    ) {
      const followUpText = buildStarFollowUp(evaluation, transcript);
      currentQuestion.followUps.push(`Q: ${followUpText}`);
      await session.save(); // Incremental save
      return res.json({ evaluation: null, nextAction: 'followup', followUp: followUpText });
    }

    return finalizeQuestion(session, evaluation, res);
  } catch (err) {
    logger.error(`Behavioral answer error: ${err.message}`);
    next(err);
  }
};

export default { answerBehavioral };
