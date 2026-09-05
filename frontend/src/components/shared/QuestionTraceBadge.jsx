import React from 'react';
import { Badge } from '../../design-system/Badge';
import { t } from '../../i18n/translations';

/**
 * QuestionTraceBadge — displays which JD skills/keywords triggered
 * this question's retrieval via TF-IDF cosine similarity.
 * 
 * @param {Object} props
 * @param {string[]} props.matchedTerms - JD terms that matched this question
 * @param {string} props.language - UI language ('english' | 'urdu')
 */
export const QuestionTraceBadge = ({ matchedTerms = [], language = 'english' }) => {
  const L = (key) => t(key, language);

  if (!matchedTerms || matchedTerms.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className="font-medium">{L('questionTrace.jdMatch')}</span>
        <span className="italic">{L('questionTrace.noMatches')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-text-muted">
        {L('questionTrace.jdMatch')}
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
