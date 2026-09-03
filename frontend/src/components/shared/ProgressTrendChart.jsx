// frontend/src/components/shared/ProgressTrendChart.jsx
// Day 6: Progress trend chart using REAL historical sessions from MongoDB.
// Renders per-mode score lines across the last few sessions.
// Data is passed in from the parent (fetched via apiClient.getSessionTrend).

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { t } from '../../i18n/translations';

// Mode differentiation by stroke pattern + shade (no decorative color)
const getModeColors = (language) => ({
  behavioral: { line: 'text-text-primary', bg: 'bg-text-primary', dot: 'bg-text-primary', label: t('chart.behavioral', language), stroke: 'var(--color-text-primary)', dasharray: '' },
  technical: { line: 'text-text-muted', bg: 'bg-text-muted', dot: 'bg-text-muted', label: t('chart.technical', language), stroke: 'var(--color-text-muted)', dasharray: '6 3' },
  coding: { line: 'text-icon-active', bg: 'bg-icon-active', dot: 'bg-icon-active', label: t('chart.coding', language), stroke: 'var(--color-icon-active)', dasharray: '2 3' },
});

const CHART_HEIGHT = 120;
const CHART_PADDING = 8;

/**
 * ProgressTrendChart — renders real session trend data as a simple SVG line chart.
 * Props:
 *   userId: string — required to fetch trend data
 *   trendData: object — optional pre-fetched { behavioral: [], technical: [], coding: [] }
 *   compact: boolean — if true, render a smaller version
 */
export const ProgressTrendChart = ({ userId, trendData: externalTrend, compact = false, language = 'english' }) => {
  const L = (key) => t(key, language);
  const MODE_COLORS = getModeColors(language);
  const [trend, setTrend] = useState(externalTrend || null);
  const [loading, setLoading] = useState(!externalTrend);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (externalTrend) {
      setTrend(externalTrend);
      setLoading(false);
      return;
    }
    if (!userId) return;

    let cancelled = false;
    setLoading(true);
    apiClient.getSessionTrend(userId)
      .then((result) => {
        if (!cancelled) setTrend(result.trend);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load trend data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, externalTrend]);

  // --- Loading state ---
  if (loading) {
    return (
      <div className={`surface-text bg-surface  rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-32 bg-border-theme/40 rounded" />
          <div className={`w-full ${compact ? 'h-16' : 'h-28'} bg-border-theme/20 rounded`} />
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className={`surface-text bg-surface  rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-2 text-danger text-sm">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{L('chart.trendUnavailable')} {error}</span>
        </div>
      </div>
    );
  }

  // --- No data state ---
  if (!trend || Object.values(trend).every((arr) => !arr || arr.length === 0)) {
    return (
      <div className={`surface-text bg-surface  rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <p className="text-sm text-text-muted">
          {L('chart.needMoreSessions')}
        </p>
      </div>
    );
  }

  // --- Compute chart dimensions ---
  const allPoints = Object.values(trend).flat().filter(Boolean);
  if (allPoints.length < 2) {
    return (
      <div className={`surface-text bg-surface  rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <p className="text-sm text-text-muted">
          {L('chart.needMoreData')}
        </p>
      </div>
    );
  }

  const height = compact ? 80 : CHART_HEIGHT;
  const maxScore = 100;
  const minScore = 0;
  const scoreRange = maxScore - minScore;

  // Find the maximum number of data points across all modes
  const maxPoints = Math.max(...Object.values(trend).map((arr) => (arr || []).length));
  const chartWidth = Math.max(maxPoints * 60, 200);

  const scoreToY = (score) => {
    const normalized = (score - minScore) / scoreRange;
    return height - CHART_PADDING - normalized * (height - 2 * CHART_PADDING);
  };

  const indexToX = (idx) => {
    if (maxPoints <= 1) return chartWidth / 2;
    return CHART_PADDING + (idx / (maxPoints - 1)) * (chartWidth - 2 * CHART_PADDING);
  };

  // Compute overall direction
  const firstScores = Object.values(trend).map((arr) => arr?.[0]?.score ?? 0);
  const lastScores = Object.values(trend).map((arr) => arr?.[arr.length - 1]?.score ?? 0);
  const avgFirst = firstScores.reduce((a, b) => a + b, 0) / (firstScores.length || 1);
  const avgLast = lastScores.reduce((a, b) => a + b, 0) / (lastScores.length || 1);
  const direction = avgLast - avgFirst;

  return (
    <div className={`surface-text bg-surface  rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {direction > 5 ? (
            <TrendingUp size={16} className="text-success" aria-label="Trending up" />
          ) : direction < -5 ? (
            <TrendingDown size={16} className="text-danger" aria-label="Trending down" />
          ) : (
            <Minus size={16} className="text-text-muted" aria-label="Stable" />
          )}
          <span className="text-sm font-semibold text-text-primary">{L('chart.progressTrend')}</span>
        </div>
        <span className="text-xs text-text-muted">
          {direction > 5 ? `+${Math.round(direction)} ${L('chart.pts')}` : direction < -5 ? `${Math.round(direction)} ${L('chart.pts')}` : L('chart.stable')}
        </span>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto" role="img" aria-label="Score trend chart showing performance across sessions">
        <svg
          viewBox={`0 0 ${chartWidth} ${height + 20}`}
          className="w-full"
          style={{ minWidth: '200px', maxHeight: compact ? '100px' : '160px' }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((score) => (
            <g key={score}>
              <line
                x1={0}
                y1={scoreToY(score)}
                x2={chartWidth}
                y2={scoreToY(score)}
                stroke="var(--color-border)"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
              <text
                x={chartWidth - 2}
                y={scoreToY(score) - 2}
                textAnchor="end"
                className="fill-text-muted"
                fontSize="8"
              >
                {score}
              </text>
            </g>
          ))}

          {/* Mode lines */}
          {Object.entries(trend).map(([mode, points]) => {
            if (!points || points.length === 0) return null;
            const color = MODE_COLORS[mode];
            const pathData = points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${indexToX(i)} ${scoreToY(p.score)}`)
              .join(' ');

            return (
              <g key={mode}>
                {/* Line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={color.stroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={color.dasharray}
                />
                {/* Dots */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={indexToX(i)}
                      cy={scoreToY(p.score)}
                      r="4"
                      style={{ fill: color.stroke }}
                    />
                    <text
                      x={indexToX(i)}
                      y={scoreToY(p.score) - 8}
                      textAnchor="middle"
                      className="fill-text-primary"
                      fontSize="9"
                      fontWeight="600"
                    >
                      {p.score}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}

          {/* Date labels on x-axis */}
          {allPoints.length > 0 && (
            <g>
              {Array.from(new Set(allPoints.map((p) => p.date))).map((date, i) => (
                <text
                  key={date}
                  x={indexToX(i)}
                  y={height + 14}
                  textAnchor="middle"
                  className="fill-text-muted"
                  fontSize="8"
                >
                  {date?.slice(5) || ''}
                </text>
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        {Object.entries(trend)
          .filter(([, points]) => points && points.length > 0)
          .map(([mode]) => {
            const color = MODE_COLORS[mode];
            return (
              <div key={mode} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} aria-hidden="true" />
                <span className={`text-xs ${color.line}`}>{color.label}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ProgressTrendChart;
