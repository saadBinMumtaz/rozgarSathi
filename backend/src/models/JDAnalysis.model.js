import mongoose from 'mongoose';

const JDAnalysisSchema = new mongoose.Schema({
  rawText: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  skills: {
    type: [String],
    default: [],
  },
  experienceLevel: {
    type: String,
    required: true,
  },
  keywords: {
    type: [String],
    default: [],
  },
  behavioralFocus: {
    type: [String],
    default: [],
  },
  technicalFocus: {
    type: [String],
    default: [],
  },
  seniorityConfidence: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true,
  },
  source: {
    type: String,
    enum: ['user', 'sample'],
    default: 'user',
  },
  sampleId: {
    type: String,
    // No default — field is absent for user JDs so the sparse index skips them.
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Enforce one canonical document per sample JD.
// Single-field sparse index: only indexes docs where sampleId EXISTS,
// so user JDs (sampleId absent) are never constrained.
JDAnalysisSchema.index({ sampleId: 1 }, { unique: true, sparse: true });

export const JDAnalysis = mongoose.model('JDAnalysis', JDAnalysisSchema);
export default JDAnalysis;
