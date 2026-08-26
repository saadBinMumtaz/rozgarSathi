import mongoose from 'mongoose';
import env from './env.js';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export const checkDbHealth = () => {
  // readyState 1 means connected
  return mongoose.connection.readyState === 1;
};

export default connectDB;
