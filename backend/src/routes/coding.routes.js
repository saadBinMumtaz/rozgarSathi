import express from 'express';
import { getQuestions, runCode, submitCode } from '../controllers/coding.controller.js';

const router = express.Router();

// POST /api/coding/questions
router.post('/questions', getQuestions);

// POST /api/coding/run
router.post('/run', runCode);

// POST /api/coding/submit
router.post('/submit', submitCode);

export default router;
