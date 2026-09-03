// frontend/src/pages/Results.jsx
// Results & Dashboard page — Day 5.
// Shows overall readiness, per-mode breakdown, cross-mode insight,
// weakest competency, weights transparency, and session trend.
// Hierarchy: Overall Result → Mode Breakdown → Weak Areas → Cross-Mode Insight → Action Plan

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { ScoreRing } from '../design-system/ScoreRing';
import { ProgressBar } from '../design-system/ProgressBar';
import { Skeleton } from '../design-system/Skeleton';
import { apiClient } from '../api/client';
import { ExportReportButton } from '../components/shared/ExportReportButton';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Brain,
  Code,
  MessageCircle,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { t } from '../i18n/translations';

const MODE_CONFIG = {
  behavioral: {
    label: 'Behavioral',
    labelUr: 'سلوکی',
    icon: MessageCircle,
    color: 'text-text-muted',
    bg: 'bg-text-muted/10',
    border: '',
  },
  technical: {
    label: 'Technical',
    labelUr: 'تکنیکی',
    icon: Brain,
    color: 'text-text-muted',
    bg: 'surface-text bg-surface-hover',
    border: '',
  },
  coding: {
    label: 'Coding',
    labelUr: 'کوڈنگ',
    icon: Code,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30/20',
  },
};

const getReadinessLabel = (score, language = 'english') => {
  const L = (key) => t(key, language);
  if (score >= 80) return { text: L('dashboard.excellent'), color: 'text-success' };
  if (score >= 60) return { text: L('dashboard.good'), color: 'text-text-muted' };
  if (score >= 40) return { text: L('dashboard.fair'), color: 'text-warning' };
  if (score > 0) return { text: L('dashboard.needsWork'), color: 'text-danger' };
  return { text: L('common.noData'), color: 'text-text-muted' };
};

