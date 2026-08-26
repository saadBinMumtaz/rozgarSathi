import mongoose from 'mongoose';

const ResumeAnalysisSchema = new mongoose.Schema(
  {
    claimedSkills: [{ type: String }],
    yearsExperience: { type: String },
    projectsSummary: { type: String },
    jdAlignmentScore: { type: Number },
    gapAreas: [{ type: String }],
    linkedJDAnalysisId: { type: String },
  },
  { timestamps: true }
);

export const ResumeAnalysis = mongoose.model('ResumeAnalysis', ResumeAnalysisSchema);
export default ResumeAnalysis;
