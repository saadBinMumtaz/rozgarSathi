import React from 'react';

export const Card = ({ children, className = '', hover = true, ...props }) => {
  return (
    <div
      className={`surface-text bg-surface rounded-xl p-6 card-shadow ${
        hover
          ? 'hover:bg-surface-hover hover:card-shadow-hover transition-all duration-200 ease-out'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-bold tracking-tight leading-snug ${className}`}>{children}</h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm leading-relaxed mt-1 ${className}`}>{children}</p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-6 pt-4 flex items-center justify-between ${className}`} style={{ borderTop: '1px solid var(--color-surface-hover)' }}>
    {children}
  </div>
);

export default Card;
