import express from 'express';
import { analyzeResume } from '../controllers/resume.controller.js';

const router = express.Router();

// POST /api/resume/analyze
router.post('/analyze', analyzeResume);

export default router;
