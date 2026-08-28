// backend/src/services/bilingual.js
// Bilingual feedback service — translates evaluation JSON at render time.
// Rule: a "Show in Urdu" toggle reuses the SAME evaluation JSON,
// translated only at render/prompt time — never re-runs the full evaluation.

import { callAI } from './ai.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

// Escape user text for safe embedding inside Azure SSML <voice> element.
const escapeXml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Generate Urdu speech audio via Azure Neural TTS (cloud fallback for devices
 * with no local Urdu voice). Uses the Azure Speech synthesis REST endpoint with
 * SSML + a neural Urdu voice, returning base64 MP3 the frontend can play.
 *
 * Throws a typed error (code: 'TTS_NOT_CONFIGURED') when Azure creds are absent,
 * so the caller/frontend can degrade to English TTS instead of dead-ending.
 *
 * @param {string} text - Urdu text to synthesize
 * @returns {Promise<{ audioBase64: string, mimeType: string }>}
 */
export const synthesizeUrduSpeech = async (text) => {
  if (!env.AZURE_TTS_KEY || !env.AZURE_TTS_REGION) {
    const err = new Error('Azure TTS is not configured');
    err.code = 'TTS_NOT_CONFIGURED';
    throw err;
  }

  const voice = env.AZURE_TTS_VOICE || 'ur-PK-UzmaNeural';
  const ssml = `<speak version='1.0' xml:lang='ur-PK'><voice name='${voice}'>${escapeXml(text)}</voice></speak>`;
  const endpoint = `https://${env.AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout for fast fallback

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env.AZURE_TTS_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'RozgarSathi',
      },
      body: ssml,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Azure TTS HTTP ${response.status}: ${detail}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString('base64');
    return { audioBase64, mimeType: 'audio/mpeg' };
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Generate Urdu speech audio via Google Translate TTS (free fallback).
 * Server-side proxy avoids CORS issues that block browser-based requests.
 * Handles text chunking for long passages (Google has ~200 char limit).
 *
 * @param {string} text - Urdu text to synthesize
 * @returns {Promise<{ audioBase64: string, mimeType: string }>}
 */
export const synthesizeUrduSpeechGoogle = async (text) => {
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= 200) {
      chunks.push(remaining);
      break;
    }
    // Find a good break point (sentence or word boundary)
    let breakAt = remaining.lastIndexOf('۔', 200); // Urdu period
    if (breakAt < 50) breakAt = remaining.lastIndexOf(' ', 200);
    if (breakAt < 50) breakAt = 200;
    chunks.push(remaining.substring(0, breakAt + 1));
    remaining = remaining.substring(breakAt + 1).trim();
  }

  const audioBuffers = [];
  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=ur&client=tw-ob&ttsspeed=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'audio/mpeg, audio/*, */*',
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Google TTS HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(buffer));
    } finally {
      clearTimeout(timeout);
    }
  }

  // Concatenate all chunks
  const combined = Buffer.concat(audioBuffers);
  return {
    audioBase64: combined.toString('base64'),
    mimeType: 'audio/mpeg',
  };
};

// Common Urdu/Roman Urdu words and phrases for language detection
const URDU_MARKERS = [
  'mein', 'main', 'hum', 'tum', 'aap', 'woh', 'yeh', 'hai', 'hain', 'tha', 'thi', 'the',
  'kya', 'kab', 'kahan', 'kaise', 'kyun', 'jo', 'ki', 'ka', 'ke', 'ko', 'se', 'mein', 'par',
  'aur', 'ya', 'lekin', 'magar', 'isliye', 'kyunki', 'agar', 'toh', 'phir', 'ab', 'pehle',
  'baad', 'upar', 'neeche', 'andar', 'bahar', 'saath', 'bina', 'karna', 'karta', 'kari',
  'tha', 'raha', 'rahi', 'hota', 'hoti', 'chahiye', 'sakta', 'sakti', 'chahie',
  'mujhe', 'tujhe', 'usse', 'humne', 'tumne', 'unhone', 'maine',
  'acha', 'theek', 'sahi', 'galat', 'bada', 'chhota', 'zyada', 'kam',
  'bhai', 'dost', 'kaam', 'paisa', 'waqt', 'din', 'raat', 'saal',
];

/**
 * Detect if a transcript is primarily in Urdu/Roman Urdu.
 * Uses a simple heuristic: count Urdu marker words vs total words.
 * @param {string} transcript - The text to analyze
 * @returns {Object} { isUrdu: boolean, confidence: number, detectedLanguage: string }
 */
export const detectAnswerLanguage = (transcript) => {
  if (!transcript || typeof transcript !== 'string') {
    return { isUrdu: false, confidence: 0, detectedLanguage: 'english' };
  }

  const text = transcript.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  
  if (words.length === 0) {
    return { isUrdu: false, confidence: 0, detectedLanguage: 'english' };
  }

  // Count Urdu markers
  const urduWordCount = URDU_MARKERS.filter(marker => {
    // Match whole words only
    const regex = new RegExp(`\\b${marker}\\b`, 'i');
    return regex.test(text);
  }).length;

  const urduRatio = urduWordCount / words.length;
  
  // Threshold: if more than 15% of words are Urdu markers, consider it Urdu
  const isUrdu = urduRatio > 0.15;
  const confidence = Math.min(urduRatio * 3, 1); // Normalize to 0-1
  
  return {
    isUrdu,
    confidence,
    detectedLanguage: isUrdu ? 'urdu' : 'english',
    urduWordCount,
    totalWords: words.length,
  };
};

/**
 * Translate an evaluation object's text fields to the target language.
 * Reuses the same evaluation data — does NOT re-run scoring.
 *
 * @param {Object} evaluation - The original evaluation object (English)
 * @param {string} targetLanguage - 'urdu' | 'english' | 'mixed'
 * @returns {Promise<Object>} Evaluation with translated text fields
 */
export const translateEvaluation = async (evaluation, targetLanguage = 'english') => {
  // English is the default — return as-is
  if (targetLanguage === 'english' || !targetLanguage) {
    return evaluation;
  }

  const fieldsToTranslate = {
    strength: evaluation.strength || '',
    missing: evaluation.missing || '',
    improvement: evaluation.improvement || '',
    evidence: Array.isArray(evaluation.evidence) ? evaluation.evidence : [],
  };

  // If all fields are empty, nothing to translate
  const hasContent = Object.values(fieldsToTranslate).some(
    (v) => (typeof v === 'string' && v.trim().length > 0) || (Array.isArray(v) && v.length > 0)
  );

  if (!hasContent) {
    return evaluation;
  }

  const languageLabel =
    targetLanguage === 'urdu'
      ? 'Urdu (اردو)'
      : targetLanguage === 'mixed'
        ? 'Roman Urdu (mixed English-Urdu)'
        : targetLanguage;

  try {
    const systemPrompt = `You are a professional translator. Translate the following interview feedback fields into ${languageLabel}.
Keep the meaning and tone intact. Do not add or remove information.
Return ONLY valid JSON with the same keys: { "strength", "missing", "improvement", "evidence" }.
Do not translate field names, only values.`;

    const userPrompt = `Translate these fields:
{
  "strength": ${JSON.stringify(fieldsToTranslate.strength)},
  "missing": ${JSON.stringify(fieldsToTranslate.missing)},
  "improvement": ${JSON.stringify(fieldsToTranslate.improvement)},
  "evidence": ${JSON.stringify(fieldsToTranslate.evidence)}
}`;

    const result = await callAI({
      systemPrompt,
      userPrompt,
      requiredFields: ['strength', 'missing', 'improvement'],
    });

    return {
      ...evaluation,
      strength: result.strength || evaluation.strength,
      missing: result.missing || evaluation.missing,
      improvement: result.improvement || evaluation.improvement,
      evidence: Array.isArray(result.evidence) ? result.evidence : evaluation.evidence,
      _translatedTo: targetLanguage,
    };
  } catch (err) {
    logger.warn(`Translation failed: ${err.message}. Returning original English evaluation.`);
    return evaluation;
  }
};

/**
 * Translate question text and follow-up prompts to the target language.
 * Enables smooth Urdu code-switching during the interview.
 *
 * @param {string} questionText - The question text to translate
 * @param {string[]} followUpPrompts - Array of follow-up prompts to translate
 * @param {string} targetLanguage - 'urdu' | 'english' | 'mixed'
 * @returns {Promise<Object>} { questionText, followUpPrompts }
 */
export const translateQuestionText = async (questionText, followUpPrompts = [], targetLanguage = 'english') => {
  if (targetLanguage === 'english' || !targetLanguage) {
    return { questionText, followUpPrompts };
  }

  const languageLabel =
    targetLanguage === 'urdu'
      ? 'Urdu (اردو) — use natural conversational Urdu with common English tech terms kept as-is'
      : targetLanguage === 'mixed'
        ? 'Roman Urdu (mixed English-Urdu script)'
        : targetLanguage;

  try {
    const textsToTranslate = [questionText, ...followUpPrompts];
    
    const systemPrompt = `You are a bilingual interview translator. Translate the following interview question and follow-up prompts into ${languageLabel}.
Rules:
- Keep technical terms (React, Node.js, API, MongoDB, etc.) in English
- Use natural conversational tone suitable for a Pakistani job interview
- Maintain the professional interview context
- Return ONLY valid JSON with keys: { "questionText": "...", "followUpPrompts": ["..."] }`;

    const userPrompt = `Translate:
{
  "questionText": ${JSON.stringify(questionText)},
  "followUpPrompts": ${JSON.stringify(followUpPrompts)}
}`;

    const result = await callAI({
      systemPrompt,
      userPrompt,
      requiredFields: ['questionText', 'followUpPrompts'],
    });

    return {
      questionText: result.questionText || questionText,
      followUpPrompts: Array.isArray(result.followUpPrompts) ? result.followUpPrompts : followUpPrompts,
    };
  } catch (err) {
    logger.warn(`Question translation failed: ${err.message}. Returning original English.`);
    return { questionText, followUpPrompts };
  }
};

export default { translateEvaluation, translateQuestionText, detectAnswerLanguage, synthesizeUrduSpeech };
