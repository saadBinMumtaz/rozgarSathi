import express from 'express';
import { createSession, getSessionById } from '../controllers/session.controller.js';
import { translateEvaluation, translateQuestionText } from '../services/bilingual.js';

const router = express.Router();

// POST /api/sessions
router.post('/', createSession);

// POST /api/sessions/translate — translate an evaluation object (MUST be before /:id)
router.post('/translate', async (req, res) => {
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
});

// POST /api/sessions/translate-question — translate question text + follow-ups
router.post('/translate-question', async (req, res) => {
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
});

// GET /api/sessions/:id
router.get('/:id', getSessionById);

export default router;
