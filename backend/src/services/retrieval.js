// backend/src/services/retrieval.js
// Question retrieval using TF-IDF + cosine similarity + Relevance Gate.
// Deterministic: same JD + question bank = same ranking.
// No LLM calls — pure text similarity + interviewProfile gate.
// Supports both behavioral and technical question banks.
//
// The Relevance Gate (interviewProfile.js) validates each question
// against the JD BEFORE it reaches the candidate.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { isQuestionRelevant, filterRelevantQuestions } from './interviewProfile.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Behavioral question bank ----------------------------------------
const behavioralPath = path.join(__dirname, '../data/behavioral-questions.json');
let behavioralBank = [];
try {
  const raw = fs.readFileSync(behavioralPath, 'utf-8');
  const parsed = JSON.parse(raw);
  behavioralBank = parsed.map((q, index) => ({
    ...q,
    id: `bq-${index}`,
  }));
  logger.info(`Loaded ${behavioralBank.length} behavioral questions from bank`);
} catch (err) {
  logger.error(`Failed to load behavioral questions: ${err.message}`);
  behavioralBank = [];
}

// --- Technical question bank -----------------------------------------
const technicalPath = path.join(__dirname, '../data/technical-questions.json');
let technicalBank = [];
try {
  const raw = fs.readFileSync(technicalPath, 'utf-8');
  const parsed = JSON.parse(raw);
  technicalBank = parsed.map((q, index) => ({
    ...q,
    id: `tq-${index}`,
  }));
  logger.info(`Loaded ${technicalBank.length} technical questions from bank`);
} catch (err) {
  logger.error(`Failed to load technical questions: ${err.message}`);
  technicalBank = [];
}

// --- Shared TF-IDF infrastructure ------------------------------------

const tokenize = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
};

// Cosine similarity between two sparse vectors (Maps)
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
 * Build a TF-IDF index for a question bank.
 * Returns { idfCache, questionVectors } for that bank.
 */
const buildTfIdfIndex = (bank, textExtractor) => {
  const vocabulary = new Set();
  const documentFrequency = new Map();

  bank.forEach((q) => {
    const terms = new Set(tokenize(textExtractor(q)));
    terms.forEach((term) => {
      vocabulary.add(term);
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    });
  });

  const N = bank.length;
  const idfCache = new Map();
  vocabulary.forEach((term) => {
    const df = documentFrequency.get(term) || 0;
    idfCache.set(term, Math.log((N + 1) / (df + 1)) + 1);
  });

  const computeVector = (text) => {
    const terms = tokenize(text);
    const tf = new Map();
    terms.forEach((term) => {
      tf.set(term, (tf.get(term) || 0) + 1);
    });
    const vector = new Map();
    tf.forEach((count, term) => {
      if (idfCache.has(term)) {
        vector.set(term, count * idfCache.get(term));
      }
    });
    return vector;
  };

  const questionVectors = bank.map((q) => ({
    question: q,
    vector: computeVector(textExtractor(q)),
  }));

  return { idfCache, questionVectors, computeVector };
};

// Pre-compute indexes for both banks at module load
const behavioralIndex = buildTfIdfIndex(behavioralBank, (q) => `${q.text} ${q.topic || ''}`);
const technicalIndex = buildTfIdfIndex(technicalBank, (q) => `${q.text} ${q.skill || ''} ${q.difficulty || ''}`);

/**
 * Enhanced scoring with multiple relevance signals:
 * 1. TF-IDF cosine similarity (base score)
 * 2. Exact skill/topic match boost
 * 3. Keyword density boost
 * 4. Seniority alignment boost
 */
const enhancedScoring = ({ question, queryVector, vector, jdAnalysis, jdTerms }) => {
  // Base: TF-IDF cosine similarity
  const baseScore = cosineSimilarity(queryVector, vector);
  
  let boostedScore = baseScore;
  const matchedTerms = [];
  
  const questionText = `${question.text} ${question.skill || question.topic || ''}`.toLowerCase();
  const questionSkill = (question.skill || question.topic || '').toLowerCase();
  
  // Boost 1: Exact skill/topic match with JD technical focus or skills
  const jdSkills = [
    ...(jdAnalysis.technicalFocus || []),
    ...(jdAnalysis.skills || []),
    ...(jdAnalysis.keywords || []),
  ].map(s => s.toLowerCase());
  
  jdSkills.forEach(skill => {
    if (questionSkill.includes(skill) || skill.includes(questionSkill)) {
      boostedScore += 0.4; // Significant boost for exact skill match
      if (!matchedTerms.includes(skill)) matchedTerms.push(skill);
    }
  });
  
  // Boost 2: Keyword density - how many JD terms appear in the question
  const matchedKeywords = jdTerms.filter(term => {
    const termLower = term.toLowerCase();
    return questionText.includes(termLower) || 
           tokenize(term).some(token => token.length > 3 && questionText.includes(token));
  });
  
  if (jdTerms.length > 0) {
    const keywordRatio = matchedKeywords.length / jdTerms.length;
    boostedScore += keywordRatio * 0.3; // Up to 0.3 boost for keyword coverage
    matchedTerms.push(...matchedKeywords);
  }
  
  // Boost 3: Seniority alignment
  const expLevel = (jdAnalysis.experienceLevel || '').toLowerCase();
  const qDifficulty = (question.difficulty || '').toLowerCase();
  
  const seniorityMap = {
    'entry': ['easy', 'medium'],
    'junior': ['easy', 'medium'],
    'mid': ['medium', 'hard'],
    'mid-level': ['medium', 'hard'],
    'senior': ['hard', 'expert'],
    'lead': ['hard', 'expert'],
    'executive': ['expert'],
  };
  
  const alignedDifficulties = seniorityMap[expLevel] || [];
  if (alignedDifficulties.includes(qDifficulty)) {
    boostedScore += 0.15; // Small boost for seniority alignment
  }
  
  // Normalize score to 0-1 range (cap at 1.0)
  boostedScore = Math.min(1.0, boostedScore);
  
  return {
    score: boostedScore,
    matchedTerms: [...new Set(matchedTerms)],
    baseScore,
  };
};

