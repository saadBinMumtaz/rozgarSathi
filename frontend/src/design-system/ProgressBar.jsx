import React from 'react';

export const ProgressBar = ({ value = 0, max = 100, label, showValue = true, className = '' }) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  // Use semantic accent colors based on progress
  let barColor = 'bg-text-muted';
  if (percentage >= 80) barColor = 'bg-success';
  else if (percentage >= 50) barColor = 'bg-warning';
  else if (percentage >= 25) barColor = 'bg-text-muted';

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs text-text-muted font-medium">
          {label && <span>{label}</span>}
          {showValue && <span>{percentage}%</span>}
        </div>
      )}
      <div className="h-2 w-full bg-border-theme/30 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
