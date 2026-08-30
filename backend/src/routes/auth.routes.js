import { Router } from 'express';
import { signup, signin, getMe, migrateGuest } from '../controllers/auth.controller.js';
import { authMiddleware, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);

// Protected routes
router.get('/me', authMiddleware, requireAuth, getMe);
router.post('/migrate-guest', authMiddleware, requireAuth, migrateGuest);

export default router;
