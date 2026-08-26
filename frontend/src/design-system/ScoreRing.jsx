import React from 'react';

export const ScoreRing = ({ score = 0, max = 10, label = 'Readiness', size = 90, strokeWidth = 8, className = '' }) => {
  const percentage = Math.min(100, Math.max(0, (score / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let colorClass = 'text-indigo-500';
  if (percentage >= 80) colorClass = 'text-emerald-400';
  else if (percentage >= 60) colorClass = 'text-cyan-400';
  else if (percentage >= 40) colorClass = 'text-amber-400';
  else colorClass = 'text-rose-400';

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-800"
            fill="transparent"
          />
          {/* Animated score circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${colorClass} transition-all duration-700 ease-out`}
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-extrabold text-slate-100">{score}</span>
          <span className="text-[10px] text-slate-400 font-medium">/{max}</span>
        </div>
      </div>
      {label && <span className="mt-1.5 text-xs text-slate-400 font-medium">{label}</span>}
    </div>
  );
};

export default ScoreRing;
