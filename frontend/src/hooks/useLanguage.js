// frontend/src/hooks/useLanguage.js
// Global language preference hook — persists the candidate's English/Urdu
// choice in localStorage so it survives page refreshes and navigation.

import { useState, useCallback } from 'react';

const LANGUAGE_STORAGE_KEY = 'rozgar-sathi-language';

export const useLanguage = () => {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'urdu' || stored === 'english') return stored;
    } catch {
      // localStorage unavailable — fall through
    }
    return 'english';
  });

  const setLanguage = useCallback((lang) => {
    const normalized = lang === 'urdu' ? 'urdu' : 'english';
    setLanguageState(normalized);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    } catch {
      // localStorage write failed — state still correct for this session
    }
  }, []);

  return {
    language,
    setLanguage,
    isUrdu: language === 'urdu',
  };
};

export default useLanguage;
