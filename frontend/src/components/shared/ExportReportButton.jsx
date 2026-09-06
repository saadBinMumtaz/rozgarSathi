// frontend/src/components/shared/ExportReportButton.jsx
// Client-side PDF export of the already-rendered Results report.
// Uses jsPDF — no backend dependency. Exports overall score, per-mode
// breakdown, top 2 action items derived from weakest competency and
// cross-mode insight.

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from '../../design-system/Button';
import { FileDown } from 'lucide-react';

const MODE_LABELS = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  coding: 'Coding',
};

const getReadinessLabel = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score > 0) return 'Needs Work';
  return 'No Data';
};

/**
 * Derive top 2 action items from the report data.
 * Uses weakest competency + cross-mode insight to produce actionable items.
 */
const deriveActionItems = (data) => {
  const items = [];

  // Action item 1: weakest competency
  if (data.weakestCompetency && data.weakestCompetency !== 'General Practice') {
    items.push(`Focus on improving "${data.weakestCompetency}" — your weakest competency area.`);
  }

  // Action item 2: lowest-scoring mode
  const modeEntries = Object.entries(data.perMode || {});
  const scoredModes = modeEntries.filter(([, score]) => score > 0);
  if (scoredModes.length > 0) {
    const lowest = scoredModes.reduce((min, [mode, score]) =>
      score < min[1] ? [mode, score] : min, scoredModes[0]);
    items.push(
      `Practice more ${MODE_LABELS[lowest[0]] || lowest[0]} interview questions (current score: ${lowest[1]}/100).`
    );
  }

  // Fallback if we still don't have 2 items
  if (items.length < 2 && data.crossModeInsight) {
    const insightSnippet = data.crossModeInsight.length > 120
      ? data.crossModeInsight.slice(0, 120) + '...'
      : data.crossModeInsight;
    items.push(`Review cross-mode insight: "${insightSnippet}"`);
  }

  if (items.length < 2) {
    items.push('Complete all three interview modes for a comprehensive readiness assessment.');
  }

  return items.slice(0, 2);
};

export const ExportReportButton = ({ data, className = '' }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // --- Title ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Rozgar Sathi — Interview Report', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Divider
      doc.setDrawColor(200);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      // --- Overall Readiness ---
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Overall Readiness', 20, y);
      y += 8;

      doc.setFontSize(28);
      const readinessLabel = getReadinessLabel(data.overallReadiness);
      doc.text(`${data.overallReadiness}/100`, 20, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(80);
      doc.text(`Status: ${readinessLabel}  |  Sessions: ${data.sessionCount || 0}`, 20, y);
      y += 12;

      // --- Per-Mode Breakdown ---
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Per-Mode Breakdown', 20, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const modeEntries = Object.entries(data.perMode || {});
      for (const [mode, score] of modeEntries) {
        const label = MODE_LABELS[mode] || mode;
        const barWidth = 80;
        const filledWidth = (score / 100) * barWidth;

        // Mode label
        doc.setTextColor(0);
        doc.text(`${label}:`, 25, y);

        // Score bar background
        doc.setFillColor(230);
        doc.rect(60, y - 4, barWidth, 6, 'F');

        // Score bar fill
        if (score >= 80) doc.setFillColor(34, 197, 94);
        else if (score >= 60) doc.setFillColor(234, 179, 8);
        else doc.setFillColor(239, 68, 68);
        doc.rect(60, y - 4, filledWidth, 6, 'F');

        // Score number
        doc.setTextColor(0);
        doc.text(`${score}/100`, 145, y);
        y += 10;
      }
      y += 6;

      // --- Weights ---
      if (data.weights) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Readiness Weights', 20, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const weightEntries = Object.entries(data.weights);
        for (const [mode, weight] of weightEntries) {
          const label = MODE_LABELS[mode] || mode;
          doc.text(`${label}: ${Math.round(weight * 100)}%`, 25, y);
          y += 6;
        }
        y += 4;
      }

      // --- Weakest Competency ---
      if (data.weakestCompetency) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Weakest Competency', 20, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(180, 80, 0);
        doc.text(data.weakestCompetency, 25, y);
        doc.setTextColor(0);
        y += 10;
      }

      // --- Action Items ---
      const actionItems = deriveActionItems(data);
      if (actionItems.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Top Action Items', 20, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        actionItems.forEach((item, idx) => {
          const lines = doc.splitTextToSize(`${idx + 1}. ${item}`, pageWidth - 50);
          doc.text(lines, 25, y);
          y += lines.length * 5 + 2;
        });
        y += 4;
      }

      // --- Cross-Mode Insight ---
      if (data.crossModeInsight) {
        // Check if we need a new page
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Cross-Mode Insight', 20, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const insightLines = doc.splitTextToSize(data.crossModeInsight, pageWidth - 40);
        doc.text(insightLines, 25, y);
        y += insightLines.length * 5 + 4;
      }

      // --- Footer ---
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Rozgar Sathi Interview Report — Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Download
      doc.save(`rozgar-sathi-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleExport}
      isLoading={exporting}
      className={className}
    >
      <FileDown size={14} className="mr-1.5" />
      Export PDF
    </Button>
  );
};

export default ExportReportButton;
