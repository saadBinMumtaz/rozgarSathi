// frontend/src/pages/SharedReport.jsx
// Public read-only shared report view — Master Context §15.6 / Rules.md §22.
// Accessible without authentication via shareToken URL parameter.
// Reuses existing Results.jsx design-system components (ScoreRing, ProgressBar, Badge, Card).

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { ScoreRing } from '../design-system/ScoreRing';
import { ProgressBar } from '../design-system/ProgressBar';
import { Skeleton } from '../design-system/Skeleton';
import { apiClient } from '../api/client';
import {
  Brain,
  Code,
  MessageCircle,
  Award,
  AlertTriangle,
  BarChart3,
  Eye,
  ShieldCheck,
} from 'lucide-react';

const MODE_CONFIG = {
  behavioral: { label: 'Behavioral', icon: MessageCircle, color: 'text-text-muted', bg: 'bg-text-muted/10' },
  technical: { label: 'Technical', icon: Brain, color: 'text-text-muted', bg: 'surface-text bg-surface-hover' },
  coding: { label: 'Coding', icon: Code, color: 'text-success', bg: 'bg-success/10' },
};

const getReadinessLabel = (score) => {
  if (score >= 80) return { text: 'Excellent', color: 'text-success' };
  if (score >= 60) return { text: 'Good', color: 'text-text-muted' };
  if (score >= 40) return { text: 'Fair', color: 'text-warning' };
  if (score > 0) return { text: 'Needs Work', color: 'text-danger' };
  return { text: 'No Data', color: 'text-text-muted' };
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export const SharedReport = ({ shareToken }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiClient.getSharedReport(shareToken);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load shared report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchReport();
    return () => { cancelled = true; };
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-danger/30">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="mx-auto text-danger" size={32} />
            <p className="text-danger">{error || 'This shared report is no longer available.'}</p>
            <p className="text-sm text-text-muted">
              The link may have expired or the report may have been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = MODE_CONFIG[data.mode] || MODE_CONFIG.behavioral;
  const ModeIcon = config.icon;
  const readiness = getReadinessLabel(data.overallScore);

  // Group questions by topic for summary
  const topicSummary = {};
  (data.questions || []).forEach((q) => {
    const topic = q.topic || 'General';
    if (!topicSummary[topic]) topicSummary[topic] = { scores: [], count: 0 };
    topicSummary[topic].count++;
    if (q.evaluation?.score != null) {
      topicSummary[topic].scores.push(q.evaluation.score);
    }
  });

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Shared Interview Report</h1>
          <p className="text-sm text-text-muted mt-1">
            {config.label} Interview — {formatDate(data.sessionDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Eye size={12} />
            Read-only
          </Badge>
          <Badge variant="success" className="gap-1">
            <ShieldCheck size={12} />
            Verified
          </Badge>
        </div>
      </div>

      {/* Overall Score + Mode */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 surface-text bg-surface">
          <CardContent className="pt-6 flex flex-col items-center">
            <ScoreRing
              score={data.overallScore}
              max={100}
              label="Overall Score"
              size={120}
              strokeWidth={10}
            />
            <div className={`mt-2 text-sm font-semibold ${readiness.color}`}>
              {readiness.text}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 size={16} className="text-text-muted" />
              Session Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                <ModeIcon size={16} className={config.color} />
              </div>
              <div className="flex-1">
                <ProgressBar value={data.overallScore} max={100} label={config.label} />
              </div>
              <span className={`text-lg font-bold ${config.color} w-12 text-right`}>
                {data.overallScore}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-text-muted pt-2 border-t border-border/30">
              <span>{data.questionCount} questions answered</span>
              <span>{formatDate(data.sessionDate)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Question Breakdown */}
      {data.questions && data.questions.length > 0 && (
        <Card className="surface-text bg-surface">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award size={16} className="text-icon-active" />
              Question Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.questions.map((q, idx) => {
              const score = q.evaluation?.score;
              return (
                <div key={q.questionId || idx} className="border-b border-border/20 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        Q{idx + 1}. {q.questionText || 'Question'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {q.topic && <Badge variant="secondary">{q.topic}</Badge>}
                        {q.difficulty && <Badge variant="info">{q.difficulty}</Badge>}
                      </div>
                    </div>
                    {score != null && (
                      <span className={`text-lg font-bold ${
                        score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-danger'
                      }`}>
                        {score}
                      </span>
                    )}
                  </div>

                  {q.evaluation && (
                    <div className="space-y-1.5 ml-1">
                      {q.evaluation.strength && (
                        <p className="text-xs text-text-muted">
                          <span className="font-semibold text-success">Strength:</span> {q.evaluation.strength}
                        </p>
                      )}
                      {q.evaluation.missing && (
                        <p className="text-xs text-text-muted">
                          <span className="font-semibold text-warning">Missing:</span> {q.evaluation.missing}
                        </p>
                      )}
                      {q.evaluation.improvement && (
                        <p className="text-xs text-text-muted">
                          <span className="font-semibold text-icon-active">Improve:</span> {q.evaluation.improvement}
                        </p>
                      )}
                      {q.evaluation.evidence && q.evaluation.evidence.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {q.evaluation.evidence.map((ev, evIdx) => (
                            <span key={evIdx} className="text-[10px] bg-surface-hover text-text-muted px-2 py-0.5 rounded">
                              {ev}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Privacy notice */}
      <div className="text-center py-4">
        <p className="text-xs text-text-muted">
          This is a read-only shared report. Candidate-identifying information is not included.
        </p>
        <p className="text-xs text-text-muted mt-1">
          Powered by <span className="font-semibold">Rozgar Sathi</span>
        </p>
      </div>
    </div>
  );
};

export default SharedReport;
