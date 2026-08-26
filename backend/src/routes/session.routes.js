import express from 'express';
import { createSession, getSessionById } from '../controllers/session.controller.js';
import { translateEvaluation } from '../services/bilingual.js';

const router = express.Router();

// POST /api/sessions
router.post('/', createSession);

// GET /api/sessions/:id
router.get('/:id', getSessionById);

// POST /api/sessions/translate — translate an evaluation object
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

export default router;
