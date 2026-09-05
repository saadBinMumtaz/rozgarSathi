// frontend/src/pages/Results.jsx
// Interview Performance Report — professional candidate assessment view.
// Shows the latest completed session as a detailed report with score,
// role context, dimension breakdown, per-question evaluation, and
// practice recommendations. Aggregate trend shown as secondary section.
// Hierarchy: Score → Role → Dimensions → Question Details → Actions

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { ScoreRing } from '../design-system/ScoreRing';
import { Skeleton } from '../design-system/Skeleton';
import { apiClient } from '../api/client';
import { ExportReportButton } from '../components/shared/ExportReportButton';
import {
  ArrowLeft,
  TrendingUp,
  Brain,
  Code,
  MessageCircle,
  Target,
  Award,
  AlertTriangle,
  Share2,
  Copy,
  Check,
  CheckCircle,
  Lightbulb,
  Quote,
  Clock,
  Briefcase,
  BarChart3,
  FileText,
  Sparkles,
} from 'lucide-react';
import { t } from '../i18n/translations';

const MODE_CONFIG = {
  behavioral: {
    label: 'Behavioral',
    labelUr: 'سلوکی',
    icon: MessageCircle,
    color: 'text-text-muted',
    bg: 'bg-text-muted/10',
  },
  technical: {
    label: 'Technical',
    labelUr: 'تکنیکی',
    icon: Brain,
    color: 'text-text-muted',
    bg: 'surface-text bg-surface-hover',
  },
  coding: {
    label: 'Coding',
    labelUr: 'کوڈنگ',
    icon: Code,
    color: 'text-success',
    bg: 'bg-success/10',
  },
};

const getModeLabel = (mode, language) => {
  if (language === 'urdu') return MODE_CONFIG[mode]?.labelUr || mode;
  return MODE_CONFIG[mode]?.label || mode;
};

const getScoreColor = (score) => {
  if (score == null) return 'text-text-muted';
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-danger';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const getDimColor = (value, max = 10) => {
  const pct = (value / max) * 100;
  if (pct >= 70) return 'bg-success';
  if (pct >= 40) return 'bg-warning';
  return 'bg-danger';
};

const getDimTextColor = (value, max = 10) => {
  const pct = (value / max) * 100;
  if (pct >= 70) return 'text-success';
  if (pct >= 40) return 'text-warning';
  return 'text-danger';
};

