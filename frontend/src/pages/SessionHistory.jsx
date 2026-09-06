// frontend/src/pages/SessionHistory.jsx
// Day 6: Full session history — mode, JD/role, date, score, transcript,
// questions, feedback, and cross-mode insight snapshot at that point in time.
// All data from real MongoDB sessions via the history API.

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Skeleton } from '../design-system/Skeleton';
import { EvidenceCard } from '../components/shared/EvidenceCard';
import { apiClient } from '../api/client';
import {
  Brain, Code, MessageCircle, Clock, ChevronDown, ChevronUp,
  AlertCircle, FileText, MessageSquare, TrendingUp,
} from 'lucide-react';
import { t } from '../i18n/translations';

const MODE_CONFIG = {
  behavioral: { label: 'Behavioral', labelUr: 'سلوکی', icon: MessageCircle, color: 'text-text-muted', bg: 'bg-text-muted/10', border: '' },
  technical: { label: 'Technical', labelUr: 'تکنیکی', icon: Brain, color: 'text-text-muted', bg: 'surface-text bg-surface-hover', border: '' },
  coding: { label: 'Coding', labelUr: 'کوڈنگ', icon: Code, color: 'text-success', bg: 'bg-success/10', border: 'border-success/30/20' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getScoreColor = (score) => {
  if (score == null) return 'text-text-muted';
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-danger';
};

const getScoreLabel = (score, L) => {
  if (score == null) return { text: L('common.noData'), ariaLabel: L('common.noData') };
  if (score >= 80) return { text: L('dashboard.excellent'), ariaLabel: `${L('common.score')} ${score}, ${L('dashboard.excellent')}` };
  if (score >= 60) return { text: L('dashboard.good'), ariaLabel: `${L('common.score')} ${score}, ${L('dashboard.good')}` };
  if (score >= 40) return { text: L('dashboard.fair'), ariaLabel: `${L('common.score')} ${score}, ${L('dashboard.fair')}` };
  return { text: L('dashboard.needsWork'), ariaLabel: `${L('common.score')} ${score}, ${L('dashboard.needsWork')}` };
};

/**
 * Expandable session card — shows summary by default, full details when expanded.
 */
const SessionCard = ({ session, language = 'english' }) => {
  const [expanded, setExpanded] = useState(false);
  const config = MODE_CONFIG[session.mode] || MODE_CONFIG.behavioral;
  const ModeIcon = config.icon;
  const scoreLabel = getScoreLabel(session.overallScore, L);
  const L = (key) => t(key, language);
  const modeLabel = language === 'urdu' ? (config.labelUr || config.label) : config.label;

  return (
    <Card className={`border-border-theme surface-text bg-surface transition-colors ${expanded ? 'ring-1 ring-border-theme' : ''}`}>
      {/* Summary row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 pt-4 pb-3 flex items-center justify-between gap-3 hover:surface-text bg-surface-hover transition-colors rounded-t-lg focus:outline-none focus:ring-2 focus:ring-border-strong focus:ring-inset"
        aria-expanded={expanded}
        aria-label={`${modeLabel} ${L('sessionHistory.interview')} ${formatDate(session.date)}, score ${session.overallScore ?? 'unknown'}. ${expanded ? L('sessionHistory.collapse') : L('sessionHistory.expand')} details.`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
            <ModeIcon size={20} className={config.color} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {modeLabel} {L('sessionHistory.interview')}
            </p>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Clock size={11} aria-hidden="true" />
              <span>{formatDate(session.date)}</span>
              <span className="text-text-muted">·</span>
              <span>{session.questionCount} {session.questionCount !== 1 ? L('common.questions') : L('common.question')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className={`text-xl font-bold ${getScoreColor(session.overallScore)}`} aria-label={scoreLabel.ariaLabel}>
              {session.overallScore ?? '—'}
            </p>
            <p className={`text-xs ${getScoreColor(session.overallScore)}`}>{scoreLabel.text}</p>
          </div>
          {expanded ? (
            <ChevronUp size={18} className="text-text-muted" aria-hidden="true" />
          ) : (
            <ChevronDown size={18} className="text-text-muted" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* JD snapshot */}
          {session.jdSnapshot && (
            <div className="surface-text bg-surface-hover rounded-lg p-3">
              <p className="text-xs font-medium text-text-muted mb-1 flex items-center gap-1">
                <FileText size={11} aria-hidden="true" /> {L('sessionHistory.jobDescription')}
              </p>
              <p className="text-xs text-text-muted line-clamp-2">
                {session.jdSnapshot.title || session.jdSnapshot.role || L('sessionHistory.customJD')}
                {session.jdSnapshot.company && ` at ${session.jdSnapshot.company}`}
              </p>
            </div>
          )}

          {/* Questions with transcripts and feedback */}
          {session.questions && session.questions.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-text-muted flex items-center gap-2">
                <MessageSquare size={14} className="text-text-muted" aria-hidden="true" />
                {L('sessionHistory.questionsFeedback')}
              </h4>
              {session.questions.map((q, idx) => (
                <div key={idx} className="surface-text bg-surface-hover rounded-lg p-3 space-y-2">
                  {/* Question header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-muted">
                        Q{idx + 1}
                        {q.topic && <span className="ml-2 text-text-muted">· {q.topic}</span>}
                        {q.difficulty && <Badge variant={q.difficulty === 'easy' ? 'success' : q.difficulty === 'hard' ? 'destructive' : 'warning'} className="ml-2 text-[10px]">{q.difficulty}</Badge>}
                      </p>
                      <p className="text-sm text-text-primary mt-1">{q.questionText}</p>
                    </div>
                    {q.score != null && (
                      <span className={`text-lg font-bold ${getScoreColor(q.score)} flex-shrink-0`} aria-label={`Score: ${q.score}`}>
                        {q.score}
                      </span>
                    )}
                  </div>

                  {/* Transcript */}
                  {q.transcript && (
                    <div className="surface-text bg-surface rounded p-2">
                      <p className="text-xs text-text-muted mb-1">{L('sessionHistory.yourAnswer')}</p>
                      <p className="text-xs text-text-muted italic line-clamp-3">{q.transcript}</p>
                    </div>
                  )}

                  {/* Evaluation feedback */}
                  {(q.strength || q.missing || q.improvement || (q.evidence && q.evidence.length > 0)) && (
                    <EvidenceCard
                      evaluation={{
                        score: q.score,
                        evidence: q.evidence || [],
                        strength: q.strength || '',
                        missing: q.missing || '',
                        improvement: q.improvement || '',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">{L('sessionHistory.noDetails')}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export const SessionHistory = ({ userId = 'guest', onNavigate, language = 'english' }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('all');

  const L = (key) => t(key, language);
  const getModeLabel = (mode) => {
    if (mode === 'all') return L('common.all');
    return language === 'urdu' ? (MODE_CONFIG[mode]?.labelUr || mode) : (MODE_CONFIG[mode]?.label || mode);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient.getSessionHistory(userId)
      .then((result) => {
        if (!cancelled) setSessions(result.history || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load session history');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  // Filter sessions by mode
  const filteredSessions = filterMode === 'all'
    ? sessions
    : sessions.filter((s) => s.mode === filterMode);

  // --- Loading state ---
  if (loading) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-danger/30">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="mx-auto text-danger" size={32} aria-hidden="true" />
            <p className="text-danger">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={() => onNavigate?.('dashboard')}>
                {L('sessionHistory.backDashboard')}
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                {L('common.retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col page-enter">
      {/* Content */}
      <div className="flex-1 p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{L('sessionHistory.title')}</h1>
              <p className="text-sm text-text-muted mt-1">
                {sessions.length} {L('dashboard.sessionsTracked')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onNavigate('dashboard')}>
                <TrendingUp size={14} className="mr-1" /> {L('sessionHistory.dashboard')}
              </Button>
            </div>
          </div>

      {/* Mode filter */}
      <div className="flex items-center gap-2" role="group" aria-label="Filter sessions by mode">
        {['all', 'behavioral', 'technical', 'coding'].map((mode) => {
          const isActive = filterMode === mode;
          const label = getModeLabel(mode);
          return (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-border-strong ${
                isActive
                  ? 'bg-text-primary/20 text-text-primary ring-1 ring-border-theme'
                  : 'surface-text bg-surface-hover text-text-muted hover:text-text-primary'
              }`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Session list */}
      {filteredSessions.length === 0 ? (
        <Card className="border-border-theme surface-text bg-surface">
          <CardContent className="pt-6 text-center space-y-3">
            <Clock size={32} className="text-text-muted mx-auto" aria-hidden="true" />
            <p className="text-sm text-text-muted">
              {filterMode === 'all'
                ? L('sessionHistory.noSessions')
                : `${L('sessionHistory.noModeSessions')} ${filterMode} ${L('dashboard.sessionsTracked')}.`}
            </p>
            <Button variant="secondary" onClick={() => onNavigate('mode-selection')}>
              {L('common.startInterview')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <SessionCard key={session.sessionId || Math.random()} session={session} language={language} />
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;
