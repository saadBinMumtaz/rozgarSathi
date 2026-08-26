// backend/src/services/retrieval.js
// Question retrieval using TF-IDF + cosine similarity.
// Deterministic: same JD + question bank = same ranking.
// No LLM calls — pure text similarity.
// Supports both behavioral and technical question banks.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Behavioral question bank ────────────────────────────────────────
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

// ─── Technical question bank ─────────────────────────────────────────
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

// ─── Shared TF-IDF infrastructure ────────────────────────────────────

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
 * Generic retrieval function using a pre-built TF-IDF index.
 */
const retrieveFromIndex = ({ index, bank, queryText, excludeIds = [], filters = {}, limit = 1 }) => {
  if (bank.length === 0) {
    logger.warn('Question bank is empty');
    return [];
  }

  const queryVector = index.computeVector(queryText);

  const candidates = index.questionVectors
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
      const score = cosineSimilarity(queryVector, vector);
      return { question, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return candidates.map((c) => c.question);
};

/**
 * Retrieve behavioral questions ranked by relevance to JD.
 */
export const retrieveBehavioralQuestions = ({
  jdAnalysis,
  excludeIds = [],
  topic,
  difficulty,
  limit = 1,
}) => {
  const queryText = [
    ...(jdAnalysis.behavioralFocus || []),
    ...(jdAnalysis.keywords || []),
  ].join(' ');

  const results = retrieveFromIndex({
    index: behavioralIndex,
    bank: behavioralBank,
    queryText,
    excludeIds,
    filters: { topic, difficulty },
    limit,
  });

  logger.debug(
    `Retrieved ${results.length} behavioral questions (topic=${topic || 'any'}, difficulty=${difficulty || 'any'})`
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
 * @returns {Array} Ranked questions
 */
export const retrieveTechnicalQuestions = ({
  jdAnalysis,
  excludeIds = [],
  skill,
  difficulty,
  limit = 1,
}) => {
  const queryText = [
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
  });

  logger.debug(
    `Retrieved ${results.length} technical questions (skill=${skill || 'any'}, difficulty=${difficulty || 'any'})`
  );
  return results;
};

/**
 * Get a random behavioral question (fallback).
 */
export const getRandomQuestion = ({ excludeIds = [], topic, difficulty } = {}) => {
  const candidates = behavioralBank.filter((q) => {
    if (excludeIds.includes(q.id)) return false;
    if (topic && q.topic && q.topic.toLowerCase() !== topic.toLowerCase()) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

/**
 * Get a random technical question (fallback).
 */
export const getRandomTechnicalQuestion = ({ excludeIds = [], skill, difficulty } = {}) => {
  const candidates = technicalBank.filter((q) => {
    if (excludeIds.includes(q.id)) return false;
    if (skill && q.skill && q.skill.toLowerCase() !== skill.toLowerCase()) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

export default {
  retrieveBehavioralQuestions,
  retrieveTechnicalQuestions,
  getRandomQuestion,
  getRandomTechnicalQuestion,
};
