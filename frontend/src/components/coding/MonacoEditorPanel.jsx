// frontend/src/components/coding/MonacoEditorPanel.jsx
// Monaco-based code editor for the coding interview (Day 4).
// Dark theme, language-aware, controlled by the parent page.

import React from 'react';
import Editor from '@monaco-editor/react';

// Map coding language IDs to Monaco language identifiers
const MONACO_LANGUAGES = {
  javascript: { id: 'javascript', ext: 'js', label: 'JavaScript' },
  python: { id: 'python', ext: 'py', label: 'Python' },
  cpp: { id: 'cpp', ext: 'cpp', label: 'C++' },
};

export const MonacoEditorPanel = ({
  value,
  onChange,
  height = '420px',
  readOnly = false,
  language = 'javascript',
}) => {
  const monacoLang = MONACO_LANGUAGES[language] || MONACO_LANGUAGES.javascript;

  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-700">
        <span className="text-xs font-medium text-slate-400 font-mono">
          solution.{monacoLang.ext}
        </span>
        <span className="text-xs text-slate-500">{monacoLang.label}</span>
      </div>
      <Editor
        height={height}
        language={monacoLang.id}
        theme="vs-dark"
        value={value}
        onChange={(next) => onChange(next ?? '')}
        loading={
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Loading editor...
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
};

export default MonacoEditorPanel;