/**
 * Generic retrieval function using enhanced scoring.
 * Filters out questions with relevance score < 0.3.
 * Supports randomize=true for session variety (top-K weighted shuffle).
 */
const retrieveFromIndex = ({ index, bank, queryText, excludeIds = [], filters = {}, limit = 1, jdAnalysis = {}, jdTerms = [], randomize = false, sessionSeed = 0, interviewProfile = null }) => {
  if (bank.length === 0) {
    logger.warn('Question bank is empty');
    return [];
  }

  const queryVector = index.computeVector(queryText);

  const allScored = index.questionVectors
    .filter(({ question }) => {
      if (excludeIds.includes(question.id)) return false;
      for (const [key, value] of Object.entries(filters)) {
        if (value && question[key] && String(question[key]).toLowerCase() !== String(value).toLowerCase()) {
          return false;
        }
      }
      return true;
    })
    .map(({ question, vector }) => {
      const scoring = enhancedScoring({ question, queryVector, vector, jdAnalysis, jdTerms });
      return { question, ...scoring };
    })
    .sort((a, b) => b.score - a.score);

  // Apply relevance threshold filter
  let candidates = allScored.filter(({ score }) => score >= 0.3);

  // Fallback: if threshold filters out everything, use top-scoring questions regardless
  if (candidates.length === 0 && allScored.length > 0) {
    logger.debug(`All questions scored below 0.3 threshold. Falling back to top ${limit} from ${allScored.length} candidates.`);
    candidates = allScored;
  }

  // ── Relevance Gate: filter questions against the JD interview profile ──
  // This runs AFTER TF-IDF scoring but BEFORE returning to the controller.
  // Questions that don't match the target role are rejected here.
  if (interviewProfile && interviewProfile.role) {
    const beforeCount = candidates.length;
    candidates = candidates.filter(({ question }) => {
      const gate = isQuestionRelevant(question, interviewProfile);
      return gate.relevant;
    });
    if (candidates.length === 0 && beforeCount > 0) {
      // All candidates were filtered by the gate — this means the bank
      // has no role-relevant questions. Log a warning and use the
      // top-scored questions as a last resort (better than nothing).
      logger.warn(
        `Relevance gate filtered ALL ${beforeCount} candidates for role="${interviewProfile.role}". ` +
        `Falling back to top-scored questions (bank may lack role-specific content).`
      );
      candidates = allScored.slice(0, Math.max(limit * 2, 4));
    } else if (candidates.length < beforeCount) {
      logger.debug(
        `Relevance gate: ${beforeCount - candidates.length}/${beforeCount} questions rejected ` +
        `for role="${interviewProfile.role}"`
      );
    }
  }

  // If randomize is enabled and we have multiple candidates, shuffle for variety
  if (randomize && candidates.length > 1) {
    const topK = candidates.slice(0, Math.max(limit * 4, 8));
    // Use sessionSeed to influence selection, but rely on Math.random for true variety
    const shuffled = [...topK];
    // Fisher-Yates shuffle — pure random for maximum variety
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // If sessionSeed is high, bias towards higher-ranked items; otherwise use shuffled order
    if (sessionSeed > 50) {
      // Re-sort by score but with some randomness preserved
      shuffled.sort((a, b) => (b.score + Math.random() * 0.2) - (a.score + Math.random() * 0.2));
    }
    return shuffled.slice(0, limit).map((c) => ({
      ...c.question,
      matchedTerms: c.matchedTerms,
      relevanceScore: c.score,
    }));
  }

  return candidates.slice(0, limit).map((c) => ({
    ...c.question,
    matchedTerms: c.matchedTerms,
    relevanceScore: c.score,
  }));
};

