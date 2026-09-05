import React from 'react';

export const Skeleton = ({ className = '', height = 'h-4', width = 'w-full', shimmer = true }) => {
  return (
    <div
      className={`rounded-md overflow-hidden ${height} ${width} ${className}`}
      style={{
        background: shimmer
          ? 'linear-gradient(90deg, var(--color-surface-hover) 0%, var(--color-surface-text) 50%, var(--color-surface-hover) 100%)'
          : 'var(--color-surface-hover)',
        backgroundSize: shimmer ? '200% 100%' : undefined,
        animation: shimmer ? 'rs-shimmer 1.5s ease-in-out infinite' : undefined,
        opacity: shimmer ? 0.3 : 0.4,
      }}
    />
  );
};

export default Skeleton;
