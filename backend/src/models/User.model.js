import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String },
    email: { type: String },
    name: { type: String },
    avatarUrl: { type: String },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', UserSchema);
export default User;
