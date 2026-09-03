// backend/src/services/resumeTailor.js
// AI-powered resume tailoring service — OpenRouter ONLY (no Groq).
// Pipeline: Resume text → OpenRouter extraction → OpenRouter JD analysis → OpenRouter tailoring → Validation → Result.

import env from '../config/env.js';
import logger from '../utils/logger.js';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── OpenRouter client ────────────────────────────────────────────────

/**
 * Generic OpenRouter call. Used for extraction, JD analysis, and tailoring.
 * No Groq fallback — if OpenRouter is not configured, throws immediately.
 */
const callOpenRouter = async (systemPrompt, userPrompt, { requiredFields = [], timeoutMs = 60000 } = {}) => {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured. Please set it in your .env file.');
  }
  if (!env.OPENROUTER_MODEL) {
    throw new Error('OPENROUTER_MODEL is not configured. Please set it in your .env file.');
  }

  const model = env.OPENROUTER_MODEL;
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.info(`[NVIDIA] Request started (attempt ${attempt}/${MAX_RETRIES}) — model=${model}`);

      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'Rozgar Sathi - Resume Tailor',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          logger.error(`[NVIDIA] Rate limit (429): ${errorText}`);
          throw new Error('Resume service is temporarily rate-limited. Please try again in a moment.');
        }
        logger.error(`[NVIDIA] HTTP ${response.status}: ${errorText}`);
        throw new Error('Resume service is temporarily unavailable. Please try again.');
      }

      const json = await response.json();
      const rawContent = json?.choices?.[0]?.message?.content;

      if (!rawContent) {
        // Log the response structure for debugging
        const finishReason = json?.choices?.[0]?.finish_reason || 'unknown';
        logger.warn(`[NVIDIA] Empty content (finish_reason: ${finishReason}, attempt ${attempt}/${MAX_RETRIES})`);

        if (attempt < MAX_RETRIES) {
          logger.info(`[NVIDIA] Retrying after empty response in ${attempt * 2}s...`);
          await delay(attempt * 2000);
          continue;
        }
        logger.error('[NVIDIA] Empty content after all retries');
        throw new Error('Resume service returned an empty result after multiple attempts. Please try again later.');
      }

      // Strip markdown fences some models add
      const cleaned = rawContent.replace(/```json\s*\n?/g, '').replace(/```\s*\n?/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        logger.warn(`[NVIDIA] Malformed JSON (attempt ${attempt}/${MAX_RETRIES}): ${parseErr.message}`);
        if (attempt < MAX_RETRIES) {
          logger.info('[NVIDIA] Retrying after malformed JSON...');
          continue; // retry
        }
        throw new Error('Resume service produced an invalid result after multiple attempts. Please try again later.');
      }

      // Validate required top-level fields
      if (requiredFields.length > 0) {
        const missing = requiredFields.filter(f => !parsed[f]);
        if (missing.length > 0) {
          logger.warn(`[NVIDIA] Missing fields: ${missing.join(', ')} (attempt ${attempt}/${MAX_RETRIES})`);
          if (attempt < MAX_RETRIES) {
            logger.info('[NVIDIA] Retrying after incomplete response...');
            continue; // retry
          }
          throw new Error('Resume service produced an incomplete result after multiple attempts. Please try again later.');
        }
      }

      logger.info(`[NVIDIA] Request completed successfully (attempt ${attempt})`);
      return parsed;
    } catch (err) {
      clearTimeout(timeout);

      if (err.name === 'AbortError') {
        logger.error(`[NVIDIA] Timeout (attempt ${attempt}/${MAX_RETRIES})`);
        if (attempt < MAX_RETRIES) {
          logger.info('[NVIDIA] Retrying after timeout...');
          continue; // retry
        }
        throw new Error('Resume service timed out after multiple attempts. Please try again later.');
      }

      // Non-retryable errors — throw immediately
      if (err.message && (
        err.message.startsWith('Resume service') ||
        err.message.startsWith('OPENROUTER_')
      )) {
        // If it's a "multiple attempts" error, throw as-is
        if (err.message.includes('multiple attempts')) throw err;
        // If it's a rate limit, don't retry
        if (err.message.includes('rate-limited')) throw err;
        // Otherwise retry
        if (attempt < MAX_RETRIES) {
          logger.warn(`[NVIDIA] Error (attempt ${attempt}): ${err.message} — retrying...`);
          continue;
        }
        throw err;
      }

      logger.error(`[NVIDIA] Network error (attempt ${attempt}): ${err.message}`);
      if (attempt < MAX_RETRIES) {
        logger.info('[NVIDIA] Retrying after network error...');
        continue;
      }
      throw new Error('Resume service is temporarily unavailable after multiple attempts. Please try again later.');
    }
  }
};

