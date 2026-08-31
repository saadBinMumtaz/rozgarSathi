import express from 'express';
import { getDashboardData, getSessionHistory, getSessionTrend, getStreak } from '../controllers/dashboard.controller.js';

const router = express.Router();

// GET /api/dashboard/:userId
router.get('/:userId', getDashboardData);

// GET /api/dashboard/:userId/history — Day 6: session history
router.get('/:userId/history', getSessionHistory);

// GET /api/dashboard/:userId/trend — Day 6: per-mode trend data
router.get('/:userId/trend', getSessionTrend);

// GET /api/dashboard/:userId/streak — consistency streak from Session.createdAt
router.get('/:userId/streak', getStreak);

export default router;
