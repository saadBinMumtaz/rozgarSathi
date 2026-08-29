// frontend/src/pages/CodingInterview.jsx
// Live coding interview page — Day 4 + Day 5 overhaul.
// 2-column layout (question + editor), bottom probe panel, auto-save,
// keyboard shortcuts, submit confirmation, follow-up prompts, reset code.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Skeleton } from '../design-system/Skeleton';
import { MonacoEditorPanel } from '../components/coding/MonacoEditorPanel';
import { TestResultPanel } from '../components/coding/TestResultPanel';
import { LanguageSelector } from '../components/coding/LanguageSelector';
import { EvidenceCard } from '../components/shared/EvidenceCard';
import { ProbePanel } from '../components/coding/ProbePanel';
import { useCodeExecution } from '../hooks/useCodeExecution';
import { apiClient } from '../api/client';
import {
  ArrowLeft, Play, Send, Clock, Timer, RotateCcw, Users, User,
  CheckCircle2, AlertTriangle, Lightbulb, Eye, EyeOff, X,
} from 'lucide-react';

const DIFFICULTY_VARIANT = { easy: 'success', medium: 'warning', hard: 'destructive' };
const AUTOSAVE_KEY_PREFIX = 'rozgar-sathi-coding-code-';

const formatElapsed = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const CodingInterview = ({ jdAnalysisId, onNavigate, userId }) => {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('');
  const [language] = useState('javascript');
  const [isSettingUp, setIsSettingUp] = useState(true);
  const [setupError, setSetupError] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [persona, setPersona] = useState('friendly');
  const [activeProbeIndex, setActiveProbeIndex] = useState(-1);
  const [codingReport, setCodingReport] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReviewCode, setShowReviewCode] = useState(false);
  const [resetToast, setResetToast] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // Practice mode state
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceProbeIndex, setPracticeProbeIndex] = useState(-1);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [practiceFeedback, setPracticeFeedback] = useState({});
  const [isEvaluatingProbe, setIsEvaluatingProbe] = useState(false);
  // Auto-accelerate state
  const [autoAccelerate, setAutoAccelerate] = useState(false);
  const timerRef = useRef(null);
  const probeTimerRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const submittedCodeRef = useRef('');

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

  // --- Soft timer (informational only) ---
  useEffect(() => {
    if (isSettingUp || isSubmitted) return undefined;
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [isSettingUp, isSubmitted]);

  // --- Session setup ---
  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      setIsSettingUp(true);
      setSetupError(null);
      try {
        const session = await apiClient.createSession('coding', jdAnalysisId, userId);
        if (cancelled) return;
        const q = await apiClient.getCodingQuestion({ sessionId: session.sessionId });
        if (cancelled) return;
        setSessionId(session.sessionId);
        setQuestion(q);

        // Restore auto-saved code if available
        const savedKey = AUTOSAVE_KEY_PREFIX + session.sessionId;
        try {
          const savedCode = localStorage.getItem(savedKey);
          setCode(savedCode || q.starterCode || '');
        } catch {
          setCode(q.starterCode || '');
        }
      } catch (err) {
        console.error('[CodingInterview] Setup error:', err);
        if (!cancelled) setSetupError(err.message || 'Failed to start the coding session');
      } finally {
        setIsSettingUp(false);
      }
    };
    setup();
    return () => { cancelled = true; };
  }, [jdAnalysisId]);

  // --- Auto-save code to localStorage (debounced 500ms) ---
  useEffect(() => {
    if (!sessionId || isSubmitted) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY_PREFIX + sessionId, code);
      } catch {}
    }, 500);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [code, sessionId, isSubmitted]);

  // --- Run tests handler ---
  const handleRun = useCallback(async () => {
    try { await runTests(sessionId, code, language); } catch { /* surfaced via hook */ }
  }, [sessionId, code, language, runTests]);

  // --- Submit handler (called after confirmation) ---
  const handleConfirmSubmit = useCallback(async () => {
    setSubmitError(null);
    try {
      const result = await submitSolution(sessionId, code, language);
      // Mark submitted regardless of executionError so user sees results/error screen
      setIsSubmitted(true);
      submittedCodeRef.current = code;
      if (result.codingReport) setCodingReport(result.codingReport);
      try { localStorage.removeItem(AUTOSAVE_KEY_PREFIX + sessionId); } catch {}
      setShowConfirmModal(false);
    } catch (err) {
      // Network or server error — keep modal open so user can retry
      console.error('[CodingInterview] Submit failed:', err);
      setSubmitError(err.message || 'Submission failed. Please try again.');
    }
  }, [sessionId, code, language, submitSolution]);

  // --- Reset code to starter ---
  const handleResetCode = useCallback(() => {
    if (question?.starterCode) {
      setCode(question.starterCode);
      setResetToast(true);
      setTimeout(() => setResetToast(false), 2000);
    }
  }, [question]);

  // --- Practice mode handlers ---
  const handleTogglePractice = useCallback(() => {
    setPracticeMode(prev => !prev);
  }, []);

  const handleSelectProbe = useCallback((idx) => {
    setPracticeProbeIndex(idx);
    setPracticeAnswer('');
  }, []);

  const handleAnswerChange = useCallback((val) => {
    setPracticeAnswer(val);
  }, []);

  const handleSubmitPractice = useCallback(async (probeIdx) => {
    if (!practiceAnswer.trim()) return;
    setIsEvaluatingProbe(true);
    try {
      const result = await apiClient.evaluateProbeAnswer({
        sessionId,
        probeText: question.interviewerProbes[probeIdx],
        answer: practiceAnswer,
        questionTitle: question.title || '',
        language: 'english',
      });
      if (result.evaluation) {
        setPracticeFeedback(prev => ({ ...prev, [probeIdx]: result.evaluation }));
      }
    } catch (err) {
      console.error('[CodingInterview] Probe evaluation failed:', err);
    } finally {
      setIsEvaluatingProbe(false);
    }
  }, [sessionId, practiceAnswer, question]);

  const handleClearFeedback = useCallback(() => {
    setPracticeFeedback({});
  }, []);

  const handleToggleAccelerate = useCallback(() => {
    setAutoAccelerate(prev => !prev);
  }, []);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSubmitted || isSettingUp) return;
      // Ctrl/Cmd + Enter = Run Tests
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleRun();
      }
      // Ctrl/Cmd + Shift + Enter = Submit (opens confirmation)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        setShowConfirmModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun, isSubmitted, isSettingUp]);

  // --- Probe timing: first at 30s (15s accelerated), then every 60s (15s/30s accelerated) ---
  // Paused when practice mode is active so user can focus on answering.
  useEffect(() => {
    if (!question?.interviewerProbes?.length || isSubmitted || practiceMode) return undefined;
    const delay = autoAccelerate ? 15000 : 30000;
    const startTimer = setTimeout(() => setActiveProbeIndex(0), delay);
    return () => clearTimeout(startTimer);
  }, [question?.interviewerProbes, isSubmitted, practiceMode, autoAccelerate]);

  useEffect(() => {
    if (activeProbeIndex < 0 || isSubmitted || practiceMode) return undefined;
    const probes = question?.interviewerProbes || [];
    if (activeProbeIndex >= probes.length - 1) return undefined;
    const interval = autoAccelerate ? 15000 : 60000;
    const timer = setTimeout(() => {
      setActiveProbeIndex((prev) => Math.min(prev + 1, probes.length - 1));
    }, interval);
    probeTimerRef.current = timer;
    return () => clearTimeout(timer);
  }, [activeProbeIndex, question?.interviewerProbes, isSubmitted, practiceMode, autoAccelerate]);

  // --- Cleanup on navigation away ---
  useEffect(() => {
    const handleCleanup = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
      setActiveProbeIndex(-1);
    };
    window.addEventListener('rozgar:interview-cleanup', handleCleanup);
    return () => window.removeEventListener('rozgar:interview-cleanup', handleCleanup);
  }, []);

  // --- Public test summary for confirmation modal ---
  const publicTestSummary = publicTestResults
    ? `${publicTestResults.filter(t => t.passed).length}/${publicTestResults.length} public tests passed`
    : null;

  // --- Loading / setup error states ---
  if (isSettingUp) {
    return (
      <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <p className="text-sm text-slate-500 text-center">Preparing your coding challenge...</p>
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

  // --- Completion screen (shown after submission regardless of evaluation) ---
  if (isSubmitted) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
        {/* Success header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 mb-2">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Interview Complete</h1>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Clock size={14} /> {formatElapsed(elapsed)}
            </span>
            {publicTestSummary && <span>{publicTestSummary}</span>}
          </div>
        </div>

        <p className="text-sm text-slate-400 text-center">
          Question: <span className="text-slate-200 font-medium">{question.title}</span> — your
          solution was judged on hidden test cases.
        </p>

        {evaluation ? (
          <EvidenceCard evaluation={evaluation} />
        ) : (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400">
              {executionError
                ? 'Your solution encountered an error during evaluation. See details below.'
                : 'Submission recorded. Evaluation is being processed.'}
            </p>
          </div>
        )}

        {/* Coding report dimensions */}
        {codingReport && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Coding Report</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Correctness', value: codingReport.correctness },
                { label: 'Complexity', value: codingReport.complexity },
                { label: 'Code Quality', value: codingReport.codeQuality },
                { label: 'Reasoning', value: codingReport.reasoning },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className={`text-2xl font-bold ${
                    value >= 8 ? 'text-emerald-400' : value >= 5 ? 'text-amber-400' : 'text-rose-400'
                  }`}>{value}/10</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden test results */}
        {hiddenTestResults && hiddenTestResults.length > 0 && (
          <TestResultPanel title="Hidden Test Results" results={hiddenTestResults} />
        )}

        {/* Review your code toggle */}
        <div>
          <button
            onClick={() => setShowReviewCode(!showReviewCode)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showReviewCode ? <EyeOff size={14} /> : <Eye size={14} />}
            {showReviewCode ? 'Hide your code' : 'Review your submitted code'}
          </button>
          {showReviewCode && (
            <div className="mt-3">
              <MonacoEditorPanel
                value={submittedCodeRef.current}
                onChange={() => {}}
                height="300px"
                readOnly
                language={language}
              />
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => onNavigate('results')}>
            View Results
          </Button>
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

  // --- Active interview ---
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent);
  const modKey = isMac ? 'Cmd' : 'Ctrl';

  return (
    <div className="min-h-screen p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('mode-selection')}>
            <ArrowLeft size={16} className="mr-1" /> Exit
          </Button>
          <h1 className="text-lg font-semibold text-slate-100">Live Coding Interview</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Persona toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPersona('friendly')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                persona === 'friendly'
                  ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Friendly Mentor — encouraging tone, more hints"
            >
              <Users size={12} /> Mentor
            </button>
            <button
              onClick={() => setPersona('strict')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                persona === 'strict'
                  ? 'bg-amber-500/10 text-amber-400 font-medium'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Strict Panel — terse, less forgiving"
            >
              <User size={12} /> Panel
            </button>
          </div>
          {/* Timer */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Timer size={15} />
            <span className="font-mono">{formatElapsed(elapsed)}</span>
          </div>
        </div>
      </div>

      {/* Main 2-column grid */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Left: Question panel */}
        <div className="lg:col-span-5 space-y-4">
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
              {/* Statement */}
              <p className="text-slate-300 leading-relaxed">{question.statement}</p>

              {/* Examples */}
              {question.examples?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase mb-2">
                    Examples
                  </div>
                  <div className="space-y-2">
                    {question.examples.map((ex, i) => (
                      <div key={i} className="bg-slate-800/60 rounded-lg px-4 py-3 font-mono text-xs space-y-1">
                        <div>
                          <span className="text-slate-500">Input:  </span>
                          <span className="text-slate-200">{ex.input}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Output: </span>
                          <span className="text-emerald-300">{ex.output}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Constraints */}
              {question.constraints?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase mb-2">
                    Constraints
                  </div>
                  <ul className="space-y-1">
                    {question.constraints.map((c, i) => (
                      <li key={i} className="text-slate-400 font-mono text-xs flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Complexity hints */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Time: </span>
                  <span className="text-slate-300 font-mono">{question.expectedTimeComplexity}</span>
                </div>
                <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Space: </span>
                  <span className="text-slate-300 font-mono">{question.expectedSpaceComplexity}</span>
                </div>
              </div>

              {/* Follow-up challenges */}
              {question.followUpPrompts?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase mb-2">
                    <Lightbulb size={12} className="text-amber-400" />
                    Think Deeper
                  </div>
                  <div className="space-y-1.5">
                    {question.followUpPrompts.map((prompt, i) => (
                      <div
                        key={i}
                        className="text-xs text-slate-400 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2"
                      >
                        {prompt}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Editor + controls */}
        <div className="lg:col-span-7 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <LanguageSelector value={language} />
              <button
                onClick={handleResetCode}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Reset code to starter template"
              >
                <RotateCcw size={13} /> Reset
              </button>
              {resetToast && (
                <span className="text-xs text-emerald-400 animate-pulse">Code reset!</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleRun}
                isLoading={isRunning}
                disabled={isRunning || isSubmitting}
                title={`Run public tests (${modKey}+Enter)`}
              >
                <Play size={14} className="mr-1.5" /> Run Tests
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowConfirmModal(true)}
                isLoading={isSubmitting}
                disabled={isRunning || isSubmitting}
                title={`Submit solution (${modKey}+Shift+Enter)`}
              >
                <Send size={14} className="mr-1.5" /> Submit
              </Button>
            </div>
          </div>

          {/* Monaco editor */}
          <MonacoEditorPanel
            value={code}
            onChange={setCode}
            height="420px"
            language={language}
          />

          {/* Network error */}
          {networkError && (
            <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {networkError}
            </div>
          )}

          {/* Test results */}
          <TestResultPanel
            title="Public Test Results"
            results={publicTestResults || []}
            executionError={executionError}
            isEmpty={!publicTestResults && !executionError}
            isExecuting={isRunning}
          />
        </div>
      </div>

      {/* Bottom probe panel */}
      <ProbePanel
        probes={question?.interviewerProbes || []}
        activeProbeIndex={activeProbeIndex}
        persona={persona}
        questionTitle={question?.title || ''}
        practiceMode={practiceMode}
        onTogglePractice={handleTogglePractice}
        autoAccelerate={autoAccelerate}
        onToggleAccelerate={handleToggleAccelerate}
        practiceProbeIndex={practiceProbeIndex}
        onSelectProbe={handleSelectProbe}
        practiceAnswer={practiceAnswer}
        onAnswerChange={handleAnswerChange}
        onSubmitPractice={handleSubmitPractice}
        isEvaluating={isEvaluatingProbe}
        practiceFeedback={practiceFeedback}
        onClearFeedback={handleClearFeedback}
      />

      {/* Submit confirmation modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">Submit Solution?</h3>
                <p className="text-xs text-slate-400">This will end the interview.</p>
              </div>
            </div>

            {publicTestSummary && (
              <div className="bg-slate-800/60 rounded-lg px-3 py-2 text-sm text-slate-300">
                {publicTestSummary}
              </div>
            )}

            {submitError && (
              <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => { setShowConfirmModal(false); setSubmitError(null); }}
                disabled={isSubmitting}
              >
                <X size={14} className="mr-1" /> Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmSubmit} isLoading={isSubmitting}>
                <Send size={14} className="mr-1" /> Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodingInterview;
