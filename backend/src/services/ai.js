// backend/src/services/ai.js
// Central Groq AI service — single entry point for ALL LLM calls.
// No other file in the repository may call the Groq API directly.
// Architecture: All AI Features → callAI() → Groq API → Return Result

import env from '../config/env.js';
import validateJsonSchema from '../utils/jsonSchemaValidate.js';
import logger from '../utils/logger.js';

const GROQ_ENDPOINT = `${(env.GROQ_API_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '')}/chat/completions`;
const GROQ_MODEL = env.GROQ_MODEL || 'openai/gpt-oss-20b';

// HTTP status codes that should NOT be retried (permanent failures)
const PERMANENT_ERROR_STATUSES = new Set([400, 401, 403, 404]);

// HTTP status codes that SHOULD be retried once (transient failures)
const TRANSIENT_ERROR_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Determine if an error is a permanent (non-retryable) failure.
 */
const isPermanentError = (status, message = '') => {
  if (PERMANENT_ERROR_STATUSES.has(status)) return true;
  if (message.includes('model_not_found') || message.includes('invalid_request_error')) return true;
  return false;
};

/**
 * Determine if an error is transient (retryable).
 */
const isTransientError = (status) => {
  return TRANSIENT_ERROR_STATUSES.has(status);
};

/**
 * Make a single Groq API request.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>} Raw content from the API
 */
const makeGroqRequest = async (systemPrompt, userPrompt) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`Groq API HTTP ${response.status}: ${errorText}`);
      err.status = response.status;
      err.body = errorText;
      throw err;
    }

    const jsonResponse = await response.json();
    const rawContent = jsonResponse?.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('Groq API returned empty content');
    }

    return rawContent;
  } catch (err) {
    clearTimeout(timeout);
    // Re-throw with status info if it's already a structured error
    if (err.status) throw err;
    // Network/timeout errors
    const wrapped = new Error(`Groq API network error: ${err.message}`);
    wrapped.status = 0; // 0 = network/timeout, treat as transient
    throw wrapped;
  }
};

/**
 * Safely parse and validate JSON from AI response.
 * Strips markdown fences, parses, validates schema.
 */
const parseAndValidateJSON = (rawContent, requiredFields) => {
  // Strip markdown JSON fences
  const cleaned = rawContent.replace(/```json\s*\n?/g, '').replace(/```\s*\n?/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`JSON parse failed: ${err.message}`);
  }

  if (requiredFields.length > 0) {
    const validation = validateJsonSchema(parsed, requiredFields);
    if (!validation.valid) {
      throw new Error(`JSON schema validation failed: ${validation.reason}`);
    }
  }

  return parsed;
};

/**
 * Primary AI entry point for the entire codebase.
 * Groq-only. Smart retry: retries transient errors once, fails immediately on permanent errors.
 *
 * @param {Object} params
 * @param {string} params.systemPrompt - System prompt for the LLM
 * @param {string} params.userPrompt - User prompt for the LLM
 * @param {string[]} [params.requiredFields=[]] - Required JSON fields to validate
 * @returns {Promise<Object>} Parsed and validated JSON response
 */
export const callAI = async ({ systemPrompt, userPrompt, requiredFields = [] }) => {
  if (!env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  // Attempt 1
  try {
    const rawContent = await makeGroqRequest(systemPrompt, userPrompt);
    return parseAndValidateJSON(rawContent, requiredFields);
  } catch (err) {
    // If permanent error, fail immediately — no retry
    if (err.status && isPermanentError(err.status, err.body)) {
      logger.error(`Groq permanent error (no retry): ${err.message}`);
      throw new Error(`Groq AI Error: ${err.message}`);
    }

    // If transient error, retry once
    if (err.status === 0 || err.status === undefined || isTransientError(err.status)) {
      logger.warn(`Groq transient error, retrying once: ${err.message}`);
    } else {
      // Unknown error type — retry once to be safe
      logger.warn(`Groq call failed, retrying once: ${err.message}`);
    }

    // Attempt 2 (final)
    try {
      const rawContent = await makeGroqRequest(systemPrompt, userPrompt);
      return parseAndValidateJSON(rawContent, requiredFields);
    } catch (err2) {
      logger.error(`Groq call failed after retry: ${err2.message}`);
      throw new Error(`Groq AI Error: ${err2.message}`);
    }
  }
};

/**
 * Health check for Groq API connectivity.
 * Used by /api/health endpoint.
 * @returns {Promise<boolean>}
 */
export const checkAIHealth = async () => {
  if (!env.GROQ_API_KEY || env.GROQ_API_KEY.includes('demo-key')) {
    return false;
  }

  try {
    const modelsUrl = `${(env.GROQ_API_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '')}/models`;
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      },
    });
    return response.ok;
  } catch (err) {
    logger.warn(`Groq health check failed: ${err.message}`);
    return false;
  }
};

