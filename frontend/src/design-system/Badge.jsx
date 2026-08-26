import React from 'react';

export const Badge = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    secondary: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    destructive: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        variants[variant] || variants.primary
      } ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
