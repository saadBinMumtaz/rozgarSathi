import express from 'express';
import { analyzeJD } from '../controllers/jd.controller.js';

const router = express.Router();

// POST /api/jd/analyze
router.post('/analyze', analyzeJD);

export default router;
