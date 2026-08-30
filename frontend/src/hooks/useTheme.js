// frontend/src/hooks/useTheme.js
// Persistent Light/Dark theme management.
// Uses class-based switching on <html> element: html.light / html.dark
// Respects OS prefers-color-scheme on first visit, persists to localStorage.

import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'rozgar-sathi-theme';

const getInitialTheme = () => {
  // 1. Check localStorage
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}

  // 2. Respect OS preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  }

  // 3. Default to dark (since the old hardcoded theme was dark)
  return 'dark';
};

export const useTheme = () => {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Apply theme to DOM using class-based approach
  useEffect(() => {
    const html = document.documentElement;
    // Remove both classes, add the active one
    html.classList.remove('light', 'dark');
    html.classList.add(theme);
    // Also set attribute for any CSS that uses it
    html.setAttribute('data-theme', theme);
    // Persist
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    // Add transition class briefly for smooth switch
    document.documentElement.classList.add('theme-transitioning');
    setThemeState(newTheme);
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 350);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' };
};

export default useTheme;