// ─── Resume extraction (OpenRouter only) ──────────────────────────────

/**
 * Extract comprehensive structured data from original resume using OpenRouter.
 * This is the "source of truth" for validation.
 */
export const extractFullResumeData = async (resumeText) => {
  const systemPrompt = `You are an expert resume parser. Extract ALL information from the resume text into structured JSON.
Do NOT summarize, omit, or skip ANY section. Every project, job, degree, certification, and skill must be captured.

Return ONLY valid JSON matching this schema:
{
  "contact": {
    "name": "Full name",
    "email": "Email address",
    "phone": "Phone number",
    "address": "Address/location",
    "linkedin": "LinkedIn URL EXACTLY as it appears in the resume (e.g. https://www.linkedin.com/in/username)",
    "github": "GitHub URL EXACTLY as it appears in the resume (e.g. https://github.com/username)",
    "portfolio": "Portfolio URL EXACTLY as it appears in the resume"
  },
  "summary": "Professional summary/objective if present",
  "skills": {
    "technical": ["Array of all technical skills mentioned"],
    "soft": ["Array of soft skills mentioned"],
    "tools": ["Array of tools/frameworks mentioned"]
  },
  "experience": [
    {
      "company": "Company name",
      "title": "Job title",
      "startDate": "Start date (month year)",
      "endDate": "End date or Present",
      "duration": "Duration if mentioned",
      "responsibilities": ["Array of responsibilities/achievements"],
      "technologies": ["Technologies used in this role"]
    }
  ],
  "education": [
    {
      "institution": "Institution name",
      "degree": "Degree name",
      "field": "Field of study",
      "graduationDate": "Graduation date",
      "gpa": "GPA if mentioned",
      "relevantCoursework": ["Relevant courses if mentioned"]
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "Brief description",
      "technologies": ["Technologies used"],
      "achievements": ["Key achievements/features"]
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization",
      "date": "Date obtained"
    }
  ],
  "languages": ["Languages spoken if mentioned"],
  "achievements": ["Notable achievements/awards"],
  "allTechnologiesMentioned": ["Complete list of every technology/tool/framework mentioned anywhere in resume"]
}

CRITICAL: Extract EVERY detail. Do not summarize or omit anything.
URLs MUST be copied EXACTLY as they appear in the resume text — do not add, remove, or change any part of the URL (protocol, www, path, etc.).`;

  const userPrompt = `Resume text:\n"""\n${resumeText}\n"""`;

  logger.info(`[NVIDIA] Resume extraction started (${resumeText.length} chars)`);
  const result = await callOpenRouter(systemPrompt, userPrompt, {
    requiredFields: ['contact', 'skills'],
  });
  logger.info(`[NVIDIA] Resume extraction completed — ${result.projects?.length || 0} projects, ${result.education?.length || 0} education entries`);
  return result;
};

// ─── JD analysis (OpenRouter only) ────────────────────────────────────

/**
 * Analyze job description using OpenRouter.
 */
export const analyzeJD = async (jdText) => {
  const systemPrompt = `You are an expert technical HR analyst. Analyze the job description and extract structured information.
Return ONLY valid JSON matching this schema:
{
  "role": "Job title or role name",
  "skills": ["Array of specific technical skills required"],
  "experienceLevel": "Entry | Mid | Senior | Lead | Executive",
  "keywords": ["Array of relevant keywords"],
  "behavioralFocus": ["Array of behavioral focus areas"],
  "technicalFocus": ["Array of primary technical competencies"],
  "seniorityConfidence": "high" | "medium" | "low"
}`;

  const userPrompt = `Job Description:\n"""\n${jdText}\n"""`;

  logger.info('[NVIDIA] JD analysis started');
  const result = await callOpenRouter(systemPrompt, userPrompt, {
    requiredFields: ['role', 'skills'],
  });
  logger.info(`[NVIDIA] JD analysis completed — role: ${result.role}`);
  return result;
};

