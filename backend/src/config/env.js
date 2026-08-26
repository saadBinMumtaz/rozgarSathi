import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory (two levels up from backend/src/config)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const requiredKeys = ['QWEN_API_KEY', 'MONGO_URI'];

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
  QWEN_API_KEY: process.env.QWEN_API_KEY,
  QWEN_API_URL: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  CODE_EXEC_URL: process.env.CODE_EXEC_URL || 'http://localhost:6000',
  CODE_EXEC_TIMEOUT_MS: parseInt(process.env.CODE_EXEC_TIMEOUT_MS || '5000', 10),
  CODE_EXEC_MEMORY_MB: parseInt(process.env.CODE_EXEC_MEMORY_MB || '256', 10),
  STT_PROVIDER_KEY: process.env.STT_PROVIDER_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'rozgar-sathi-jwt-secret',
  NODE_ENV: process.env.NODE_ENV || 'development',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

export default env;
