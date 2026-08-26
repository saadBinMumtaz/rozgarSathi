import React from 'react';
import { Badge } from '../../design-system/Badge';

/**
 * QuestionTraceBadge — displays which JD skills/keywords triggered
 * this question's retrieval via TF-IDF cosine similarity.
 * 
 * @param {Object} props
 * @param {string[]} props.matchedTerms - JD terms that matched this question
 */
export const QuestionTraceBadge = ({ matchedTerms = [] }) => {
  if (!matchedTerms || matchedTerms.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium">JD Match:</span>
        <span className="italic">No matches</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
        JD Match:
      </span>
      {matchedTerms.map((term, idx) => (
        <Badge key={`${term}-${idx}`} variant="info" size="sm">
          {term}
        </Badge>
      ))}
    </div>
  );
};

export default QuestionTraceBadge;
