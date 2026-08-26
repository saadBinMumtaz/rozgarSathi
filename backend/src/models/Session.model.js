import mongoose from 'mongoose';

const EvaluationSchema = new mongoose.Schema(
  {
    score: { type: Number },
    dimensions: { type: Object },
    evidence: [{ type: String }],
    strength: { type: String },
    missing: { type: String },
    improvement: { type: String },
    confidenceLevel: { type: String, enum: ['high', 'medium', 'low'] },
  },
  { _id: false }
);

const QuestionEntrySchema = new mongoose.Schema(
  {
    questionId: { type: String },
    questionText: { type: String },
    topic: { type: String },
    difficulty: { type: String },
    transcript: { type: String },
    followUps: [{ type: String }],
    evaluation: EvaluationSchema,
  },
  { _id: false }
);

const SessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    mode: {
      type: String,
      enum: ['behavioral', 'technical', 'coding'],
      required: true,
    },
    jdSnapshot: { type: Object },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
    },
    questions: [QuestionEntrySchema],
    overallScore: { type: Number },
    shareToken: { type: String },
    authenticated: { type: Boolean, default: false },
    engagementSummary: {
      avgEyeContactPct: { type: Number },
      cameraUsed: { type: Boolean },
      note: { type: String },
    },
    metadata: { type: Object },
  },
  { timestamps: true }
);

export const Session = mongoose.model('Session', SessionSchema);
export default Session;
