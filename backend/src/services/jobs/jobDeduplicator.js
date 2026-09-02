// backend/src/services/jobs/jobDeduplicator.js
// Deduplicates normalized job listings using multiple signals:
// 1. source + sourceJobId (exact same listing from same provider)
// 2. applicationUrl (same job posted via different paths)
// 3. normalized title + company + location (fuzzy match across providers)

/**
 * Deduplicate an array of normalized job objects.
 * Returns a new array with duplicates removed (first occurrence wins).
 * @param {Object[]} jobs - Array of normalized job objects
 * @returns {Object[]} Deduplicated array
 */
export const deduplicateJobs = (jobs) => {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];

  const seen = new Map(); // key → index in result array
  const result = [];

  for (const job of jobs) {
    if (!job) continue;

    // Signal 1: source + sourceJobId (strongest — exact match)
    const sourceKey = `${job.source}:${job.sourceJobId}`;
    if (seen.has(sourceKey)) continue;

    // Signal 2: applicationUrl (if present and unique)
    if (job.applicationUrl) {
      const urlKey = `url:${normalizeUrl(job.applicationUrl)}`;
      if (seen.has(urlKey)) continue;
      seen.set(urlKey, result.length);
    }

    // Signal 3: normalized title + company + location (cross-provider dedup)
    const fingerprintKey = `fp:${makeFingerprint(job)}`;
    if (seen.has(fingerprintKey)) continue;

    // Mark all keys as seen
    seen.set(sourceKey, result.length);
    seen.set(fingerprintKey, result.length);

    result.push(job);
  }

  return result;
};

/**
 * Normalize a URL for comparison (lowercase, strip trailing slash and query params).
 */
const normalizeUrl = (url) => {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/+$/, '');
  } catch {
    return url.toLowerCase().replace(/\/+$/, '');
  }
};

/**
 * Create a fingerprint from title + company + location for cross-provider dedup.
 * Normalizes whitespace, case, and strips common suffixes.
 */
const makeFingerprint = (job) => {
  const normalize = (str) =>
    (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const title = normalize(job.title);
  const company = normalize(job.company);
  const location = normalize(job.location);

  return `${title}|${company}|${location}`;
};

export default { deduplicateJobs };
