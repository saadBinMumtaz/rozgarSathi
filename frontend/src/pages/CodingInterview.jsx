// frontend/src/pages/CodingInterview.jsx
// Live coding interview page — Day 4.
// One curated question per session, Monaco editor, sandboxed judge feedback.
// Distinct readable states for empty code / syntax error / timeout (via
// TestResultPanel's executionError rendering). Per-test feedback only —
// no aggregate "N/M passed" summary anywhere.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Skeleton } from '../design-system/Skeleton';
import { MonacoEditorPanel } from '../components/coding/MonacoEditorPanel';
import { TestResultPanel } from '../components/coding/TestResultPanel';
import { LanguageSelector } from '../components/coding/LanguageSelector';
import { EvidenceCard } from '../components/shared/EvidenceCard';
import { useCodeExecution } from '../hooks/useCodeExecution';
import { apiClient } from '../api/client';
import { ArrowLeft, Play, Send, Clock, MessageSquare, Timer } from 'lucide-react';

const DIFFICULTY_VARIANT = { easy: 'success', medium: 'warning', hard: 'destructive' };

const formatElapsed = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const CodingInterview = ({ jdAnalysisId, onNavigate }) => {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isSettingUp, setIsSettingUp] = useState(true);
  const [setupError, setSetupError] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const {
    isRunning,
    isSubmitting,
    publicTestResults,
    hiddenTestResults,
    executionError,
    evaluation,
    networkError,
    runTests,
    submitSolution,
  } = useCodeExecution();

  // Soft timer — informational only, never interrupts the candidate.
  useEffect(() => {
    if (isSettingUp || isSubmitted) return undefined;
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [isSettingUp, isSubmitted]);

  // Session setup: create session, then fetch and link a curated question.
  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      setIsSettingUp(true);
      setSetupError(null);
      try {
        console.log('[CodingInterview] Creating session...');
        const session = await apiClient.createSession('coding', jdAnalysisId);
        if (cancelled) return;
        console.log('[CodingInterview] Session created:', session);
        console.log('[CodingInterview] Fetching question with sessionId:', session.sessionId);
        const q = await apiClient.getCodingQuestion({ sessionId: session.sessionId });
        if (cancelled) return;
        console.log('[CodingInterview] Question fetched:', q.id);
        setSessionId(session.sessionId);
        setQuestion(q);
        setCode(q.starterCode || '');
      } catch (err) {
        console.error('[CodingInterview] Setup error:', err);
        if (!cancelled) setSetupError(err.message || 'Failed to start the coding session');
      } finally {
        // Always clear loading state — even if cancelled, we don't want to hang.
        setIsSettingUp(false);
      }
    };
    setup();
    return () => {
      cancelled = true;
    };
  }, [jdAnalysisId]);

  const handleRun = useCallback(async () => {
    try {
      await runTests(sessionId, code, language);
    } catch {
      /* surfaced via hook state */
    }
  }, [sessionId, code, language, runTests]);

  const handleSubmit = useCallback(async () => {
    try {
      const result = await submitSolution(sessionId, code, language);
      if (!result.executionError) setIsSubmitted(true);
    } catch {
      /* surfaced via hook state */
    }
  }, [sessionId, code, language, submitSolution]);

  // --- Loading / setup error states -------------------------------------------
  if (isSettingUp) {
    return (
      <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <p className="text-sm text-slate-500 text-center">Preparing your coding challenge…</p>
      </div>
    );
  }

  if (setupError || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-rose-500/30">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-rose-300">{setupError || 'Failed to load the coding challenge. Please try again.'}</p>
            <Button variant="secondary" onClick={() => onNavigate('mode-selection')}>
              Back to mode selection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Completion screen -------------------------------------------------------
  if (isSubmitted && evaluation) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">Interview Complete</h1>
          <Badge variant="secondary">
            <Clock size={12} className="mr-1 inline" />
            {formatElapsed(elapsed)}
          </Badge>
        </div>
        <p className="text-sm text-slate-400">
          Question: <span className="text-slate-200 font-medium">{question.title}</span> — your
          solution was judged on hidden test cases.
        </p>
        <EvidenceCard evaluation={evaluation} />
        {hiddenTestResults && hiddenTestResults.length > 0 && (
          <TestResultPanel title="Hidden Test Results" results={hiddenTestResults} />
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => onNavigate('mode-selection')}>
            Practice another mode
          </Button>
          <Button variant="primary" onClick={() => onNavigate('landing')}>
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  // --- Active interview ----------------------------------------------------------
  return (
    <div className="min-h-screen p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('mode-selection')}>
            <ArrowLeft size={16} className="mr-1" /> Exit
          </Button>
          <h1 className="text-lg font-semibold text-slate-100">Live Coding Interview</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Timer size={15} />
          <span className="font-mono">{formatElapsed(elapsed)}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Left: question statement */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-700 bg-slate-900/50">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">{question.title}</CardTitle>
                <Badge variant={DIFFICULTY_VARIANT[question.difficulty] || 'secondary'}>
                  {question.difficulty}
                </Badge>
              </div>
              <CardDescription>{question.topic}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-slate-300 leading-relaxed">{question.statement}</p>

              {question.examples?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase mb-1.5">
                    Examples
                  </div>
                  <div className="space-y-1.5">
                    {question.examples.map((ex, i) => (
                      <div key={i} className="bg-slate-800/60 rounded-md px-3 py-2 font-mono text-xs">
                        <div className="text-slate-400">
                          input&nbsp;&nbsp;= {ex.input}
                        </div>
                        <div className="text-slate-400">
                          output = {ex.output}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {question.constraints?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase mb-1.5">
                    Constraints
                  </div>
                  <ul className="space-y-0.5">
                    {question.constraints.map((c, i) => (
                      <li key={i} className="text-slate-400 font-mono text-xs list-disc ml-4">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/60 rounded-md px-3 py-2">
                  <span className="text-slate-500">Expected time:</span>{' '}
                  <span className="text-slate-300 font-mono">{question.expectedTimeComplexity}</span>
                </div>
                <div className="bg-slate-800/60 rounded-md px-3 py-2">
                  <span className="text-slate-500">Expected space:</span>{' '}
                  <span className="text-slate-300 font-mono">{question.expectedSpaceComplexity}</span>
                </div>
              </div>

              {question.interviewerProbes?.length > 0 && (
                <div className="border-t border-slate-800 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase mb-1.5">
                    <MessageSquare size={13} /> The interviewer may ask
                  </div>
                  <ul className="space-y-0.5">
                    {question.interviewerProbes.map((probe, i) => (
                      <li key={i} className="text-slate-400 text-xs list-disc ml-4">
                        {probe}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: editor + results */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <LanguageSelector value={language} onChange={setLanguage} />
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleRun}
                isLoading={isRunning}
                disabled={isRunning || isSubmitting}
              >
                <Play size={14} className="mr-1.5" /> Run Tests
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                disabled={isRunning || isSubmitting}
              >
                <Send size={14} className="mr-1.5" /> Submit Solution
              </Button>
            </div>
          </div>

          <MonacoEditorPanel value={code} onChange={setCode} height="420px" />

          {networkError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {networkError}
            </div>
          )}

          <TestResultPanel
            title="Public Test Results"
            results={publicTestResults || []}
            executionError={executionError}
            isEmpty={!publicTestResults && !executionError}
            isExecuting={isRunning}
          />
        </div>
      </div>
    </div>
  );
};

export default CodingInterview;
