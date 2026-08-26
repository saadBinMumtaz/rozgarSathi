// frontend/src/hooks/useTextToSpeech.js
// Wraps window.speechSynthesis for text-to-speech.
// Exposes: speak(text, language), cancel(), isSpeaking, isSupported, urduVoiceUnavailable.
// Supports English and Urdu voices with graceful fallback.

import { useState, useEffect, useRef, useCallback } from 'react';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [urduVoiceUnavailable, setUrduVoiceUnavailable] = useState(false);
  const utteranceRef = useRef(null);
  const voicesRef = useRef([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      // Load voices (they may load asynchronously)
      const loadVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        window.speechSynthesis.cancel();
      };
    } else {
      setIsSupported(false);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text, language = 'english') => {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    setUrduVoiceUnavailable(false);

    const utterance = new SpeechSynthesisUtterance(text);

    if (language === 'urdu') {
      // Try to find an Urdu voice
      const voices = voicesRef.current.length > 0
        ? voicesRef.current
        : window.speechSynthesis.getVoices();
      const urduVoice = voices.find(
        (v) => v.lang && (v.lang.startsWith('ur') || v.lang.startsWith('ur-'))
      );

      if (urduVoice) {
        utterance.voice = urduVoice;
        utterance.lang = urduVoice.lang;
      } else {
        // No Urdu voice available — flag it and speak with default voice at reduced volume
        setUrduVoiceUnavailable(true);
        utterance.lang = 'ur-PK';
      }

      utterance.rate = 0.85; // Slightly slower for Urdu clarity
      utterance.pitch = 1.0;
    } else {
      // English
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return { speak, cancel, isSpeaking, isSupported, urduVoiceUnavailable };
};

export default useTextToSpeech;
