import express from 'express';
import {
  createSession,
  getSessionById,
  translateEvaluationHandler,
  translateQuestionHandler,
  synthesizeSpeechHandler,
  synthesizeSpeechGoogleHandler,
} from '../controllers/session.controller.js';

const router = express.Router();

// POST /api/sessions
router.post('/', createSession);

// POST /api/sessions/translate — translate an evaluation object (MUST be before /:id)
router.post('/translate', translateEvaluationHandler);

// POST /api/sessions/translate-question — translate question text + follow-ups
router.post('/translate-question', translateQuestionHandler);

// POST /api/sessions/tts — cloud Urdu speech (Azure) fallback
router.post('/tts', synthesizeSpeechHandler);

// POST /api/sessions/tts-google — Google Translate TTS proxy (free Urdu fallback)
router.post('/tts-google', synthesizeSpeechGoogleHandler);

// GET /api/sessions/:id
router.get('/:id', getSessionById);

export default router;
