// backend/src/middleware/rateLimiter.js
// Rate limiting for expensive endpoints (Day 4 onward).
// Coding executions are limited per SESSION (keyed by body.sessionId) so one
// candidate spamming Run/Submit during the demo can't starve the judge queue.

import rateLimit from 'express-rate-limit';

// Key limiter buckets by the coding session (falls back to IP before the
// session is created).
const sessionKeyGenerator = (req) => (req.body && req.body.sessionId) || req.ip;

const tooManyHandler = (message) => (req, res) => res.status(429).json({ code: 429, message });

// POST /api/coding/run — each run triggers several judge executions, keep
// the window generous but bounded.
export const codingRunLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: sessionKeyGenerator,
  handler: tooManyHandler('Too many test runs — please wait a moment before running again.'),
});

// POST /api/coding/submit — hidden-test runs + evaluation, tighter budget.
export const codingSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: sessionKeyGenerator,
  handler: tooManyHandler('Too many submissions — please wait a moment before submitting again.'),
});

export default { codingRunLimiter, codingSubmitLimiter };
