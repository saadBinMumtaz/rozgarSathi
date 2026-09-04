// frontend/src/pages/TailorResumePage.jsx
// Public-facing page explaining the AI resume tailoring feature.
// Split-screen hero with typewriter, Aurora background, video frame.

import React, { useState, useEffect } from 'react';
import PublicNavbar from '../components/shared/PublicNavbar';
import PublicFooter from '../components/shared/PublicFooter';
import ScrollReveal from '../components/shared/ScrollReveal';
import Aurora from '../components/shared/Aurora';
import { Button } from '../design-system/Button';
import { t } from '../i18n/translations';
import {
  FileText, ArrowRight, Upload, Sparkles, CheckCircle2,
  ArrowLeftRight, Target, BarChart3, Shield, RefreshCw
} from 'lucide-react';

/* ─── TypeWriter Hook ─── */
const useTypeWriter = (words, typingSpeed = 70, deletingSpeed = 40, pauseDuration = 1500) => {
  const [displayed, setDisplayed] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    let timeout;
    if (!isDeleting && displayed === currentWord) {
      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && displayed === '') {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    } else if (isDeleting) {
      timeout = setTimeout(() => setDisplayed((prev) => prev.slice(0, -1)), deletingSpeed);
    } else {
      timeout = setTimeout(() => setDisplayed(currentWord.slice(0, displayed.length + 1)), typingSpeed);
    }
    return () => clearTimeout(timeout);
  }, [displayed, wordIndex, isDeleting, words, typingSpeed, deletingSpeed, pauseDuration]);

  return displayed;
};

const STEP_KEYS = [
  { icon: Upload, titleKey: 'tr.flowUpload', descKey: 'tr.flowUploadDesc' },
  { icon: Target, titleKey: 'tr.flowAnalyze', descKey: 'tr.flowAnalyzeDesc' },
  { icon: Sparkles, titleKey: 'tr.flowTailor', descKey: 'tr.flowTailorDesc' },
  { icon: FileText, titleKey: 'tr.flowApply', descKey: 'tr.flowApplyDesc' },
];

const HIGHLIGHT_KEYS = [
  { icon: Shield, titleKey: 'tr.noFabrication', descKey: 'tr.noFabricationDesc' },
  { icon: BarChart3, titleKey: 'tr.smartMatching', descKey: 'tr.smartMatchingDesc' },
  { icon: RefreshCw, titleKey: 'tr.atsFriendly', descKey: 'tr.atsFriendlyDesc' },
  { icon: CheckCircle2, titleKey: 'tr.whyTitle', descKey: 'tr.whyDesc' },
];

