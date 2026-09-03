// frontend/src/hooks/useTranslation.js
// Convenience hook that binds the global t() lookup to the current language.
// Usage:  const { t, language, isUrdu } = useTranslation();
//         <h1>{t('nav.home')}</h1>

import { useCallback } from 'react';
import { t as lookupTranslation } from '../i18n/translations';
import { useLanguage } from './useLanguage';

export const useTranslation = () => {
  const { language, isUrdu } = useLanguage();

  const t = useCallback(
    (key) => lookupTranslation(key, language),
    [language]
  );

  return { t, language, isUrdu };
};

export default useTranslation;