/**
 * Retrieve behavioral questions ranked by relevance to JD.
 * @param {boolean} [randomize=false] - Enable weighted randomization for session variety
 * @param {number} [sessionSeed=0] - Seed based on session count for cross-session variety
 */
export const retrieveBehavioralQuestions = ({
  jdAnalysis,
  excludeIds = [],
  topic,
  difficulty,
  limit = 1,
  randomize = false,
  sessionSeed = 0,
  interviewProfile = null,
}) => {
  // Collect all JD terms for traceability
  const jdTerms = [
    ...(jdAnalysis.behavioralFocus || []),
    ...(jdAnalysis.skills || []),
    ...(jdAnalysis.keywords || []),
  ];

  // Enhanced query text: include role, behavioral focus, and skills
  const queryText = [
    jdAnalysis.role || '',
    ...(jdAnalysis.behavioralFocus || []),
    ...(jdAnalysis.skills || []),
    ...(jdAnalysis.keywords || []),
  ].join(' ');

  const results = retrieveFromIndex({
    index: behavioralIndex,
    bank: behavioralBank,
    queryText,
    excludeIds,
    filters: { topic, difficulty },
    limit,
    jdAnalysis,
    jdTerms,
    randomize,
    sessionSeed,
    interviewProfile,
  });

  logger.debug(
    `Retrieved ${results.length} behavioral questions (topic=${topic || 'any'}, difficulty=${difficulty || 'any'}, avgScore=${results.length > 0 ? (results.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) / results.length).toFixed(3) : 'N/A'})`
  );
  return results;
};

/**
 * Retrieve technical questions ranked by relevance to JD skills.
 * @param {Object} params
 * @param {Object} params.jdAnalysis - JD analysis object with technicalFocus, skills
 * @param {string[]} params.excludeIds - Question IDs to exclude
 * @param {string} [params.skill] - Filter by skill (e.g. 'React', 'Node.js')
 * @param {string} [params.difficulty] - Filter by difficulty
 * @param {number} [params.limit=1] - Number of questions to return
 * @param {boolean} [params.randomize=false] - Enable weighted randomization for session variety
 * @param {number} [params.sessionSeed=0] - Seed based on session count for cross-session variety
 * @returns {Array} Ranked questions with matchedTerms
 */
export const retrieveTechnicalQuestions = ({
  jdAnalysis,
  excludeIds = [],
  skill,
  difficulty,
  limit = 1,
  randomize = false,
  sessionSeed = 0,
  interviewProfile = null,
}) => {
  // Collect all JD terms for traceability
  const jdTerms = [
    ...(jdAnalysis.technicalFocus || []),
    ...(jdAnalysis.skills || []),
    ...(jdAnalysis.keywords || []),
  ];

  // Enhanced query text: include role, technical focus, and skills
  const queryText = [
    jdAnalysis.role || '',
    ...(jdAnalysis.technicalFocus || []),
    ...(jdAnalysis.skills || []),
    ...(jdAnalysis.keywords || []),
  ].join(' ');

  const results = retrieveFromIndex({
    index: technicalIndex,
    bank: technicalBank,
    queryText,
    excludeIds,
    filters: { skill, difficulty },
    limit,
    jdAnalysis,
    jdTerms,
    randomize,
    sessionSeed,
    interviewProfile,
  });

  logger.debug(
    `Retrieved ${results.length} technical questions (skill=${skill || 'any'}, difficulty=${difficulty || 'any'}, avgScore=${results.length > 0 ? (results.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) / results.length).toFixed(3) : 'N/A'})`
  );
  return results;
};

/**
 * Get a random behavioral question (fallback).
 */
export const getRandomQuestion = ({ excludeIds = [], topic, difficulty, interviewProfile = null } = {}) => {
  let candidates = behavioralBank.filter((q) => {
    if (excludeIds.includes(q.id)) return false;
    if (topic && q.topic && q.topic.toLowerCase() !== topic.toLowerCase()) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    return true;
  });
  // Apply relevance gate if interviewProfile is available
  if (interviewProfile && interviewProfile.role) {
    const gated = filterRelevantQuestions(candidates, interviewProfile);
    if (gated.length > 0) candidates = gated;
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

/**
 * Get a random technical question (fallback).
 */
export const getRandomTechnicalQuestion = ({ excludeIds = [], skill, difficulty, interviewProfile = null } = {}) => {
  let candidates = technicalBank.filter((q) => {
    if (excludeIds.includes(q.id)) return false;
    if (skill && q.skill && q.skill.toLowerCase() !== skill.toLowerCase()) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    return true;
  });
  // Apply relevance gate if interviewProfile is available
  if (interviewProfile && interviewProfile.role) {
    const gated = filterRelevantQuestions(candidates, interviewProfile);
    if (gated.length > 0) candidates = gated;
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

export default {
  retrieveBehavioralQuestions,
  retrieveTechnicalQuestions,
  getRandomQuestion,
  getRandomTechnicalQuestion,
};