// ─── Tailoring (OpenRouter only) ──────────────────────────────────────

/**
 * Generate tailored resume JSON based on original data + JD.
 * Uses the comprehensive anti-hallucination prompt.
 */
export const generateTailoredResume = async (originalResumeData, jdAnalysis, jdText, originalResumeTextLength) => {
  const systemPrompt = `You are an expert ATS resume tailoring system.

Your task: rewrite the candidate's resume to maximize its match with the target JOB DESCRIPTION.

═══ YOU MUST MAKE SUBSTANTIVE CHANGES ═══

Simply copying the original resume is a FAILURE. You MUST actively:

1. REWRITE every bullet point in Projects and Experience:
   - Use strong action verbs (Built, Developed, Designed, Implemented, Led, Optimized)
   - Emphasize aspects relevant to the JD
   - Add JD keywords where supported by the candidate's actual experience
   - Make each bullet results-oriented where possible

2. REORDER skills by JD relevance:
   - Skills mentioned in the JD go FIRST in each category
   - Less relevant skills go later
   - Categorize properly into languages, frameworks, databases, developerTools, softSkills

3. REWRITE the professional summary:
   - Create a 1-2 sentence summary that directly aligns the candidate with the JD role
   - Mention the most relevant technologies and experience areas

4. REORDER projects by JD relevance:
   - Most relevant projects first
   - Rewrite each project's bullets to emphasize JD-relevant aspects

5. IMPROVE coursework selection:
   - If the original has coursework, keep only the most JD-relevant courses

═══ FACTUAL ACCURACY — NON-NEGOTIABLE ═══

While you MUST make the changes above, you MUST NOT:
- Invent skills, technologies, companies, projects, dates, metrics, or certifications
- Add a technology not present in the original resume
- Fabricate achievements, metrics, or responsibilities
- Change dates, company names, job titles, degrees, or institutions

If a JD keyword is NOT supported by the original resume, do NOT add it — list it in analysis.missingSkills instead.

═══ EXAMPLE OF EXPECTED CHANGE ═══

Original bullet: "Worked on a web app using React and Node.js"
JD mentions: React, TypeScript, REST APIs, MongoDB

GOOD tailored bullet: "Developed a full-stack web application using React and Node.js, implementing RESTful APIs and integrating MongoDB for data persistence"

BAD (no change): "Worked on a web app using React and Node.js"
BAD (fabricated): "Worked on a web app using React, TypeScript, and GraphQL"  ← TypeScript/GraphQL not in original

═══ OUTPUT JSON SCHEMA ═══

{
  "tailoredResume": {
    "contact": {
      "name": "exact original name",
      "email": "exact original email",
      "phone": "exact original phone",
      "linkedin": "EXACT original URL verbatim — do not modify any part",
      "github": "EXACT original URL verbatim — do not modify any part",
      "portfolio": "EXACT original URL verbatim — do not modify any part"
    },
    "summary": "NEW 1-2 sentence summary directly aligned to the JD role",
    "education": [
      {
        "institution": "same as original",
        "degree": "same as original",
        "field": "same as original",
        "dates": "same as original",
        "gpa": "same as original",
        "coursework": ["JD-relevant courses from original only"]
      }
    ],
    "projects": [
      {
        "name": "exact project name from original",
        "subtitle": "brief JD-relevant descriptor",
        "bullets": [
          "REWRITTEN bullet with strong action verb, JD keywords, results focus",
          "REWRITTEN bullet emphasizing different JD-relevant aspect"
        ],
        "technologies": ["exact technologies from original"]
      }
    ],
    "skills": {
      "languages": ["REORDERED: JD-relevant first"],
      "frameworks": ["REORDERED: JD-relevant first"],
      "databases": ["REORDERED: JD-relevant first"],
      "developerTools": ["REORDERED: JD-relevant first"],
      "softSkills": ["REORDERED: JD-relevant first"]
    },
    "certifications": [
      { "name": "from original", "issuer": "from original", "date": "from original" }
    ],
    "experience": [
      {
        "company": "same as original",
        "title": "same as original",
        "startDate": "same as original",
        "endDate": "same as original",
        "bullets": ["REWRITTEN with action verbs and JD emphasis using ONLY original facts"]
      }
    ]
  },
  "analysis": {
    "matchScore": 0-100,
    "matchedSkills": ["skills from JD found in resume"],
    "missingSkills": ["skills from JD NOT in resume"],
    "changesMade": ["SPECIFIC changes: e.g. 'Rewrote Project X bullets to emphasize React and REST APIs', 'Moved MongoDB before SQL in databases', 'Rewrote summary to highlight full-stack experience'"]
  }
}

COMPLETENESS CHECKLIST (verify internally before outputting):
1. Every original section is represented.
2. Every job/employer is represented.
3. Every education entry is represented.
4. Every project is present with REWRITTEN bullets.
5. Every certification is represented.
6. Skills are REORDERED by JD relevance.
7. No placeholders like "...", "[insert]", "[add]".
8. Every bullet point is DIFFERENT from the original (rephrased, improved).
9. The result is a FULL resume suitable for downloading.`;

  const userPrompt = `ORIGINAL RESUME DATA:
${JSON.stringify(originalResumeData, null, 2)}

JOB DESCRIPTION:
${jdText}

Tailor this resume for the job above. REWRITE every bullet point, REORDER skills by relevance, and WRITE a new summary. Do not copy the original verbatim. Do not invent any facts.`;

  logger.info('[NVIDIA] Tailoring started');
  const result = await callOpenRouter(systemPrompt, userPrompt, {
    requiredFields: ['tailoredResume', 'analysis'],
  });
  logger.info('[NVIDIA] Tailoring completed');

  // ── Validate completeness ──
  const completeness = validateCompleteness(originalResumeData, result.tailoredResume, originalResumeTextLength);
  if (!completeness.valid) {
    logger.warn(`[NVIDIA] Completeness check FAILED: ${completeness.reason}`);
    result.validationWarning = completeness.reason;
    result.completenessFailed = true;
  } else {
    logger.info('[NVIDIA] Completeness validation passed');
  }

  // ── Validate no fabricated skills ──
  const fabrication = validateNoFabrication(originalResumeData, result.tailoredResume);
  if (!fabrication.valid) {
    logger.warn(`[NVIDIA] Fabrication check FAILED: ${fabrication.reason}`);
    result.validationWarning = (result.validationWarning ? result.validationWarning + '; ' : '') + fabrication.reason;
  }

  return result;
};

