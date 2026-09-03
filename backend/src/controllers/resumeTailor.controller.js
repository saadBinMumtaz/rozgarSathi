// backend/src/controllers/resumeTailor.controller.js
// Handles resume tailoring: upload resume + JD, return tailored resume.
// ALL AI calls go through OpenRouter (NVIDIA) — no Groq in this pipeline.

import multer from 'multer';
import { extractTextFromFile } from '../services/resumeParser.js';
import { extractFullResumeData, analyzeJD, generateTailoredResume } from '../services/resumeTailor.js';
import resumeTailor from '../services/resumeTailor.js';
import logger from '../utils/logger.js';

// Multer config: store files in memory (buffer) for parsing
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const uploadMiddleware = upload.single('resume');

/**
 * Extract URLs directly from raw resume text via regex.
 * This is more reliable than AI extraction for preserving exact URLs.
 */
const extractURLsFromText = (text) => {
  const urls = {};
  const urlRegex = /https?:\/\/(?:www\.)?([^\s\)\]\,\;\"\'<>]+)/gi;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const fullUrl = match[0];
    const afterProtocol = match[1].toLowerCase();
    if (afterProtocol.includes('linkedin.com/') && !urls.linkedin) {
      urls.linkedin = fullUrl.replace(/[\)\]\,\;]+$/, '');
    } else if (afterProtocol.includes('github.com/') && !urls.github) {
      urls.github = fullUrl.replace(/[\)\]\,\;]+$/, '');
    } else if (!urls.portfolio && !afterProtocol.includes('linkedin.com') && !afterProtocol.includes('github.com')) {
      urls.portfolio = fullUrl.replace(/[\)\]\,\;]+$/, '');
    }
  }
  // Also capture email
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) urls.email = emailMatch[0];
  return urls;
};

/**
 * POST /api/resume/tailor
 * Accepts: resume file (multipart) + jobDescription (form field)
 * Returns: tailored resume JSON + analysis + validation info
 *
 * Pipeline (all OpenRouter/NVIDIA):
 *   1. Extract text from uploaded file
 *   2. Extract structured resume data
 *   3. Analyze job description
 *   4. Generate tailored resume
 *   5. Validate completeness
 *   6. Return result
 */
export const tailorResume = async (req, res, next) => {
  try {
    const { jobDescription } = req.body;

    // Validate inputs
    if (!req.file) {
      return res.status(400).json({ code: 400, message: 'Resume file is required' });
    }

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ code: 400, message: 'Job description is required' });
    }

    // Step 1: Extract text from resume file
    const resumeText = await extractTextFromFile(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ code: 400, message: 'Could not extract text from resume' });
    }

    logger.info(`[Pipeline] Resume uploaded: ${req.file.originalname} (${resumeText.length} chars)`);

    // Step 2: Extract full structured data from original resume (OpenRouter)
    const originalResumeData = await extractFullResumeData(resumeText);

    // Step 2b: Override AI-extracted URLs with exact URLs from raw text (regex is 100% accurate)
    const rawURLs = extractURLsFromText(resumeText);
    if (rawURLs.linkedin && originalResumeData.contact) {
      originalResumeData.contact.linkedin = rawURLs.linkedin;
      logger.info(`[Pipeline] LinkedIn URL from raw text: ${rawURLs.linkedin}`);
    }
    if (rawURLs.github && originalResumeData.contact) {
      originalResumeData.contact.github = rawURLs.github;
      logger.info(`[Pipeline] GitHub URL from raw text: ${rawURLs.github}`);
    }
    if (rawURLs.portfolio && originalResumeData.contact) {
      originalResumeData.contact.portfolio = rawURLs.portfolio;
      logger.info(`[Pipeline] Portfolio URL from raw text: ${rawURLs.portfolio}`);
    }
    if (rawURLs.email && originalResumeData.contact) {
      originalResumeData.contact.email = rawURLs.email;
    }

    // Step 3: Analyze job description (OpenRouter)
    let jdAnalysis;
    try {
      jdAnalysis = await analyzeJD(jobDescription);
    } catch (jdErr) {
      logger.warn(`[Pipeline] AI JD analysis failed: ${jdErr.message} — using fallback`);
      jdAnalysis = resumeTailor.analyzeJDFallback(jobDescription);
    }

    // Step 4: Generate tailored resume (OpenRouter)
    let result;
    let usedFallback = false;
    try {
      result = await generateTailoredResume(
        originalResumeData,
        jdAnalysis,
        jobDescription,
        resumeText.length
      );
    } catch (tailorErr) {
      logger.warn(`[Pipeline] AI tailoring failed: ${tailorErr.message} — using deterministic fallback`);
      result = resumeTailor.reorderByJD(originalResumeData, jdAnalysis);
      result.completenessFailed = false;
      result.validationWarning = 'AI tailoring was unavailable. A basic reorder by JD relevance was applied instead.';
      usedFallback = true;
    }

    // Step 5: Return result with validation info
    return res.status(200).json({
      success: true,
      originalResumeData,
      jdAnalysis,
      tailoredResume: result.tailoredResume,
      analysis: result.analysis,
      validationWarning: result.validationWarning || null,
      completenessFailed: result.completenessFailed || false,
      usedFallback,
    });
  } catch (err) {
    logger.error(`[Pipeline] Tailoring failed: ${err.message}`);
    next(err);
  }
};

export default { tailorResume, uploadMiddleware };
