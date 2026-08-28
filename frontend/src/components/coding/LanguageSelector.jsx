// frontend/src/components/coding/LanguageSelector.jsx
// Language picker for the coding interview (Day 4).
// JavaScript only is wired to the judge today; other languages are visible
// but disabled so the extension point is obvious.

import React from 'react';
import { ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript (Node.js)', available: true },
  { id: 'python', label: 'Python 3', available: false },
  { id: 'cpp', label: 'C++', available: false },
];

export const LanguageSelector = ({ value = 'javascript', onChange }) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-slate-800 border border-slate-700 rounded-md px-3 py-2 pr-8 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        aria-label="Programming language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id} disabled={!lang.available}>
            {lang.label}
            {!lang.available ? ' (coming soon)' : ''}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
    </div>
  );
};

export default LanguageSelector;