export const Results = ({ userId = 'guest', onNavigate, onBackToHub, language = 'english' }) => {
  const [data, setData] = useState(null);
  const [latestSession, setLatestSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [interviewSummary, setInterviewSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const L = (key) => t(key, language);

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
          const sessions = histResult?.history || [];
          setLatestSession(sessions.length > 0 ? sessions[0] : null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load results');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [userId]);

  // Fetch interview summary after session data loads
  useEffect(() => {
    if (!latestSession?.sessionId) return;
    let cancelled = false;
    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const result = await apiClient.getInterviewSummary(latestSession.sessionId);
        if (!cancelled && result?.summary) {
          setInterviewSummary(result.summary);
        }
      } catch {
        // Summary is non-critical — silently ignore
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };
    fetchSummary();
    return () => { cancelled = true; };
  }, [latestSession?.sessionId]);

  const handleShare = async () => {
    if (!latestSession?.sessionId) return;
    setShareLoading(true);
    try {
      const result = await apiClient.generateShareToken(latestSession.sessionId);
      setShareLink(`${window.location.origin}/shared/${result.shareToken}`);
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
      <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // --- Error state ---
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-danger/30" hover={false}>
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="mx-auto text-danger" size={32} />
            <p className="text-danger">{error || L('results.failedLoad')}</p>
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

  const session = latestSession;
  const mode = session?.mode || 'behavioral';
  const config = MODE_CONFIG[mode] || MODE_CONFIG.behavioral;
  const ModeIcon = config.icon;
  const overallScore = session?.overallScore ?? 0;
  const questions = session?.questions || [];
  const jdSnapshot = session?.jdSnapshot;

  // Aggregate dimension scores across all questions in the session
  // Session history API returns dimensions directly on the question object
  const aggregatedDims = {};
  const dimCounts = {};
  questions.forEach((q) => {
    if (q.score == null) return;
    const dims = q.dimensions || {};
    Object.entries(dims).forEach(([key, val]) => {
      if (typeof val !== 'number') return;
      aggregatedDims[key] = (aggregatedDims[key] || 0) + val;
      dimCounts[key] = (dimCounts[key] || 0) + 1;
    });
  });
  // Average dimensions
  const dimensions = {};
  Object.entries(aggregatedDims).forEach(([key, total]) => {
    dimensions[key] = Math.round((total / (dimCounts[key] || 1)) * 10) / 10;
  });

  // Collect all strengths and improvements from questions
  const strengths = questions
    .map((q) => q.strength)
    .filter((s) => s && s.trim().length > 0);
  const improvements = questions
    .map((q) => q.improvement)
    .filter((s) => s && s.trim().length > 0);

  const { perMode, trend } = data;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-6 page-enter">

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBackToHub?.()}
            className="text-text-muted hover:text-text-primary"
          >
            <ArrowLeft size={16} className="mr-1" /> {L('results.backToMode')}
          </Button>
          <div className="flex items-center gap-2">
            {data && <ExportReportButton data={data} />}
            <Button
              variant="secondary"
              size="sm"
              onClick={shareLink ? handleCopyLink : handleShare}
              isLoading={shareLoading}
              disabled={!session?.sessionId}
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
          </div>
        </div>

        {/* Share link bar */}
        {shareLink && (
          <div className="surface-text bg-surface rounded-lg flex items-center gap-2 p-3 border border-border-theme">
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

        {/* ════════════════════════════════════════════════════════════
            SECTION 1: HERO — Score Overview
            ════════════════════════════════════════════════════════════ */}
        <Card className="surface-text bg-surface border-border-theme overflow-visible" hover={false}>
          <CardContent className="pt-6 animate-scale-in">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Score Ring */}
              <div className="flex-shrink-0">
                <ScoreRing
                  score={overallScore}
                  max={100}
                  label=""
                  size={140}
                  strokeWidth={10}
                />
              </div>

              {/* Score details */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
                    <ModeIcon size={20} className={config.color} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-text-primary">
                      {getModeLabel(mode, language)} Interview
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-text-muted mt-0.5">
                      {jdSnapshot && (
                        <>
                          <Briefcase size={13} />
                          <span>
                            {jdSnapshot.title || jdSnapshot.role || 'Custom Role'}
                            {jdSnapshot.company && ` · ${jdSnapshot.company}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                  <div>
                    <div className={`text-3xl font-extrabold ${getScoreColor(overallScore)}`}>
                      {overallScore}
                      <span className="text-lg font-normal text-text-muted">/100</span>
                    </div>
                    <div className={`text-sm font-semibold mt-0.5 ${getScoreColor(overallScore)}`}>
                      {overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : overallScore > 0 ? 'Needs Work' : 'No Data'}
                    </div>
                  </div>
                  <div className="h-12 w-px bg-border-theme mx-2" />
                  <div className="text-sm text-text-muted space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} />
                      <span>{session ? formatDate(session.date) : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText size={13} />
                      <span>{questions.length} {questions.length !== 1 ? 'Questions' : 'Question'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2: ROLE CONTEXT
            ════════════════════════════════════════════════════════════ */}
        {jdSnapshot && (jdSnapshot.role || jdSnapshot.title || jdSnapshot.skills?.length > 0 || jdSnapshot.keywords?.length > 0) && (
          <Card className="surface-text bg-surface border-border-theme" hover={false}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase size={15} className="text-text-muted" />
                Role Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(jdSnapshot.title || jdSnapshot.role) && (
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wider">Position</span>
                    <p className="text-base font-semibold text-text-primary mt-0.5">
                      {jdSnapshot.title || jdSnapshot.role}
                      {jdSnapshot.company && ` at ${jdSnapshot.company}`}
                    </p>
                  </div>
                )}
                {jdSnapshot.skills?.length > 0 && (
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wider">Key Skills</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {jdSnapshot.skills.slice(0, 8).map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {jdSnapshot.keywords?.length > 0 && (
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wider">Keywords</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {jdSnapshot.keywords.slice(0, 6).map((kw, i) => (
                        <Badge key={i} variant="default">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════════════════════════
            SECTION 2.5: INTERVIEW SUMMARY (AI-synthesized)
            ════════════════════════════════════════════════════════════ */}
        {(interviewSummary || summaryLoading) && (
          <Card className="surface-text bg-surface border-border-theme animate-slide-up stagger-1" hover={false}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles size={15} className="text-icon-active" />
                Interviewer Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <p className="text-sm text-text-primary leading-relaxed">{interviewSummary}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════════════════════════
            SECTION 3: PERFORMANCE SUMMARY
            ════════════════════════════════════════════════════════════ */}
        <Card className="surface-text bg-surface border-border-theme animate-slide-up stagger-2" hover={false}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 size={15} className="text-text-muted" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Dimension breakdown */}
            {Object.keys(dimensions).length > 0 ? (
              <div className="space-y-3">
                <span className="text-xs text-text-muted uppercase tracking-wider">Score Dimensions</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(dimensions).map(([key, value]) => {
                    const pct = Math.min(100, (value / 10) * 100);
                    return (
                      <div key={key} className="bg-surface-hover rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-text-muted capitalize font-medium">{key}</span>
                          <span className={`text-sm font-bold ${getDimTextColor(value)}`}>
                            {value}<span className="text-xs font-normal text-text-muted">/10</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-border-theme/30 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getDimColor(value)} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-text-muted">Dimension breakdown not available for this session.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ════════════════════════════════════════════════════════════
            SECTION 4: QUESTION-BY-QUESTION ANALYSIS
            ════════════════════════════════════════════════════════════ */}
        {questions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">Question-by-Question Analysis</h2>
              <Badge variant="secondary">{questions.length} questions</Badge>
            </div>

            {questions.map((q, idx) => {
              const qScore = q.score;
              const hasEvaluation = q.strength || q.missing || q.improvement || (q.evidence?.length > 0);

              return (
                <Card key={idx} className="surface-text bg-surface border-border-theme" hover={false}>
                  <CardContent className="pt-5 space-y-4">
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-text-muted bg-surface-hover px-2 py-0.5 rounded">
                            Q{idx + 1}
                          </span>
                          {q.topic && (
                            <Badge variant="secondary">{q.topic}</Badge>
                          )}
                          {q.difficulty && (
                            <Badge variant={q.difficulty === 'easy' ? 'success' : q.difficulty === 'hard' ? 'destructive' : 'warning'}>
                              {q.difficulty}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-text-primary leading-relaxed">{q.questionText}</p>
                      </div>
                      {qScore != null && (
                        <div className="flex-shrink-0 text-center">
                          <div className={`text-2xl font-extrabold ${getScoreColor(qScore)}`}>{qScore}</div>
                          <div className="text-[10px] text-text-muted">/100</div>
                        </div>
                      )}
                    </div>

                    {/* Candidate's answer transcript */}
                    {q.transcript && (
                      <div className="bg-surface-hover rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Quote size={12} className="text-text-muted" />
                          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Your Answer</span>
                        </div>
                        <p className="text-sm text-text-muted leading-relaxed italic">{q.transcript}</p>
                      </div>
                    )}

                    {/* Evaluation details */}
                    {hasEvaluation && (
                      <div className="space-y-3">
                        {/* Evidence */}
                        {q.evidence?.length > 0 && (
                          <div className="bg-surface-hover rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Sparkles size={13} className="text-icon-active" />
                              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">Evidence</span>
                            </div>
                            <ul className="space-y-1">
                              {q.evidence.map((item, i) => (
                                <li key={i} className="text-sm text-text-muted flex items-start gap-2">
                                  <span className="text-text-muted mt-1.5 flex-shrink-0">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Strength + Missing side by side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.strength && (
                            <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <CheckCircle size={14} className="text-success" />
                                <span className="text-xs font-semibold text-success uppercase tracking-wider">Strength</span>
                              </div>
                              <p className="text-sm text-text-primary leading-relaxed">{q.strength}</p>
                            </div>
                          )}
                          {q.missing && (
                            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <AlertTriangle size={14} className="text-warning" />
                                <span className="text-xs font-semibold text-warning uppercase tracking-wider">Gap</span>
                              </div>
                              <p className="text-sm text-text-primary leading-relaxed">{q.missing}</p>
                            </div>
                          )}
                        </div>

                        {/* Improvement */}
                        {q.improvement && (
                          <div className="bg-surface-hover border border-border-theme rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Lightbulb size={14} className="text-warning" />
                              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">How to Improve</span>
                            </div>
                            <p className="text-sm text-text-muted leading-relaxed">{q.improvement}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* No evaluation available */}
                    {!hasEvaluation && (
                      <div className="text-center py-3">
                        <p className="text-xs text-text-muted">Detailed evaluation not available for this question.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            SECTION 5: KEY STRENGTHS & IMPROVEMENT AREAS
            ════════════════════════════════════════════════════════════ */}
        {(strengths.length > 0 || improvements.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up stagger-4">
            {/* Strengths */}
            <Card className="surface-text bg-surface border-success/20" hover={false}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle size={15} className="text-success" />
                  Key Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {strengths.length > 0 ? (
                  <ul className="space-y-2.5">
                    {strengths.map((s, i) => (
                      <li key={i} className="text-sm text-text-primary flex items-start gap-2.5">
                        <span className="text-success mt-0.5 flex-shrink-0 font-bold">✓</span>
                        <span className="leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-muted">Complete questions to see your strengths.</p>
                )}
              </CardContent>
            </Card>

            {/* Improvement Areas */}
            <Card className="surface-text bg-surface border-warning/20" hover={false}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target size={15} className="text-warning" />
                  Improvement Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {improvements.length > 0 ? (
                  <ul className="space-y-2.5">
                    {improvements.map((s, i) => (
                      <li key={i} className="text-sm text-text-primary flex items-start gap-2.5">
                        <span className="text-warning mt-0.5 flex-shrink-0 font-bold">→</span>
                        <span className="leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-muted">Keep practicing to identify improvement areas.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            SECTION 6: NEXT-STEP PRACTICE RECOMMENDATIONS
            ════════════════════════════════════════════════════════════ */}
        <Card className="surface-text bg-surface border-border-theme animate-slide-up stagger-5" hover={false}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target size={15} className="text-icon-active" />
              Next-Step Practice Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const recommendations = [];

              // Find lowest-scoring mode from aggregate data
              if (perMode) {
                const modeEntries = Object.entries(perMode).filter(([, score]) => score > 0);
                const allModes = Object.entries(perMode);
                const untriedModes = allModes.filter(([, score]) => score === 0);

                if (untriedModes.length > 0) {
                  const untried = untriedModes[0];
                  recommendations.push({
                    icon: MODE_CONFIG[untried[0]]?.icon || Code,
                    title: `Try ${getModeLabel(untried[0], language)} Interview`,
                    desc: `You haven't attempted a ${getModeLabel(untried[0], language)} interview yet. Complete all three modes for a full assessment.`,
                  });
                }

                if (modeEntries.length > 0) {
                  const lowest = modeEntries.reduce((min, [m, s]) => s < min[1] ? [m, s] : min, modeEntries[0]);
                  recommendations.push({
                    icon: MODE_CONFIG[lowest[0]]?.icon || Code,
                    title: `Practice ${getModeLabel(lowest[0], language)} Questions`,
                    desc: `Your ${getModeLabel(lowest[0], language)} score (${lowest[1]}/100) has the most room for improvement. Focus on this area.`,
                  });
                }
              }

              // Based on session dimensions
              if (Object.keys(dimensions).length > 0) {
                const sortedDims = Object.entries(dimensions).sort((a, b) => a[1] - b[1]);
                const weakestDim = sortedDims[0];
                if (weakestDim && weakestDim[1] < 7) {
                  recommendations.push({
                    icon: Target,
                    title: `Strengthen "${weakestDim[0]}"`,
                    desc: `Your "${weakestDim[0]}" dimension scored ${weakestDim[1]}/10. Practice answers that specifically demonstrate this skill.`,
                  });
                }
              }

              // Fallback
              if (recommendations.length === 0) {
                recommendations.push({
                  icon: Award,
                  title: 'Complete More Interviews',
                  desc: 'Finish interviews in all three modes (Behavioral, Technical, Coding) to get personalized recommendations.',
                });
              }

              return (
                <div className="space-y-3">
                  {recommendations.map((rec, i) => {
                    const Icon = rec.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 bg-surface-hover rounded-lg p-3">
                        <div className="w-8 h-8 rounded-lg bg-text-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={16} className="text-text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{rec.title}</p>
                          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{rec.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* ════════════════════════════════════════════════════════════
            SECTION 7: AGGREGATE TREND (cross-session)
            ════════════════════════════════════════════════════════════ */}
        {trend && trend.length > 1 && (
          <Card className="surface-text bg-surface border-border-theme" hover={false}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp size={15} className="text-success" />
                Score Trend
                <span className="text-xs font-normal text-text-muted">
                  Last {trend.length} sessions
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1.5 h-20">
                {trend.map((point, idx) => {
                  const height = Math.max(8, (point.score / 100) * 100);
                  const modeConfig = MODE_CONFIG[point.mode] || MODE_CONFIG.behavioral;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${point.sessionDate} — ${point.mode}: ${point.score}`}
                    >
                      <span className="text-[10px] text-text-muted font-mono">{point.score}</span>
                      <div
                        className={`w-full rounded-t-md ${modeConfig.bg} transition-all duration-300`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[9px] text-text-muted truncate w-full text-center">
                        {point.sessionDate?.slice(5) || ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════════════════════════
            SECTION 8: EMPTY STATE — No sessions
            ════════════════════════════════════════════════════════════ */}
        {!session && (
          <Card className="surface-text bg-surface border-border-theme" hover={false}>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <Award size={40} className="mx-auto text-text-muted" />
              <div>
                <h3 className="text-lg font-semibold text-text-primary">No Interview Data Yet</h3>
                <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
                  Complete an interview session to see your detailed performance report with scores, feedback, and recommendations.
                </p>
              </div>
              <Button variant="primary" onClick={() => onNavigate?.('jd-input')}>
                {L('common.startInterview')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Bottom Actions ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 pb-8 animate-fade-in stagger-6">
          <Button variant="primary" onClick={() => onNavigate?.('mode-selection')}>
            Practice Another Mode
          </Button>
          <Button variant="secondary" onClick={() => onBackToHub?.()}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
