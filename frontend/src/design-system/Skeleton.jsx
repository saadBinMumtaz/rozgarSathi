import React from 'react';

export const Skeleton = ({ className = '', height = 'h-4', width = 'w-full' }) => {
  return (
    <div
      className={`bg-border-theme/40 animate-pulse rounded-md ${height} ${width} ${className}`}
    />
  );
};

export default Skeleton;
