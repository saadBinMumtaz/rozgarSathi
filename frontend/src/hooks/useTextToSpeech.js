// frontend/src/hooks/useTextToSpeech.js
// Wraps window.speechSynthesis for text-to-speech.
// Exposes: speak(text, language), cancel(), isSpeaking, isSupported,
//          urduLoading, urduVoiceUnavailable.
//
// Language handling:
//  - English: always local SpeechSynthesis (unchanged).
//  - Urdu: (1) try a local Urdu voice; if present, speak Urdu locally.
//          (2) else call the backend cloud TTS (Azure) and play the returned
//              MP3 through an <audio> element — Urdu audio on every device.
//          (3) if Azure fails, try Google Translate TTS via backend proxy.
//          (4) if all cloud TTS fails, degrade to English TTS so the
//              interview never dead-ends (Rules §11).

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';

// Decode a base64 string into an object URL backed by a Blob of the given MIME type.
const base64ToObjectUrl = (b64, mimeType) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType || 'audio/mpeg' }));
};

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [urduLoading, setUrduLoading] = useState(false);
  const [urduVoiceUnavailable, setUrduVoiceUnavailable] = useState(false);
  const voicesRef = useRef([]);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const speakIdRef = useRef(0); // invalidates in-flight cloud requests on cancel/new speak

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const loadVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
        // Debug: log available Urdu voices
        const urduVoices = voicesRef.current.filter(v => v.lang && v.lang.startsWith('ur'));
        if (urduVoices.length > 0) {
          console.log('[TTS] Urdu voices found:', urduVoices.map(v => `${v.name} (${v.lang})`).join(', '));
        }
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        window.speechSynthesis.cancel();
        if (audioRef.current) audioRef.current.pause();
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      };
    } else {
      setIsSupported(false);
    }
  }, []);

  const stopCloudAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
      } catch {
        /* no-op */
      }
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {
        /* no-op */
      }
      objectUrlRef.current = null;
    }
  }, []);

  // Listen for app-level cleanup event (dispatched when navigating away
  // from interview pages). Stops cloud TTS audio objects (new Audio())
  // that aren't in the DOM and can't be caught by querySelectorAll('audio').
  useEffect(() => {
    const handleCleanup = () => {
      stopCloudAudio();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setUrduLoading(false);
    };
    window.addEventListener('rozgar:interview-cleanup', handleCleanup);
    return () => window.removeEventListener('rozgar:interview-cleanup', handleCleanup);
  }, [stopCloudAudio]);

  // Local SpeechSynthesis utterance (English, or Urdu when a local Urdu voice exists).
  const speakWithUtterance = useCallback((text, { lang, voice, rate = 0.9 }, requestId) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = 1.0;
    const isCurrent = () => requestId === undefined || requestId === speakIdRef.current;
    utterance.onstart = () => { if (isCurrent()) setIsSpeaking(true); };
    utterance.onend = () => { if (isCurrent()) setIsSpeaking(false); };
    utterance.onerror = () => { if (isCurrent()) setIsSpeaking(false); };
    window.speechSynthesis.speak(utterance);
  }, []);

  // Store latest implementations in refs to prevent speak() from changing reference
  const speakWithUtteranceRef = useRef(speakWithUtterance);
  speakWithUtteranceRef.current = speakWithUtterance;

  // Google Translate TTS via backend proxy (avoids CORS issues)
  const tryGoogleTtsUrduRef = useRef((text, requestId, fallbackText) => {
    if (requestId !== speakIdRef.current) return;
    console.log('[TTS] Trying Google Translate TTS via backend proxy');

    apiClient
      .synthesizeUrduSpeechGoogle(text)
      .then(({ audioBase64, mimeType }) => {
        if (requestId !== speakIdRef.current) return;
        const url = base64ToObjectUrl(audioBase64, mimeType);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplay = () => {
          console.log('[TTS] Google TTS audio playing');
          setIsSpeaking(true);
        };
        audio.onended = () => {
          if (requestId === speakIdRef.current) setIsSpeaking(false);
        };
        audio.onerror = () => {
          if (requestId !== speakIdRef.current) return;
          console.warn('[TTS] Google TTS audio error, falling back to English');
          setUrduVoiceUnavailable(true);
          // Fallback to English
          const utterance = new SpeechSynthesisUtterance(fallbackText || text);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          utterance.onend = () => { if (requestId === speakIdRef.current) setIsSpeaking(false); };
          utterance.onerror = () => { if (requestId === speakIdRef.current) setIsSpeaking(false); };
          window.speechSynthesis.speak(utterance);
        };
        return audio.play().catch(() => {
          if (requestId !== speakIdRef.current) return;
          console.warn('[TTS] Google TTS autoplay blocked, falling back to English');
          setUrduVoiceUnavailable(true);
          const utterance = new SpeechSynthesisUtterance(fallbackText || text);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          utterance.onend = () => { if (requestId === speakIdRef.current) setIsSpeaking(false); };
          utterance.onerror = () => { if (requestId === speakIdRef.current) setIsSpeaking(false); };
          window.speechSynthesis.speak(utterance);
        });
      })
      .catch((err) => {
        if (requestId !== speakIdRef.current) return;
        console.warn('[TTS] Google TTS proxy failed:', err.message, '- falling back to English');
        setUrduVoiceUnavailable(true);
        // Fallback to English
        const utterance = new SpeechSynthesisUtterance(fallbackText || text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => { if (requestId === speakIdRef.current) setIsSpeaking(false); };
        utterance.onerror = () => { if (requestId === speakIdRef.current) setIsSpeaking(false); };
        window.speechSynthesis.speak(utterance);
      });
  });

  // Stable speak function - uses refs to prevent dependency changes
  const speak = useCallback(
    (text, language = 'english', fallbackText = null) => {
      if (!text) return;

      // Check if speechSynthesis is supported
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      // Reset any ongoing speech (local or cloud) and mark this request current.
      window.speechSynthesis.cancel();
      stopCloudAudio();
      setUrduVoiceUnavailable(false);
      const requestId = (speakIdRef.current += 1);
      // Mark the AI as presenting immediately — before onstart/onplay fire — so the
      // mic gate stays closed for the ENTIRE question (including the cloud-fetch
      // window). Cleared on end/error/cancel.
      setIsSpeaking(true);

      if (language === 'english') {
        // English: use local SpeechSynthesis
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => { if (requestId === speakIdRef.current) setIsSpeaking(false); };
        utterance.onerror = () => { if (requestId === speakIdRef.current) setIsSpeaking(false); };
        window.speechSynthesis.speak(utterance);
        return;
      }

      // Urdu path
      const voices =
        voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
      const urduVoice = voices.find((v) => v.lang && v.lang.startsWith('ur'));

      if (urduVoice) {
        // Primary: local Urdu voice present — speak Urdu natively.
        speakWithUtteranceRef.current(text, { lang: urduVoice.lang, voice: urduVoice, rate: 0.85 }, requestId);
        return;
      }

      // Fallback: no local Urdu voice — try cloud TTS with fast timeout, then Google TTS, then English.
      setUrduLoading(true);

      // Try Azure cloud TTS first (with short timeout for fast fallback)
      apiClient
        .synthesizeUrduSpeech(text, 'urdu')
        .then(({ audioBase64, mimeType }) => {
          if (requestId !== speakIdRef.current) return;
          const url = base64ToObjectUrl(audioBase64, mimeType);
          objectUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onplay = () => setIsSpeaking(true);
          audio.onended = () => {
            if (requestId === speakIdRef.current) setIsSpeaking(false);
          };
          audio.onerror = () => {
            if (requestId !== speakIdRef.current) return;
            // Azure audio failed to play — try Google TTS via backend proxy
            tryGoogleTtsUrduRef.current(text, requestId, fallbackText);
          };
          return audio.play().catch(() => {
            if (requestId !== speakIdRef.current) return;
            // Autoplay blocked or play failed — try Google TTS via backend proxy
            tryGoogleTtsUrduRef.current(text, requestId, fallbackText);
          });
        })
        .catch(() => {
          if (requestId !== speakIdRef.current) return;
          // Azure unavailable — try Google TTS via backend proxy
          tryGoogleTtsUrduRef.current(text, requestId, fallbackText);
        })
        .finally(() => {
          if (requestId === speakIdRef.current) setUrduLoading(false);
        });
    },
    [stopCloudAudio] // Minimal dependencies - everything else uses refs
  );

  const cancel = useCallback(() => {
    speakIdRef.current += 1; // invalidate any in-flight cloud request
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopCloudAudio();
    setIsSpeaking(false);
    setUrduLoading(false);
  }, [stopCloudAudio]);

  return { speak, cancel, isSpeaking, isSupported, urduLoading, urduVoiceUnavailable };
};

export default useTextToSpeech;
