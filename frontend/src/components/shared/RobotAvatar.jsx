// frontend/src/components/shared/RobotAvatar.jsx
// Smiling robot avatar with antenna — matches Canva mockup design.
// Adapts stroke color based on theme.

import React from 'react';

export const RobotAvatar = ({ size = 120, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    aria-label="Interview robot avatar"
  >
    {/* Antenna */}
    <circle cx="95" cy="20" r="6" stroke="currentColor" strokeWidth="3" />
    <line x1="95" y1="26" x2="95" y2="40" stroke="currentColor" strokeWidth="3" />

    {/* Head outline */}
    <rect x="25" y="35" width="70" height="60" rx="12" stroke="currentColor" strokeWidth="3" />

    {/* Inner face border */}
    <rect x="32" y="42" width="56" height="46" rx="8" stroke="currentColor" strokeWidth="2.5" />

    {/* Left eye (happy arc) */}
    <path
      d="M42 62 C42 56, 52 56, 52 62"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />

    {/* Right eye (happy arc) */}
    <path
      d="M68 62 C68 56, 78 56, 78 62"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />

    {/* Smile */}
    <path
      d="M48 72 C48 80, 72 80, 72 72"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />

    {/* Left ear */}
    <path
      d="M25 55 C18 55, 18 75, 25 75"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />

    {/* Right ear */}
    <path
      d="M95 55 C102 55, 102 75, 95 75"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export default RobotAvatar;
