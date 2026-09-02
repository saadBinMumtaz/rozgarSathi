// backend/src/services/jobs/providers/arbeitnowProvider.js
// Arbeitnow Job Board API provider — free, no API key required.
// Docs: https://arbeitnow.com/api
//
// IMPORTANT: The Arbeitnow API does NOT support keyword search.
// It returns paginated listings from their general job board.
// We fetch multiple pages and apply client-side relevance filtering.

import logger from '../../../utils/logger.js';

const ARBEITNOW_BASE_URL = 'https://www.arbeitnow.com/api/job-board-api';

/**
 * Fetch a single page of jobs from Arbeitnow.
 */
const fetchPage = async (page) => {
  const url = `${ARBEITNOW_BASE_URL}?page=${page}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn(`[Arbeitnow] Page ${page} returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    clearTimeout(timeout);
    logger.warn(`[Arbeitnow] Page ${page} fetch failed: ${err.message}`);
    return [];
  }
};

/**
 * Score a job's relevance to a search query.
 * Returns 0 if no match, higher = more relevant.
 */
const scoreRelevance = (job, queryTerms) => {
  if (!queryTerms.length) return 1; // No query = all jobs equally relevant

  const title = (job.title || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const company = (job.company_name || '').toLowerCase();
  const location = (job.location || '').toLowerCase();

  let score = 0;

  for (const term of queryTerms) {
    const t = term.toLowerCase();
    if (!t) continue;

    // Title match (highest weight)
    if (title.includes(t)) {
      score += 10;
      // Exact title word boundary match gets bonus
      if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(job.title || '')) {
        score += 5;
      }
    }

    // Company match
    if (company.includes(t)) score += 3;

    // Location match
    if (location.includes(t)) score += 2;

    // Description match (lower weight — often boilerplate)
    if (description.includes(t)) score += 1;
  }

  return score;
};

/**
 * Check if a job matches location/remote filters.
 */
const matchesFilters = (job, location, remote) => {
  // Remote filter: check if job mentions "remote" in title, location, or description
  if (remote) {
    const text = `${job.title || ''} ${job.location || ''} ${job.description || ''}`.toLowerCase();
    const isRemote = text.includes('remote') || text.includes('work from home') || text.includes('wfh');
    if (!isRemote) return false;
  }

  // Location filter: check if job location matches
  if (location) {
    const jobLocation = (job.location || '').toLowerCase();
    const searchLocation = location.toLowerCase();
    if (!jobLocation.includes(searchLocation) && !searchLocation.includes(jobLocation)) {
      return false;
    }
  }

  return true;
};

/**
 * Search jobs on Arbeitnow.
 * Fetches multiple pages and applies client-side relevance filtering
 * since the API does not support keyword search.
 *
 * @param {Object} params
 * @param {string} params.query - Search keyword
 * @param {string} [params.location] - Location filter
 * @param {boolean} [params.remote] - Remote-only filter
 * @param {number} [params.page] - Page number (1-based, for pagination of filtered results)
 * @param {number} [params.limit] - Results per page
 * @returns {Promise<Object[]>} Array of filtered, relevance-sorted Arbeitnow job objects
 */
export const searchJobs = async ({ query, location, remote, page = 1, limit = 20 }) => {
  try {
    // Build query terms for relevance scoring
    const queryTerms = (query || '')
      .toLowerCase()
      .split(/[\s,;]+/)
      .map(t => t.trim())
      .filter(t => t.length >= 2); // Ignore very short terms

    // Fetch multiple pages to get a larger pool for filtering
    // More pages = better chance of finding relevant matches
    const pagesToFetch = queryTerms.length > 0 ? 4 : 2; // Fetch more when searching
    const fetchPromises = [];
    for (let i = 1; i <= pagesToFetch; i++) {
      fetchPromises.push(fetchPage(i));
    }

    const pageResults = await Promise.all(fetchPromises);
    const allJobs = pageResults.flat();

    if (allJobs.length === 0) {
      logger.info('[Arbeitnow] No jobs fetched from any page');
      return [];
    }

    // Apply location/remote filters
    let filtered = allJobs.filter(job => matchesFilters(job, location, remote));

    // Apply relevance filtering and scoring when query is present
    if (queryTerms.length > 0) {
      // Score each job
      const scored = filtered.map(job => ({
        job,
        score: scoreRelevance(job, queryTerms),
      }));

      // Filter out jobs with zero relevance score
      const relevant = scored.filter(s => s.score > 0);

      // Sort by relevance score (descending)
      relevant.sort((a, b) => b.score - a.score);

      filtered = relevant.map(s => s.job);

      logger.info(`[Arbeitnow] ${filtered.length} relevant jobs from ${allJobs.length} total (query: "${query}")`);
    } else {
      logger.info(`[Arbeitnow] ${filtered.length} jobs after location filter from ${allJobs.length} total`);
    }

    return filtered.slice(0, limit);
  } catch (err) {
    logger.error(`[Arbeitnow] Search failed: ${err.message}`);
    return [];
  }
};

export default { searchJobs };
