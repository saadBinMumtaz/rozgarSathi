import express from 'express';
import { checkDbHealth } from '../config/db.js';
import { checkAIHealth } from '../services/ai.js';

const router = express.Router();

// GET /api/health
router.get('/', async (req, res) => {
  const mongoOk = checkDbHealth();
  const groqOk = await checkAIHealth();

  const isHealthy = mongoOk && groqOk;

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    mongo: mongoOk,
    groq: groqOk,
  });
});

export default router;
