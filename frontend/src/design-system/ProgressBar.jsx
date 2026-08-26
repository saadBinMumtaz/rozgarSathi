import React from 'react';

export const ProgressBar = ({ value = 0, max = 100, label, showValue = true, className = '' }) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
          {label && <span>{label}</span>}
          {showValue && <span>{percentage}%</span>}
        </div>
      )}
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
