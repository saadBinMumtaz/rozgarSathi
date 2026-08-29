import Session from '../models/Session.model.js';
import { translateEvaluation, translateQuestionText, synthesizeUrduSpeech, synthesizeUrduSpeechGoogle } from '../services/bilingual.js';

export const createSession = async (req, res, next) => {
  try {
    const { mode, jdAnalysisId, userId } = req.body;
    if (!mode) {
      return res.status(400).json({ error: 'Session mode is required' });
    }
    const newSession = await Session.create({
      userId: userId || 'guest',
      mode,
      jdSnapshot: jdAnalysisId ? { jdAnalysisId } : {},
      status: 'in_progress',
      questions: [],
      metadata: {
        sessionSeed: Math.floor(Date.now() / 1000) % 100, // Time-based seed for cross-session variety
      },
    });
    return res.status(201).json({ sessionId: newSession._id.toString() });
  } catch (err) {
    next(err);
  }
};

export const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json(session);
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/translate — translate an evaluation object (via bilingual service)
export const translateEvaluationHandler = async (req, res) => {
  try {
    const { evaluation, targetLanguage } = req.body;
    if (!evaluation) {
      return res.status(400).json({ error: 'Evaluation is required' });
    }
    const translated = await translateEvaluation(evaluation, targetLanguage || 'urdu');
    return res.json({ evaluation: translated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/sessions/translate-question — translate question text + follow-ups
export const translateQuestionHandler = async (req, res) => {
  try {
    const { questionText, followUpPrompts, targetLanguage } = req.body;
    if (!questionText) {
      return res.status(400).json({ error: 'questionText is required' });
    }
    const translated = await translateQuestionText(questionText, followUpPrompts || [], targetLanguage || 'urdu');
    return res.json(translated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/sessions/tts — cloud Urdu speech (Azure) for devices with no local Urdu voice
export const synthesizeSpeechHandler = async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    if (language !== 'urdu') {
      return res.status(400).json({ error: 'Cloud TTS is currently only supported for Urdu' });
    }
    const audio = await synthesizeUrduSpeech(text);
    return res.json(audio);
  } catch (err) {
    if (err.code === 'TTS_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: 'TTS_NOT_CONFIGURED' });
    }
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/sessions/tts-google — Google Translate TTS proxy (free Urdu fallback)
export const synthesizeSpeechGoogleHandler = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    const audio = await synthesizeUrduSpeechGoogle(text);
    return res.json(audio);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export default { createSession, getSessionById, translateEvaluationHandler, translateQuestionHandler, synthesizeSpeechHandler, synthesizeSpeechGoogleHandler };
