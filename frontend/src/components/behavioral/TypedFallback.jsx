// frontend/src/components/behavioral/TypedFallback.jsx
// Auto-renders if mic permission denied or STT fails.
// No manual toggle — appears automatically when voice input unavailable.

import React from 'react';
import { Keyboard } from 'lucide-react';
import { Button } from '../../design-system/Button';

export const TypedFallback = ({ value, onChange, onSubmit, isSpeaking, disabled }) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit && value?.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Keyboard size={18} className="text-indigo-400" />
        <span className="text-sm font-medium text-slate-200">Type your answer</span>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || isSpeaking}
          placeholder={
            isSpeaking
              ? 'Wait for AI to finish speaking...'
              : 'Type your answer here...'
          }
          rows={5}
          className="w-full bg-slate-900 border border-slate-700 rounded-md p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <Button
          type="submit"
          disabled={disabled || isSpeaking || !value?.trim()}
          isLoading={false}
          className="mt-3"
        >
          Submit Answer
        </Button>
      </form>
    </div>
  );
};

export default TypedFallback;
