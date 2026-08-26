import mongoose from 'mongoose';

const CodingQuestionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    statement: { type: String, required: true },
    constraints: [{ type: String }],
    examples: [{ type: Object }],
    starterCode: { type: String },
    publicTests: [{ type: Object }],
    hiddenTests: [{ type: Object }],
    expectedTimeComplexity: { type: String },
    expectedSpaceComplexity: { type: String },
    followUpPrompts: [{ type: String }],
    interviewerProbes: [{ type: String }],
  },
  { timestamps: true }
);

export const CodingQuestion = mongoose.model('CodingQuestion', CodingQuestionSchema);
export default CodingQuestion;
