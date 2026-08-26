// backend/src/services/resumeParser.js
// Parses résumé files (.pdf, .txt, .doc, .docx) and extracts candidate information.
// Uses pdf-parse for PDFs, mammoth for DOCX, and native fs for TXT.
// Falls back to LLM extraction for skills/experience/projects.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { callQwen } from './ai.js';
import logger from '../utils/logger.js';

/**
 * Extract raw text from an uploaded file buffer based on MIME type/extension.
 */
export const extractTextFromFile = async (fileBuffer, mimetype, originalname) => {
  const ext = path.extname(originalname).toLowerCase();

  try {
    if (mimetype === 'application/pdf' || ext === '.pdf') {
      const data = await pdfParse(fileBuffer);
      return data.text;
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === '.docx'
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    }

    if (mimetype === 'application/msword' || ext === '.doc') {
      // mammoth can handle .doc with limited support
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    }

    if (mimetype === 'text/plain' || ext === '.txt') {
      return fileBuffer.toString('utf-8');
    }

    throw new Error(`Unsupported file type: ${mimetype || ext}`);
  } catch (err) {
    logger.error(`File text extraction failed: ${err.message}`);
    throw new Error(`Failed to parse résumé file: ${err.message}`);
  }
};

/**
 * Extract structured candidate information from résumé text using Qwen.
 * Returns { claimedSkills, yearsExperience, projectsSummary }.
 */
export const extractResumeInfo = async (resumeText) => {
  const systemPrompt = `You are an expert résumé analyst. Extract structured information from the following résumé text.
Return ONLY valid JSON matching this schema:
{
  "claimedSkills": ["Array of technical skills the candidate claims to have"],
  "yearsExperience": "Total years of experience (e.g. '3 years', '5+ years')",
  "projectsSummary": "Brief 2-3 sentence summary of key projects"
}

Focus on technical skills explicitly mentioned. For yearsExperience, look for dates, "X years", or infer from work history. For projectsSummary, summarize the most significant 2-3 projects.`;

  const userPrompt = `Résumé text:\n"""\n${resumeText}\n"""`;

  const requiredFields = ['claimedSkills', 'yearsExperience', 'projectsSummary'];

  try {
    return await callQwen({ systemPrompt, userPrompt, requiredFields });
  } catch (err) {
    logger.warn(`Qwen résumé extraction failed (${err.message}). Using deterministic fallback.`);
    return fallbackExtractResume(resumeText);
  }
};

/**
 * Deterministic fallback for résumé extraction when Qwen is unavailable.
 */
const fallbackExtractResume = (text) => {
  const lower = text.toLowerCase();

  // Known skills to look for
  const knownSkills = [
    'React', 'Node.js', 'JavaScript', 'TypeScript', 'Python', 'Java', 'MongoDB',
    'Express', 'REST API', 'GraphQL', 'Docker', 'AWS', 'SQL', 'Git', 'HTML', 'CSS',
    'Redux', 'Next.js', 'Vue.js', 'Angular', 'PostgreSQL', 'MySQL', 'Redis',
    'Kubernetes', 'CI/CD', 'Agile', 'Scrum',
  ];

  const claimedSkills = knownSkills.filter((s) => lower.includes(s.toLowerCase()));
  if (claimedSkills.length === 0) {
    claimedSkills.push('JavaScript', 'Problem Solving');
  }

  // Years of experience heuristic
  let yearsExperience = 'Not specified';
  const yearMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  if (yearMatch) {
    yearsExperience = `${yearMatch[1]}+ years`;
  } else {
    const dateMatches = text.match(/\b(19|20)\d{2}\b/g);
    if (dateMatches && dateMatches.length >= 2) {
      const years = dateMatches.map((d) => parseInt(d, 10)).sort((a, b) => a - b);
      const span = years[years.length - 1] - years[0];
      if (span > 0 && span < 30) {
        yearsExperience = `${span}+ years`;
      }
    }
  }

  // Projects summary — grab first 200 chars after "project" keyword
  let projectsSummary = 'No project details extracted.';
  const projectIdx = lower.indexOf('project');
  if (projectIdx !== -1) {
    const snippet = text.substring(projectIdx, projectIdx + 200).trim();
    projectsSummary = snippet.length > 150 ? snippet.substring(0, 150) + '...' : snippet;
  }

  return { claimedSkills, yearsExperience, projectsSummary };
};

export default { extractTextFromFile, extractResumeInfo };
