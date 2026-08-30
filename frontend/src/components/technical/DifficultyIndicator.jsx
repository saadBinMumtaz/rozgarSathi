// frontend/src/components/technical/DifficultyIndicator.jsx
// Visual indicator showing current difficulty level and direction of change.
// Used by TechnicalInterview.jsx to show adaptive difficulty movement.

import React from 'react';
import { Badge } from '../../design-system/Badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', variant: 'success', color: 'text-success' },
  medium: { label: 'Medium', variant: 'warning', color: 'text-warning' },
  hard: { label: 'Hard', variant: 'destructive', color: 'text-danger' },
};

export const DifficultyIndicator = ({ current, previous, ratingDelta }) => {
  const config = DIFFICULTY_CONFIG[current] || DIFFICULTY_CONFIG.medium;

  // Determine direction arrow
  let DirectionIcon = Minus;
  let directionLabel = 'Stable';
  let directionColor = 'text-text-muted';

  if (previous && previous !== current) {
    const levels = ['easy', 'medium', 'hard'];
    const prevIdx = levels.indexOf(previous);
    const currIdx = levels.indexOf(current);
    if (currIdx > prevIdx) {
      DirectionIcon = TrendingUp;
      directionLabel = 'Stepped up';
      directionColor = 'text-danger';
    } else if (currIdx < prevIdx) {
      DirectionIcon = TrendingDown;
      directionLabel = 'Stepped down';
      directionColor = 'text-success';
    }
  }

  return (
    <div className="flex items-center gap-3 surface-text bg-surface-hover/50  rounded-lg px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted uppercase tracking-wide">Difficulty</span>
        <Badge variant={config.variant} size="sm">
          {config.label}
        </Badge>
      </div>
      {previous && (
        <div className={`flex items-center gap-1 text-xs ${directionColor}`}>
          <DirectionIcon size={14} />
          <span>{directionLabel}</span>
        </div>
      )}
      {typeof ratingDelta === 'number' && ratingDelta !== 0 && (
        <div className={`text-xs ${ratingDelta > 0 ? 'text-success' : 'text-danger'}`}>
          ({ratingDelta > 0 ? '+' : ''}{ratingDelta} rating)
        </div>
      )}
    </div>
  );
};

export default DifficultyIndicator;
