// frontend/src/components/shared/ScrollReveal.jsx
// Lightweight scroll-triggered reveal animation using IntersectionObserver.
// Wraps children in a div that fades + slides in when it enters the viewport.

import { useEffect, useRef, useState } from 'react';

export const ScrollReveal = ({
  children,
  direction = 'up',       // 'up' | 'down' | 'left' | 'right' | 'none'
  delay = 0,
  duration = 600,
  threshold = 0.15,
  className = '',
  as: Component = 'div',
}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const directionStyles = {
    up:    'translateY(32px)',
    down:  'translateY(-32px)',
    left:  'translateX(32px)',
    right: 'translateX(-32px)',
    none:  'none',
  };

  return (
    <Component
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : directionStyles[direction] || directionStyles.up,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Component>
  );
};

export default ScrollReveal;