// ─── Validation: Completeness ─────────────────────────────────────────

/**
 * Validate that the tailored resume is complete — no sections/entries lost.
 */
const validateCompleteness = (original, tailored, originalTextLength) => {
  const issues = [];

  // 1. Check education count
  const origEduCount = original?.education?.length || 0;
  const tailoredEduCount = tailored?.education?.length || 0;
  if (origEduCount > 0 && tailoredEduCount === 0) {
    issues.push('All education entries were removed');
  } else if (origEduCount > 0 && tailoredEduCount < origEduCount) {
    issues.push(`Education entries reduced from ${origEduCount} to ${tailoredEduCount}`);
  }

  // 2. Check project count
  const origProjCount = original?.projects?.length || 0;
  const tailoredProjCount = tailored?.projects?.length || 0;
  if (origProjCount > 0 && tailoredProjCount === 0) {
    issues.push('All projects were removed');
  } else if (origProjCount > 0 && tailoredProjCount < origProjCount) {
    issues.push(`Projects reduced from ${origProjCount} to ${tailoredProjCount}`);
  }

  // 3. Check certifications count
  const origCertCount = original?.certifications?.length || 0;
  const tailoredCertCount = tailored?.certifications?.length || 0;
  if (origCertCount > 0 && tailoredCertCount === 0) {
    issues.push('All certifications were removed');
  }

  // 4. Check experience count
  const origExpCount = original?.experience?.length || 0;
  const tailoredExpCount = tailored?.experience?.length || 0;
  if (origExpCount > 0 && tailoredExpCount === 0) {
    issues.push('All work experience was removed');
  }

  // 5. Check contact name preserved
  if (original?.contact?.name && original.contact.name !== 'Unknown') {
    if (!tailored?.contact?.name || tailored.contact.name === 'Unknown') {
      issues.push('Candidate name was lost');
    }
  }

  // 6. Check skills not completely empty
  const tailoredSkillCounts = [
    ...(tailored?.skills?.languages || []),
    ...(tailored?.skills?.frameworks || []),
    ...(tailored?.skills?.databases || []),
    ...(tailored?.skills?.developerTools || []),
    ...(tailored?.skills?.technical || []),
    ...(tailored?.skills?.tools || []),
  ];
  if (tailoredSkillCounts.length === 0) {
    issues.push('All skills were removed');
  }

  // 7. Length check — estimate tailored content length
  const tailoredJsonLength = JSON.stringify(tailored).length;
  if (originalTextLength && originalTextLength > 200) {
    // Tailored JSON should be at least 40% of original text length (JSON has overhead)
    const minLength = Math.floor(originalTextLength * 0.4);
    if (tailoredJsonLength < minLength) {
      issues.push(`Output suspiciously short (${tailoredJsonLength} chars vs original ${originalTextLength} chars)`);
    }
  }

  // 8. Check for placeholders
  const tailoredStr = JSON.stringify(tailored).toLowerCase();
  if (tailoredStr.includes('[insert') || tailoredStr.includes('[add') || tailoredStr.includes('...')) {
    issues.push('Output contains placeholders ("...", "[insert]", "[add]")');
  }

  return {
    valid: issues.length === 0,
    reason: issues.length > 0 ? issues.join('; ') : '',
  };
};

