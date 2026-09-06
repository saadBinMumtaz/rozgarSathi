// frontend/src/components/shared/RobotAvatar.jsx
// State-aware robot avatar with antenna.
// States: neutral, speaking, listening, thinking, positive.
// Uses subtle SVG expression changes + CSS transitions.
// Respects prefers-reduced-motion.

import React from 'react';

const T = '0.35s ease'; // transition shorthand

export const RobotAvatar = ({ size = 120, className = '', style, state = 'neutral' }) => {
  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // Eye visibility: arc (happy) vs dot (attentive)
  const showDotEyes = state === 'listening' || state === 'thinking';
  const showArcEyes = !showDotEyes;

  // Mouth visibility per state
  const showSmile = state === 'neutral';
  const showSpeak = state === 'speaking';
  const showSmallO = state === 'listening';
  const showFlat = state === 'thinking';
  const showWide = state === 'positive';

  const dur = reduced ? '0.01s' : T;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label={`Interview robot — ${state}`}
      role="img"
    >
      <style>{`
        @keyframes ra-speak {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.45); }
        }
        @keyframes ra-antenna {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .ra-mouth-speaking {
          transform-origin: 60px 74px;
          animation: ra-speak 0.4s ease-in-out infinite;
        }
        .ra-antenna-thinking {
          animation: ra-antenna 1.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ra-mouth-speaking,
          .ra-antenna-thinking { animation: none !important; }
        }
      `}</style>

      {/* Antenna */}
      <g className={state === 'thinking' ? 'ra-antenna-thinking' : ''}>
        <circle cx="95" cy="20" r="6" stroke="currentColor" strokeWidth="3" />
        <line x1="95" y1="26" x2="95" y2="40" stroke="currentColor" strokeWidth="3" />
      </g>

      {/* Head outline */}
      <rect x="25" y="35" width="70" height="60" rx="12" stroke="currentColor" strokeWidth="3" />

      {/* Inner face border */}
      <rect x="32" y="42" width="56" height="46" rx="8" stroke="currentColor" strokeWidth="2.5" />

      {/* Eyes: arc (neutral, speaking, positive) */}
      <g style={{ opacity: showArcEyes ? 1 : 0, transition: `opacity ${dur}` }}>
        <path d="M42 62 C42 56, 52 56, 52 62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M68 62 C68 56, 78 56, 78 62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
      {/* Eyes: dot (listening, thinking) */}
      <g style={{ opacity: showDotEyes ? 1 : 0, transition: `opacity ${dur}` }}>
        <circle cx="47" cy="59" r="3.5" fill="currentColor" />
        <circle cx="73" cy="59" r="3.5" fill="currentColor" />
      </g>

      {/* Mouth: neutral smile */}
      <path
        d="M48 72 C48 80, 72 80, 72 72"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"
        style={{ opacity: showSmile ? 1 : 0, transition: `opacity ${dur}` }}
      />
      {/* Mouth: speaking (animated) */}
      <g
        className={showSpeak ? 'ra-mouth-speaking' : ''}
        style={{ opacity: showSpeak ? 1 : 0, transition: `opacity ${dur}` }}
      >
        <ellipse cx="60" cy="74" rx="8" ry="5" stroke="currentColor" strokeWidth="2.5" fill="none" />
      </g>
      {/* Mouth: listening (small o) */}
      <ellipse
        cx="60" cy="74" rx="5" ry="3.5"
        stroke="currentColor" strokeWidth="2.5" fill="none"
        style={{ opacity: showSmallO ? 1 : 0, transition: `opacity ${dur}` }}
      />
      {/* Mouth: thinking (flat line) */}
      <path
        d="M50 75 L70 75"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"
        style={{ opacity: showFlat ? 1 : 0, transition: `opacity ${dur}` }}
      />
      {/* Mouth: positive (wide smile) */}
      <path
        d="M44 70 C44 82, 76 82, 76 70"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"
        style={{ opacity: showWide ? 1 : 0, transition: `opacity ${dur}` }}
      />

      {/* Ears */}
      <path d="M25 55 C18 55, 18 75, 25 75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M95 55 C102 55, 102 75, 95 75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
};

export default RobotAvatar;
