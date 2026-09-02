import { Router } from 'express';
import { signup, signin, getMe, migrateGuest, googleAuth, googleCallback, googleVerify, setPassword, logout } from '../controllers/auth.controller.js';
import { authMiddleware, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.post('/google/verify', googleVerify);

// Protected routes
router.get('/me', authMiddleware, requireAuth, getMe);
router.post('/migrate-guest', authMiddleware, requireAuth, migrateGuest);
router.post('/set-password', authMiddleware, requireAuth, setPassword);
router.post('/logout', authMiddleware, requireAuth, logout);

export default router;