export const TailorResumePage = ({ isDark, toggleTheme, onNavigate, language, setLanguage }) => {
  const L = (key) => t(key, language);
  const typewriterWord = useTypeWriter([L('tr.tw1'), L('tr.tw2'), L('tr.tw3'), L('tr.tw4')], 70, 40, 1500);

  const STEPS = STEP_KEYS.map(s => ({ ...s, title: L(s.titleKey), desc: L(s.descKey) }));
  const HIGHLIGHTS = HIGHLIGHT_KEYS.map(h => ({ ...h, title: L(h.titleKey), desc: L(h.descKey) }));

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <PublicNavbar isDark={isDark} toggleTheme={toggleTheme} onNavigate={onNavigate} currentPage="public-tailor-resume" language={language} setLanguage={setLanguage} />

      {/* ─── Hero — Split Screen ─── */}
      <section className="relative pt-28 overflow-hidden">
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <Aurora blend={0.4} amplitude={0.8} speed={1.0} lightMode={!isDark} />
        </div>
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-text-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Column */}
          <div className="space-y-6">
            <ScrollReveal delay={100}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold text-text-primary tracking-tight leading-tight">
                {L('tr.heroPrefix')}
                <br />
                <span className="inline-block min-w-[1ch]">
                  {typewriterWord}
                  <span
                    className="inline-block w-[3px] h-[0.85em] bg-text-primary ml-0.5 align-middle"
                    style={{ animation: 'tw-cursor-blink 0.7s steps(2, start) infinite' }}
                  />
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <p className="text-base md:text-lg text-text-muted max-w-xl leading-relaxed">
                {L('tr.heroDesc')}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button size="lg" variant="primary" onClick={() => onNavigate('resume-tailor')}>
                  {L('tr.ctaUpload')} <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button size="lg" variant="secondary" onClick={() => onNavigate('find-jobs')}>
                  <Target size={16} className="mr-2" /> {L('tr.ctaPaste')}
                </Button>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column — Video Frame */}
          <ScrollReveal delay={200} direction="right">
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden shadow-2xl bg-surface">
                {/* VIDEO PLACEHOLDER: Upload custom resume tailoring video here */}
                {/* Replace src with your video file, e.g., "/hero-resume.mp4" */}
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src="/tailor-resume.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{L('tr.flowTitle')}</h2>
              <p className="mt-4 text-text-muted text-lg">
                {L('tr.flowDesc')}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <ScrollReveal key={step.title} delay={i * 100}>
                  <div className="surface-text bg-surface rounded-xl p-6 h-full transition-colors relative">
                    <div className="absolute top-4 right-4 text-3xl font-black text-surface-text/10">
                      {i + 1}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-text-primary/10 flex items-center justify-center mb-4">
                      <Icon size={22} className="text-surface-text-muted" />
                    </div>
                    <h3 className="text-base font-bold text-surface-text">{step.title}</h3>
                    <p className="mt-2 text-sm text-surface-text-muted leading-relaxed">{step.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Before / After ─── */}
      <section className="py-20 md:py-28 bg-bg-hover/30">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{L('tr.beforeTitle')}</h2>
              <p className="mt-4 text-text-muted text-lg">
                {L('tr.beforeDesc')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Before */}
              <div className="surface-text bg-surface rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-text-muted/20 flex items-center justify-center">
                    <FileText size={16} className="text-surface-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-text">{L('tr.origResume')}</p>
                    <p className="text-xs text-surface-text-muted">{L('tr.origGeneric')}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-surface-hover/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-surface-text-muted mb-1">{L('tr.labelSummary')}</p>
                    <p className="text-xs text-surface-text leading-relaxed">
                      "Software developer with experience in web applications and databases. Looking for opportunities to grow."
                    </p>
                  </div>
                  <div className="bg-surface-hover/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-surface-text-muted mb-1">{L('tr.labelSkills')}</p>
                    <div className="flex flex-wrap gap-1">
                      {['Java', 'SQL', 'HTML', 'CSS', 'Teamwork', 'Communication'].map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-text-primary/5 text-xs text-surface-text-muted">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-surface-hover/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-surface-text-muted mb-1">{L('tr.labelExperience')}</p>
                    <p className="text-xs text-surface-text leading-relaxed">
                      "Developed web applications. Worked with databases. Collaborated with team members."
                    </p>
                  </div>
                </div>
              </div>

              {/* After */}
              <div className="surface-text bg-surface rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                    <Sparkles size={16} className="text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-text">{L('tr.tailoredFor')}</p>
                    <p className="text-xs text-success">{L('tr.matchScore')}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-success/5 rounded-lg p-3">
                    <p className="text-xs font-semibold text-surface-text-muted mb-1">{L('tr.labelSummary')}</p>
                    <p className="text-xs text-surface-text leading-relaxed">
                      "Full stack developer with 3 years building React + Node.js applications. Experienced in REST API design, MongoDB, and agile team delivery."
                    </p>
                  </div>
                  <div className="bg-success/5 rounded-lg p-3">
                    <p className="text-xs font-semibold text-surface-text-muted mb-1">{L('tr.skillsReordered')}</p>
                    <div className="flex flex-wrap gap-1">
                      {['React', 'Node.js', 'MongoDB', 'TypeScript', 'REST APIs', 'Git'].map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-success/15 text-xs text-surface-text font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-success/5 rounded-lg p-3">
                    <p className="text-xs font-semibold text-surface-text-muted mb-1">{L('tr.experienceEnhanced')}</p>
                    <p className="text-xs text-surface-text leading-relaxed">
                      "Built 5+ React applications serving 10K+ users. Designed RESTful APIs with Node.js and Express. Reduced page load time by 40%."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Key Highlights ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                {L('tr.whyTitle')}
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {HIGHLIGHTS.map((item, i) => {
              const Icon = item.icon;
              return (
                <ScrollReveal key={item.title} delay={i * 80}>
                  <div className="surface-text bg-surface rounded-xl p-6 h-full transition-colors">
                    <Icon size={22} className="text-surface-text-muted mb-3" />
                    <h3 className="text-base font-bold text-surface-text">{item.title}</h3>
                    <p className="mt-2 text-sm text-surface-text-muted leading-relaxed">{item.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="surface-text bg-surface rounded-2xl p-10 md:p-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-text-primary/[0.03] to-transparent pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {L('tr.ctaTitle')}
                </h2>
                <p className="text-surface-text-muted text-lg max-w-xl mx-auto">
                  {L('tr.ctaDesc')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => onNavigate('resume-tailor')}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-text-primary text-bg-primary text-base font-semibold hover:opacity-90 transition-opacity"
                  >
                    {L('tr.ctaUpload')} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <PublicFooter isDark={isDark} onNavigate={onNavigate} />

      <style>{`
        @keyframes tw-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default TailorResumePage;
