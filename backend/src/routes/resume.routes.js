import express from 'express';
import { analyzeResume, uploadMiddleware } from '../controllers/resume.controller.js';

const router = express.Router();

// POST /api/resume/analyze — accepts multipart/form-data (file) or JSON (text)
router.post('/analyze', uploadMiddleware, analyzeResume);

export default router;
