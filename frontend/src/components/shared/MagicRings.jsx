// frontend/src/components/shared/MagicRings.jsx
// Subtle animated concentric rings using SVG — used as a decorative footer background.
// Adapts to dark/light mode via isDark prop.

import { useEffect, useRef } from 'react';

export const MagicRings = ({ isDark = true, className = '' }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let animationId;
    const rings = svg.querySelectorAll('.magic-ring');
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = (time - startTime) / 1000;
      rings.forEach((ring, i) => {
        const speed = 0.15 + i * 0.05;
        const rotation = elapsed * speed * (i % 2 === 0 ? 1 : -1);
        const scale = 1 + Math.sin(elapsed * 0.3 + i * 0.5) * 0.02;
        ring.setAttribute('transform', `rotate(${rotation}) scale(${scale})`);
      });
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const strokeColor = isDark ? 'rgba(237, 242, 244, 0.06)' : 'rgba(43, 45, 66, 0.06)';
  const accentColor = isDark ? 'rgba(150, 171, 201, 0.08)' : 'rgba(43, 45, 66, 0.04)';

  return (
    <svg
      ref={svgRef}
      viewBox="-200 -200 400 400"
      className={`pointer-events-none ${className}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      aria-hidden="true"
    >
      {[60, 90, 120, 150, 180].map((r, i) => (
        <circle
          key={i}
          className="magic-ring"
          cx="0"
          cy="0"
          r={r}
          fill="none"
          stroke={i % 2 === 0 ? strokeColor : accentColor}
          strokeWidth={i === 2 ? 1.5 : 0.8}
          strokeDasharray={`${4 + i * 2} ${8 + i * 3}`}
          style={{ transformOrigin: '0 0' }}
        />
      ))}
    </svg>
  );
};

export default MagicRings;
