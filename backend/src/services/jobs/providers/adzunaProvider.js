// backend/src/services/jobs/providers/adzunaProvider.js
// Adzuna Jobs API provider — requires ADZUNA_APP_ID and ADZUNA_APP_KEY.
// Docs: https://developer.adzuna.com/

import env from '../../../config/env.js';
import logger from '../../../utils/logger.js';

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs';
const ADZUNA_COUNTRY = 'in'; // Default to India; can be extended

/**
 * Check if Adzuna is configured with API credentials.
 */
export const isConfigured = () => {
  return Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY);
};

/**
 * Search jobs on Adzuna.
 * @param {Object} params
 * @param {string} params.query - Search keyword
 * @param {string} [params.location] - Location filter
 * @param {boolean} [params.remote] - Remote-only filter
 * @param {number} [params.page] - Page number (1-based)
 * @param {number} [params.limit] - Results per page
 * @returns {Promise<Object[]>} Array of raw Adzuna job objects
 */
export const searchJobs = async ({ query, location, remote, page = 1, limit = 20 }) => {
  if (!isConfigured()) {
    logger.warn('[Adzuna] Not configured — skipping provider');
    return [];
  }

  try {
    // Build Adzuna API URL
    // Format: /v1/api/jobs/{country}/search?app_id=...&app_key=...&what=...&where=...
    const url = new URL(`${ADZUNA_BASE_URL}/${ADZUNA_COUNTRY}/search`);
    url.searchParams.set('app_id', env.ADZUNA_APP_ID);
    url.searchParams.set('app_key', env.ADZUNA_APP_KEY);
    url.searchParams.set('results_per_page', String(Math.min(limit, 50)));
    url.searchParams.set('page', String(page));
    url.searchParams.set('content-type', 'application/json');

    if (query) url.searchParams.set('what', query);
    if (location) url.searchParams.set('where', location);
    if (remote) url.searchParams.set('what_and', 'remote');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn(`[Adzuna] API returned ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Adzuna returns { results: [...jobs], count, mean_salary, ... }
    const jobs = Array.isArray(data?.results) ? data.results : [];
    return jobs.slice(0, limit);
  } catch (err) {
    logger.error(`[Adzuna] Search failed: ${err.message}`);
    return [];
  }
};

export default { isConfigured, searchJobs };
