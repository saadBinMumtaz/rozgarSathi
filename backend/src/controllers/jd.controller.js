import JDAnalysis from '../models/JDAnalysis.model.js';
import { extractJDAnalysis } from '../services/ai.js';

export const analyzeJD = async (req, res, next) => {
  try {
    const { text, sampleId } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Job description text is required and must be a non-empty string.',
      });
    }

    // If a sampleId is provided, reuse the existing canonical document.
    if (sampleId) {
      const existing = await JDAnalysis.findOne({ source: 'sample', sampleId });
      if (existing) {
        return res.status(200).json(formatResponse(existing));
      }
    }

    // Call single Qwen AI service (or deterministic fallback wrapper)
    const analysisResult = await extractJDAnalysis(text);

    // Save analysis to MongoDB
    const docData = {
      rawText: text,
      role: analysisResult.role,
      skills: analysisResult.skills,
      experienceLevel: analysisResult.experienceLevel,
      keywords: analysisResult.keywords,
      behavioralFocus: analysisResult.behavioralFocus,
      technicalFocus: analysisResult.technicalFocus,
      seniorityConfidence: analysisResult.seniorityConfidence,
      source: sampleId ? 'sample' : 'user',
      createdAt: new Date(),
    };
    // Only set sampleId for sample JDs; omit for user JDs so the sparse
    // index ({source, sampleId}) excludes them and allows unlimited user docs.
    if (sampleId) {
      docData.sampleId = sampleId;
    }
    const savedDoc = await JDAnalysis.create(docData);

    return res.status(201).json(formatResponse(savedDoc));
  } catch (error) {
    next(error);
  }
};

/** Shape the response consistently for both create and reuse paths. */
const formatResponse = (doc) => ({
  _id: doc._id,
  rawText: doc.rawText,
  role: doc.role,
  skills: doc.skills,
  experienceLevel: doc.experienceLevel,
  keywords: doc.keywords,
  behavioralFocus: doc.behavioralFocus,
  technicalFocus: doc.technicalFocus,
  seniorityConfidence: doc.seniorityConfidence,
  source: doc.source || 'user',
  sampleId: doc.sampleId || null,
  createdAt: doc.createdAt,
});

export default {
  analyzeJD,
};
