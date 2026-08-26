// backend/src/controllers/behavioral.controller.js
// Behavioral interview controller — handles question retrieval, answer processing,
// follow-ups, and incremental session persistence.

import Session from '../models/Session.model.js';
import JDAnalysis from '../models/JDAnalysis.model.js';
import { retrieveBehavioralQuestions, getRandomQuestion } from '../services/retrieval.js';
import { evaluateBehavioralAnswer, INVALID_EVALUATION } from '../services/scoring.js';
import { detectAnswerLanguage, translateQuestionText } from '../services/bilingual.js';
import logger from '../utils/logger.js';

const MIN_WORDS_FOR_NUDGE = 10;
const FOLLOW_UP_SCORE_THRESHOLD = 50;
const MAX_QUESTIONS = 5; // behavioral interview length

const PROFANITY_LIST = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'motherfucker', 'dick', 'piss',
  'damn', 'hell', 'crap', 'bastard', 'slut', 'whore',
];

/**
 * Check if transcript contains profanity.
 * Returns the first profane word found, or null.
 */
const detectProfanity = (transcript) => {
  const lower = transcript.toLowerCase();
  return PROFANITY_LIST.find((p) => lower.includes(p)) || null;
};

/**
 * Detect low-quality / non-answer submissions (too short, profanity,
 * repeated characters, repeated words, vowel-less gibberish).
 */
const isLowQualityAnswer = (transcript) => {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS_FOR_NUDGE) return true;
  const lower = transcript.toLowerCase();
  if (PROFANITY_LIST.some((p) => lower.includes(p))) return true;
  if (/(.)\1{5,}/.test(lower.replace(/\s+/g, ''))) return true; // "aaaaaa..."
  const uniqueRatio = new Set(words.map((w) => w.toLowerCase())).size / words.length;
  if (uniqueRatio < 0.3) return true; // same words repeated
  const noVowelRatio = words.filter((w) => !/[aeiou]/i.test(w)).length / words.length;
  if (noVowelRatio > 0.5) return true; // "asdf qwer tyui"
  return false;
};

const STAR_FOLLOWUPS = {
  situation: "Let's go back to the beginning — what was the specific situation you were in, and what made it particularly challenging?",
  task: 'What exactly was your responsibility in that situation, and how did you clarify what was expected of you?',
  action: 'Walk me through the specific steps you personally took — not the team, but you individually. What was your thought process?',
  result: 'How did it end — what was the concrete result of your actions, and how did you measure whether you succeeded?',
};

/**
 * Build context-aware follow-ups that probe deeper into the candidate's answer.
 * Uses the weakest STAR dimension and anchors to something the candidate actually said.
 */
const DEEP_PROBES = {
  situation: [
    'What made that situation particularly complex or high-stakes?',
    'Were there any constraints that limited your options at the time?',
  ],
  task: [
    'How did you prioritize what needed to happen first?',
    'Was there ambiguity about who owned the problem? How did you handle that?',
  ],
  action: [
    'What alternatives did you consider before committing to that approach?',
    'What was the biggest risk you took, and how did you mitigate it?',
  ],
  result: [
    'If you could do it again, what would you change and why?',
    'How did this experience change how you approach similar situations now?',
  ],
};

/**
 * Extract a short anchor phrase from the candidate's transcript for
 * context-aware follow-ups ("You mentioned 'X' — ...").
 * Returns the first meaningful sentence, trimmed to 80 chars.
 */
const extractAnchor = (transcript) => {
  if (!transcript) return '';
  const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  if (sentences.length === 0) return '';
  let anchor = sentences[0].trim();
  if (anchor.length > 80) anchor = anchor.substring(0, 77) + '...';
  return anchor;
};

/**
 * STAR coaching folded into a follow-up: target the weakest STAR dimension
 * and anchor it to something the candidate actually said.
 * Also includes a deep probe from the same dimension for richer follow-ups.
 */
