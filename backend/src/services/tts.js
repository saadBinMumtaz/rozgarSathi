// backend/src/services/tts.js
// Text-to-Speech service — single entry point for all external TTS API calls.
// Architecture rule: all external API calls go through dedicated service files.
// Moved from bilingual.js to isolate TTS concerns from translation logic.

import env from '../config/env.js';

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

export default { synthesizeUrduSpeech, synthesizeUrduSpeechGoogle };
