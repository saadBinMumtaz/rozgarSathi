import express from 'express';
import { getCodingQuestion, runTests, submitSolution, getProbes } from '../controllers/coding.controller.js';
import { codingRunLimiter, codingSubmitLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/coding/questions
router.post('/questions', getCodingQuestion);

// POST /api/coding/run — rate limited per session (judge executions are costly)
router.post('/run', codingRunLimiter, runTests);

// POST /api/coding/probes — return scripted interviewerProbes for the session's question
router.post('/probes', getProbes);

// POST /api/coding/submit — rate limited per session
router.post('/submit', codingSubmitLimiter, submitSolution);

export default router;
