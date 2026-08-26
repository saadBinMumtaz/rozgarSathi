import express from 'express';
import { answerTechnical } from '../controllers/technical.controller.js';

const router = express.Router();

// POST /api/sessions/:id/answer (technical variant — Section 8)
router.post('/:id/answer', answerTechnical);

export default router;
