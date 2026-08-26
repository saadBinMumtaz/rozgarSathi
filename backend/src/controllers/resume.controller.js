import ResumeAnalysis from '../models/ResumeAnalysis.model.js';

export const analyzeResume = async (req, res, next) => {
  try {
    const { text, linkedJDAnalysisId } = req.body;
    if (!text && !req.file) {
      return res.status(400).json({ error: 'Resume text or file is required' });
    }
    const doc = await ResumeAnalysis.create({
      claimedSkills: ['JavaScript', 'Problem Solving'],
      yearsExperience: '3 years',
      projectsSummary: 'Full-stack web application development',
      jdAlignmentScore: 85,
      gapAreas: ['Cloud Security'],
      linkedJDAnalysisId: linkedJDAnalysisId || null,
    });
    return res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

export default { analyzeResume };
