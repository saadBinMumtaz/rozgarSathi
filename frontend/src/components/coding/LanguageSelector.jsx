// frontend/src/components/coding/LanguageSelector.jsx
// Language indicator for the coding interview (Day 4).
// Only JavaScript is wired to the judge today — shown as a styled badge.
// When more languages are added, this can be swapped back to a dropdown.

import React from 'react';
import { Code2 } from 'lucide-react';

export const LanguageSelector = ({ value = 'javascript', onChange }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700">
      <Code2 size={14} className="text-indigo-400" />
      <span className="text-sm text-slate-200 font-medium">JavaScript</span>
      <span className="text-xs text-slate-500">(Node.js)</span>
    </div>
  );
};

export default LanguageSelector;
