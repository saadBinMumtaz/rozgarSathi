import React from 'react';

export const ScoreRing = ({ score = 0, max = 10, label = 'Readiness', size = 90, strokeWidth = 8, className = '' }) => {
  const percentage = Math.min(100, Math.max(0, (score / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Semantic accent colors based on score range
  let strokeColor;
  if (percentage >= 80) strokeColor = 'var(--color-success)';
  else if (percentage >= 50) strokeColor = 'var(--color-warning)';
  else strokeColor = 'var(--color-danger)';

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle — track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
            fill="transparent"
            opacity={0.3}
          />
          {/* Animated scores circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-extrabold text-text-primary">{score}</span>
          <span className="text-[10px] text-text-muted font-medium">/{max}</span>
        </div>
      </div>
      {label && <span className="mt-1.5 text-xs text-text-muted font-medium">{label}</span>}
    </div>
  );
};

export default ScoreRing;
