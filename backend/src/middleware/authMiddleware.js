import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { User } from '../models/User.model.js';

/**
 * Auth middleware — verifies JWT from Authorization header.
 * Attaches req.user (User document) on success.
 * Does NOT reject unauthenticated requests — use requireAuth for that.
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      req.user = null;
      return next();
    }
    next(err);
  }
};

/**
 * Require auth middleware — rejects requests without a valid JWT.
 */
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ code: 401, message: 'Authentication required. Please sign in.' });
  }
  next();
};

export default authMiddleware;
