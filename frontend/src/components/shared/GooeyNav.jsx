// frontend/src/components/shared/GooeyNav.jsx
// Gooey morphing navigation with glassmorphism border.
// Particles burst on tab switch; active pill morphs between items.
// Adapts colors to dark/light mode via isDark prop.
// Improvements: centered layout, increased spacing, fixed navigation,
// smoother animations, responsive design.

import { useRef, useEffect, useState, useCallback } from 'react';

const GooeyNav = ({
  items,
  animationTime = 600,
  particleCount = 18,
  particleDistances = [100, 12],
  particleR = 110,
  timeVariance = 350,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0,
  isDark = true,
  onNavigate,
}) => {
  const containerRef = useRef(null);
  const navRef = useRef(null);
  const filterRef = useRef(null);
  const textRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

  const noise = (n = 1) => n / 2 - Math.random() * n;
  const getXY = (distance, pointIndex, totalPoints) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };
  const createParticle = (i, t, d, r) => {
    let rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
    };
  };
  const makeParticles = useCallback((element) => {
    const d = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      element.classList.remove('active');
      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('gooey-particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);
        point.classList.add('gooey-point');
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => {
          element.classList.add('active');
        });
        setTimeout(() => {
          try { element.removeChild(particle); } catch {}
        }, t);
      }, 30);
    }
  }, [particleCount, particleDistances, particleR, animationTime, timeVariance, colors]);

  const updateEffectPosition = useCallback((element) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText = element.innerText;
  }, []);

  const triggerEffects = useCallback((liEl) => {
    updateEffectPosition(liEl);
    if (filterRef.current) {
      const particles = filterRef.current.querySelectorAll('.gooey-particle');
      particles.forEach((p) => filterRef.current.removeChild(p));
    }
    if (textRef.current) {
      textRef.current.classList.remove('active');
      void textRef.current.offsetWidth;
      textRef.current.classList.add('active');
    }
    if (filterRef.current) makeParticles(filterRef.current);
  }, [updateEffectPosition, makeParticles]);

  const handleClick = useCallback((e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeIndex === index) return;
    setActiveIndex(index);
    // Find the <li> parent of the clicked <a>
    const liEl = e.currentTarget.closest('li') || e.currentTarget.parentElement;
    if (liEl) triggerEffects(liEl);
    // Navigate after a short delay so the animation starts first
    const page = items[index]?.page;
    if (page && onNavigate) {
      setTimeout(() => onNavigate(page), 80);
    }
  }, [activeIndex, items, onNavigate, triggerEffects]);

  const handleKeyDown = useCallback((e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const liEl = e.currentTarget.closest('li') || e.currentTarget.parentElement;
      if (liEl) handleClick({ currentTarget: liEl, preventDefault: () => {}, stopPropagation: () => {} }, index);
    }
  }, [handleClick]);

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;
    const activeLi = navRef.current.querySelectorAll('li')[activeIndex];
    if (activeLi) {
      updateEffectPosition(activeLi);
      textRef.current?.classList.add('active');
    }
    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex];
      if (currentActiveLi) updateEffectPosition(currentActiveLi);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeIndex, updateEffectPosition]);

  // Theme-aware CSS variables
  const pillBg = isDark ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.92)';
  const pillText = isDark ? '#0f172a' : '#f8fafc';
  const navText = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(15,23,42,0.7)';
  const particleColors = isDark
    ? { 1: '#96abc9', 2: '#e5b10c', 3: '#38bdf8', 4: '#a78bfa' }
    : { 1: '#64748b', 2: '#d97706', 3: '#0284c7', 4: '#7c3aed' };

  return (
    <>
      <style>{`
        :root {
          --color-1: ${particleColors[1]};
          --color-2: ${particleColors[2]};
          --color-3: ${particleColors[3]};
          --color-4: ${particleColors[4]};
        }
        .gooey-effect {
          position: absolute;
          opacity: 1;
          pointer-events: none;
          display: grid;
          place-items: center;
          z-index: 2;
          transition: left 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
                      width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .gooey-effect.text {
          color: ${pillText};
          transition: color 0.3s ease;
          font-weight: 600;
          font-size: 0.875rem;
          z-index: 3;
        }
        .gooey-effect.text.active {
          color: ${pillText};
        }
        .gooey-effect.filter {
          filter: blur(6px) contrast(80) blur(0);
          mix-blend-mode: screen;
        }
        .gooey-effect.filter::before {
          content: "";
          position: absolute;
          inset: -60px;
          z-index: -2;
          background: ${isDark ? '#0f172a' : '#f8fafc'};
        }
        .gooey-effect.filter::after {
          content: "";
          position: absolute;
          inset: 0;
          background: ${pillBg};
          transform: scale(0);
          opacity: 0;
          z-index: -1;
          border-radius: 9999px;
        }
        .gooey-effect.active::after {
          animation: gooey-pill 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes gooey-pill {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .gooey-particle,
        .gooey-point {
          display: block;
          opacity: 0;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          transform-origin: center;
        }
        .gooey-particle {
          --time: 5s;
          position: absolute;
          top: calc(50% - 9px);
          left: calc(50% - 9px);
          animation: gooey-particle-anim calc(var(--time)) ease 1 -350ms;
        }
        .gooey-point {
          background: var(--color);
          opacity: 1;
          animation: gooey-point-anim calc(var(--time)) ease 1 -350ms;
        }
        @keyframes gooey-particle-anim {
          0% {
            transform: rotate(0deg) translate(calc(var(--start-x)), calc(var(--start-y)));
            opacity: 1;
            animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
          }
          60% {
            transform: rotate(calc(var(--rotate) * 0.4)) translate(calc(var(--end-x) * 1.15), calc(var(--end-y) * 1.15));
            opacity: 1;
            animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
          }
          80% {
            transform: rotate(calc(var(--rotate) * 0.6)) translate(calc(var(--end-x)), calc(var(--end-y)));
            opacity: 0.9;
          }
          100% {
            transform: rotate(calc(var(--rotate) * 1.0)) translate(calc(var(--end-x) * 0.4), calc(var(--end-y) * 0.4));
            opacity: 0;
          }
        }
        @keyframes gooey-point-anim {
          0% { transform: scale(0); opacity: 0; animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1); }
          20% { transform: scale(calc(var(--scale) * 0.3)); }
          35% { opacity: 1; }
          55% { transform: scale(var(--scale)); opacity: 1; animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1); }
          80% { transform: scale(var(--scale)); opacity: 0.8; }
          100% { transform: scale(0); opacity: 0; }
        }
        .gooey-li {
          position: relative;
        }
        .gooey-li a {
          position: relative;
          z-index: 4;
        }
      `}</style>

      <div className="relative" ref={containerRef}>
        <nav className="flex relative" style={{ transform: 'translate3d(0,0,0.01px)' }}>
          {/* Glassmorphism container */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(15,23,42,0.04)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)'}`,
              boxShadow: isDark
                ? '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          />

          <ul
            ref={navRef}
            className="flex gap-3 sm:gap-4 md:gap-6 list-none p-1.5 sm:p-2 px-3 sm:px-4 m-0 relative z-[3]"
            style={{ color: navText }}
          >
            {items.map((item, index) => (
              <li
                key={index}
                className={`gooey-li rounded-full cursor-pointer text-xs sm:text-sm font-medium transition-colors duration-300 ${
                  activeIndex === index ? 'active' : ''
                }`}
              >
                <a
                  onClick={(e) => handleClick(e, index)}
                  href={item.href || '#'}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="outline-none py-2 px-3 sm:px-4 md:px-5 inline-block select-none no-underline"
                  style={{
                    color: activeIndex === index ? pillText : navText,
                    fontWeight: activeIndex === index ? 600 : 500,
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <span className="gooey-effect filter" ref={filterRef} />
        <span className="gooey-effect text" ref={textRef} />
      </div>
    </>
  );
};

export default GooeyNav;
