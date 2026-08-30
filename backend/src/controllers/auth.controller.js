import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { User } from '../models/User.model.js';
import { Session } from '../models/Session.model.js';

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
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    // Check existing
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ error: `A user with that ${field} already exists.` });
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
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Find by username or email
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        { email: username.toLowerCase().trim() },
      ],
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
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
      return res.status(401).json({ error: 'Not authenticated.' });
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
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const { guestId } = req.body;
    if (!guestId) {
      return res.status(400).json({ error: 'guestId is required.' });
    }

    const result = await Session.updateMany(
      { userId: guestId },
      { $set: { userId: String(req.user._id) } }
    );

    res.json({ migratedCount: result.modifiedCount || 0 });
  } catch (err) {
    next(err);
  }
};
