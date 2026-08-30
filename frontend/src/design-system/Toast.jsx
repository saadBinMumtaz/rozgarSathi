import React from 'react';

export const Toast = ({ message, type = 'info', onClose, className = '' }) => {
  if (!message) return null;

  const styles = {
    info: 'surface-text bg-surface text-text-primary',
    success: 'surface-text bg-surface border-success/40 text-text-primary',
    warning: 'surface-text bg-surface border-warning/40 text-text-primary',
    error: 'surface-text bg-surface border-danger/40 text-text-primary',
  };

  const iconColors = {
    info: 'text-text-muted',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-danger',
  };

  return (
    <div
      className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg border shadow-lg flex items-center gap-3 z-50 text-sm ${
        styles[type] || styles.info
      } ${className}`}
    >
      <span className={iconColors[type] || iconColors.info}>
        {type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}
      </span>
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="hover:opacity-75 focus:outline-none ml-2 text-text-muted hover:text-text-primary font-bold"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default Toast;
