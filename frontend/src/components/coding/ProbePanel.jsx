// frontend/src/components/coding/ProbePanel.jsx
// Full-width bottom panel for coding interview probes.
// Supports two modes:
//   1. Auto-probe (default): probes appear on a timer, spoken via VoiceQuestionPlayer
//   2. Practice mode: user clicks a probe, types/records an answer, gets feedback
// Also has an auto-accelerate toggle for faster probe progression.

import React, { useState } from 'react';
import { VoiceQuestionPlayer } from '../shared/VoiceQuestionPlayer';
import { EvidenceCard } from '../shared/EvidenceCard';
import {
  ChevronDown, ChevronUp, CheckCircle2, Volume2, MessageSquare,
  Zap, PenLine, Send, Loader2, X,
} from 'lucide-react';

export const ProbePanel = ({
  probes = [],
  activeProbeIndex = -1,
  persona = 'friendly',
  questionTitle = '',
  // Practice mode props
  practiceMode = false,
  onTogglePractice = () => {},
  // Auto-accelerate props
  autoAccelerate = false,
  onToggleAccelerate = () => {},
  // Practice answer state
  practiceProbeIndex = -1,
  onSelectProbe = () => {},
  practiceAnswer = '',
  onAnswerChange = () => {},
  onSubmitPractice = () => {},
  isEvaluating = false,
  practiceFeedback = null,
  onClearFeedback = () => {},
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!probes.length) return null;

  const activeProbe =
    activeProbeIndex >= 0 && activeProbeIndex < probes.length
      ? probes[activeProbeIndex]
      : null;

  const personaColor =
    persona === 'strict' ? 'border-warning/30' : 'border-success/30';
  const personaAccent =
    persona === 'strict' ? 'text-warning' : 'text-success';
  const personaBg =
    persona === 'strict' ? 'bg-warning/10' : 'bg-success/10';

  return (
    <div className={`border ${personaColor} rounded-lg overflow-hidden surface-text bg-surface/60`}>
      {/* Collapsible header bar */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:surface-text bg-surface-hover/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className={personaAccent} />
          <span className="text-sm font-semibold text-text-primary">Interviewer</span>
          {questionTitle && (
            <span className="text-xs text-text-muted hidden sm:inline">
              — {questionTitle}
            </span>
          )}
          {activeProbe && !isExpanded && !practiceMode && (
            <span className="text-xs text-text-muted truncate max-w-md ml-2">
              {activeProbe}
            </span>
          )}
          {practiceMode && !isExpanded && (
            <span className="text-xs text-icon-active ml-2">Practice mode active</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-accelerate toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleAccelerate(); }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
              autoAccelerate
                ? 'bg-warning/20 text-warning ring-1 ring-warning/30'
                : 'surface-text bg-surface-hover/50 text-text-muted hover:text-text-muted'
            }`}
            title={autoAccelerate ? 'Probes appear faster (click to slow down)' : 'Speed up probe timing'}
          >
            <Zap size={12} />
            <span className="hidden sm:inline">{autoAccelerate ? 'Fast' : 'Normal'}</span>
          </button>

          {/* Practice mode toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePractice(); }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
              practiceMode
                ? 'bg-text-primary/20 text-text-primary ring-1 ring-border-theme'
                : 'surface-text bg-surface-hover/50 text-text-muted hover:text-text-muted'
            }`}
            title={practiceMode ? 'Exit practice mode' : 'Practice probes manually'}
          >
            <PenLine size={12} />
            <span className="hidden sm:inline">{practiceMode ? 'Practicing' : 'Practice'}</span>
          </button>

          {activeProbe && !isExpanded && !practiceMode && (
            <Volume2 size={14} className={`${personaAccent} animate-pulse`} />
          )}
          <span className="text-xs text-text-muted">
            {activeProbeIndex >= 0 ? `${activeProbeIndex + 1}/${probes.length}` : `0/${probes.length}`}
          </span>
          {isExpanded ? (
            <ChevronDown size={16} className="text-text-muted" />
          ) : (
            <ChevronUp size={16} className="text-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t">
          {/* === Practice Mode === */}
          {practiceMode ? (
            <div className="pt-3 space-y-3">
              <p className="text-xs text-text-primary/80">
                Click a probe below to practice answering it. Type your response and get instant feedback.
              </p>

              {/* Probe selector chips */}
              <div className="flex flex-wrap gap-2">
                {probes.map((probe, idx) => {
                  const isSelected = idx === practiceProbeIndex;
                  const isDone = practiceFeedback?.[idx];
                  return (
                    <button
                      key={idx}
                      onClick={() => onSelectProbe(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                        isSelected
                          ? 'bg-text-primary/20 text-text-primary ring-1 ring-border-theme font-medium'
                          : isDone
                            ? 'bg-success/10 text-success ring-1 ring-success/20'
                            : 'surface-text bg-surface-hover/40 text-text-muted hover:surface-text bg-surface-hover/60 hover:text-text-muted'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 size={12} className="text-success" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                      )}
                      <span className={probe.length > 35 ? 'max-w-[200px] truncate' : ''}>
                        {probe.length > 35 ? probe.slice(0, 35) + '...' : probe}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Practice answer area */}
              {practiceProbeIndex >= 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-text-primary font-medium">
                    {probes[practiceProbeIndex]}
                  </p>
                  <textarea
                    value={practiceAnswer}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    placeholder="Type your answer here... Explain your reasoning, approach, or thought process."
                    className="w-full h-24 px-3 py-2 surface-text bg-surface-hover/60  rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-border-strong focus:border-border-strong resize-none"
                    disabled={isEvaluating}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">
                      {practiceAnswer.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onSubmitPractice(practiceProbeIndex)}
                      disabled={!practiceAnswer.trim() || isEvaluating}
                      isLoading={isEvaluating}
                    >
                      {isEvaluating ? (
                        <><Loader2 size={14} className="animate-spin mr-1" /> Evaluating...</>
                      ) : (
                        <><Send size={14} className="mr-1" /> Submit Answer</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Practice feedback */}
              {practiceFeedback && practiceProbeIndex >= 0 && practiceFeedback[practiceProbeIndex] && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-primary">Feedback</span>
                    <button
                      onClick={onClearFeedback}
                      className="text-xs text-text-muted hover:text-text-muted"
                    >
                      Dismiss
                    </button>
                  </div>
                  <EvidenceCard evaluation={practiceFeedback[practiceProbeIndex]} />
                </div>
              )}
            </div>
          ) : (
            /* === Auto-Probe Mode (default) === */
            <>
              {/* Active probe — spoken aloud via VoiceQuestionPlayer */}
              {activeProbe && (
                <div className="pt-3">
                  <VoiceQuestionPlayer text={activeProbe} language="english" />
                </div>
              )}

              {/* Probe chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {probes.map((probe, idx) => {
                  const isActive = idx === activeProbeIndex;
                  const isPast = idx < activeProbeIndex;
                  const isFuture = idx > activeProbeIndex;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                        isActive
                          ? `${personaBg} ${personaAccent} font-medium ring-1 ${personaColor}`
                          : isPast
                            ? 'surface-text bg-surface-hover/60 text-text-muted'
                            : 'surface-text bg-surface-hover/30 text-text-muted'
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 size={12} className="text-text-muted" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                      )}
                      <span className={isFuture ? 'opacity-50' : ''}>
                        {probe.length > 40 ? probe.slice(0, 40) + '...' : probe}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Accelerate indicator */}
              {autoAccelerate && (
                <p className="text-xs text-warning/70 flex items-center gap-1">
                  <Zap size={11} />
                  Probes appearing at accelerated pace (15s / 30s intervals)
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Inline Button to avoid circular import issues
const Button = ({ variant, size, onClick, disabled, isLoading, children }) => (
  <button
    onClick={onClick}
    disabled={disabled || isLoading}
    className={`inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors
      ${variant === 'primary'
        ? 'bg-text-primary text-bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
        : 'surface-text bg-surface-hover text-text-muted hover:bg-bg-hover'}
      ${size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2'}
    `}
  >
    {children}
  </button>
);

export default ProbePanel;
