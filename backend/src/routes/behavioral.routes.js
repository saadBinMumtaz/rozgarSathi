import express from 'express';
import { answerBehavioral } from '../controllers/behavioral.controller.js';

const router = express.Router();

// POST /api/sessions/:id/answer (behavioral variant — Section 8)
router.post('/:id/answer', answerBehavioral);

export default router;