// ─── Validation: No fabrication ───────────────────────────────────────

/**
 * Validate that tailored resume doesn't contain fabricated information.
 */
const validateNoFabrication = (original, tailored) => {
  const originalSkills = new Set([
    ...(original.skills?.technical || []),
    ...(original.skills?.tools || []),
    ...(original.skills?.languages || []),
    ...(original.skills?.frameworks || []),
    ...(original.skills?.databases || []),
    ...(original.skills?.developerTools || []),
    ...(original.allTechnologiesMentioned || [])
  ].map(s => s.toLowerCase()));

  const tailoredSkillCategories = ['languages', 'frameworks', 'databases', 'developerTools', 'softSkills', 'technical', 'tools'];
  const allTailoredSkills = [];
  tailoredSkillCategories.forEach(cat => {
    if (tailored.skills?.[cat]) {
      allTailoredSkills.push(...tailored.skills[cat]);
    }
  });

  const fabricatedSkills = allTailoredSkills.filter(
    skill => !originalSkills.has(skill.toLowerCase())
  );

  if (fabricatedSkills.length > 0) {
    return {
      valid: false,
      reason: `Potential fabricated skills detected: ${fabricatedSkills.join(', ')}`,
    };
  }

  return { valid: true };
};

// ─── Fallback: deterministic JD analysis (no AI) ──────────────────────

/**
 * Fallback JD analysis using simple keyword extraction — no AI needed.
 * Used when OpenRouter is completely unavailable to keep the pipeline alive.
 */
