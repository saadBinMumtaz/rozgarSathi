import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import connectDB from './config/db.js';

import healthRoutes from './routes/health.routes.js';
import jdRoutes from './routes/jd.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import sessionRoutes from './routes/session.routes.js';
import behavioralRoutes from './routes/behavioral.routes.js';
import technicalRoutes from './routes/technical.routes.js';
import codingRoutes from './routes/coding.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import authRoutes from './routes/auth.routes.js';
import reportRoutes from './routes/report.routes.js';

import errorHandler from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import logger from './utils/logger.js';

const app = express();

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json({ limit: '1mb' }));

// Mount API routes (Section 8 API Contract)
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/jd', jdRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/sessions', sessionRoutes);
// Contract (Section 8): POST /api/sessions/:id/answer is owned by both mode routers.
// Behavioral is mounted first and falls through (next()) when the session mode
// doesn't match, so the technical router gets the next chance at the same path.
app.use('/api/sessions', behavioralRoutes);
app.use('/api/sessions', technicalRoutes);
app.use('/api/coding', codingRoutes);
// Auth middleware on dashboard — attaches req.user but doesn't block guests
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
// Shareable reports — §15.6 / §22 (unauthenticated GET for shared links)
app.use('/api/reports', reportRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({ message: 'Rozgar Sathi Backend API running' });
});

// Error handling middleware
app.use(errorHandler);

// Connect Database and Start Server
const startServer = async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    logger.info(`🚀 Rozgar Sathi Backend Server running on port ${env.PORT} (${env.NODE_ENV})`);
  });
};

startServer();

export default app;
