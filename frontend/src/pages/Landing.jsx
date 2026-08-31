import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../design-system/Button';
import { sampleJDs, sampleSeniorityOrder } from '../data/sampleJD';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Aurora from '../components/shared/Aurora';
import PageHeader from '../components/shared/PageHeader';

/* ─── TypeWriter Hook ─── */
const useTypeWriter = (words, typingSpeed = 70, deletingSpeed = 40, pauseDuration = 1500) => {
  const [displayed, setDisplayed] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    let timeout;

    if (!isDeleting && displayed === currentWord) {
      // Pause at end of word, then start deleting
      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && displayed === '') {
      // Move to next word
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    } else if (isDeleting) {
      timeout = setTimeout(() => {
        setDisplayed((prev) => prev.slice(0, -1));
      }, deletingSpeed);
    } else {
      timeout = setTimeout(() => {
        setDisplayed(currentWord.slice(0, displayed.length + 1));
      }, typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [displayed, wordIndex, isDeleting, words, typingSpeed, deletingSpeed, pauseDuration]);

  return displayed;
};

/* ─── Landing Page ─── */
export const Landing = ({ onNavigate, onTrySampleJD, isAuthenticated, user, isDark }) => {
  const { logout } = useAuth();
  const videoRef = useRef(null);

  const typewriterWord = useTypeWriter(
    ['Behavioral', 'Technical', 'Coding'],
    70,   // typing speed (ms per char)
    40,   // deleting speed
    1500  // pause at end of word
  );

  // Force video to loop between 0–6 seconds
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => {
      if (video.currentTime >= 6) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    };
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col relative overflow-hidden">
      {/* Aurora background effect */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <Aurora
          blend={0.4}
          amplitude={0.8}
          speed={1.0}
          lightMode={!isDark}
        />
      </div>

      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-text-primary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* ─── Navigation Header ─── */}
      <PageHeader
        isDark={isDark}
        onNavigate={onNavigate}
        currentPage="landing"
        isAuthenticated={isAuthenticated}
        onLogout={() => { logout(); onNavigate('landing'); }}
      />

      {/* ─── Split-Screen Hero ─── */}
      <section className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10">
        {/* Left Column — Text & CTAs */}
        <div className="space-y-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold text-text-primary tracking-tight leading-tight">
            Get ready for
            <br />
            <span className="inline-block min-w-[1ch] mt-1">
              {typewriterWord}
              <span
                className="inline-block w-[3px] h-[0.85em] bg-text-primary ml-0.5 align-middle"
                style={{ animation: 'tw-cursor-blink 0.7s steps(2, start) infinite' }}
              />
            </span>
            {' '}interview
          </h1>

          <p className="text-base md:text-lg text-text-muted max-w-xl leading-relaxed">
            Practice spoken Behavioral, Technical, and Live Coding interviews tailored
            to your target Job Description — with adaptive difficulty, bilingual support,
            and evidence-backed scoring.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={() => onNavigate(isAuthenticated ? 'jd-input' : 'auth')}
            >
              {isAuthenticated ? 'Start JD Analysis & Practice →' : 'Get Started →'}
            </Button>

            <select
              value=""
              onChange={(e) => {
                const sample = sampleJDs.find((s) => s.id === e.target.value);
                if (sample) onTrySampleJD({ text: sample.text, sampleId: sample.id });
              }}
              aria-label="Load a sample job description"
              className="text-base font-semibold surface-text bg-surface rounded-lg px-4 py-3 text-text-primary hover:border-border-strong focus:outline-none focus:border-border-strong cursor-pointer"
            >
              <option value="" disabled>
                <span className="flex items-center gap-1"><Sparkles size={14} /> Try a sample JD…</span>
              </option>
              {sampleSeniorityOrder.map((group) => (
                <optgroup key={group} label={group}>
                  {sampleJDs
                    .filter((s) => s.seniority === group)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Guest hint */}
          {!isAuthenticated && (
            <p className="text-xs text-text-muted">
              Try a sample JD without signing up, or{' '}
              <button onClick={() => onNavigate('auth')} className="text-text-primary font-medium hover:underline">
                create an account
              </button>{' '}
              to track your progress.
            </p>
          )}
        </div>

        {/* Right Column — Video Frame */}
        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden border border-border shadow-2xl bg-surface">
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/animated-video.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* Cursor blink keyframes */}
      <style>{`
        @keyframes tw-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
