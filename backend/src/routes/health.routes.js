import express from 'express';
import { checkDbHealth } from '../config/db.js';
import { checkQwenHealth } from '../services/ai.js';

const router = express.Router();

// GET /api/health
router.get('/', async (req, res) => {
  const mongoOk = checkDbHealth();
  const qwenOk = await checkQwenHealth();

  const isHealthy = mongoOk && qwenOk;

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    mongo: mongoOk,
    qwen: qwenOk,
  });
});

export default router;
