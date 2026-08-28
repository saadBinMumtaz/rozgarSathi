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
} from '../services/answerQuality.js';
import logger from '../utils/logger.js';

const MAX_QUESTIONS = 5; // technical interview length
const FOLLOW_UP_SCORE_THRESHOLD = 50;

const PROFANITY_LIST = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'motherfucker', 'dick', 'piss',
  'damn', 'hell', 'crap', 'slut', 'whore',
];

const detectProfanity = (transcript) => {
  const lower = transcript.toLowerCase();
  return PROFANITY_LIST.find((p) => lower.includes(p)) || null;
};

/**
 * Track answer-quality attempts on session metadata so invalid inputs are
 * re-asked with the same direct message instead of being scored. Shared by the
 * main-answer and follow-up paths (mirrors behavioral.controller.js).
 */
const bumpInvalidAttempts = async (session) => {
  if (!session.metadata) session.metadata = {};
  session.metadata.invalidAttempts = (session.metadata.invalidAttempts || 0) + 1;
  await session.save();
  return session.metadata.invalidAttempts;
};

const resetInvalidAttempts = (session) => {
  if (session.metadata) session.metadata.invalidAttempts = 0;
};

/**
 * Build a technical follow-up based on the weakest rubric dimension.
 * Enhanced with context-aware deep probes anchored to the candidate's answer.
 */
const TECHNICAL_DEEP_PROBES = {
  correctness: [
    'Can you verify that with a concrete example from your experience?',
    'What edge cases might break that assumption?',
  ],
  depth: [
    'Can you go one level deeper — what are the underlying mechanics?',
    'How does this behave under high load or with large datasets?',
  ],
  practical: [
    'How would you apply this in a real production system?',
    'What monitoring or observability would you add to catch issues early?',
  ],
  relevance: [
    'How does this relate specifically to the role requirements?',
    'Can you connect this to a project you have actually shipped?',
  ],
  communication: [
    'Can you rephrase that more concisely for a junior developer?',
    'What would you include in a design doc about this decision?',
  ],
  reasoning: [
    'What was your reasoning process for arriving at that conclusion?',
    'What alternatives did you consider and why did you reject them?',
  ],
};

const buildTechnicalFollowUp = (evaluation, question) => {
  const dims = evaluation.dimensions || {};
  const keys = Object.keys(dims).filter((k) => typeof dims[k] === 'number');
  if (keys.length === 0) {
    return 'Can you elaborate more on that with a specific example?';
  }

  // Find the weakest dimension
  keys.sort((a, b) => dims[a] - dims[b]);
  const weakest = keys[0];

  const prompts = TECHNICAL_DEEP_PROBES[weakest] || [
    'Can you elaborate more on that with a specific example?',
  ];

  // Pick a random deep probe for variety
  return prompts[Math.floor(Math.random() * prompts.length)];
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
      return res.status(404).json({ error: 'Session not found' });
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
      return res.status(400).json({ error: 'Transcript is required' });
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

    const evaluation = await evaluateTechnicalAnswer({ question: questionData, transcript, language: activeLanguage });

    // Detect answer language for Urdu auto-translation
    const langDetection = detectAnswerLanguage(transcript);
    session.metadata.lastAnswerLanguage = langDetection.detectedLanguage;
    session.metadata.languageConfidence = langDetection.confidence;

    currentQuestion.transcript = transcript;
    currentQuestion.evaluation = evaluation;
    // Mark the nested evaluation as modified so Mongoose persists it correctly
    session.markModified(`questions.${session.questions.length - 1}.evaluation`);

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