const buildStarFollowUp = (evaluation, transcript) => {
  const dims = evaluation.dimensions || {};
  const keys = Object.keys(STAR_FOLLOWUPS).filter((k) => typeof dims[k] === 'number');
  let dimKey = 'action';
  if (keys.length > 0) {
    keys.sort((a, b) => dims[a] - dims[b]);
    dimKey = keys[0];
  }
  const base = STAR_FOLLOWUPS[dimKey];
  const anchor = extractAnchor(transcript);
  const deepProbes = DEEP_PROBES[dimKey] || [];
  const probe = deepProbes.length > 0 ? deepProbes[Math.floor(Math.random() * deepProbes.length)] : '';
  
  if (anchor) {
    const combined = probe
      ? `You mentioned "${anchor}" — ${base.charAt(0).toLowerCase() + base.slice(1)} Also, ${probe.charAt(0).toLowerCase() + probe.slice(1)}`
      : `You mentioned "${anchor}" — ${base.charAt(0).toLowerCase() + base.slice(1)}`;
    return combined;
  }
  return probe ? `${base} ${probe}` : base;
};

// INVALID_EVALUATION is now imported from scoring.js (Rules §5: only scoring.js constructs evaluations)

/**
 * Close the session with an overall score.
 */
const completeSession = async (session, evaluation, res) => {
  session.status = 'completed';
  session.overallScore = Math.round(
    session.questions.reduce((sum, q) => sum + (q.evaluation?.score || 0), 0) /
      session.questions.length
  );
  await session.save(); // Final save
  return res.json({ evaluation, nextAction: 'complete' });
};

/**
 * Close the current question and advance to the next one (or complete).
 */
const finalizeQuestion = async (session, evaluation, res) => {
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

  await session.save(); // Incremental save

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
      return res.status(404).json({ error: 'Session not found' });
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
        return res.status(500).json({ error: 'No behavioral questions available' });
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
      return res.status(400).json({ error: 'Transcript is required' });
    }

    // The active question is always the last entry in the session.
    const currentQuestion = session.questions[session.questions.length - 1];
    const lastFollowUp = currentQuestion.followUps[currentQuestion.followUps.length - 1];
    const isFollowUpPending =
      Boolean(currentQuestion.evaluation) &&
      currentQuestion.followUps.length > 0 &&
      String(lastFollowUp).startsWith('Q:');

    // Follow-up answer path: record the answer and move on.
    if (isFollowUpPending) {
      currentQuestion.followUps.push(`A: ${transcript}`);
      await session.save(); // Incremental save
      return finalizeQuestion(session, currentQuestion.evaluation, res);
    }

    // Defensive: question already closed (stale client state) — advance, don't error.
    if (currentQuestion.evaluation) {
      return finalizeQuestion(session, currentQuestion.evaluation, res);
    }

    // Main answer path with low-quality / non-answer detection.
    const lowQuality = isLowQualityAnswer(transcript);
    const alreadyNudged = Boolean(currentQuestion.transcript);
    const profaneWord = detectProfanity(transcript);

    // Profanity detected — give strong warning and end interview
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

    if (lowQuality && !alreadyNudged) {
      // Nudge once politely (spoken aloud by the client) before scoring.
      currentQuestion.transcript = transcript; // marks that a nudge was issued
      await session.save();
      return res.json({
        evaluation: null,
        nextAction: 'nudge',
        nudge:
          "I didn't quite catch a proper answer there. Could you share a real example from your experience?",
      });
    }

    let evaluation;
    if (lowQuality && alreadyNudged) {
      // Second invalid attempt: mark as invalid and move on (no deep scoring).
      evaluation = INVALID_EVALUATION;
    } else {
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
      evaluation = await evaluateBehavioralAnswer({ question: questionData, transcript, language: activeLanguage });
    }

    // Detect answer language for Urdu auto-translation
    const langDetection = detectAnswerLanguage(transcript);
    session.metadata.lastAnswerLanguage = langDetection.detectedLanguage;
    session.metadata.languageConfidence = langDetection.confidence;

    currentQuestion.transcript = transcript;
    currentQuestion.evaluation = evaluation;

    // Adaptive follow-up (once): low score -> STAR coaching folded into a follow-up.
    if (
      !lowQuality &&
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
