// frontend/src/components/behavioral/FollowUpBubble.jsx
// Renders follow-up question from the interviewer.
// Visually distinct from main question.

import React from 'react';
import { MessageCircleQuestion } from 'lucide-react';

export const FollowUpBubble = ({ text, language = 'english' }) => {
  if (!text) return null;

  return (
    <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-indigo-400">
          <MessageCircleQuestion size={20} />
        </div>
        <div className="flex-1">
          <div className="text-sm text-indigo-300 mb-2 font-medium">Follow-up question:</div>
          <div className={`text-slate-100 leading-relaxed ${language === 'urdu' ? 'urdu-text text-right' : ''}`}>{text}</div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpBubble;
