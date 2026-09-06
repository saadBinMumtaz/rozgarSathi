// backend/src/services/googleAuth.js
// Google OAuth 2.0 token verification and user creation/lookup.
// Uses google-auth-library to verify ID tokens from Google's OAuth flow.

import logger from '../utils/logger.js';
import { OAuth2Client } from 'google-auth-library';
import env from '../config/env.js';
import { User } from '../models/User.model.js';

// Initialize Google OAuth client
const getGoogleClient = () => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }
  return new OAuth2Client(env.GOOGLE_CLIENT_ID);
};

/**
 * Verify a Google ID token and return the payload.
 * @param {string} idToken - The Google ID token to verify
 * @returns {Promise<Object>} The verified payload with sub (googleId), email, name, picture
 */
export const verifyGoogleToken = async (idToken) => {
  try {
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
      emailVerified: payload.email_verified,
    };
  } catch (err) {
    logger.error('[GoogleAuth] Token verification failed:', err.message);
    throw new Error('Invalid Google ID token');
  }
};

/**
 * Derive a valid username from an email address.
 * Uses the local part (before @), removes dots and special characters.
 * Example: john.doe@gmail.com -> johndoe
 * @param {string} email - The email address
 * @returns {string} A valid username
 */
const deriveUsernameFromEmail = (email) => {
  const localPart = email.split('@')[0];
  // Remove dots, convert to lowercase, keep only alphanumeric and underscores
  return localPart.replace(/\./g, '').replace(/[^a-z0-9_]/gi, '').toLowerCase();
};

/**
 * Find or create a user from Google OAuth payload.
 * @param {Object} googlePayload - The verified Google payload
 * @returns {Promise<Object>} The user document
 */
export const findOrCreateGoogleUser = async (googlePayload) => {
  const { googleId, email, name, avatarUrl } = googlePayload;

  // Try to find existing user by googleId
  let user = await User.findOne({ googleId });
  
  if (user) {
    // Update last login
    user.lastLoginAt = new Date();
    // Update profile info if changed
    if (name && user.name !== name) user.name = name;
    if (avatarUrl && user.avatarUrl !== avatarUrl) user.avatarUrl = avatarUrl;
    await user.save({ validateBeforeSave: false });
    return user;
  }

  // Try to find existing user by email (might have signed up with password before)
  user = await User.findOne({ email: email.toLowerCase() });
  
  if (user) {
    // Link Google account to existing user
    user.googleId = googleId;
    user.lastLoginAt = new Date();
    if (name && !user.name) user.name = name;
    if (avatarUrl && !user.avatarUrl) user.avatarUrl = avatarUrl;
    await user.save({ validateBeforeSave: false });
    return user;
  }

  // Derive username from email local part
  const derivedUsername = deriveUsernameFromEmail(email);
  
  // Ensure username is unique by appending random suffix if needed
  let username = derivedUsername;
  let counter = 1;
  while (await User.findOne({ username })) {
    username = `${derivedUsername}${counter}`;
    counter++;
  }

  // Create new user
  user = new User({
    googleId,
    email: email.toLowerCase(),
    name: name || derivedUsername,
    avatarUrl,
    lastLoginAt: new Date(),
    // No password — Google OAuth user (will be set later via /api/auth/set-password)
    username,
  });
  
  await user.save();
  return user;
};

/**
 * Generate Google OAuth consent URL.
 * @param {string} redirectUri - The redirect URI after consent
 * @returns {string} The Google OAuth consent URL
 */
export const generateGoogleAuthUrl = (redirectUri) => {
  const client = getGoogleClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: redirectUri,
    prompt: 'consent',
  });
};

export default {
  verifyGoogleToken,
  findOrCreateGoogleUser,
  generateGoogleAuthUrl,
};