const analyzeJDFallback = (jdText) => {
  logger.warn('[Pipeline] Using deterministic JD analysis fallback (no AI)');
  const lower = jdText.toLowerCase();
  const TECH = [
    'javascript','typescript','python','java','c++','c#','ruby','go','golang','rust','kotlin','swift','php','scala','r',
    'react','angular','vue','svelte','next.js','nextjs','nuxt','express','node.js','nodejs','django','flask','spring','fastapi','nestjs','rails',
    'sql','postgresql','mysql','mongodb','redis','elasticsearch','dynamodb','firebase','supabase','cassandra','sqlite',
    'aws','azure','gcp','docker','kubernetes','jenkins','ci/cd','terraform','linux','git',
    'html','css','sass','tailwind','bootstrap','webpack','vite','graphql','rest','api','microservices','agile','scrum',
    'machine learning','deep learning','nlp','computer vision','data science','tensorflow','pytorch',
    'figma','jira','confluence','postman','vscode','intellij',
  ];
  const found = TECH.filter(t => lower.includes(t));
  const remaining = found.slice(5);
  return {
    role: 'Target Role (basic extraction)',
    skills: found.slice(0, 15),
    experienceLevel: 'Mid',
    keywords: found,
    behavioralFocus: ['teamwork', 'communication', 'problem-solving'],
    technicalFocus: remaining.length > 0 ? remaining : found.slice(0, 5),
    seniorityConfidence: 'low',
    _fallback: true,
  };
};

// ─── Fallback: deterministic resume reordering (no AI) ────────────────

/**
 * Fallback tailoring: reorder original resume sections by JD relevance.
 * Preserves ALL original data — just reorders and does basic bullet improvements.
 * Used when OpenRouter is completely unavailable.
 */
const reorderByJD = (originalResumeData, jdAnalysis) => {
  logger.warn('[Pipeline] Using deterministic resume reordering fallback (no AI)');
  const keywords = [
    ...(jdAnalysis.skills || []),
    ...(jdAnalysis.keywords || []),
  ].map(k => k.toLowerCase());

  const orig = originalResumeData;

  const tailoredResume = {
    contact: { ...(orig.contact || {}) },
    summary: orig.summary || '',
    education: (orig.education || []).map(e => ({ ...e })),
    projects: [],
    skills: {},
    certifications: (orig.certifications || []).map(c => ({ ...c })),
    experience: [],
  };

  // Reorder skills by JD relevance
  const reorder = (arr) => {
    if (!arr?.length) return [];
    const matched = arr.filter(s => keywords.includes(s.toLowerCase()));
    const rest = arr.filter(s => !keywords.includes(s.toLowerCase()));
    return [...matched, ...rest];
  };
  tailoredResume.skills = {
    languages: reorder(orig.skills?.languages),
    frameworks: reorder(orig.skills?.frameworks),
    databases: reorder(orig.skills?.databases),
    developerTools: reorder(orig.skills?.developerTools),
    softSkills: reorder(orig.skills?.softSkills || orig.skills?.soft),
    technical: reorder(orig.skills?.technical),
    tools: reorder(orig.skills?.tools),
  };

  // Reorder projects by JD relevance
  const scoredProjects = (orig.projects || []).map((p, i) => {
    const text = [p.name, p.description, ...(p.technologies || []), ...(p.achievements || []), ...(p.bullets || [])]
      .join(' ').toLowerCase();
    const score = keywords.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0);
    return { project: { ...p }, score, origIdx: i };
  });
  scoredProjects.sort((a, b) => b.score - a.score);
  tailoredResume.projects = scoredProjects.map(sp => ({
    ...sp.project,
    bullets: sp.project.bullets || (sp.project.description ? [sp.project.description] : []),
  }));

  // Reorder experience bullets by relevance
  tailoredResume.experience = (orig.experience || []).map(exp => ({
    ...exp,
    bullets: exp.responsibilities || exp.bullets || [],
  }));

  return {
    tailoredResume,
    analysis: {
      matchScore: 40,
      matchedSkills: keywords.filter(kw =>
        JSON.stringify(orig.skills).toLowerCase().includes(kw)
      ).slice(0, 15),
      missingSkills: keywords.filter(kw =>
        !JSON.stringify(orig.skills).toLowerCase().includes(kw)
      ).slice(0, 10),
      changesMade: [
        'Reordered skills by job description relevance (basic — AI tailoring unavailable)',
        'Reordered projects by job description relevance',
        'Preserved all original content without modification',
      ],
      _fallback: true,
    },
  };
};

export default { extractFullResumeData, analyzeJD, generateTailoredResume, analyzeJDFallback, reorderByJD };
