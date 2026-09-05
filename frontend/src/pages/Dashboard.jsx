// frontend/src/pages/Dashboard.jsx
// Day 6: Central dashboard — overall readiness, per-mode scores, weakest competency,
// recommended next interview, latest session snapshot, and progress-trend chart.
// Pulls real data from MongoDB via dashboard + history + trend APIs.

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { ScoreRing } from '../design-system/ScoreRing';
import { ProgressBar } from '../design-system/ProgressBar';
import { Skeleton } from '../design-system/Skeleton';
import { ProgressTrendChart } from '../components/shared/ProgressTrendChart';
import { StreakBadge } from '../components/shared/StreakBadge';
import PageHeader from '../components/shared/PageHeader';
import { apiClient } from '../api/client';
import {
  ArrowRight, Brain, Code, MessageCircle, Target,
  Award, AlertTriangle, BarChart3, Clock, TrendingUp,
  CheckCircle2, AlertCircle, Briefcase, FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n/translations';

const MODE_CONFIG = {
  behavioral: { label: 'Behavioral', labelUr: 'سلوکی', icon: MessageCircle, color: 'text-text-muted', bg: 'bg-text-muted/10', border: '', route: 'behavioral-interview' },
  technical: { label: 'Technical', labelUr: 'تکنیکی', icon: Brain, color: 'text-text-muted', bg: 'surface-text bg-surface-hover', border: '', route: 'technical-interview' },
  coding: { label: 'Coding', labelUr: 'کوڈنگ', icon: Code, color: 'text-success', bg: 'bg-success/10', border: 'border-success/30/20', route: 'coding-interview' },
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

export const Dashboard = ({ userId = 'guest', onNavigate, isDark, isAuthenticated, language = 'english', setLanguage }) => {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        if (!cancelled) {
          setData(dashResult);
          setHistory(histResult);
        }
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
              <Button variant="secondary" onClick={() => onNavigate?.('jd-input')}>
                {L('common.startInterview')}
              </Button>
              <Button variant="ghost" onClick={() => window.location.reload()}>
                {L('common.retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overallReadiness, perMode, weakestCompetency, crossModeInsight, weights, weightsReason, sessionCount } = data;
  const readiness = getReadinessLabel(overallReadiness, language);
  const sessions = history?.history || [];
  const latestSession = sessions[0] || null;

  // Determine which modes are incomplete and recommend next interview
  const modeScores = Object.entries(perMode);
  const incompleteModes = modeScores.filter(([, score]) => score === 0).map(([mode]) => mode);
  const completedModes = modeScores.filter(([, score]) => score > 0);
  const weakestMode = completedModes.length > 0
    ? completedModes.reduce((min, [mode, score]) => score < min[1] ? [mode, score] : min, completedModes[0])
    : null;

  // Recommendation: prioritize incomplete modes, then weakest completed mode
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

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Navigation Header */}
      <PageHeader
        isDark={isDark}
        onNavigate={onNavigate}
        currentPage="dashboard"
        isAuthenticated={isAuthenticated}
        onLogout={() => { logout(); onNavigate('home'); }}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Content */}
      <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{L('dashboard.title')}</h1>
            <p className="text-sm text-text-muted mt-1">
              {sessionCount > 0
                ? `${sessionCount} ${L('dashboard.sessionsTracked')}${sessionCount !== 1 ? 's' : ''}`
                : L('dashboard.startFirst')}
            </p>
            <div className="mt-1">
              <StreakBadge userId={userId} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onNavigate('resume-tailor')}>
              <FileText size={14} className="mr-1" /> {L('dashboard.resumeTailor')}
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('find-jobs')}>
              <Briefcase size={14} className="mr-1" /> {L('dashboard.findJobs')}
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('session-history')}>
              <Clock size={14} className="mr-1" /> {L('dashboard.history')}
            </Button>
          </div>
        </div>

      {/* Overall Readiness + Per-Mode Breakdown */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Overall readiness ring */}
        <Card className="md:col-span-1 surface-text bg-surface">
          <CardContent className="pt-6 flex flex-col items-center">
            <ScoreRing score={overallReadiness} max={100} label={L('dashboard.overallReadiness')} size={120} strokeWidth={10} />
            <div className={`mt-2 text-sm font-semibold ${readiness.color}`} aria-label={`Readiness: ${readiness.text}`}>
              {readiness.text}
            </div>
            {sessionCount === 0 && (
              <p className="text-xs text-text-muted mt-2 text-center">{L('dashboard.completeToSee')}</p>
            )}
          </CardContent>
        </Card>

        {/* Per-mode scores */}
        <Card className="md:col-span-3 surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 size={16} className="text-text-muted" aria-hidden="true" />
              {L('dashboard.modeBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {modeScores.map(([mode, score]) => {
              const config = MODE_CONFIG[mode] || MODE_CONFIG.behavioral;
              const ModeIcon = config.icon;
              return (
                <div key={mode} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <ModeIcon size={16} className={config.color} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <ProgressBar value={score} max={100} label={getModeLabel(mode)} />
                  </div>
                  <span className={`text-lg font-bold ${config.color} w-12 text-right`} aria-label={`${getModeLabel(mode)} score: ${score}`}>
                    {score}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Weakest Competency + Recommendation */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border-theme surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target size={16} className="text-warning" aria-hidden="true" />
              {L('dashboard.weakestCompetency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-warning" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-semibold text-text-primary">{weakestCompetency}</p>
                <p className="text-xs text-text-muted">{L('dashboard.focusNext')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommended Next Interview */}
        <Card className="border-border-theme surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award size={16} className="text-icon-active" aria-hidden="true" />
              {L('dashboard.recommendedNext')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recommendedMode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const config = MODE_CONFIG[recommendedMode];
                    const Icon = config.icon;
                    return (
                      <>
                        <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
                          <Icon size={20} className={config.color} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-text-primary">{getModeLabel(recommendedMode)} {L('sessionHistory.interview')}</p>
                          <p className="text-xs text-text-muted">{recommendationReason}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate(MODE_CONFIG[recommendedMode]?.route || 'mode-selection')}
                  className="w-full"
                >
                  {L('common.startInterview')} — {getModeLabel(recommendedMode)} <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-2">
                <CheckCircle2 size={24} className="text-success mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm text-text-muted">{L('dashboard.allComplete')}</p>
                <p className="text-xs text-text-muted mt-1">{L('dashboard.practiceImprove')}</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => onNavigate('mode-selection')}>
                  {L('dashboard.chooseMode')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cross-Mode Insight */}
      {crossModeInsight && (
        <Card className="border-border-theme surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain size={16} className="text-icon-active" aria-hidden="true" />
              {L('dashboard.crossModeInsight')}
              <Badge variant="secondary">{L('dashboard.aiPowered')}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-muted leading-relaxed whitespace-pre-line">{crossModeInsight}</p>
          </CardContent>
        </Card>
      )}

      {/* Progress Trend Chart */}
      <ProgressTrendChart userId={userId} language={language} />

      {/* Latest Session Snapshot */}
      {latestSession && (
        <Card className="border-border-theme surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock size={16} className="text-text-muted" aria-hidden="true" />
              {L('dashboard.latestSession')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const config = MODE_CONFIG[latestSession.mode] || MODE_CONFIG.behavioral;
                  const Icon = config.icon;
                  return (
                    <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
                      <Icon size={20} className={config.color} aria-hidden="true" />
                    </div>
                  );
                })()}
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {getModeLabel(latestSession.mode)} {L('sessionHistory.interview')}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatDate(latestSession.date)} · {latestSession.questionCount} {L('common.questions')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${
                  latestSession.overallScore >= 70 ? 'text-success' :
                  latestSession.overallScore >= 40 ? 'text-warning' : 'text-danger'
                }`}>
                  {latestSession.overallScore ?? '—'}
                </p>
                <p className="text-xs text-text-muted">{L('common.score')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weights Transparency */}
      {weights && (
        <Card className="border-border-theme surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-icon-active" aria-hidden="true" />
              {L('dashboard.readinessWeights')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(weights).map(([mode, weight]) => {
                const config = MODE_CONFIG[mode];
                return (
                  <div key={mode} className="flex items-center justify-between text-sm">
                    <span className="text-text-muted capitalize">{mode}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 surface-text bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full bg-text-primary rounded-full" style={{ width: `${weight * 100}%` }} />
                      </div>
                      <span className="text-text-muted font-mono text-xs w-8 text-right">
                        {Math.round(weight * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-text-muted mt-3">
              {weightsReason || L('dashboard.weightsNote')}
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default Dashboard;
