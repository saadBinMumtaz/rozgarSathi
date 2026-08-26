import CodingQuestion from '../models/CodingQuestion.model.js';
import { createCodingStubEvaluation } from '../services/scoring.js';

export const getQuestions = async (req, res, next) => {
  try {
    const { topic, difficulty } = req.body;
    const query = {};
    if (topic) query.topic = topic;
    if (difficulty) query.difficulty = difficulty;

    const question = (await CodingQuestion.findOne(query)) || {
      _id: 'sample_q1',
      title: 'Two Sum',
      topic: 'Arrays & Hashing',
      difficulty: 'easy',
      statement:
        'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
      examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
      starterCode: 'function twoSum(nums, target) {\n  // Write solution here\n}',
      publicTests: [{ input: '[2,7,11,15], 9', expected: '[0,1]' }],
      hiddenTests: [{ input: '[3,2,4], 6', expected: '[1,2]' }],
      expectedTimeComplexity: 'O(N)',
      expectedSpaceComplexity: 'O(N)',
      followUpPrompts: ['Can you solve it in O(N) time?'],
      interviewerProbes: ['Consider using a hash map to store complements.'],
    };
    return res.json(question);
  } catch (err) {
    next(err);
  }
};

export const runCode = async (req, res, next) => {
  try {
    const { sessionId, code, language } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    return res.json({
      publicTestResults: [
        { input: '[2,7,11,15], 9', expected: '[0,1]', actual: '[0,1]', passed: true },
      ],
    });
  } catch (err) {
    next(err);
  }
};

export const submitCode = async (req, res, next) => {
  try {
    const { sessionId, code, language } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    return res.json({
      hiddenTestResults: [
        { input: '[3,2,4], 6', expected: '[1,2]', actual: '[1,2]', passed: true },
      ],
      evaluation: createCodingStubEvaluation(),
    });
  } catch (err) {
    next(err);
  }
};

export default { getQuestions, runCode, submitCode };
