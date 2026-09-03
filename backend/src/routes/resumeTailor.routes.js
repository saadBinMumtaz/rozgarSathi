// backend/src/routes/resumeTailor.routes.js
// Routes for resume tailoring feature.

import express from 'express';
import { tailorResume, uploadMiddleware } from '../controllers/resumeTailor.controller.js';

const router = express.Router();

// POST /api/resume/tailor — accepts resume file + job description
router.post('/tailor', uploadMiddleware, tailorResume);

export default router;
