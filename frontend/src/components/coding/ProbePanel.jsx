// frontend/src/components/coding/ProbePanel.jsx
// Full-width bottom panel that replaces the cramped sidebar.
// Shows scripted interviewer probes with VoiceQuestionPlayer for the active probe.
// Collapsible — when collapsed, shows a single-line active probe with a speaker icon.

import React, { useState } from 'react';
import { VoiceQuestionPlayer } from '../shared/VoiceQuestionPlayer';
import { ChevronDown, ChevronUp, CheckCircle2, Volume2, MessageSquare } from 'lucide-react';

export const ProbePanel = ({
  probes = [],
  activeProbeIndex = -1,
  persona = 'friendly',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!probes.length) return null;

  const activeProbe =
    activeProbeIndex >= 0 && activeProbeIndex < probes.length
      ? probes[activeProbeIndex]
      : null;

  const personaColor =
    persona === 'strict' ? 'border-amber-500/30' : 'border-emerald-500/30';
  const personaAccent =
    persona === 'strict' ? 'text-amber-400' : 'text-emerald-400';
  const personaBg =
    persona === 'strict' ? 'bg-amber-500/10' : 'bg-emerald-500/10';

  return (
    <div className={`border ${personaColor} rounded-lg overflow-hidden bg-slate-900/60`}>
      {/* Collapsible header bar */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className={personaAccent} />
          <span className="text-sm font-semibold text-slate-200">Interviewer</span>
          {activeProbe && !isExpanded && (
            <span className="text-xs text-slate-400 truncate max-w-md ml-2">
              {activeProbe}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeProbe && !isExpanded && (
            <Volume2 size={14} className={`${personaAccent} animate-pulse`} />
          )}
          <span className="text-xs text-slate-500">
            {activeProbeIndex >= 0 ? `${activeProbeIndex + 1}/${probes.length}` : `0/${probes.length}`}
          </span>
          {isExpanded ? (
            <ChevronDown size={16} className="text-slate-500" />
          ) : (
            <ChevronUp size={16} className="text-slate-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
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
                        ? 'bg-slate-800/60 text-slate-500'
                        : 'bg-slate-800/30 text-slate-600'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 size={12} className="text-slate-500" />
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
        </div>
      )}
    </div>
  );
};

export default ProbePanel;
