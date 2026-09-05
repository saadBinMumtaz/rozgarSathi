import React, { useState } from 'react';
import { Button } from '../design-system/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { ScoreRing } from '../design-system/ScoreRing';
import { ArrowLeft } from 'lucide-react';
import { t } from '../i18n/translations';

export const ModeSelection = ({ jdAnalysis, onSelectMode, onNavigate, language, setLanguage }) => {
  const [selectedMode, setSelectedMode] = useState(null);

  const L = (key) => t(key, language);

  if (!jdAnalysis) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary p-12 flex flex-col items-center justify-center">
        <p className="text-text-muted mb-4">{L('modeSelection.noJD')}</p>
        <Button onClick={() => onNavigate('jd-input')}>{L('modeSelection.goToJD')}</Button>
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
      image: '/mode-behavioral.png',
      title: L('modeSelection.behavioral.title'),
      subtitle: L('modeSelection.behavioral.subtitle'),
      badge: L('modeSelection.behavioral.badge'),
      badgeVariant: 'primary',
      description: L('modeSelection.behavioral.desc'),
      focusList: behavioralFocus,
    },
    {
      id: 'technical',
      image: '/mode-technical.png',
      title: L('modeSelection.technical.title'),
      subtitle: L('modeSelection.technical.subtitle'),
      badge: L('modeSelection.technical.badge'),
      badgeVariant: 'info',
      description: L('modeSelection.technical.desc'),
      focusList: technicalFocus,
    },
    {
      id: 'coding',
      image: '/mode-coding.png',
      title: L('modeSelection.coding.title'),
      subtitle: L('modeSelection.coding.subtitle'),
      badge: L('modeSelection.coding.badge'),
      badgeVariant: 'success',
      description: L('modeSelection.coding.desc'),
      focusList: skills.slice(0, 4),
    },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col page-enter">
      {/* Simple top bar with back button and language toggle */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('jd-input')}
          className="text-text-muted hover:text-text-primary"
        >
          <ArrowLeft size={16} className="mr-1" /> {L('modeSelection.backToJD')}
        </Button>
        <div className="flex items-center gap-1 bg-surface surface-text rounded-lg px-2 py-1">
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
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 md:px-12 pb-12 space-y-8">
        {/* Extracted JD Analysis Summary Card */}
        <Card className="surface-text bg-surface animate-slide-up stagger-1">
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
                  {L('modeSelection.confidence')} {seniorityConfidence}
                </Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">{role}</h2>
              <p className="text-xs text-text-muted">{L('modeSelection.extracted')}</p>
            </div>

            <div className="flex items-center gap-4 surface-text bg-surface p-4 rounded-xl ">
              <ScoreRing score={10} max={10} size={50} strokeWidth={5} label="" />
              <div>
                <div className="text-xs font-semibold text-text-muted">{L('modeSelection.targetSkills')}</div>
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
        <div className="space-y-1 animate-slide-up stagger-2">
          <h3 className="text-xl font-bold text-text-primary">{L('modeSelection.title')}</h3>
          <p className="text-sm text-text-muted">
            {L('modeSelection.subtitle')}
          </p>
        </div>

        {/* Mode Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((m, idx) => {
            const isSelected = selectedMode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`cursor-pointer transition-all duration-200 animate-slide-up ${
                  isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                }`}
                style={{ animationDelay: `${180 + idx * 60}ms` }}
              >
                <Card
                  className={`h-full flex flex-col justify-between ${
                    isSelected
                      ? 'border-border-strong surface-text bg-surface-hover ring-2 ring-border-strong shadow-2xl'
                      : 'hover:border-border-theme'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <img src={m.image} alt={m.title} className="w-full h-auto object-contain max-h-44" />
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    <p className="text-xs text-text-muted leading-relaxed">{m.description}</p>
                    
                    {m.focusList.length > 0 && (
                      <div className="pt-2 border-t">
                        <span className="text-[11px] font-semibold text-text-muted block mb-1.5">
                          {L('modeSelection.targetFocus')}
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
                      }}
                    >
                      {isSelected ? L('modeSelection.selected') : L('modeSelection.selectMode')}
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
              {L('modeSelection.launch')} {modes.find((m) => m.id === selectedMode)?.title} →
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ModeSelection;
