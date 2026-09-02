// frontend/src/components/shared/WaveformAnimation.jsx
// Animated waveform bars for "Listening" state — matches Canva mockup.
// Bars animate with staggered heights to simulate audio visualization.

import React from 'react';

const BAR_COUNT = 12;

export const WaveformAnimation = ({ className = '' }) => (
  <div className={`flex items-center gap-1 ${className}`} aria-label="Listening animation">
    {Array.from({ length: BAR_COUNT }).map((_, i) => (
      <div
        key={i}
        className="w-1 rounded-full bg-current"
        style={{
          height: '16px',
          animation: `waveform-bar 1s ease-in-out ${i * 0.08}s infinite`,
        }}
      />
    ))}
  </div>
);

export default WaveformAnimation;
