// frontend/src/components/shared/TypewriterText.jsx
// Character-by-character text reveal animation.
// Types out text at a configurable speed, with a blinking cursor.

import React, { useState, useEffect } from 'react';

export const TypewriterText = ({
  text,
  speed = 33,
  className = '',
  onComplete,
}) => {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setIsComplete(false);
    if (!text) return;

    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {!isComplete && (
        <span className="inline-block w-0.5 h-5 ml-0.5 align-middle bg-current animate-pulse" />
      )}
    </span>
  );
};

export default TypewriterText;
