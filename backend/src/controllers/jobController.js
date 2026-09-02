// backend/src/controllers/jobController.js
// Handles job search requests — validates params, delegates to jobSearchService.

import { searchAllProviders } from '../services/jobs/jobSearchService.js';
import logger from '../utils/logger.js';

/**
 * GET /api/jobs/search
 * Query params: q, location, remote, page, limit
 */
export const searchJobs = async (req, res, next) => {
  try {
    const { q, location, remote, page, limit } = req.query;

    // Validate: at least a keyword or location must be provided
    if (!q?.trim() && !location?.trim()) {
      return res.status(400).json({
        code: 400,
        message: 'Please provide a search keyword (q) or location.',
      });
    }

    const result = await searchAllProviders({
      query: q || '',
      location: location || '',
      remote: remote === 'true' || remote === '1',
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    // If all providers failed (no jobs returned), return a friendly message
    const allFailed = Object.values(result.providers).every(p => !p.ok);
    if (allFailed && result.jobs.length === 0) {
      return res.status(503).json({
        code: 503,
        message: 'Job search is temporarily unavailable. Please try again later.',
        jobs: [],
        providers: result.providers,
      });
    }

    return res.json(result);
  } catch (err) {
    logger.error(`[JobController] Search error: ${err.message}`);
    next(err);
  }
};

export default { searchJobs };
