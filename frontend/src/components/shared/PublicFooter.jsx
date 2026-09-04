// frontend/src/components/shared/PublicFooter.jsx
// Small, clean footer for public-facing pages with MagicRings background.

import React from 'react';
import MagicRings from './MagicRings';
import { Github, Mail } from 'lucide-react';

export const PublicFooter = ({ isDark = true, onNavigate }) => {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-bg-primary">
      {/* MagicRings subtle background */}
      <div className="absolute inset-0 opacity-60">
        <MagicRings isDark={isDark} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 items-start">
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-text-primary flex items-center justify-center font-black text-xs text-bg-primary">
                RS
              </div>
              <span className="text-base font-bold text-text-primary">RozGar-Sathi</span>
            </div>
            <p className="text-sm text-text-muted max-w-xs leading-relaxed">
              Your AI-powered career companion — from job search to interview mastery.
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-primary">Explore</h4>
            <div className="space-y-1.5">
              {[
                { label: 'Home', page: 'home' },
                { label: 'Find Your Job', page: 'public-find-job' },
                { label: 'Tailor Resume', page: 'public-tailor-resume' },
                { label: 'Prepare Interview', page: 'public-prepare-interview' },
              ].map((link) => (
                <button
                  key={link.page}
                  onClick={() => onNavigate?.(link.page)}
                  className="block text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-primary">Connect</h4>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="mailto:contact@rozgarsathi.com"
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all"
                aria-label="Contact us"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-text-muted">
            &copy; 2026 RozGar-Sathi. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
