// frontend/src/design-system/ThemeToggle.jsx
// Sun/Moon icon toggle for Light/Dark theme switching.
// No border — solid block style matching the design system.

import React from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = ({ isDark, onToggle, size = 'md' }) => {
  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <button
      onClick={onToggle}
      className={`
        ${sizes[size]}
        rounded-lg
        flex items-center justify-center
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-border-strong
        hover:scale-105 active:scale-95
        surface-text bg-surface-hover
        text-icon-muted
        hover:text-icon-active
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun size={iconSizes[size]} className="text-warning" />
      ) : (
        <Moon size={iconSizes[size]} className="text-text-primary" />
      )}
    </button>
  );
};

export default ThemeToggle;
