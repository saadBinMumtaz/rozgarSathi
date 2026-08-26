import React from 'react';

export const Toast = ({ message, type = 'info', onClose, className = '' }) => {
  if (!message) return null;

  const bgColors = {
    info: 'bg-indigo-900/90 border-indigo-700 text-indigo-200',
    success: 'bg-emerald-900/90 border-emerald-700 text-emerald-200',
    warning: 'bg-amber-900/90 border-amber-700 text-amber-200',
    error: 'bg-rose-900/90 border-rose-700 text-rose-200',
  };

  return (
    <div
      className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg border shadow-xl flex items-center gap-3 backdrop-blur-md z-50 text-sm ${
        bgColors[type] || bgColors.info
      } ${className}`}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="hover:opacity-75 focus:outline-none ml-2 text-current font-bold"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default Toast;
