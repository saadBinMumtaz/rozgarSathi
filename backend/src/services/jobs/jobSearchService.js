// backend/src/services/jobs/jobSearchService.js
// Orchestrates job search across all providers, normalizes results, deduplicates,
// and provides lightweight caching via MongoDB.

import { searchJobs as searchArbeitnow } from './providers/arbeitnowProvider.js';
import { searchJobs as searchAdzuna } from './providers/adzunaProvider.js';
import { normalizeArbeitnow, normalizeAdzuna } from './jobNormalizer.js';
import { deduplicateJobs } from './jobDeduplicator.js';
import logger from '../../utils/logger.js';

// In-memory cache for search results (lightweight, short-lived).
// Key: normalized query string, Value: { results, timestamp }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map();

/**
 * Search for jobs across all configured providers.
 * Results are normalized, deduplicated, and cached.
 *
 * @param {Object} params
 * @param {string} params.query - Search keyword
 * @param {string} [params.location] - Location filter
 * @param {boolean} [params.remote] - Remote-only filter
 * @param {number} [params.page] - Page number (1-based)
 * @param {number} [params.limit] - Results per page
 * @returns {Promise<Object>} { jobs, providers, errors }
 */
export const searchAllProviders = async ({ query, location, remote, page = 1, limit = 20 }) => {
  // Check cache first (only for page 1 to avoid stale pagination)
  const cacheKey = makeCacheKey({ query, location, remote, page });
  if (page === 1) {
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.info(`[JobSearch] Cache hit for: ${cacheKey}`);
      return cached.results;
    }
  }

  // Sanitize inputs
  const sanitizedQuery = sanitizeInput(query || '', 100);
  const sanitizedLocation = sanitizeInput(location || '', 100);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const searchParams = {
    query: sanitizedQuery,
    location: sanitizedLocation,
    remote: Boolean(remote),
    page: safePage,
    limit: safeLimit,
  };

  // Call all providers in parallel — each catches its own errors
  const [arbeitnowRaw, adzunaRaw] = await Promise.allSettled([
    searchArbeitnow(searchParams),
    searchAdzuna(searchParams),
  ]);

  const providerStatus = {
    arbeitnow: { ok: arbeitnowRaw.status === 'fulfilled', count: 0 },
    adzuna: { ok: adzunaRaw.status === 'fulfilled', count: 0 },
  };

  // Normalize results from each provider
  const allNormalized = [];

  if (arbeitnowRaw.status === 'fulfilled') {
    const jobs = (arbeitnowRaw.value || [])
      .map(normalizeArbeitnow)
      .filter(Boolean);
    providerStatus.arbeitnow.count = jobs.length;
    allNormalized.push(...jobs);
  } else {
    logger.error(`[JobSearch] Arbeitnow failed: ${arbeitnowRaw.reason}`);
  }

  if (adzunaRaw.status === 'fulfilled') {
    const jobs = (adzunaRaw.value || [])
      .map(normalizeAdzuna)
      .filter(Boolean);
    providerStatus.adzuna.count = jobs.length;
    allNormalized.push(...jobs);
  } else {
    logger.error(`[JobSearch] Adzuna failed: ${adzunaRaw.reason}`);
  }

  // Deduplicate
  const deduplicated = deduplicateJobs(allNormalized);

  // Build result
  const result = {
    jobs: deduplicated,
    providers: providerStatus,
    totalResults: deduplicated.length,
    page: safePage,
    limit: safeLimit,
  };

  // Cache for page 1
  if (safePage === 1 && deduplicated.length > 0) {
    searchCache.set(cacheKey, { results: result, timestamp: Date.now() });
  }

  // Evict old cache entries
  evictStaleCache();

  return result;
};

/**
 * Build a cache key from search parameters.
 */
const makeCacheKey = ({ query, location, remote, page }) => {
  return `${(query || '').toLowerCase().trim()}:${(location || '').toLowerCase().trim()}:${remote ? 'r' : 'a'}:${page}`;
};

/**
 * Sanitize user input: trim, collapse whitespace, limit length.
 */
const sanitizeInput = (str, maxLen) => {
  return str
    .replace(/[<>]/g, '') // Strip angle brackets
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
};

/**
 * Remove stale cache entries older than 2x TTL.
 */
const evictStaleCache = () => {
  const cutoff = Date.now() - CACHE_TTL_MS * 2;
  for (const [key, val] of searchCache) {
    if (val.timestamp < cutoff) {
      searchCache.delete(key);
    }
  }
};

export default { searchAllProviders };
