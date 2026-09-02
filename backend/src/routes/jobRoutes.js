// backend/src/routes/jobRoutes.js
// Job Discovery routes — search for active job listings from external providers.
// Requires authentication — guests cannot access job search.

import express from 'express';
import { searchJobs } from '../controllers/jobController.js';
import { authMiddleware, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/jobs/search?q=backend+developer&location=Lahore&remote=true&page=1&limit=20
// Auth required: JWT token must be provided via Authorization header
router.get('/search', authMiddleware, requireAuth, searchJobs);

export default router;
