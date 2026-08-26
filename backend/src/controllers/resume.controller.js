// backend/src/controllers/resume.controller.js
// Handles résumé upload, parsing, and JD-alignment gap analysis.
// Uses resumeParser.js for file parsing and gapAnalysis.js for cosine-similarity scoring.

import multer from 'multer';
import ResumeAnalysis from '../models/ResumeAnalysis.model.js';
import JDAnalysis from '../models/JDAnalysis.model.js';
import { extractTextFromFile, extractResumeInfo } from '../services/resumeParser.js';
import { computeGapAnalysis } from '../services/gapAnalysis.js';
import logger from '../utils/logger.js';

// Multer config: store files in memory (buffer) for parsing
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const uploadMiddleware = upload.single('file');

/**
 * POST /api/resume/analyze
 * Accepts either a file upload (multipart/form-data) or plain text (JSON).
 * Optional: linkedJDAnalysisId to compute alignment score and gap areas.
 */
export const analyzeResume = async (req, res, next) => {
  try {
    let resumeText = null;
    const { text, linkedJDAnalysisId } = req.body;

    // Extract text from uploaded file OR use provided text
    if (req.file) {
      resumeText = await extractTextFromFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    } else if (text) {
      resumeText = text;
    }

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: 'Résumé text or file is required' });
    }

    // Extract structured candidate info from résumé
    const resumeInfo = await extractResumeInfo(resumeText);

    // Load linked JD analysis if provided
    let jdAnalysis = null;
    let gapResult = { jdAlignmentScore: 0, gapAreas: [] };

    if (linkedJDAnalysisId) {
      jdAnalysis = await JDAnalysis.findById(linkedJDAnalysisId);
      if (!jdAnalysis) {
        return res.status(404).json({ error: 'Linked JD analysis not found' });
      }

      // Compute embedding-based gap analysis
      gapResult = computeGapAnalysis(resumeInfo.claimedSkills, jdAnalysis);
    }

    // Create ResumeAnalysis document
    const doc = await ResumeAnalysis.create({
      claimedSkills: resumeInfo.claimedSkills,
      yearsExperience: resumeInfo.yearsExperience,
      projectsSummary: resumeInfo.projectsSummary,
      jdAlignmentScore: gapResult.jdAlignmentScore,
      gapAreas: gapResult.gapAreas,
      linkedJDAnalysisId: linkedJDAnalysisId || null,
    });

    return res.status(201).json(doc);
  } catch (err) {
    logger.error(`Resume analysis error: ${err.message}`);
    next(err);
  }
};

export default { analyzeResume, uploadMiddleware };
