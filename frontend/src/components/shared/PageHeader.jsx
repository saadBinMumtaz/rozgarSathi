// frontend/src/components/shared/PageHeader.jsx
// Reusable page header with GooeyNav for consistent navigation across all pages.
// Adapts to dark/light mode and provides standardized spacing.
// Theme toggle is handled globally in App.jsx (fixed top-4 right-4 z-50).

import React from 'react';
import GooeyNav from './GooeyNav';

const PageHeader = ({
  isDark,
  onNavigate,
  currentPage,
  isAuthenticated = false,
  onLogout,
  extraRightContent = null,
}) => {
  // Define navigation items based on authentication state
  const navItems = isAuthenticated
    ? [
        { label: 'Home', href: '#', page: 'landing' },
        { label: 'Practice', href: '#', page: 'jd-input' },
        { label: 'Dashboard', href: '#', page: 'dashboard' },
      ]
    : [
        { label: 'Home', href: '#', page: 'landing' },
        { label: 'Features', href: '#', page: 'landing' },
        { label: 'Sign Up', href: '#', page: 'auth' },
      ];

  // Determine active index based on current page
  const getActiveIndex = () => {
    if (currentPage === 'landing' || currentPage === 'home') return 0;
    if (currentPage === 'auth') return isAuthenticated ? 0 : 2;
    if (currentPage === 'jd-input' || currentPage === 'mode-selection' ||
        currentPage === 'technical-interview' || currentPage === 'behavioral-interview' ||
        currentPage === 'coding-interview') return 1;
    if (currentPage === 'dashboard' || currentPage === 'results' || currentPage === 'session-history') return 2;
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

        {/* Right side — extra content and logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {extraRightContent}

          {isAuthenticated && onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-border-strong"
              aria-label="Sign out of your account"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
