// frontend/src/hooks/useSpeechToText.js
// Wraps Web Speech API SpeechRecognition for speech-to-text.
// Exposes: start(), stop(), transcript, interimTranscript, isListening, isSupported, error.
// Supports language-aware recognition (English en-US, Urdu ur-PK).
// Auto-renders TypedFallback if mic permission denied or STT fails.

import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechToText = (language = 'english') => {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const [checked, setChecked] = useState(false);
  const recognitionRef = useRef(null);
  const languageRef = useRef(language);

  // Keep language ref in sync
  useEffect(() => {
    languageRef.current = language;
    // Reconfigure recognition language if instance exists
    if (recognitionRef.current) {
      const wasListening = isListening;
      recognitionRef.current.stop();
      recognitionRef.current.lang = language === 'urdu' ? 'ur-PK' : 'en-US';
      // Don't auto-restart — let caller control start/stop
      if (wasListening) {
        setIsListening(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof window !== 'undefined' && SpeechRecognition) {
      setIsSupported(true);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = languageRef.current === 'urdu' ? 'ur-PK' : 'en-US';

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          setTranscript((prev) => prev + final);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      setError('Speech recognition not supported');
    }
    setChecked(true);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition not supported');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    // Ensure language is current before starting
    recognitionRef.current.lang = languageRef.current === 'urdu' ? 'ur-PK' : 'en-US';

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError(err.message || 'Failed to start');
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    checked,
    error,
    start,
    stop,
    reset,
  };
};

export default useSpeechToText;
