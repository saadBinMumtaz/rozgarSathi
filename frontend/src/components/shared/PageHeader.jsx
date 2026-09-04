// frontend/src/components/shared/PageHeader.jsx
// Reusable page header with GooeyNav for consistent navigation across all pages.
// Adapts to dark/light mode and provides standardized spacing.
// Theme toggle is handled globally in App.jsx (fixed top-4 right-4 z-50).
// Language toggle is inline (EN | اردو) next to the logout button.

import React from 'react';
import GooeyNav from './GooeyNav';
import { useTranslation } from '../../hooks/useTranslation';

const PageHeader = ({
  isDark,
  onNavigate,
  currentPage,
  isAuthenticated = false,
  onLogout,
  extraRightContent = null,
  language,
  setLanguage,
}) => {
  const { t } = useTranslation();

  // Define navigation items based on authentication state — labels translated via t()
  // "Find Jobs" is only available to authenticated users
  const navItems = isAuthenticated
    ? [
        { label: t('nav.home'), href: '#', page: 'landing' },
        { label: t('nav.practice'), href: '#', page: 'jd-input' },
        { label: t('nav.findJobs'), href: '#', page: 'find-jobs' },
        { label: t('nav.dashboard'), href: '#', page: 'dashboard' },
      ]
    : [
        { label: t('nav.home'), href: '#', page: 'landing' },
        { label: t('nav.features'), href: '#', page: 'landing' },
        { label: t('nav.signUp'), href: '#', page: 'auth' },
      ];

  // Determine active index based on current page
  const getActiveIndex = () => {
    if (currentPage === 'landing' || currentPage === 'home') return 0;
    if (currentPage === 'auth') return isAuthenticated ? 0 : 2;
    if (currentPage === 'jd-input' || currentPage === 'mode-selection' ||
        currentPage === 'technical-interview' || currentPage === 'behavioral-interview' ||
        currentPage === 'coding-interview') return 1;
    if (currentPage === 'find-jobs' || currentPage === 'job-detail') return 2;
    if (currentPage === 'dashboard' || currentPage === 'results' || currentPage === 'session-history') return isAuthenticated ? 3 : 2;
    return 0;
  };

  return (
    <header className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 py-6">
      <div className="flex items-center justify-between gap-4">
        {/* Logo — left */}
        <img
          src={isDark ? '/logo-white.png' : '/logo-dark.png'}
          alt="Rozgar Sathi"
          className="h-20 sm:h-24 w-auto flex-shrink-0 cursor-pointer"
          onClick={() => onNavigate?.('landing')}
        />

        {/* Gooey Navigation — centered */}
        <div className="flex-1 flex justify-center">
          <GooeyNav
            items={navItems}
            initialActiveIndex={getActiveIndex()}
            isDark={isDark}
            onNavigate={onNavigate}
          />
        </div>

        {/* Right side — language toggle, extra content, and logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Global language toggle (EN | اردو) */}
          {language && setLanguage && (
            <div className="flex items-center gap-0.5 surface-text bg-surface rounded-lg px-1.5 py-1">
              <button
                onClick={() => setLanguage('english')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  language === 'english'
                    ? 'bg-text-primary text-bg-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('urdu')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  language === 'urdu'
                    ? 'bg-text-primary text-bg-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                aria-label="اردو میں تبدیل کریں"
                style={{ fontFamily: "'Noto Nastaliq Urdu', 'Urdu Typesetting', serif" }}
              >
                اردو
              </button>
            </div>
          )}

          {extraRightContent}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
