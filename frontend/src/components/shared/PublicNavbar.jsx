// frontend/src/components/shared/PublicNavbar.jsx
// Reusable glassy navigation bar for public-facing pages.
// Theme-aware logo, backdrop blur, smooth transitions.

import React, { useState } from 'react';
import { ThemeToggle } from '../../design-system/ThemeToggle';
import { Menu, X, Briefcase, FileText, Mic, Zap } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', page: 'home', icon: null },
  { label: 'Find Your Job', page: 'public-find-job', icon: Briefcase },
  { label: 'Tailor Resume', page: 'public-tailor-resume', icon: FileText },
  { label: 'Prepare Interview', page: 'public-prepare-interview', icon: Mic },
];

export const PublicNavbar = ({ isDark, toggleTheme, onNavigate, currentPage, language, setLanguage }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-bg-primary/70 border-b border-border/30 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo — theme-aware image */}
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 group"
          >
            <img
              src={isDark ? '/logo-white.png' : '/logo-dark.png'}
              alt="Rozgar Sathi"
              className="h-10 sm:h-12 w-auto flex-shrink-0 cursor-pointer transition-opacity group-hover:opacity-80"
            />
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = currentPage === link.page;
              const Icon = link.icon;
              return (
                <button
                  key={link.page}
                  onClick={() => handleNav(link.page)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-text-primary/10 text-text-primary'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  {Icon && <Icon size={14} />}
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Right side: language toggle + theme toggle + CTA */}
          <div className="flex items-center gap-3">
            {/* Language toggle (EN | اردو) */}
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

            <ThemeToggle isDark={isDark} onToggle={toggleTheme} size="sm" />

            <button
              onClick={() => handleNav('home')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-text-primary text-bg-primary text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Zap size={14} />
              Start Preparing
            </button>

            <button
              onClick={() => handleNav('auth')}
              className="hidden sm:inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              Sign In
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/30 bg-bg-primary/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive = currentPage === link.page;
              const Icon = link.icon;
              return (
                <button
                  key={link.page}
                  onClick={() => handleNav(link.page)}
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-text-primary/10 text-text-primary'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  {Icon && <Icon size={16} />}
                  {link.label}
                </button>
              );
            })}
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => handleNav('auth')}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary border border-border transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNav('home')}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold bg-text-primary text-bg-primary hover:opacity-90 transition-opacity"
              >
                Start Preparing
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;
