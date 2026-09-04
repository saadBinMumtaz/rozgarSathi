// frontend/src/pages/PrepareInterviewPage.jsx
// Public-facing page showcasing interview preparation — the strongest page.
// Split-screen hero with typewriter, Aurora background, video frame.

import React, { useState, useEffect } from 'react';
import PublicNavbar from '../components/shared/PublicNavbar';
import PublicFooter from '../components/shared/PublicFooter';
import ScrollReveal from '../components/shared/ScrollReveal';
import Aurora from '../components/shared/Aurora';
import { Button } from '../design-system/Button';
import { t } from '../i18n/translations';
import {
  Mic, Code2, Brain, MessageSquare, ArrowRight, Volume2, Globe,
  BarChart3, Zap, Target, CheckCircle2, Users, Sparkles, Play
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

const MODE_KEYS = [
  { icon: Mic, titleKey: 'pi.modeBehavioral', descKey: 'pi.modeBehavioralDesc' },
  { icon: Brain, titleKey: 'pi.modeTechnical', descKey: 'pi.modeTechnicalDesc' },
  { icon: Code2, titleKey: 'pi.modeCoding', descKey: 'pi.modeCodingDesc' },
];

const CAP_KEYS = [
  { icon: Target, titleKey: 'pi.liveAdaptive', descKey: 'pi.liveAdaptiveDesc' },
  { icon: BarChart3, titleKey: 'pi.liveFeedback', descKey: 'pi.liveFeedbackDesc' },
  { icon: MessageSquare, titleKey: 'pi.liveFollowup', descKey: 'pi.liveFollowupDesc' },
  { icon: Globe, titleKey: 'pi.liveBilingual', descKey: 'pi.liveBilingualDesc' },
  { icon: Volume2, titleKey: 'pi.liveVoice', descKey: 'pi.liveVoiceDesc' },
  { icon: Zap, titleKey: 'pi.liveContext', descKey: 'pi.liveContextDesc' },
];

export const PrepareInterviewPage = ({ isDark, toggleTheme, onNavigate, language, setLanguage }) => {
  const L = (key) => t(key, language);
  const typewriterWord = useTypeWriter([L('pi.tw1'), L('pi.tw2'), L('pi.tw3')], 70, 40, 1500);

  const INTERVIEW_MODES = MODE_KEYS.map(m => ({ ...m, title: L(m.titleKey), desc: L(m.descKey) }));
  const CAPABILITIES = CAP_KEYS.map(c => ({ ...c, title: L(c.titleKey), desc: L(c.descKey) }));

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <PublicNavbar isDark={isDark} toggleTheme={toggleTheme} onNavigate={onNavigate} currentPage="public-prepare-interview" language={language} setLanguage={setLanguage} />

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
                {L('pi.heroPrefix')}
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
                {L('pi.heroDesc')}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button size="lg" variant="primary" onClick={() => onNavigate('jd-input')}>
                  {L('pi.ctaStart')} <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button size="lg" variant="secondary" onClick={() => onNavigate('mode-selection')}>
                  <Play size={16} className="mr-2" /> {L('pi.ctaExplore')}
                </Button>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column — Video Frame */}
          <ScrollReveal delay={200} direction="right">
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden shadow-2xl bg-surface">
                {/* VIDEO PLACEHOLDER: Upload custom interview prep video here */}
                {/* Replace src with your video file, e.g., "/hero-interview.mp4" */}
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src="/interview.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Interview Modes ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{L('pi.modeTitle')}</h2>
              <p className="mt-4 text-text-muted text-lg">
                {L('pi.modeDesc')}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {INTERVIEW_MODES.map((mode, i) => {
              const Icon = mode.icon;
              return (
                <ScrollReveal key={mode.title} delay={i * 100}>
                  <div className="surface-text bg-surface rounded-xl p-6 h-full transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-text-primary/10 flex items-center justify-center mb-4">
                      <Icon size={22} className="text-surface-text-muted" />
                    </div>
                    <h3 className="text-lg font-bold text-surface-text">{mode.title}</h3>
                    <p className="mt-2 text-sm text-surface-text-muted leading-relaxed">{mode.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Live Interview Flow ─── */}
      <section className="py-20 md:py-28 bg-bg-hover/30">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                {L('pi.liveTitle')}
              </h2>
              <p className="mt-4 text-text-muted text-lg">
                {L('pi.liveDesc')}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="surface-text bg-surface rounded-2xl p-6 md:p-8 max-w-3xl mx-auto">
              <div className="space-y-5">
                {/* AI Question */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-text-primary/15 flex items-center justify-center flex-shrink-0">
                    <Mic size={14} className="text-surface-text" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-surface-text">{L('pi.mockAiLabel')}</span>
                      <span className="text-xs text-surface-text-muted">{L('pi.mockBehavioral')}</span>
                      <Volume2 size={12} className="text-surface-text-muted ml-auto" />
                    </div>
                    <div className="bg-surface-hover/50 rounded-xl p-4">
                      <p className="text-sm text-surface-text leading-relaxed">
                        "Tell me about a time you had to debug a critical issue under pressure. What was your approach?"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Candidate Answer */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-text-primary/15 flex items-center justify-center flex-shrink-0">
                    <Users size={14} className="text-surface-text" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-surface-text">{L('pi.mockYou')}</span>
                      <span className="text-xs text-surface-text-muted">{L('pi.mockVoiceResp')}</span>
                    </div>
                    <div className="bg-text-primary/5 rounded-xl p-4">
                      <p className="text-sm text-text-primary leading-relaxed">
                        "During my internship, our production server crashed 2 hours before a demo. I first checked the error logs, identified a memory leak in the database connection pool, and fixed it by implementing connection timeout limits. The server was back up in 45 minutes."
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Evaluation */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                    <BarChart3 size={14} className="text-success" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-success">{L('pi.mockEvalLabel')}</span>
                      <span className="text-xs text-surface-text-muted">{L('pi.mockScore')}</span>
                    </div>
                    <div className="bg-success/5 rounded-xl p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={12} className="text-success" />
                          <span className="text-xs text-surface-text">{L('pi.mockGoodStar')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={12} className="text-success" />
                          <span className="text-xs text-surface-text">{L('pi.mockTechLogical')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sparkles size={12} className="text-warning" />
                          <span className="text-xs text-surface-text">{L('pi.mockResult')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Follow-Up */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-text-primary/15 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={14} className="text-surface-text" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-surface-text">{L('pi.mockFollowUp')}</span>
                      <span className="text-xs text-surface-text-muted">{L('pi.mockContextAware')}</span>
                    </div>
                    <div className="bg-surface-hover/50 rounded-xl p-4">
                      <p className="text-sm text-surface-text leading-relaxed">
                        "How did you communicate with your team during the crisis? Did you delegate any tasks?"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Voice & Bilingual ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="left">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Voice-driven & bilingual
                </h2>
                <p className="text-text-muted text-lg leading-relaxed">
                  Speak your answers naturally — no typing required. Our AI listens, evaluates, and responds
                  with voice. Switch between English and Urdu seamlessly.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-text-primary/5 flex items-center justify-center flex-shrink-0">
                      <Volume2 size={16} className="text-text-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{L('pi.voiceInteraction')}</p>
                      <p className="text-xs text-text-muted mt-0.5">{L('pi.voiceInteractionDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-text-primary/5 flex items-center justify-center flex-shrink-0">
                      <Globe size={16} className="text-text-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{L('pi.englishUrdu')}</p>
                      <p className="text-xs text-text-muted mt-0.5">{L('pi.englishUrduDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-text-primary/5 flex items-center justify-center flex-shrink-0">
                      <Zap size={16} className="text-text-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{L('pi.realTimeAdapt')}</p>
                      <p className="text-xs text-text-muted mt-0.5">{L('pi.realTimeAdaptDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div className="surface-text bg-surface rounded-2xl p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-text-primary/5">
                    <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center">
                      <Mic size={18} className="text-danger" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-surface-text">{L('pi.listening')}</p>
                      <p className="text-xs text-surface-text-muted">{L('pi.speakClearly')}</p>
                    </div>
                    <div className="flex items-center gap-0.5 h-6">
                      {[0.4, 0.8, 0.5, 1, 0.6, 0.9, 0.3, 0.7, 0.5].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-danger/60 rounded-full"
                          style={{
                            height: `${h * 100}%`,
                            animation: `waveform-bar ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                            animationDelay: `${i * 0.05}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <div className="flex items-center gap-0.5 bg-surface-hover rounded-lg px-2 py-1">
                      <span className="px-2 py-0.5 rounded bg-text-primary/20 text-xs font-semibold text-surface-text">EN</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold text-surface-text-muted">اردو</span>
                    </div>
                  </div>

                  <div className="bg-surface-hover/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-surface-text-muted">{L('pi.sessionScore')}</span>
                      <span className="text-lg font-bold text-surface-text">7.5<span className="text-xs text-surface-text-muted">/10</span></span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: L('pi.scoreComm'), score: 8 },
                        { label: L('pi.scoreTechDepth'), score: 7 },
                        { label: L('pi.scoreStar'), score: 8 },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <span className="text-xs text-surface-text-muted w-28">{item.label}</span>
                          <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-success rounded-full" style={{ width: `${item.score * 10}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-surface-text w-6 text-right">{item.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── Capabilities ─── */}
      <section className="py-20 md:py-28 bg-bg-hover/30">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Built for real interview success
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <ScrollReveal key={cap.title} delay={i * 80}>
                  <div className="surface-text bg-surface rounded-xl p-6 h-full transition-colors">
                    <Icon size={22} className="text-surface-text-muted mb-3" />
                    <h3 className="text-base font-bold text-surface-text">{cap.title}</h3>
                    <p className="mt-2 text-sm text-surface-text-muted leading-relaxed">{cap.desc}</p>
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
                  {L('pi.ctaTitle')}
                </h2>
                <p className="text-surface-text-muted text-lg max-w-xl mx-auto">
                  {L('pi.ctaDesc')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => onNavigate('jd-input')}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-text-primary text-bg-primary text-base font-semibold hover:opacity-90 transition-opacity"
                  >
                    {L('pi.ctaStart')} <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => onNavigate('mode-selection')}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-surface-text text-base font-medium hover:bg-surface-hover transition-colors"
                  >
                    <Play size={16} /> {L('pi.ctaExplore')}
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
        @keyframes waveform-bar {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};

export default PrepareInterviewPage;
