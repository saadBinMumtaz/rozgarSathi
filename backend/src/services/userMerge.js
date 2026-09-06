// backend/src/services/userMerge.js
// Re-associates guest sessions to an authenticated user.
// Ensures no sessions are lost or duplicated during the merge.

import logger from '../utils/logger.js';
import { Session } from '../models/Session.model.js';

/**
 * Merge guest sessions into an authenticated user account.
 * Re-associates all sessions with the given guestId to the authenticated userId.
 * 
 * @param {string} guestId - The guest user ID to merge from
 * @param {string} authenticatedUserId - The authenticated user ID to merge to
 * @returns {Promise<Object>} Result with mergedSessionCount
 */
export const mergeGuestSessions = async (guestId, authenticatedUserId) => {
  if (!guestId || !authenticatedUserId) {
    throw new Error('Both guestId and authenticatedUserId are required');
  }

  // Don't merge if guestId is the same as authenticatedUserId
  if (guestId === authenticatedUserId) {
    return { mergedSessionCount: 0, skipped: true };
  }

  try {
    // Find all sessions with the guestId
    const guestSessions = await Session.find({ userId: guestId });
    
    if (guestSessions.length === 0) {
      return { mergedSessionCount: 0, skipped: false };
    }

    // Update all guest sessions to use the authenticated user ID
    const result = await Session.updateMany(
      { userId: guestId },
      { 
        $set: { 
          userId: String(authenticatedUserId),
          authenticated: true // Mark as authenticated session
        } 
      }
    );

    const mergedCount = result.modifiedCount || 0;

logger.info(`[UserMerge] Merged ${mergedCount} sessions from guest ${guestId} to user ${authenticatedUserId}`);

    return {
      mergedSessionCount: mergedCount,
      skipped: false,
    };
  } catch (err) {
    logger.error('[UserMerge] Failed to merge guest sessions:', err);
    throw new Error('Failed to merge guest sessions');
  }
};

/**
 * Check if a user has any guest sessions that need merging.
 * 
 * @param {string} guestId - The guest user ID to check
 * @returns {Promise<boolean>} True if there are guest sessions to merge
 */
export const hasGuestSessions = async (guestId) => {
  if (!guestId) return false;
  
  const count = await Session.countDocuments({ userId: guestId });
  return count > 0;
};

export default {
  mergeGuestSessions,
  hasGuestSessions,
};
