import React, { useState } from 'react';
import { Button } from '../design-system/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { ScoreRing } from '../design-system/ScoreRing';

export const ModeSelection = ({ jdAnalysis, onSelectMode, onNavigate, language, setLanguage }) => {
  const [selectedMode, setSelectedMode] = useState(null);

  if (!jdAnalysis) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-12 flex flex-col items-center justify-center">
        <p className="text-slate-400 mb-4">No Job Description analysis found.</p>
        <Button onClick={() => onNavigate('jd-input')}>← Go to JD Input</Button>
      </div>
    );
  }

  const {
    role,
    experienceLevel,
    skills = [],
    behavioralFocus = [],
    technicalFocus = [],
    seniorityConfidence = 'medium',
  } = jdAnalysis;

  const modes = [
    {
      id: 'behavioral',
      icon: '🎤',
      title: 'Behavioral Interview',
      subtitle: 'Communication, STAR Structure & Self-Awareness',
      badge: 'Voice Driven',
      badgeVariant: 'primary',
      description:
        'Fully voice-driven interview round. The AI asks questions aloud and listens to your spoken answers. Focuses on STAR response framework.',
      focusList: behavioralFocus,
    },
    {
      id: 'technical',
      icon: '💻',
      title: 'Technical Q&A',
      subtitle: 'Knowledge Depth & Role-Specific Tech Stack',
      badge: 'Adaptive Difficulty',
      badgeVariant: 'info',
      description:
        'Technical questions derived directly from your target JD tech stack. Difficulty adapts live based on your depth of answer.',
      focusList: technicalFocus,
    },
    {
      id: 'coding',
      icon: '🧩',
      title: 'Live Coding Interview',
      subtitle: 'LeetCode-Style Sandbox & Probing Interviewer',
      badge: 'Judge0 Sandbox',
      badgeVariant: 'success',
      description:
        'Solve real algorithmic problems inside Monaco Editor while the AI interviewer speaks probes aloud in real-time.',
      focusList: skills.slice(0, 4),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col items-center">
      {/* Navigation Header */}
      <header className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-4 mb-8">
        <Button
          variant="link"
          className="text-slate-400 hover:text-white flex items-center gap-2"
          onClick={() => onNavigate('jd-input')}
        >
          ← Edit Job Description
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('results')}
          >
            View Results
          </Button>
          {/* Language Toggle */}
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-500">
              {language === 'urdu' ? 'زبان' : 'Language'}
            </span>
            <Button
              variant={language === 'english' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('english')}
            >
              English
            </Button>
            <Button
              variant={language === 'urdu' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('urdu')}
            >
              {'اردو'}
            </Button>
          </div>
          <Badge variant="success">Step 2 of 2</Badge>
        </div>
      </header>

      <main className="w-full max-w-5xl space-y-8">
        {/* Extracted JD Analysis Summary Card */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-indigo-500/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge variant="primary">{experienceLevel}</Badge>
                <Badge
                  variant={
                    seniorityConfidence === 'high'
                      ? 'success'
                      : seniorityConfidence === 'medium'
                      ? 'warning'
                      : 'destructive'
                  }
                >
                  Confidence: {seniorityConfidence}
                </Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">{role}</h2>
              <p className="text-xs text-slate-400">Extracted & Persisted in MongoDB</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <ScoreRing score={10} max={10} size={50} strokeWidth={5} label="" />
              <div>
                <div className="text-xs font-semibold text-slate-300">Target Skills Extracted</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {skills.slice(0, 5).map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-800 text-[11px] rounded text-indigo-300 font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Section Heading */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white">Select Interview Mode</h3>
          <p className="text-sm text-slate-400">
            Choose the interview round you want to practice. You can complete all three for cross-mode insights.
          </p>
        </div>

        {/* Mode Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((m) => {
            const isSelected = selectedMode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                }`}
              >
                <Card
                  className={`h-full flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/50 shadow-2xl'
                      : 'hover:border-slate-700'
                  }`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-3xl">{m.icon}</span>
                      <Badge variant={m.badgeVariant}>{m.badge}</Badge>
                    </div>
                    <CardTitle className="text-lg">{m.title}</CardTitle>
                    <CardDescription className="text-xs">{m.subtitle}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed">{m.description}</p>
                    
                    {m.focusList.length > 0 && (
                      <div className="pt-2 border-t border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                          Target Focus Areas:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {m.focusList.map((f, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-800/80 text-[10px] text-slate-300 rounded"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <div className="mt-4 pt-4 border-t border-slate-800/60">
                    <Button
                      variant={isSelected ? 'primary' : 'secondary'}
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMode(m.id);
                        onSelectMode(m.id);
                      }}
                    >
                      {isSelected ? 'Selected ✓' : 'Select Mode'}
                    </Button>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Start Session CTA */}
        {selectedMode && (
          <div className="flex justify-end pt-4 animate-fade-in">
            <Button
              size="lg"
              variant="primary"
              onClick={() => onSelectMode(selectedMode)}
            >
              Launch {modes.find((m) => m.id === selectedMode)?.title} →
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ModeSelection;
