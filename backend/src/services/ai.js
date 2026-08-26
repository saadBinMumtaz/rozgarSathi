import env from '../config/env.js';
import validateJsonSchema from '../utils/jsonSchemaValidate.js';
import logger from '../utils/logger.js';

/**
 * Single Qwen entry point for the entire codebase.
 * No other file in the repository may make direct calls to Qwen API.
 */
export const callQwen = async ({ systemPrompt, userPrompt, requiredFields = [] }) => {
  const url = `${env.QWEN_API_URL.replace(/\/$/, '')}/chat/completions`;

  const makeRequest = async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'nemotron-3-ultra-550b-a55b:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        // response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API HTTP ${response.status}: ${errorText}`);
    }

    const jsonResponse = await response.json();
    const rawContent = jsonResponse?.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('Qwen API returned empty content');
    }

    // Clean JSON block syntax if present
    const cleanedContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsedData = JSON.parse(cleanedContent);

    const validation = validateJsonSchema(parsedData, requiredFields);
    if (!validation.valid) {
      throw new Error(`JSON schema validation failed: ${validation.reason}`);
    }

    return parsedData;
  };

  // Attempt 1
  try {
    return await makeRequest();
  } catch (err1) {
    logger.warn(`Qwen call attempt 1 failed: ${err1.message}. Retrying once...`);
    // Attempt 2 (Retry once on malformed JSON or transient error)
    try {
      return await makeRequest();
    } catch (err2) {
      logger.error(`Qwen call attempt 2 failed: ${err2.message}`);
      throw new Error(`Qwen AI Error: ${err2.message}`);
    }
  }
};

/**
 * Helper to check Qwen API connectivity for /api/health
 */
export const checkQwenHealth = async () => {
  if (!env.QWEN_API_KEY || env.QWEN_API_KEY.includes('demo-key')) {
    // If demo key or non-configured key, fallback check
    return Boolean(env.QWEN_API_KEY);
  }

  try {
    const url = `${env.QWEN_API_URL.replace(/\/$/, '')}/models`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.QWEN_API_KEY}`,
      },
    });
    return response.ok || response.status === 200 || response.status === 401;
  } catch (err) {
    logger.warn(`Qwen health check ping failed: ${err.message}`);
    return false;
  }
};

/**
 * High-level service function for Job Description Extraction
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
    'seniorityConfidence'
  ];

  try {
    return await callQwen({ systemPrompt, userPrompt, requiredFields });
  } catch (err) {
    logger.warn(`Qwen API extraction unavailable or failed (${err.message}). Using deterministic fallback parsing.`);

    // Pure deterministic extraction fallback if Qwen API fails or key is mock
    return fallbackExtractJD(jdText);
  }
};

/**
 * Deterministic fallback extractor for JD text
 */
const fallbackExtractJD = (jdText) => {
  const text = jdText.toLowerCase();

  // Extract role title
  let role = "Software Engineer";
  if (text.includes("frontend") || text.includes("react")) role = "Frontend Engineer";
  else if (text.includes("backend") || text.includes("node")) role = "Backend Engineer";
  else if (text.includes("fullstack") || text.includes("full stack")) role = "Full Stack Engineer";
  else if (text.includes("devops") || text.includes("cloud")) role = "DevOps Engineer";
  else if (text.includes("data") || text.includes("python")) role = "Data Engineer";

  // Skills heuristic
  const knownSkills = ["React", "Node.js", "JavaScript", "TypeScript", "Python", "MongoDB", "Express", "REST API", "GraphQL", "Docker", "AWS", "SQL", "Git"];
  const skills = knownSkills.filter(s => text.includes(s.toLowerCase()));
  if (skills.length === 0) skills.push("JavaScript", "Problem Solving");

  // Experience level
  let experienceLevel = "Mid-level";
  let seniorityConfidence = "medium";
  if (text.includes("senior") || text.includes("lead") || text.includes("5+ years") || text.includes("5+")) {
    experienceLevel = "Senior";
    seniorityConfidence = "high";
  } else if (text.includes("junior") || text.includes("entry") || text.includes("intern")) {
    experienceLevel = "Junior";
    seniorityConfidence = "high";
  } else if (!text.includes("year") && !text.includes("level")) {
    seniorityConfidence = "low";
  }

  return {
    role,
    skills,
    experienceLevel,
    keywords: skills.slice(0, 5),
    behavioralFocus: ["Teamwork", "Communication", "Problem Solving"],
    technicalFocus: skills.slice(0, 4),
    seniorityConfidence
  };
};

export default {
  callQwen,
  checkQwenHealth,
  extractJDAnalysis
};
