// backend/src/routes/report.routes.js
// Shareable read-only report routes — Master Context §15.6 / Rules.md §22.
// POST /api/reports/share           — authenticated (generates token)
// GET  /api/reports/shared/:token   — unauthenticated (public read-only view)

import express from 'express';
import { generateShareToken, getSharedReport } from '../controllers/report.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/reports/share — authenticated; generates shareToken
router.post('/share', authMiddleware, generateShareToken);

// GET /api/reports/shared/:shareToken — unauthenticated; public read-only
router.get('/shared/:shareToken', getSharedReport);

export default router;
