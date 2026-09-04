// frontend/src/pages/HomePage.jsx
// Public-facing Home page — premium AI career platform landing.
// Split-screen hero with typewriter, Aurora background, video frame.

import React, { useState, useEffect } from 'react';
import PublicNavbar from '../components/shared/PublicNavbar';
import PublicFooter from '../components/shared/PublicFooter';
import ScrollReveal from '../components/shared/ScrollReveal';
import Aurora from '../components/shared/Aurora';
import { Button } from '../design-system/Button';
import { t } from '../i18n/translations';
import {
  Briefcase, FileSearch, FileText, Mic, Code2, Brain, MessageSquare,
  ArrowRight, Sparkles, Target, Users, GraduationCap, BarChart3,
  Globe, Volume2, Shield, Zap, CheckCircle2, XCircle, Play
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

const FLOW_STEP_KEYS = [
  { icon: Briefcase, labelKey: 'home.flowFind', descKey: 'home.flowFindDesc' },
  { icon: FileSearch, labelKey: 'home.flowAnalyze', descKey: 'home.flowAnalyzeDesc' },
  { icon: FileText, labelKey: 'home.flowTailor', descKey: 'home.flowTailorDesc' },
  { icon: Mic, labelKey: 'home.flowPractice', descKey: 'home.flowPracticeDesc' },
  { icon: Code2, labelKey: 'home.flowCode', descKey: 'home.flowCodeDesc' },
  { icon: Brain, labelKey: 'home.flowEval', descKey: 'home.flowEvalDesc' },
  { icon: MessageSquare, labelKey: 'home.flowFeedback', descKey: 'home.flowFeedbackDesc' },
];

const FEATURE_KEYS = [
  { icon: Target, titleKey: 'home.feat1Title', descKey: 'home.feat1Desc' },
  { icon: Volume2, titleKey: 'home.feat2Title', descKey: 'home.feat2Desc' },
  { icon: Globe, titleKey: 'home.feat3Title', descKey: 'home.feat3Desc' },
  { icon: BarChart3, titleKey: 'home.feat4Title', descKey: 'home.feat4Desc' },
  { icon: Shield, titleKey: 'home.feat5Title', descKey: 'home.feat5Desc' },
  { icon: Zap, titleKey: 'home.feat6Title', descKey: 'home.feat6Desc' },
];

const AUDIENCE_KEYS = [
  { icon: GraduationCap, titleKey: 'home.aud1Title', descKey: 'home.aud1Desc' },
  { icon: Users, titleKey: 'home.aud2Title', descKey: 'home.aud2Desc' },
  { icon: Briefcase, titleKey: 'home.aud3Title', descKey: 'home.aud3Desc' },
];

export const HomePage = ({ isDark, toggleTheme, onNavigate, language, setLanguage }) => {
  const L = (key) => t(key, language);
  const typewriterWord = useTypeWriter([L('home.tw1'), L('home.tw2'), L('home.tw3'), L('home.tw4')], 70, 40, 1500);

  const FLOW_STEPS = FLOW_STEP_KEYS.map(s => ({ ...s, label: L(s.labelKey), desc: L(s.descKey) }));
  const FEATURES = FEATURE_KEYS.map(f => ({ ...f, title: L(f.titleKey), desc: L(f.descKey) }));
  const AUDIENCE = AUDIENCE_KEYS.map(a => ({ ...a, title: L(a.titleKey), desc: L(a.descKey) }));
  const COMPARISON = [
    { traditional: 'home.compJobDiscTrad', rozgar: 'home.compJobDiscRozgar', label: 'home.compJobDiscLabel' },
    { traditional: 'home.compResumeTrad', rozgar: 'home.compResumeRozgar', label: 'home.compResumeLabel' },
    { traditional: 'home.compInterviewTrad', rozgar: 'home.compInterviewRozgar', label: 'home.compInterviewLabel' },
    { traditional: 'home.compCodingTrad', rozgar: 'home.compCodingRozgar', label: 'home.compCodingLabel' },
    { traditional: 'home.compFeedbackTrad', rozgar: 'home.compFeedbackRozgar', label: 'home.compFeedbackLabel' },
    { traditional: 'home.compLangTrad', rozgar: 'home.compLangRozgar', label: 'home.compLangLabel' },
  ].map(r => ({ ...r, traditional: L(r.traditional), rozgar: L(r.rozgar), label: L(r.label) }));

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <PublicNavbar isDark={isDark} toggleTheme={toggleTheme} onNavigate={onNavigate} currentPage="home" language={language} setLanguage={setLanguage} />

      {/* ─── Hero Section — Split Screen ─── */}
      <section className="relative overflow-hidden pt-16">
        {/* Aurora background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <Aurora blend={0.4} amplitude={0.8} speed={1.0} lightMode={!isDark} />
        </div>
        {/* Radial glow */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-text-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Column — Text & CTAs */}
          <div className="space-y-6">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-text-primary/5 border border-border text-sm text-text-muted">
                <Sparkles size={14} />
                <span>{L('home.badge')}</span>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold text-text-primary tracking-tight leading-tight">
                {L('home.heroPrefix')}
                <br />
                <span className="inline-block min-w-[1ch]">
                  {typewriterWord}
                  <span
                    className="inline-block w-[3px] h-[0.85em] bg-text-primary ml-0.5 align-middle"
                    style={{ animation: 'tw-cursor-blink 0.7s steps(2, start) infinite' }}
                  />
                </span>
                <br />
                {L('home.heroSuffix')}
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <p className="text-base md:text-lg text-text-muted max-w-xl leading-relaxed">
                {L('home.heroDesc')}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button size="lg" variant="primary" onClick={() => onNavigate('auth')}>
                  {L('home.ctaStart')} <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button size="lg" variant="secondary" onClick={() => onNavigate('public-find-job')}>
                  <Briefcase size={16} className="mr-2" /> {L('home.ctaExplore')}
                </Button>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column — Video Frame */}
          <ScrollReveal delay={200} direction="right">
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden border border-border shadow-2xl bg-surface">
                {/* VIDEO PLACEHOLDER: Upload custom hero video here */}
                {/* Replace src with your video file, e.g., "/hero-home.mp4" */}
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src="/animated-video.mp4" type="video/mp4" />
                </video>
                {/* Fallback overlay if video doesn't load */}
                <div className="absolute inset-0 flex items-center justify-center bg-surface/80 pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-text-primary/10 flex items-center justify-center">
                    <Play size={24} className="text-text-primary ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Product Flow ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                {L('home.flowTitle')}
              </h2>
              <p className="mt-4 text-text-muted text-lg">
                {L('home.flowDesc')}
              </p>
            </div>
          </ScrollReveal>

          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <ScrollReveal key={step.label} delay={i * 80} direction="up">
                  <div className="surface-text bg-surface rounded-xl px-4 py-5 text-center min-w-[130px] md:min-w-[150px] border border-border/50 hover:border-border-strong transition-colors">
                    <Icon size={24} className="mx-auto mb-2 text-surface-text-muted" />
                    <p className="text-sm font-semibold text-surface-text">{step.label}</p>
                    <p className="text-xs text-surface-text-muted mt-1 hidden md:block">{step.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Who It's For ─── */}
      <section className="py-20 md:py-28 bg-bg-hover/30">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{L('home.audienceTitle')}</h2>
              <p className="mt-4 text-text-muted text-lg">
                {L('home.audienceDesc')}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AUDIENCE.map((item, i) => {
              const Icon = item.icon;
              return (
                <ScrollReveal key={item.title} delay={i * 100}>
                  <div className="surface-text bg-surface rounded-xl p-6 border border-border/50 h-full hover:border-border-strong transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-text-primary/10 flex items-center justify-center mb-4">
                      <Icon size={22} className="text-surface-text-muted" />
                    </div>
                    <h3 className="text-lg font-bold text-surface-text">{item.title}</h3>
                    <p className="mt-2 text-sm text-surface-text-muted leading-relaxed">{item.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Core Features ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                {L('home.featTitle')}
              </h2>
              <p className="mt-4 text-text-muted text-lg">
                {L('home.featDesc')}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <ScrollReveal key={feat.title} delay={i * 80}>
                  <div className="surface-text bg-surface rounded-xl p-6 border border-border/50 h-full hover:border-border-strong transition-colors">
                    <Icon size={22} className="text-surface-text-muted mb-3" />
                    <h3 className="text-base font-bold text-surface-text">{feat.title}</h3>
                    <p className="mt-2 text-sm text-surface-text-muted leading-relaxed">{feat.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Why RozGar-Sathi? ─── */}
      <section className="py-20 md:py-28 bg-bg-hover/30">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                {L('home.whyTitle')}
              </h2>
              <p className="mt-4 text-text-muted text-lg">
                {L('home.whyDesc')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="surface-text bg-surface rounded-2xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-3 gap-0 text-sm font-semibold border-b border-border/30">
                <div className="p-4 text-surface-text-muted">{L('home.compAspect')}</div>
                <div className="p-4 text-surface-text-muted text-center">{L('home.compTraditional')}</div>
                <div className="p-4 text-surface-text text-center">{L('home.compRozgar')}</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-3 gap-0 text-sm ${
                    i < COMPARISON.length - 1 ? 'border-b border-border/20' : ''
                  }`}
                >
                  <div className="p-4 font-medium text-surface-text">{row.label}</div>
                  <div className="p-4 text-surface-text-muted flex items-center gap-2">
                    <XCircle size={14} className="flex-shrink-0 text-danger/70" />
                    <span className="hidden sm:inline">{row.traditional}</span>
                    <span className="sm:hidden text-xs">{row.traditional}</span>
                  </div>
                  <div className="p-4 text-surface-text flex items-center gap-2">
                    <CheckCircle2 size={14} className="flex-shrink-0 text-success" />
                    <span>{row.rozgar}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── AI / Tech Section ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="left">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {L('home.aiTitle')}
                </h2>
                <p className="text-text-muted text-lg leading-relaxed">
                  {L('home.aiDesc')}
                </p>
                <ul className="space-y-3">
                  {[
                    L('home.aiBullet1'),
                    L('home.aiBullet2'),
                    L('home.aiBullet3'),
                    L('home.aiBullet4'),
                    L('home.aiBullet5'),
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-text-muted">
                      <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div className="surface-text bg-surface rounded-2xl p-6 border border-border/50">
                {/* Mock interview conversation UI */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-text-primary/20 flex items-center justify-center">
                      <Brain size={16} className="text-surface-text" />
                    </div>
                    <span className="text-sm font-semibold text-surface-text">{L('home.mockAiLabel')}</span>
                    <span className="text-xs text-surface-text-muted ml-auto">{L('home.mockRound')}</span>
                  </div>

                  <div className="bg-surface-hover/50 rounded-xl p-4">
                    <p className="text-sm text-surface-text-muted leading-relaxed">
                      "Tell me about a time you had to deal with a difficult team member. How did you handle it?"
                    </p>
                  </div>

                  <div className="bg-text-primary/5 rounded-xl p-4 border border-border/30">
                    <p className="text-sm text-text-primary leading-relaxed">
                      "In my final year project, a teammate wasn't contributing. I scheduled a one-on-one,
                      understood their concerns, and we redistributed tasks based on strengths..."
                    </p>
                  </div>

                  <div className="bg-success/10 rounded-xl p-4 border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={14} className="text-success" />
                      <span className="text-xs font-semibold text-success">{L('home.mockStrong')}</span>
                    </div>
                    <p className="text-xs text-surface-text-muted">
                      {L('home.mockFeedback')}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="surface-text bg-surface rounded-2xl p-10 md:p-16 text-center border border-border/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-text-primary/[0.03] to-transparent pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {L('home.ctaTitle')}
                </h2>
                <p className="text-surface-text-muted text-lg max-w-xl mx-auto">
                  {L('home.ctaDesc')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => onNavigate('auth')}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-text-primary text-bg-primary text-base font-semibold hover:opacity-90 transition-opacity"
                  >
                    Get Started Free <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => onNavigate('public-find-job')}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-surface-text/20 text-surface-text text-base font-medium hover:bg-surface-hover transition-colors"
                  >
                    <Briefcase size={16} /> {L('home.ctaBrowse')}
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <PublicFooter isDark={isDark} onNavigate={onNavigate} />

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

export default HomePage;
