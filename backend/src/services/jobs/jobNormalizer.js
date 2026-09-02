// backend/src/services/jobs/jobNormalizer.js
// Normalizes provider-specific job objects into the common Rozgar Sathi job schema.
// Every provider must pass through here before results reach the frontend.

/**
 * Normalize an Arbeitnow job into the common schema.
 * @param {Object} job - Raw Arbeitnow job object
 * @returns {Object|null} Normalized job or null if unusable
 */
export const normalizeArbeitnow = (job) => {
  if (!job || !job.title) return null;

  // Arbeitnow provides description as HTML — strip tags for plain text
  const description = stripHtml(job.description || '');

  // Arbeitnow location can be a string or empty
  const location = job.location || 'Remote';

  // Parse skills from description if not explicitly provided
  const skills = extractSkillsFromText(description);

  return {
    id: `arbeitnow_${job.slug || job.id}`,
    source: 'arbeitnow',
    sourceJobId: String(job.slug || job.id),
    title: job.title || 'Unknown Title',
    company: job.company_name || job.company || 'Unknown Company',
    location,
    description,
    skills,
    employmentType: job.job_types?.[0] || job.contract_type || 'Full-time',
    salary: job.salary || null,
    postedAt: parseDate(job.created_at),
    applicationUrl: job.url || job.links?.apply || null,
    sourceUrl: job.url || null,
  };
};

/**
 * Normalize an Adzuna job into the common schema.
 * @param {Object} job - Raw Adzuna job object
 * @returns {Object|null} Normalized job or null if unusable
 */
export const normalizeAdzuna = (job) => {
  if (!job || !job.title) return null;

  const description = stripHtml(job.description || '');
  const location = job.location?.display_name || 'Unknown';

  // Adzuna provides salary as a structured object
  let salary = null;
  if (job.salary_min && job.salary_max) {
    salary = `${job.salary_min} - ${job.salary_max} ${job.salary_currency || ''}`.trim();
  } else if (job.salary_min) {
    salary = `From ${job.salary_min} ${job.salary_currency || ''}`.trim();
  }

  // Adzuna provides category as a tag
  const skills = [
    ...(job.category?.tag || '').split('/').filter(Boolean),
    ...extractSkillsFromText(description),
  ].filter(Boolean);

  // Deduplicate skills
  const uniqueSkills = [...new Set(skills.map(s => s.trim()))].slice(0, 15);

  return {
    id: `adzuna_${job.id}`,
    source: 'adzuna',
    sourceJobId: String(job.id),
    title: job.title || 'Unknown Title',
    company: job.company?.display_name || 'Unknown Company',
    location,
    description,
    skills: uniqueSkills,
    employmentType: job.contract_time || 'Full-time',
    salary,
    postedAt: parseDate(job.created),
    applicationUrl: job.redirect_url || null,
    sourceUrl: job.redirect_url || null,
  };
};

/**
 * Strip HTML tags from a string, returning plain text.
 */
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Extract common technical skills from job description text.
 * Uses a curated list of well-known tech keywords.
 */
const extractSkillsFromText = (text) => {
  if (!text) return [];
  const lower = text.toLowerCase();

  const knownSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
    'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'SQL', 'GraphQL',
    'React', 'Angular', 'Vue', 'Svelte', 'Next.js', 'Node.js', 'Express',
    'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Rails', 'Laravel',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'DynamoDB',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD',
    'REST API', 'REST', 'Microservices', 'Git', 'Linux', 'Agile', 'Scrum',
    'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch',
    'HTML', 'CSS', 'Tailwind', 'SASS', 'Webpack', 'Vite',
  ];

  return knownSkills.filter(skill => {
    const pattern = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${pattern}\\b`, 'i');
    return regex.test(lower);
  });
};

/**
 * Parse a date value into an ISO string.
 * Handles Unix timestamps (seconds) and ISO date strings.
 * @param {*} dateValue - Unix timestamp (seconds), ISO string, or null
 * @returns {string|null} ISO date string or null
 */
const parseDate = (dateValue) => {
  if (!dateValue) return null;

  // Unix timestamp in seconds (e.g., 1788357638) — convert to milliseconds
  if (typeof dateValue === 'number') {
    // Sanity check: timestamps should be > year 2000 (946684800 seconds)
    // and < year 2100 (4102444800 seconds)
    if (dateValue > 946684800 && dateValue < 4102444800) {
      return new Date(dateValue * 1000).toISOString();
    }
    // If it's already in milliseconds range, use directly
    if (dateValue > 946684800000 && dateValue < 4102444800000) {
      return new Date(dateValue).toISOString();
    }
    return null;
  }

  // ISO date string or other parseable format
  const parsed = new Date(dateValue);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export default {
  normalizeArbeitnow,
  normalizeAdzuna,
};
