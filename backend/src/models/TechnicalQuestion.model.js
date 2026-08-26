import mongoose from 'mongoose';

const TechnicalQuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    skill: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    rubric: { type: Object },
    followUpPrompts: [{ type: String }],
  },
  { timestamps: true }
);

export const TechnicalQuestion = mongoose.model('TechnicalQuestion', TechnicalQuestionSchema);
export default TechnicalQuestion;