export const Results = ({ userId = 'guest', onNavigate, language = 'english' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [latestSessionId, setLatestSessionId] = useState(null);

  const L = (key) => t(key, language);
  const getModeLabel = (mode) => language === 'urdu' ? (MODE_CONFIG[mode]?.labelUr || mode) : (MODE_CONFIG[mode]?.label || mode);

  useEffect(() => {
    let cancelled = false;
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiClient.getDashboardData(userId);
        if (!cancelled) setData(result);
        // Also fetch session history to get latest session ID for sharing
        try {
          const historyResult = await apiClient.getSessionHistory(userId);
          if (!cancelled && historyResult?.history?.length > 0) {
            setLatestSessionId(historyResult.history[0].sessionId);
          }
        } catch {}
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load results');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDashboard();
    return () => { cancelled = true; };
  }, [userId]);

  const handleShare = async () => {
    if (!latestSessionId) return;
    setShareLoading(true);
    try {
      const result = await apiClient.generateShareToken(latestSessionId);
      const fullUrl = `${window.location.origin}/shared/${result.shareToken}`;
      setShareLink(fullUrl);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            <AlertTriangle className="mx-auto text-danger" size={32} />
            <p className="text-danger">{error || L('results.failedLoad')}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => onNavigate?.('mode-selection')}>
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

  const { overallReadiness, perMode, weakestCompetency, trend, crossModeInsight, weights, weightsReason, sessionCount } = data;
  const readiness = getReadinessLabel(overallReadiness, language);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Content */}
      <div className="flex-1 p-6 md:p-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Back button */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('mode-selection')}
              className="text-text-muted hover:text-text-primary"
            >
              <ArrowLeft size={16} className="mr-1" /> {L('results.backToMode')}
            </Button>
          </div>

          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{L('results.title')}</h1>
              <p className="text-sm text-text-muted mt-1">
                {sessionCount > 0
                  ? `${L('results.basedOn')} ${sessionCount} ${L('dashboard.sessionsTracked')}${sessionCount !== 1 ? 's' : ''}`
                  : L('results.completeToSee')}
              </p>
            </div>
            {onNavigate && (
              <div className="flex gap-2">
                <ExportReportButton data={data} />
                <Button
                  variant="secondary"
                  onClick={shareLink ? handleCopyLink : handleShare}
                  isLoading={shareLoading}
                  disabled={!latestSessionId}
                >
                  {shareLink ? (
                    <>
                      {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                      {copied ? L('results.copied') : L('results.copyLink')}
                    </>
                  ) : (
                    <>
                      <Share2 size={14} className="mr-1" />
                      {L('results.shareReport')}
                    </>
                  )}
                </Button>
                <Button variant="secondary" onClick={() => onNavigate('mode-selection')}>
                  {L('results.practiceMore')}
                </Button>
          </div>
        )}
      </div>

      {/* Share link display */}
      {shareLink && (
        <div className="surface-text flex items-center gap-2 p-3 rounded-lg bg-surface-hover/50 border border-border/30">
          <Share2 size={14} className="text-surface-text-muted flex-shrink-0" />
          <input
            type="text"
            readOnly
            value={shareLink}
            className="flex-1 bg-transparent text-sm text-surface-text-muted outline-none truncate"
            onClick={(e) => e.target.select()}
          />
          <Button variant="ghost" size="sm" onClick={handleCopyLink}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
        </div>
      )}

      {/* Overall Readiness + Per-Mode Breakdown */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Overall readiness — large ring */}
        <Card className="md:col-span-1 surface-text bg-surface">
          <CardContent className="pt-6 flex flex-col items-center">
            <ScoreRing
              score={overallReadiness}
              max={100}
              label={L('results.overallReadiness')}
              size={120}
              strokeWidth={10}
            />
            <div className={`mt-2 text-sm font-semibold ${readiness.color}`}>
              {readiness.text}
            </div>
          </CardContent>
        </Card>

        {/* Per-mode scores */}
        <Card className="md:col-span-3 surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 size={16} className="text-text-muted" />
              {L('results.modeBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(perMode).map(([mode, score]) => {
              const config = MODE_CONFIG[mode] || MODE_CONFIG.behavioral;
              const ModeIcon = config.icon;
              return (
                <div key={mode} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <ModeIcon size={16} className={config.color} />
                  </div>
                  <div className="flex-1">
                    <ProgressBar value={score} max={100} label={getModeLabel(mode)} />
                  </div>
                  <span className={`text-lg font-bold ${config.color} w-12 text-right`}>
                    {score}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Weakest Competency + Weights */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border-theme surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target size={16} className="text-warning" />
              {L('results.weakestCompetency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-lg font-semibold text-text-primary">{weakestCompetency}</p>
                <p className="text-xs text-text-muted">
                  {L('results.focusArea')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weights transparency */}
        <Card className="border-border-theme surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award size={16} className="text-icon-active" />
              {L('results.readinessWeights')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weights && Object.entries(weights).map(([mode, weight]) => {
                const config = MODE_CONFIG[mode];
                return (
                  <div key={mode} className="flex items-center justify-between text-sm">
                    <span className="text-text-muted capitalize">{mode}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 surface-text bg-surface-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-text-primary rounded-full"
                          style={{ width: `${weight * 100}%` }}
                        />
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
              {weightsReason || L('results.weightsNote')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cross-Mode Insight — THE highlight */}
      {crossModeInsight && (
        <Card className="border-border-theme surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain size={16} className="text-icon-active" />
              {L('results.crossModeInsight')}
              <Badge variant="secondary">{L('results.aiPowered')}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-muted leading-relaxed whitespace-pre-line">{crossModeInsight}</p>
          </CardContent>
        </Card>
      )}

      {/* Trend */}
      {trend && trend.length > 0 && (
        <Card className="border-border-theme surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-success" />
              {L('results.sessionTrend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {trend.map((point, idx) => {
                const height = Math.max(8, (point.score / 100) * 100);
                const config = MODE_CONFIG[point.mode] || MODE_CONFIG.behavioral;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${point.sessionDate} — ${point.mode}: ${point.score}`}
                  >
                    <span className="text-xs text-text-muted font-mono">{point.score}</span>
                    <div
                      className={`w-full rounded-t-md ${config.bg} border ${config.border} transition-all duration-300`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-text-muted truncate w-full text-center">
                      {point.sessionDate?.slice(5) || ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </div>
    </div>
  );
};

export default Results;