/**
 * High-level service function for Job Description Extraction.
 * Falls back to deterministic parsing if Groq fails.
 */
export const extractJDAnalysis = async (jdText) => {
  const systemPrompt = `You are an expert technical interviewer and HR analyst.
Analyze the following Job Description (JD) text and extract structured information into JSON format.
Return ONLY valid JSON matching this schema:
{
  "role": "Job title or role name (e.g. Senior Frontend Engineer)",
  "skills": ["Array of specific technical skills extracted"],
  "experienceLevel": "Entry | Mid | Senior | Lead | Executive",
  "keywords": ["Array of relevant keywords"],
  "behavioralFocus": ["Array of behavioral focus areas like Teamwork, Communication, Problem Solving"],
  "technicalFocus": ["Array of primary technical competencies required"],
  "seniorityConfidence": "high" | "medium" | "low"
}`;

  const userPrompt = `Job Description:\n"""\n${jdText}\n"""`;

  const requiredFields = [
    'role',
    'skills',
    'experienceLevel',
    'keywords',
    'behavioralFocus',
    'technicalFocus',
    'seniorityConfidence',
  ];

  try {
    return await callAI({ systemPrompt, userPrompt, requiredFields });
  } catch (err) {
    logger.warn(`Groq JD extraction failed (${err.message}). Using deterministic fallback.`);
    return fallbackExtractJD(jdText);
  }
};

/**
 * Deterministic fallback extractor for JD text.
 * Used when Groq API is unavailable.
 */
const fallbackExtractJD = (jdText) => {
  const text = jdText.toLowerCase();

  let role = 'Software Engineer';
  if (text.includes('frontend') || text.includes('react')) role = 'Frontend Engineer';
  else if (text.includes('backend') || text.includes('node')) role = 'Backend Engineer';
  else if (text.includes('fullstack') || text.includes('full stack')) role = 'Full Stack Engineer';
  else if (text.includes('devops') || text.includes('cloud')) role = 'DevOps Engineer';
  else if (text.includes('data') || text.includes('python')) role = 'Data Engineer';

  const knownSkills = [
    'React', 'Node.js', 'JavaScript', 'TypeScript', 'Python', 'MongoDB',
    'Express', 'REST API', 'GraphQL', 'Docker', 'AWS', 'SQL', 'Git',
  ];
  const skills = knownSkills.filter((s) => text.includes(s.toLowerCase()));
  if (skills.length === 0) skills.push('JavaScript', 'Problem Solving');

  let experienceLevel = 'Mid-level';
  let seniorityConfidence = 'medium';
  if (text.includes('senior') || text.includes('lead') || text.includes('5+ years') || text.includes('5+')) {
    experienceLevel = 'Senior';
    seniorityConfidence = 'high';
  } else if (text.includes('junior') || text.includes('entry') || text.includes('intern')) {
    experienceLevel = 'Junior';
    seniorityConfidence = 'high';
  } else if (!text.includes('year') && !text.includes('level')) {
    seniorityConfidence = 'low';
  }

  return {
    role,
    skills,
    experienceLevel,
    keywords: skills.slice(0, 5),
    behavioralFocus: ['Teamwork', 'Communication', 'Problem Solving'],
    technicalFocus: skills.slice(0, 4),
    seniorityConfidence,
  };
};

export default {
  callAI,
  checkAIHealth,
  extractJDAnalysis,
};
