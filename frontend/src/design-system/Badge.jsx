import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-surface-hover text-surface-text',
    primary: 'bg-surface-text/20 text-surface-text',
    secondary: 'bg-surface-hover text-surface-text-muted',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    destructive: 'bg-danger/20 text-danger',
    info: 'bg-surface-hover text-surface-text-muted',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        variants[variant] || variants.default
      } ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
