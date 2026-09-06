// frontend/src/components/shared/InterviewCompletion.jsx
// Shared completion screen for Behavioral and Technical interviews.
// Shows mode-aware achievement, data-driven takeaway, strongest/weakest
// dimensions, and clear next actions. Uses existing evaluation data.

import React, { useState } from 'react';
import { Card, CardContent } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { ScoreRing } from '../../design-system/ScoreRing';
import { RobotAvatar } from './RobotAvatar';
import { EvidenceCard } from './EvidenceCard';
import { Badge } from '../../design-system/Badge';
import { ChevronDown, ChevronUp, ArrowRight, RotateCcw, LayoutGrid } from 'lucide-react';
import { t } from '../../i18n/translations';

export const InterviewCompletion = ({
  mode = 'behavioral',
  evaluations = [],
  terminationMessage = null,
  onNavigate,
  onReset,
  language = 'english',
  translatedEvaluations = null,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const L = (key) => t(key, language);

  // ── Compute summary statistics ──
  const totalScore = evaluations.length > 0
    ? evaluations.reduce((sum, e) => sum + (typeof e?.score === 'number' ? e.score : 0), 0)
    : 0;
  const avgScore = evaluations.length > 0 ? Math.round(totalScore / evaluations.length) : 0;
  const highScores = evaluations.filter(e => e?.score >= 70).length;
  const lowScores = evaluations.filter(e => e?.score < 40).length;

  // ── Find strongest and weakest dimensions across all evaluations ──
  const dimTotals = {};
  const dimCounts = {};
  evaluations.forEach((ev) => {
    if (!ev?.dimensions) return;
    Object.entries(ev.dimensions).forEach(([key, val]) => {
      if (typeof val !== 'number') return;
      if (!dimTotals[key]) { dimTotals[key] = 0; dimCounts[key] = 0; }
      dimTotals[key] += val;
      dimCounts[key] += 1;
    });
  });

  const dimAvgs = Object.entries(dimTotals).map(([key, total]) => ({
    key,
    avg: Math.round(total / (dimCounts[key] || 1)),
  }));

  const strongest = dimAvgs.length > 0 ? dimAvgs.reduce((a, b) => a.avg > b.avg ? a : b) : null;
  const weakest = dimAvgs.length > 1
    ? dimAvgs.reduce((a, b) => a.avg < b.avg ? a : b)
    : null;

  // ── Data-driven takeaway from the most recent evaluation ──
  // Use translated evaluations when available (Urdu mode)
  const displayEvals = translatedEvaluations && translatedEvaluations.length > 0 ? translatedEvaluations : evaluations;
  const lastEval = displayEvals.length > 0 ? displayEvals[displayEvals.length - 1] : null;
  const displayLastEval = lastEval;

  // Prettify a dimension key: "codeQuality" → "Code Quality"
  const prettyDim = (key) => key ? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim() : '';

  const modeLabel = mode === 'behavioral' ? L('interview.behavioral.complete') : L('interview.technical.complete');

  // ── Terminated state ──
  if (terminationMessage) {
    return (
      <div className="min-h-screen bg-bg-primary p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-danger/30">
            <CardContent className="text-center py-8 space-y-4">
              <div className="text-2xl font-bold text-danger">{L('interview.terminated')}</div>
              <div className="text-danger text-sm max-w-md mx-auto">{terminationMessage}</div>
              <div className="flex justify-center gap-3 mt-4">
                <Button variant="secondary" onClick={() => onNavigate('dashboard')}>
                  {L('completion.goDashboard')}
                </Button>
                <Button variant="primary" onClick={onReset}>
                  {L('completion.practiceAgain')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Hero: Avatar + Score ── */}
        <Card className="border-success/30 overflow-hidden">
          <CardContent className="py-8 px-6">
            <div className="flex flex-col items-center gap-6">
              {/* Robot in positive state */}
              <div className="rounded-full flex items-center justify-center ring-2 shadow-lg"
                style={{ width: 140, height: 140, backgroundColor: 'var(--color-surface)', border: '3px solid var(--color-border-strong)' }}>
                <RobotAvatar size={110} state="positive" style={{ color: 'var(--color-surface-text)' }} />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-text-primary text-center">{modeLabel}</h2>

              {/* Score ring + stats */}
              <div className="flex items-center gap-6">
                <ScoreRing score={avgScore} max={100} label={L('interview.overallScore')} size={100} strokeWidth={7} />
                <div className="space-y-1.5 text-sm">
                  <div className="text-text-muted">
                    <span className="font-medium text-text-primary">{evaluations.length}</span> {L('interview.questionsCount').replace(':', '')}
                  </div>
                  {highScores > 0 && (
                    <div className="text-text-muted">
                      <span className="font-medium" style={{ color: 'var(--color-success)' }}>{highScores}</span> {L('interview.strongAnswers')}
                    </div>
                  )}
                  {lowScores > 0 && (
                    <div className="text-text-muted">
                      <span className="font-medium" style={{ color: 'var(--color-danger)' }}>{lowScores}</span> {L('interview.needImprovement')}
                    </div>
                  )}
                </div>
              </div>

              {/* Data-driven takeaway */}
              {displayLastEval && (
                <div className="w-full max-w-lg space-y-3 mt-2">
                  {/* Performance takeaway from most recent evaluation */}
                  {displayLastEval.strength && (
                    <div className="surface-text bg-surface-hover rounded-lg px-4 py-3 text-sm text-text-muted leading-relaxed text-left">
                      <span className="font-semibold text-text-primary">{L('completion.takeaway')}:</span>{' '}
                      {displayLastEval.strength}
                    </div>
                  )}

                  {/* Strongest + weakest dimensions */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    {strongest && (
                      <Badge variant="success">
                        {prettyDim(strongest.key)} {strongest.avg * 10}/100
                      </Badge>
                    )}
                    {weakest && (
                      <Badge variant="warning">
                        {prettyDim(weakest.key)} {weakest.avg * 10}/100
                      </Badge>
                    )}
                  </div>

                  {/* Improvement hint from most recent evaluation */}
                  {displayLastEval.improvement && (
                    <div className="surface-text bg-surface-hover rounded-lg px-4 py-3 text-sm text-text-muted leading-relaxed text-left">
                      <span className="font-semibold text-text-primary">{L('completion.nextStep')}:</span>{' '}
                      {displayLastEval.improvement}
                    </div>
                  )}
                </div>
              )}

              {/* Primary CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 w-full max-w-md">
                <Button variant="primary" onClick={() => onNavigate('results')} className="w-full sm:flex-1 flex items-center justify-center gap-2">
                  {L('completion.viewReport')} <ArrowRight size={16} />
                </Button>
              </div>

              {/* Secondary actions */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <Button variant="secondary" size="sm" onClick={onReset}>
                  <RotateCcw size={14} className="mr-1" /> {L('completion.practiceAgain')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { onReset(); onNavigate('mode-selection'); }}>
                  <LayoutGrid size={14} className="mr-1" /> {L('interview.tryAnotherMode')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Detailed feedback (collapsible) ── */}
        {evaluations.length > 0 && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors w-full"
              aria-expanded={showDetails}
            >
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <span>{L('interview.detailedFeedback')}</span>
              <span className="text-xs font-normal text-text-muted">({evaluations.length} {L('interview.questionsLabel')})</span>
            </button>

            {showDetails && (
              <div className="mt-4 space-y-4">
                {displayEvals.map((evaluation, idx) => (
                  <EvidenceCard key={idx} evaluation={evaluation} language={language} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewCompletion;