import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory (two levels up from backend/src/config)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const requiredKeys = ['GROQ_API_KEY', 'MONGO_URI'];

for (const key of requiredKeys) {
  if (!process.env[key] || process.env[key].trim() === '') {
    console.error(`\n❌ FATAL ERROR: Missing required environment variable: "${key}"`);
    console.error(`Please define "${key}" in your .env file at the root of the repository.\n`);
    process.exit(1);
  }
}

export const env = Object.freeze({
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_API_URL: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1',
  GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  CODE_EXEC_URL: process.env.CODE_EXEC_URL || 'http://localhost:6000',
  CODE_EXEC_TIMEOUT_MS: parseInt(process.env.CODE_EXEC_TIMEOUT_MS || '5000', 10),
  CODE_EXEC_MEMORY_MB: parseInt(process.env.CODE_EXEC_MEMORY_MB || '256', 10),
  STT_PROVIDER_KEY: process.env.STT_PROVIDER_KEY || '',
  // Azure Neural TTS (cloud Urdu voice fallback). Optional — when unset, the
  // frontend degrades to local English TTS instead of cloud Urdu audio.
  AZURE_TTS_KEY: process.env.AZURE_TTS_KEY || '',
  AZURE_TTS_REGION: process.env.AZURE_TTS_REGION || '',
  AZURE_TTS_VOICE: process.env.AZURE_TTS_VOICE || 'ur-PK-UzmaNeural',
  JWT_SECRET: process.env.JWT_SECRET || 'rozgar-sathi-jwt-secret',
  // Google OAuth (Phase 2 — Day 8). Optional — when unset, Google sign-in is disabled.
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

export default env;
