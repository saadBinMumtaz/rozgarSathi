import React, { useState } from 'react';
import { Button } from '../design-system/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { ScoreRing } from '../design-system/ScoreRing';
import PageHeader from '../components/shared/PageHeader';
import { ThemeToggle } from '../design-system/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export const ModeSelection = ({ jdAnalysis, onSelectMode, onNavigate, language, setLanguage, isDark }) => {
  const { logout } = useAuth();
  const [selectedMode, setSelectedMode] = useState(null);

  if (!jdAnalysis) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-12 flex flex-col items-center justify-center">
        <p className="text-text-muted mb-4">No Job Description analysis found.</p>
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
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Navigation Header */}
      <PageHeader
        isDark={isDark}
        onNavigate={onNavigate}
        currentPage="mode-selection"
        isAuthenticated={true}
        onLogout={() => { logout(); onNavigate('landing'); }}
        extraRightContent={
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-1 surface-text bg-surface rounded-lg px-2 py-1">
              <Button
                variant={language === 'english' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('english')}
                className="text-xs"
              >
                EN
              </Button>
              <Button
                variant={language === 'urdu' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('urdu')}
                className="text-xs"
              >
                اردو
              </Button>
            </div>
            <Badge variant="success">Step 2 of 2</Badge>
          </div>
        }
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 md:px-12 pb-12 space-y-8">
        {/* Extracted JD Analysis Summary Card */}
        <Card className="surface-text bg-surface">
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
              <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">{role}</h2>
              <p className="text-xs text-text-muted">Extracted & Persisted in MongoDB</p>
            </div>

            <div className="flex items-center gap-4 surface-text bg-surface p-4 rounded-xl ">
              <ScoreRing score={10} max={10} size={50} strokeWidth={5} label="" />
              <div>
                <div className="text-xs font-semibold text-text-muted">Target Skills Extracted</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {skills.slice(0, 5).map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 surface-text bg-surface-hover text-[11px] rounded text-text-primary font-mono">
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
          <h3 className="text-xl font-bold text-text-primary">Select Interview Mode</h3>
          <p className="text-sm text-text-muted">
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
                      ? 'border-border-strong surface-text bg-surface-hover ring-2 ring-border-strong shadow-2xl'
                      : 'hover:border-border-theme'
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
                    <p className="text-xs text-text-muted leading-relaxed">{m.description}</p>
                    
                    {m.focusList.length > 0 && (
                      <div className="pt-2 border-t">
                        <span className="text-[11px] font-semibold text-text-muted block mb-1.5">
                          Target Focus Areas:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {m.focusList.map((f, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 surface-text bg-surface-hover text-[10px] text-text-muted rounded"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <div className="mt-4 pt-4 border-t">
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
