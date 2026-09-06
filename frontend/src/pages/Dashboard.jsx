// frontend/src/pages/Dashboard.jsx
// Personal career coaching dashboard.
// Answers three questions: How am I doing? Where am I weak? What should I do next?
// Uses only real session data — no fabricated metrics or trends.

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { ScoreRing } from '../design-system/ScoreRing';
import { Skeleton } from '../design-system/Skeleton';
import { ProgressTrendChart } from '../components/shared/ProgressTrendChart';
import { StreakBadge } from '../components/shared/StreakBadge';
import PageHeader from '../components/shared/PageHeader';
import { apiClient } from '../api/client';
import {
  ArrowRight, Brain, Code, MessageCircle, Target,
  Award, Clock, TrendingUp, TrendingDown,
  Minus, CheckCircle2, AlertCircle, Briefcase, FileText,
  Zap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n/translations';

const MODE_CONFIG = {
  behavioral: { label: 'Behavioral', labelUr: 'سلوکی', icon: MessageCircle, route: 'behavioral-interview' },
  technical: { label: 'Technical', labelUr: 'تکنیکی', icon: Brain, route: 'technical-interview' },
  coding: { label: 'Coding', labelUr: 'کوڈنگ', icon: Code, route: 'coding-interview' },
};

const getReadinessLabel = (score, language = 'english') => {
  const L = (key) => t(key, language);
  if (score >= 80) return { text: L('dashboard.excellent'), color: 'text-success' };
  if (score >= 60) return { text: L('dashboard.good'), color: 'text-text-muted' };
  if (score >= 40) return { text: L('dashboard.fair'), color: 'text-warning' };
  if (score > 0) return { text: L('dashboard.needsWork'), color: 'text-danger' };
  return { text: L('common.noData'), color: 'text-text-muted' };
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const TrendIcon = ({ direction, size = 14 }) => {
  if (direction === 'up') return <TrendingUp size={size} className="text-success" aria-label="Improving" />;
  if (direction === 'down') return <TrendingDown size={size} className="text-danger" aria-label="Declining" />;
  return <Minus size={size} className="text-text-muted" aria-label="Stable" />;
};

export const Dashboard = ({ userId = 'guest', onNavigate, isDark, isAuthenticated, language = 'english', setLanguage }) => {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weightsOpen, setWeightsOpen] = useState(false);

  const L = (key) => t(key, language);
  const getModeLabel = (mode) => language === 'urdu' ? (MODE_CONFIG[mode]?.labelUr || mode) : (MODE_CONFIG[mode]?.label || mode);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashResult, histResult] = await Promise.all([
          apiClient.getDashboardData(userId),
          apiClient.getSessionHistory(userId),
        ]);
        if (!cancelled) { setData(dashResult); setHistory(histResult); }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [userId]);

  // --- Loading state ---
  if (loading) {
    return (
      <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  // --- Error state ---
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-danger/30">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="mx-auto text-danger" size={32} aria-hidden="true" />
            <p className="text-danger">{error || L('dashboard.failedLoad')}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => onNavigate?.('jd-input')}>{L('common.startInterview')}</Button>
              <Button variant="ghost" onClick={() => window.location.reload()}>{L('common.retry')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    overallReadiness, perMode, weakestCompetencyDetails, strongestCompetencyDetails,
    crossModeInsight, weights, weightsReason, sessionCount, modeTrends,
  } = data;

  // Backward compat: old weakestCompetency string
  const weakestLabel = weakestCompetencyDetails?.label || data.weakestCompetency || '';
  const readiness = getReadinessLabel(overallReadiness, language);
  const sessions = history?.history || [];
  const latestSession = sessions[0] || null;

  const modeScores = Object.entries(perMode);
  const incompleteModes = modeScores.filter(([, score]) => score === 0).map(([mode]) => mode);
  const completedModes = modeScores.filter(([, score]) => score > 0);
  const weakestMode = completedModes.length > 0
    ? completedModes.reduce((min, [mode, score]) => score < min[1] ? [mode, score] : min, completedModes[0])
    : null;

  let recommendedMode = null;
  let recommendationReason = '';
  if (incompleteModes.length > 0) {
    recommendedMode = incompleteModes[0];
    recommendationReason = language === 'urdu'
      ? `آپ نے ابھی تک ${getModeLabel(recommendedMode)} نہیں آزمایا۔`
      : `You haven't tried ${MODE_CONFIG[recommendedMode]?.label || recommendedMode} yet.`;
  } else if (weakestMode) {
    recommendedMode = weakestMode[0];
    recommendationReason = language === 'urdu'
      ? `${getModeLabel(recommendedMode)} کا اسکور سب سے کم ہے — بہتری کے لیے مشق کریں۔`
      : `${MODE_CONFIG[recommendedMode]?.label || recommendedMode} has the lowest score — practice to improve.`;
  }

  // ─── EMPTY STATE (new users) ──────────────────────────────────────────────
  if (sessionCount === 0) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <PageHeader isDark={isDark} onNavigate={onNavigate} currentPage="dashboard"
          isAuthenticated={isAuthenticated}
          onLogout={() => { logout(); onNavigate('home'); }}
          language={language} setLanguage={setLanguage} />
        <div className="p-6 md:p-12 max-w-4xl mx-auto page-enter">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-text-primary">{L('dashboard.title')}</h1>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onNavigate('resume-tailor')}>
                <FileText size={14} className="mr-1" /> {L('dashboard.resumeTailor')}
              </Button>
              <Button variant="secondary" onClick={() => onNavigate('find-jobs')}>
                <Briefcase size={14} className="mr-1" /> {L('dashboard.findJobs')}
              </Button>
            </div>
          </div>
          <Card className="max-w-lg mx-auto text-center surface-text bg-surface" hover={false}>
            <CardContent className="pt-6 space-y-5">
              <ScoreRing score={0} max={100} label={L('dashboard.overallReadiness')} size={140} strokeWidth={10} />
              <div>
                <p className="text-lg font-semibold text-text-primary">{L('dashboard.startFirst')}</p>
                <p className="text-sm text-text-muted mt-2">
                  {language === 'urdu'
                    ? 'اپنی پہلی انٹرویو مکمل کرنے کے بعد آپ کا اسکور، کمزور علاقے اور تجاویز یہاں دکھائی جائیں گی۔'
                    : 'Complete your first interview to see your readiness score, discover weak areas, and get personalized coaching recommendations.'}
                </p>
              </div>
              <Button variant="primary" onClick={() => onNavigate('jd-input')} className="w-full">
                {L('common.startInterview')} <ArrowRight size={16} />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── MAIN DASHBOARD ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <PageHeader isDark={isDark} onNavigate={onNavigate} currentPage="dashboard"
        isAuthenticated={isAuthenticated}
        onLogout={() => { logout(); onNavigate('home'); }}
        language={language} setLanguage={setLanguage} />

      <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{L('dashboard.title')}</h1>
            <p className="text-sm text-text-muted mt-1">
              {sessionCount} {L('dashboard.sessionsTracked')}{sessionCount !== 1 ? 's' : ''}
            </p>
            <div className="mt-1"><StreakBadge userId={userId} /></div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Button variant="secondary" onClick={() => onNavigate('resume-tailor')} className="px-2 sm:px-4">
              <FileText size={14} className="sm:mr-1" /> <span className="hidden sm:inline">{L('dashboard.resumeTailor')}</span>
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('find-jobs')} className="px-2 sm:px-4">
              <Briefcase size={14} className="sm:mr-1" /> <span className="hidden sm:inline">{L('dashboard.findJobs')}</span>
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('session-history')} className="px-2 sm:px-4">
              <Clock size={14} className="sm:mr-1" /> <span className="hidden sm:inline">{L('dashboard.history')}</span>
            </Button>
          </div>
        </div>

        {/* ─── 1. HOW AM I DOING? — Hero ─────────────────────────────────── */}
        <Card className="surface-text bg-surface" hover={false}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0">
                <ScoreRing score={overallReadiness} max={100} label={L('dashboard.overallReadiness')} size={160} strokeWidth={12} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold uppercase tracking-wider ${readiness.color}`}>
                  {readiness.text}
                </div>
                <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--color-surface-text-muted)' }}>
                  {overallReadiness >= 80
                    ? (language === 'urdu'
                      ? 'آپ اچھی طرح تیار ہیں۔ اپنی مضبوطی برقرار رکھیں اور کمزور علاقوں پر توجہ دیں۔'
                      : 'You\'re well-prepared. Maintain your strengths and focus on closing remaining gaps.')
                    : overallReadiness >= 60
                      ? (language === 'urdu'
                        ? 'آپ ترقی کر رہے ہیں۔ مستقل مشق سے اسکور بہتر ہوگا۔'
                        : 'You\'re making progress. Consistent practice across all modes will push your score higher.')
                      : (language === 'urdu'
                        ? 'شروعات ہے۔ ہر موڈ میں ایک ایک کر کے مشق کریں — تیزی سے بہتری آئے گی۔'
                        : 'Early stages. Focus on completing one session in each mode — you\'ll improve quickly with practice.')}
                </p>
                {latestSession && (
                  <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--color-surface-text-muted)' }}>
                    <Clock size={12} aria-hidden="true" />
                    <span>
                      {language === 'urdu' ? 'تازہ ترین' : 'Latest'}: {getModeLabel(latestSession.mode)} — {latestSession.overallScore ?? '—'}/100
                      {' · '}{formatDate(latestSession.date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── 2. PERFORMANCE BREAKDOWN — Mode cards ─────────────────────── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 px-1">
            {L('dashboard.performanceBreakdown')}
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {modeScores.map(([mode, score]) => {
              const config = MODE_CONFIG[mode] || MODE_CONFIG.behavioral;
              const ModeIcon = config.icon;
              const modeTrend = modeTrends?.[mode];
              return (
                <Card key={mode} className="surface-text bg-surface" hover={false}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-surface-hover flex items-center justify-center">
                          <ModeIcon size={14} style={{ color: 'var(--color-surface-text-muted)' }} aria-hidden="true" />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-surface-text-muted)' }}>
                          {getModeLabel(mode)}
                        </span>
                      </div>
                      {modeTrend && modeTrend.direction !== 'insufficient' && <TrendIcon direction={modeTrend.direction} />}
                    </div>
                    <div className="text-2xl font-bold" style={{ color: score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                      {score > 0 ? score : '—'}
                    </div>
                    {score === 0 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-surface-text-muted)' }}>
                        {language === 'urdu' ? 'ابھی تک نہیں' : 'Not yet attempted'}
                      </p>
                    )}
                    {score > 0 && modeTrend?.direction === 'up' && (
                      <p className="text-xs text-success mt-1">{language === 'urdu' ? 'بہتر ہو رہا ہے' : 'Improving'}</p>
                    )}
                    {score > 0 && modeTrend?.direction === 'down' && (
                      <p className="text-xs text-danger mt-1">{language === 'urdu' ? 'کم ہو رہا ہے' : 'Needs attention'}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ─── 3. COACHING — Weakest + Strongest + Recommendation ────────── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 px-1">
            {L('dashboard.coaching')}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Weakest Area — actionable */}
            <Card className="border-warning/20 surface-text bg-surface" hover={false}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--color-surface-text-muted)' }}>
                  <Target size={14} className="text-warning" aria-hidden="true" />
                  {L('dashboard.weakestArea')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weakestCompetencyDetails?.score > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-warning">{weakestLabel}</span>
                      <span className="text-2xl font-bold text-warning">{weakestCompetencyDetails.score}%</span>
                    </div>
                    {weakestCompetencyDetails.why && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-surface-text-muted)' }}>
                          {L('dashboard.whyLabel')}
                        </p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-surface-text)' }}>
                          {weakestCompetencyDetails.why}
                        </p>
                      </div>
                    )}
                    {weakestCompetencyDetails.mode && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-surface-text-muted)' }}>
                          {L('dashboard.nextLabel')}
                        </p>
                        <Button variant="ghost" size="sm" className="px-0 text-left text-warning hover:text-warning"
                          onClick={() => onNavigate(MODE_CONFIG[weakestCompetencyDetails.mode]?.route || 'mode-selection')}>
                          {language === 'urdu' ? `${getModeLabel(weakestCompetencyDetails.mode)} انٹرویو کی مشق کریں` : `Practice ${getModeLabel(weakestCompetencyDetails.mode)} Interview`}
                          <ArrowRight size={14} className="ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-semibold" style={{ color: 'var(--color-surface-text)' }}>{weakestLabel}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-surface-text-muted)' }}>
                      {language === 'urdu' ? 'مزید ڈیٹا دستیاب ہونے پر تفصیلات دکھائی جائیں گی۔' : 'More data needed for detailed insights.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Strongest Area — celebrate the win */}
            <Card className="border-success/20 surface-text bg-surface" hover={false}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--color-surface-text-muted)' }}>
                  <Award size={14} className="text-success" aria-hidden="true" />
                  {L('dashboard.strongestArea')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {strongestCompetencyDetails ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-success">{strongestCompetencyDetails.label}</span>
                      <span className="text-2xl font-bold text-success">{strongestCompetencyDetails.score}%</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-surface-text-muted)' }}>
                      {language === 'urdu' ? 'یہ آپ کی مضبوط نقطہ ہے — اسے برقرار رکھیں۔' : 'Your strongest dimension — keep sharpening it.'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--color-surface-text-muted)' }}>
                    {language === 'urdu' ? 'مزید ڈیٹا کی ضرورت۔' : 'Complete more sessions to see your strengths.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommended Next Action */}
          <Card className="mt-4 surface-text bg-surface" hover={false}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--color-surface-text-muted)' }}>
                <Zap size={14} className="text-warning" aria-hidden="true" />
                {L('dashboard.recommendedAction')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendedMode ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {(() => {
                      const Icon = MODE_CONFIG[recommendedMode].icon;
                      return (
                        <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0">
                          <Icon size={20} style={{ color: 'var(--color-surface-text)' }} aria-hidden="true" />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-surface-text)' }}>
                        {getModeLabel(recommendedMode)} {L('sessionHistory.interview')}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-surface-text-muted)' }}>{recommendationReason}</p>
                    </div>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => onNavigate(MODE_CONFIG[recommendedMode]?.route || 'mode-selection')}>
                    {L('common.startInterview')} <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-success" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-surface-text)' }}>{L('dashboard.allComplete')}</p>
                      <p className="text-xs" style={{ color: 'var(--color-surface-text-muted)' }}>{L('dashboard.practiceImprove')}</p>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => onNavigate('mode-selection')}>
                    {L('dashboard.chooseMode')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── 4. CROSS-MODE INSIGHT ─────────────────────────────────────── */}
        {crossModeInsight && sessionCount > 0 && (
          <Card className="surface-text bg-surface" hover={false}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--color-surface-text-muted)' }}>
                <Brain size={14} className="text-warning" aria-hidden="true" />
                {L('dashboard.crossModeInsight')}
                <Badge variant="secondary">{L('dashboard.aiPowered')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-surface-text)' }}>
                {crossModeInsight}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ─── 5. PROGRESS TREND ─────────────────────────────────────────── */}
        {sessions.length > 1 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 px-1">
              {L('dashboard.progress')}
            </h2>
            <ProgressTrendChart userId={userId} language={language} />
          </div>
        )}

        {/* ─── 6. WEIGHTS (collapsible, compact) ─────────────────────────── */}
        {weights && (
          <Card className="surface-text bg-surface" hover={false}>
            <button
              className="w-full flex items-center justify-between cursor-pointer"
              onClick={() => setWeightsOpen(!weightsOpen)}
              aria-expanded={weightsOpen}
            >
              <CardTitle className="text-xs flex items-center gap-2" style={{ color: 'var(--color-surface-text-muted)' }}>
                <TrendingUp size={12} aria-hidden="true" />
                {L('dashboard.readinessWeights')}
              </CardTitle>
              {weightsOpen ? <ChevronUp size={14} style={{ color: 'var(--color-surface-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-surface-text-muted)' }} />}
            </button>
            {weightsOpen && (
              <CardContent className="mt-2">
                <div className="space-y-2">
                  {Object.entries(weights).map(([mode, weight]) => (
                    <div key={mode} className="flex items-center justify-between text-xs">
                      <span className="capitalize" style={{ color: 'var(--color-surface-text-muted)' }}>{mode}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1 bg-surface-hover rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${weight * 100}%`, backgroundColor: 'var(--color-surface-text-muted)' }} />
                        </div>
                        <span className="font-mono w-8 text-right" style={{ color: 'var(--color-surface-text-muted)' }}>
                          {Math.round(weight * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--color-surface-text-muted)' }}>
                  {weightsReason || L('dashboard.weightsNote')}
                </p>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
