import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { User } from '../models/User.model.js';
import { Session } from '../models/Session.model.js';
import { verifyGoogleToken, findOrCreateGoogleUser, generateGoogleAuthUrl } from '../services/googleAuth.js';
import { mergeGuestSessions } from '../services/userMerge.js';

const generateToken = (userId) => {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '30d' });
};

/**
 * POST /api/auth/signup
 * Body: { username, email, password, guestId? }
 * Creates a new user, migrates guest sessions, returns JWT + user.
 */
export const signup = async (req, res, next) => {
  try {
    const { username, email, password, guestId } = req.body;

    // Validate
    if (!username || !email || !password) {
      return res.status(400).json({ code: 400, message: 'Username, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ code: 400, message: 'Password must be at least 6 characters.' });
    }
    if (username.length < 3) {
      return res.status(400).json({ code: 400, message: 'Username must be at least 3 characters.' });
    }

    // Check existing
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ code: 409, message: `A user with that ${field} already exists.` });
    }

    // Create user (password hashed by pre-save hook)
    const user = new User({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password,
    });
    await user.save();

    // Migrate guest sessions to this user
    let migratedCount = 0;
    if (guestId) {
      const result = await Session.updateMany(
        { userId: guestId },
        { $set: { userId: String(user._id) } }
      );
      migratedCount = result.modifiedCount || 0;
    }

    const token = generateToken(String(user._id));

    res.status(201).json({
      token,
      user: user.toJSON(),
      migratedSessions: migratedCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/signin
 * Body: { username, password }
 * Returns JWT + user.
 */
export const signin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: 'Username and password are required.' });
    }

    // Find by username or email
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        { email: username.toLowerCase().trim() },
      ],
    });

    if (!user) {
      return res.status(401).json({ code: 401, message: 'Invalid username or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ code: 401, message: 'Invalid username or password.' });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(String(user._id));

    res.json({
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the current authenticated user.
 */
export const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: 'Not authenticated.' });
    }
    res.json({ user: req.user.toJSON() });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/migrate-guest
 * Body: { guestId }
 * Migrates guest sessions to the authenticated user.
 */
export const migrateGuest = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: 'Not authenticated.' });
    }

    const { guestId } = req.body;
    if (!guestId) {
      return res.status(400).json({ code: 400, message: 'guestId is required.' });
    }

    const result = await mergeGuestSessions(guestId, String(req.user._id));

    res.json({ mergedCount: result.mergedSessionCount });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/google
 * Redirects to Google OAuth consent screen.
 */
export const googleAuth = async (req, res, next) => {
  try {
    const redirectUri = env.GOOGLE_REDIRECT_URI || `${env.VITE_API_BASE_URL}/auth/google/callback`;
    const authUrl = generateGoogleAuthUrl(redirectUri);
    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback, verifies token, creates/updates user, returns JWT.
 */
export const googleCallback = async (req, res, next) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ code: 400, message: 'Authorization code is required.' });
    }

    // Exchange code for tokens (in a real app, you'd use the OAuth2Client)
    // For simplicity, we'll expect the frontend to send the ID token directly
    // This is a simplified flow - in production, use proper OAuth2 code exchange
    
    // For now, we'll redirect to frontend with a temporary token
    // The frontend will then call /api/auth/google/verify with the ID token
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/google/callback?code=${code}`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/google/verify
 * Body: { idToken, guestId? }
 * Verifies Google ID token and returns JWT + user.
 * Returns needsPassword flag if user has no password set.
 */
export const googleVerify = async (req, res, next) => {
  try {
    const { idToken, guestId } = req.body;

    if (!idToken) {
      return res.status(400).json({ code: 400, message: 'Google ID token is required.' });
    }

    // Verify Google token
    const googlePayload = await verifyGoogleToken(idToken);

    // Find or create user
    const user = await findOrCreateGoogleUser(googlePayload);

    // Merge guest sessions if provided
    let mergedSessionCount = 0;
    if (guestId) {
      const result = await mergeGuestSessions(guestId, String(user._id));
      mergedSessionCount = result.mergedSessionCount;
    }

    // Check if user needs to set a password (Google OAuth users without password)
    const needsPassword = !user.password;

    // Generate JWT
    const token = generateToken(String(user._id));

    res.json({
      token,
      user: user.toJSON(),
      mergedSessions: mergedSessionCount,
      needsPassword,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/set-password
 * Body: { password }
 * Sets password for the authenticated user (used after Google OAuth sign-in).
 * Requires authentication.
 */
export const setPassword = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: 'Authentication required.' });
    }

    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ code: 400, message: 'Password must be at least 6 characters.' });
    }

    // Update user password (hashed by pre-save hook)
    req.user.password = password;
    await req.user.save();

    // Generate new JWT (in case token needs refresh)
    const token = generateToken(String(req.user._id));

    res.json({
      token,
      user: req.user.toJSON(),
      message: 'Password set successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Clears authentication (client-side only, JWT is stateless).
 */
export const logout = async (req, res, next) => {
  try {
    // JWT is stateless, so logout is handled client-side by removing the token
    // This endpoint exists for API completeness
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};
