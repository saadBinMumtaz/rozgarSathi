import mongoose from 'mongoose';

const BehavioralQuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    rubric: { type: Object },
    followUpPrompts: [{ type: String }],
  },
  { timestamps: true }
);

export const BehavioralQuestion = mongoose.model('BehavioralQuestion', BehavioralQuestionSchema);
export default BehavioralQuestion;
