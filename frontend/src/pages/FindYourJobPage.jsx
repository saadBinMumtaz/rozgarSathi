// frontend/src/pages/FindYourJobPage.jsx
// Public-facing page explaining the job discovery & JD analysis flow.
// Split-screen hero with typewriter, Aurora background, video frame.

import React, { useState, useEffect } from 'react';
import PublicNavbar from '../components/shared/PublicNavbar';
import PublicFooter from '../components/shared/PublicFooter';
import ScrollReveal from '../components/shared/ScrollReveal';
import Aurora from '../components/shared/Aurora';
import { Button } from '../design-system/Button';
import { t } from '../i18n/translations';
import {
  Briefcase, Search, FileSearch, Target, ArrowRight, CheckCircle2,
  MapPin, Building2, Clock, Sparkles, BarChart3, Code2, Mic
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
  { icon: Search, titleKey: 'fj.flowSearch', descKey: 'fj.flowSearchDesc' },
  { icon: Target, titleKey: 'fj.flowAnalyze', descKey: 'fj.flowAnalyzeDesc' },
  { icon: FileSearch, titleKey: 'fj.flowPrepare', descKey: 'fj.flowPrepareDesc' },
  { icon: Sparkles, titleKey: 'fj.flowSucceed', descKey: 'fj.flowSucceedDesc' },
];

const JD_OUTPUT_KEYS = [
  { icon: BarChart3, labelKey: 'fj.aiSkills', descKey: 'fj.aiSkillsDesc' },
  { icon: Building2, labelKey: 'fj.aiRole', descKey: 'fj.aiRoleDesc' },
  { icon: Code2, labelKey: 'fj.aiKeywords', descKey: 'fj.aiKeywordsDesc' },
  { icon: Mic, labelKey: 'fj.aiRequirements', descKey: 'fj.aiRequirementsDesc' },
];

export const FindYourJobPage = ({ isDark, toggleTheme, onNavigate, language, setLanguage }) => {
  const L = (key) => t(key, language);
  const typewriterWord = useTypeWriter([L('fj.tw1'), L('fj.tw2'), L('fj.tw3'), L('fj.tw4')], 70, 40, 1500);

  const STEPS = STEP_KEYS.map(s => ({ ...s, title: L(s.titleKey), desc: L(s.descKey) }));
  const JD_OUTPUTS = JD_OUTPUT_KEYS.map(o => ({ ...o, label: L(o.labelKey), desc: L(o.descKey) }));

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <PublicNavbar isDark={isDark} toggleTheme={toggleTheme} onNavigate={onNavigate} currentPage="public-find-job" language={language} setLanguage={setLanguage} />

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
                {L('fj.heroPrefix')}
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
                {L('fj.heroDesc')}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button size="lg" variant="primary" onClick={() => onNavigate('find-jobs')}>
                  {L('fj.ctaBrowse')} <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button size="lg" variant="secondary" onClick={() => onNavigate('jd-input')}>
                  <FileSearch size={16} className="mr-2" /> {L('fj.ctaPaste')}
                </Button>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column — Video Frame */}
          <ScrollReveal delay={200} direction="right">
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden shadow-2xl bg-surface">
                {/* VIDEO PLACEHOLDER: Upload custom job discovery video here */}
                {/* Replace src with your video file, e.g., "/hero-jobs.mp4" */}
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src="/job-search.mp4" type="video/mp4" />
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
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{L('fj.flowTitle')}</h2>
              <p className="mt-4 text-text-muted text-lg">
                {L('fj.flowDesc')}
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

      {/* ─── What the AI Extracts ─── */}
      <section className="py-20 md:py-28 bg-bg-hover/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="left">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {L('fj.aiTitle')}
                </h2>
                <p className="text-text-muted text-lg leading-relaxed">
                  {L('fj.aiDesc')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {JD_OUTPUTS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-text-primary/5 flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className="text-text-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                          <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div className="surface-text bg-surface rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <FileSearch size={18} className="text-surface-text-muted" />
                  <span className="text-sm font-semibold text-surface-text">{L('fj.mockJdResult')}</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-surface-hover/50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-surface-text-muted uppercase tracking-wider mb-2">{L('fj.mockRole')}</p>
                    <p className="text-sm text-surface-text font-medium">Full Stack Developer</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-surface-text-muted">
                      <span className="flex items-center gap-1"><Building2 size={12} /> TechCorp</span>
                      <span className="flex items-center gap-1"><MapPin size={12} /> Remote</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> 2-4 yrs</span>
                    </div>
                  </div>
                  <div className="bg-surface-hover/50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-surface-text-muted uppercase tracking-wider mb-2">{L('fj.mockKeySkills')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['React', 'Node.js', 'MongoDB', 'TypeScript', 'REST APIs', 'Git'].map((skill) => (
                        <span key={skill} className="px-2 py-0.5 rounded-md bg-text-primary/10 text-xs text-surface-text font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-success/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={14} className="text-success" />
                      <span className="text-xs font-semibold text-success">{L('fj.mockAnalysisDone')}</span>
                    </div>
                    <p className="text-xs text-surface-text-muted">
                      {L('fj.mockAnalysisResult')}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
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
                  {L('fj.ctaTitle')}
                </h2>
                <p className="text-surface-text-muted text-lg max-w-xl mx-auto">
                  {L('fj.ctaDesc')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => onNavigate('find-jobs')}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-text-primary text-bg-primary text-base font-semibold hover:opacity-90 transition-opacity"
                  >
                    {L('fj.ctaBrowse')} <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => onNavigate('jd-input')}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-surface-text text-base font-medium hover:bg-surface-hover transition-colors"
                  >
                    <FileSearch size={16} /> {L('fj.ctaPaste')}
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

export default FindYourJobPage;
