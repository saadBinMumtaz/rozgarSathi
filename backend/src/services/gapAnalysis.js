// backend/src/services/gapAnalysis.js
// Computes jdAlignmentScore using TF-IDF cosine similarity between
// candidate's claimed skills and JD's skills/keywords.
// Populates gapAreas with JD skills that have no close embedding match.

import logger from '../utils/logger.js';

// ─── TF-IDF helpers (reuses same approach as retrieval.js) ───────────

const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^\w\s.+#]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

/**
 * Build a TF vector for a list of skills/terms.
 * Each skill is tokenized and term frequencies are counted.
 */
const buildSkillVector = (skills) => {
  const vec = new Map();
  for (const skill of skills) {
    const tokens = tokenize(skill);
    for (const token of tokens) {
      vec.set(token, (vec.get(token) || 0) + 1);
    }
  }
  return vec;
};

/**
 * Cosine similarity between two sparse vectors (Maps).
 */
const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  vecA.forEach((val, term) => {
    normA += val * val;
    if (vecB.has(term)) {
      dotProduct += val * vecB.get(term);
    }
  });

  vecB.forEach((val) => {
    normB += val * val;
  });

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Compute alignment score and gap areas between resume skills and JD skills.
 *
 * @param {string[]} claimedSkills - Skills extracted from résumé
 * @param {object} jdAnalysis - JDAnalysis document with skills/keywords/technicalFocus
 * @param {number} [threshold=0.3] - Minimum cosine similarity to consider a match
 * @returns {{ jdAlignmentScore: number, gapAreas: string[] }}
 */
export const computeGapAnalysis = (claimedSkills, jdAnalysis, threshold = 0.3) => {
  if (!claimedSkills || claimedSkills.length === 0) {
    return { jdAlignmentScore: 0, gapAreas: jdAnalysis?.skills || [] };
  }

  // Collect all JD skill terms
  const jdSkills = [
    ...(jdAnalysis?.skills || []),
    ...(jdAnalysis?.keywords || []),
    ...(jdAnalysis?.technicalFocus || []),
  ];

  // Deduplicate JD skills
  const uniqueJdSkills = [...new Set(jdSkills.map((s) => s.toLowerCase()))];

  if (uniqueJdSkills.length === 0) {
    return { jdAlignmentScore: 0, gapAreas: [] };
  }

  // Build TF vector for candidate's claimed skills
  const resumeVector = buildSkillVector(claimedSkills);

  // For each JD skill, compute cosine similarity against the resume vector
  const jdSkillScores = [];
  const gapAreas = [];

  for (const jdSkill of uniqueJdSkills) {
    const jdVector = buildSkillVector([jdSkill]);
    const similarity = cosineSimilarity(resumeVector, jdVector);
    jdSkillScores.push({ skill: jdSkill, similarity });

    if (similarity < threshold) {
      // Find the original-cased version of this skill
      const originalSkill =
        jdAnalysis.skills?.find((s) => s.toLowerCase() === jdSkill) ||
        jdAnalysis.keywords?.find((s) => s.toLowerCase() === jdSkill) ||
        jdAnalysis.technicalFocus?.find((s) => s.toLowerCase() === jdSkill) ||
        jdSkill;
      gapAreas.push(originalSkill);
    }
  }

  // Overall alignment score = average of top similarities, scaled to 0-100
  const avgSimilarity =
    jdSkillScores.length > 0
      ? jdSkillScores.reduce((sum, s) => sum + s.similarity, 0) / jdSkillScores.length
      : 0;

  // Scale: multiply by 100 and cap at 100
  const jdAlignmentScore = Math.round(Math.min(100, avgSimilarity * 100));

  logger.info(
    `Gap analysis: alignment=${jdAlignmentScore}%, gaps=${gapAreas.length}/${uniqueJdSkills.length} JD skills unmatched`
  );

  return { jdAlignmentScore, gapAreas };
};

export default { computeGapAnalysis };
