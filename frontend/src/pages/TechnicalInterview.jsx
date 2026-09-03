// frontend/src/pages/TechnicalInterview.jsx
// Technical Q&A interview page — Day 3.
// Reuses VoiceQuestionPlayer.jsx (shared TTS), MicRecorder, TypedFallback.
// Wires DifficultyIndicator and EvidenceCard.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { ProgressBar } from '../design-system/ProgressBar';
import { VoiceQuestionPlayer } from '../components/shared/VoiceQuestionPlayer';
import { MicRecorder } from '../components/behavioral/MicRecorder';
import { TypedFallback } from '../components/behavioral/TypedFallback';
import { EvidenceCard } from '../components/shared/EvidenceCard';
import { DifficultyIndicator } from '../components/technical/DifficultyIndicator';
import { QuestionTraceBadge } from '../components/shared/QuestionTraceBadge';
import { RobotAvatar } from '../components/shared/RobotAvatar';
import { WaveformAnimation } from '../components/shared/WaveformAnimation';
import { TypewriterText } from '../components/shared/TypewriterText';
import { apiClient } from '../api/client';
import { useTabLock } from '../hooks/useTabLock';
import { useSession } from '../hooks/useSession';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { t } from '../i18n/translations';
import { RefreshCw } from 'lucide-react';

export const TechnicalInterview = ({ jdAnalysisId, onNavigate, language = 'english', isUrdu = false, userId, isDark = false, isActive = true }) => {
  const {
    sessionId,
    currentQuestion,
    evaluations,
    followUp,
    nudge,
    isLoading,
    isComplete,
    error,
    createSession,
    createAndFetchFirst,
    answerQuestion,
    resetSession,
    resume,
  } = useSession({ mode: 'technical', userId });

  const [useTypedFallback, setUseTypedFallback] = useState(false);
  const [micTranscript, setMicTranscript] = useState('');
  const [typedTranscript, setTypedTranscript] = useState('');
  const [difficultyInfo, setDifficultyInfo] = useState({ current: 'medium', previous: null, ratingDelta: 0 });
  const [questionCount, setQuestionCount] = useState(0);
  const [urduQuestionText, setUrduQuestionText] = useState(null);
  const [urduFollowUp, setUrduFollowUp] = useState(null);
  const [urduNudge, setUrduNudge] = useState(null);
  const [isTranslatingUrdu, setIsTranslatingUrdu] = useState(false);
  const [urduEvaluations, setUrduEvaluations] = useState([]);
  const [terminationMessage, setTerminationMessage] = useState(null);
  const { isLocked: tabConflict, dismissWarning: dismissTabWarning } = useTabLock(sessionId, 'technical');
  const { speak, cancel, isSpeaking, isSupported: ttsSupported } = useTextToSpeech();

  const L = (key) => t(key, language);
  const MAX_QUESTIONS = 5;
  const initRef = useRef(false); // Prevent duplicate initialization
  const justCreatedRef = useRef(false); // Track when session was just created (to skip resume)

  // Cleanup: stop TTS and speech synthesis when component unmounts or navigating away
  useEffect(() => {
    return () => {
      // Stop any ongoing speech synthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      // Stop any audio playback
      document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      // Dispatch cleanup event for other components
      window.dispatchEvent(new CustomEvent('rozgar:interview-cleanup'));
    };
  }, []);

  // Listen for cleanup event from other components
  useEffect(() => {
    const handleCleanup = () => {
      // Stop any ongoing speech synthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      // Stop any audio playback
      document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
    window.addEventListener('rozgar:interview-cleanup', handleCleanup);
    return () => window.removeEventListener('rozgar:interview-cleanup', handleCleanup);
  }, []);

  // Auto-translate question to Urdu when language is Urdu and question changes
  useEffect(() => {
    if (!isUrdu || !currentQuestion?.questionText) {
      setUrduQuestionText(null);
      return;
    }
    // Already have translation for this question
    if (urduQuestionText) return;

    setIsTranslatingUrdu(true);
    apiClient
      .translateQuestion(currentQuestion.questionText, [], 'urdu')
      .then((result) => setUrduQuestionText(result.questionText))
      .catch((err) => {
        console.error('Question translation failed:', err);
        setUrduQuestionText(currentQuestion.questionText);
      })
      .finally(() => setIsTranslatingUrdu(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.questionId, currentQuestion?.questionText, isUrdu]);

  // Auto-translate the follow-up prompt to Urdu (display + speak) in Urdu mode.
  // Reuses translateQuestion; the null-while-pending gate prevents speaking English first.
  useEffect(() => {
    if (!isUrdu || !followUp) {
      setUrduFollowUp(null);
      return;
    }
    setUrduFollowUp(null);
    setIsTranslatingUrdu(true);
    let cancelled = false;
    apiClient
      .translateQuestion(followUp, [], 'urdu')
      .then((result) => { if (!cancelled) setUrduFollowUp(result.questionText); })
      .catch(() => { if (!cancelled) setUrduFollowUp(followUp); })
      .finally(() => { if (!cancelled) setIsTranslatingUrdu(false); });
    return () => { cancelled = true; };
  }, [followUp, isUrdu]);

  // Auto-translate the invalid-answer nudge to Urdu (display + speak) in Urdu mode.
  // Mirrors the follow-up flow; the null-while-pending gate prevents speaking English
  // before the Urdu translation arrives.
  useEffect(() => {
    if (!isUrdu || !nudge) {
      setUrduNudge(null);
      return;
    }
    setUrduNudge(null);
    setIsTranslatingUrdu(true);
    let cancelled = false;
    apiClient
      .translateQuestion(nudge, [], 'urdu')
      .then((result) => { if (!cancelled) setUrduNudge(result.questionText); })
      .catch(() => { if (!cancelled) setUrduNudge(nudge); })
      .finally(() => { if (!cancelled) setIsTranslatingUrdu(false); });
    return () => { cancelled = true; };
  }, [nudge, isUrdu]);

  // Auto-translate evaluations when interview completes in Urdu mode
  useEffect(() => {
    if (!isUrdu || !isComplete || evaluations.length === 0) {
      setUrduEvaluations([]);
      return;
    }
    let cancelled = false;
    const translate = async () => {
      const translated = [];
      for (const ev of evaluations) {
        try {
          const result = await apiClient.translateEvaluation(ev, 'urdu');
          translated.push(result);
        } catch {
          translated.push(ev);
        }
        if (cancelled) break;
      }
      if (!cancelled) setUrduEvaluations(translated);
    };
    translate();
    return () => { cancelled = true; };
  }, [isUrdu, isComplete, evaluations]);

  // Handle difficulty tracking and termination messages from answer results
  useEffect(() => {
    if (!currentQuestion) return;
    // Update question count when question changes
    setQuestionCount((prev) => {
      const newCount = evaluations.length + (currentQuestion ? 1 : 0);
      return Math.max(prev, newCount);
    });
  }, [currentQuestion, evaluations.length]);

  // Speak the current question/follow-up aloud when it changes
  useEffect(() => {
    if (!currentQuestion) return;
    const speakText = followUp
      ? (isUrdu ? urduFollowUp : followUp)
      : (isUrdu && urduQuestionText ? urduQuestionText : currentQuestion.questionText);
    if (speakText) {
      speak(speakText, language, followUp || currentQuestion.questionText);
    }
    return () => { cancel(); };
  }, [currentQuestion?.questionId, followUp, urduQuestionText, urduFollowUp, isUrdu, language, speak, cancel]);

  // Cancel TTS when page becomes inactive (hidden but still mounted)
  useEffect(() => {
    if (!isActive) {
      cancel();
    }
  }, [isActive, cancel]);

  // Session initialization and resume logic
  useEffect(() => {
    // Prevent duplicate initialization
    if (initRef.current) return;

    if (!sessionId) {
      // No session exists — create a new one and fetch first question atomically
      initRef.current = true;
      justCreatedRef.current = true; // Mark that we just created a session
      createAndFetchFirst('technical', jdAnalysisId, userId, language)
        .then(() => {
          // Session created and first question fetched successfully
          // State will be updated by createAndFetchFirst
        })
        .catch((err) => {
          console.error('Failed to create session:', err);
          initRef.current = false; // Allow retry on failure
          justCreatedRef.current = false;
        });
    } else if (!isComplete && !justCreatedRef.current) {
      // Session exists and was NOT just created — resume it (page refresh recovery)
      initRef.current = true;
      resume().catch((err) => {
        console.error('Failed to resume session:', err);
        resetSession();
        initRef.current = false;
      });
    } else if (justCreatedRef.current) {
      // Session was just created — clear the flag
      justCreatedRef.current = false;
    }

    // Reset init flag when session is cleared (for restart)
    if (!sessionId && !jdAnalysisId) {
      initRef.current = false;
    }
  }, [sessionId, jdAnalysisId, isComplete, createAndFetchFirst, resume, resetSession, userId, language]);

  const submitAnswer = useCallback(async () => {
    // Strict limit: prevent submitting more than MAX_QUESTIONS
    if (questionCount >= MAX_QUESTIONS) {
      return;
    }

    const transcript = useTypedFallback ? typedTranscript.trim() : micTranscript.trim();
    if (!transcript || !sessionId) return;

    setMicTranscript('');
    setTypedTranscript('');
    setUrduQuestionText(null); // Clear for auto-translate of new question

    try {
      const result = await answerQuestion(currentQuestion?.questionId, transcript, language);
      // Handle technical-specific logic: difficulty changes and termination
      if (result?.difficultyChange) {
        setDifficultyInfo({
          current: result.difficultyChange.to,
          previous: result.difficultyChange.from,
          ratingDelta: result.ratingDelta || 0,
        });
      }
      if (result?.terminationReason === 'profanity' && result.message) {
        setTerminationMessage(result.message);
      }
      if (result?.nextAction === 'first_question') {
        setDifficultyInfo({ current: result.nextQuestion.difficulty, previous: null, ratingDelta: 0 });
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  }, [sessionId, currentQuestion, micTranscript, typedTranscript, useTypedFallback, answerQuestion, language, questionCount]);

  const handleResetSession = useCallback(() => {
    resetSession();
    setUrduNudge(null);
    setMicTranscript('');
    setTypedTranscript('');
    setQuestionCount(0);
    setDifficultyInfo({ current: 'medium', previous: null, ratingDelta: 0 });
    setTerminationMessage(null);
    setUrduQuestionText(null);
    setUrduFollowUp(null);
    // Reset init flag to allow re-initialization
    initRef.current = false;
  }, [resetSession]);

  const activeTranscript = useTypedFallback ? typedTranscript : micTranscript;
  const progress = (questionCount / MAX_QUESTIONS) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: isDark ? '#0a0a0a' : '#fafafa', color: isDark ? '#ffffff' : '#111111' }}>
      {/* Top bar: Back + En/UR */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => onNavigate('mode-selection')}
          className="text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: isDark ? '#ffffff' : '#111111' }}
        >
          {L('interview.back')}
        </button>
        <div className="flex items-center gap-3">
          <Badge variant="success">Q{Math.min(questionCount, MAX_QUESTIONS)}/{MAX_QUESTIONS}</Badge>
          <DifficultyIndicator
            current={difficultyInfo.current}
            previous={difficultyInfo.previous}
            ratingDelta={difficultyInfo.ratingDelta}
          />
        </div>
      </div>
  
      {/* Progress bar (subtle) */}
      <div className="px-6">
        <ProgressBar value={progress} label={`${L('interview.progress')}: ${questionCount}/${MAX_QUESTIONS} ${L('interview.questionsLabel')}`} />
      </div>
  
      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-danger/10 rounded-md text-danger text-sm flex items-center justify-between gap-3" role="alert">
          <span>{error.includes('Failed to fetch') || error.includes('network')
            ? L('interview.serverUnreachable')
            : error}</span>
          <Button
            variant="link"
            className="shrink-0 underline text-danger hover:text-danger"
            onClick={() => {
              initRef.current = false;
              handleResetSession();
            }}
          >
            {sessionId ? L('interview.restartInterview') : L('interview.retry')}
          </Button>
        </div>
      )}
  
      {/* Tab conflict warning */}
      {tabConflict && (
        <div className="mx-6 mt-4 p-3 bg-warning/10 rounded-md text-warning text-sm flex items-center justify-between gap-3" role="alert">
          <span>{L('interview.tabConflict')} <button onClick={dismissTabWarning} className="underline font-medium">{L('interview.continueHere')}</button>.</span>
        </div>
      )}
  
      {/* Main immersive stage */}
      {currentQuestion && !isComplete && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          {/* Robot avatar with themed circle */}
          <div
            className="rounded-full flex items-center justify-center relative z-10"
            style={{
              width: 220,
              height: 220,
              backgroundColor: '#ffffff',
              border: `3px solid ${isDark ? '#ffffff' : '#333333'}`,
            }}
          >
            <RobotAvatar
              size={180}
              style={{ color: '#000000' }}
            />
          </div>
  
          {/* Question text with typewriter effect */}
          <div className="mt-8 text-center max-w-2xl min-h-[3.5rem]">
            <p className="text-xl md:text-2xl font-semibold leading-relaxed" style={{ color: isDark ? '#ffffff' : '#111111' }}>
              <TypewriterText
                text={followUp
                  ? ((isUrdu && urduFollowUp) || followUp)
                  : ((isUrdu && urduQuestionText) || currentQuestion.questionText)}
                speed={33}
              />
            </p>
          </div>
  
          {/* Urdu translation indicator */}
          {isUrdu && isTranslatingUrdu && (
            <div className="mt-4 text-xs animate-pulse" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{L('interview.translating')}</div>
          )}
  
          {/* Repeat Question button */}
          <div className="mt-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const speakText = followUp
                  ? ((isUrdu && urduFollowUp) || followUp)
                  : ((isUrdu && urduQuestionText) || currentQuestion.questionText);
                speak(speakText, language, followUp || currentQuestion.questionText);
              }}
              className="flex items-center gap-2"
              style={{ color: isDark ? '#ffffff' : '#111111' }}
            >
              <RefreshCw size={18} />
              {L('interview.repeatQuestion')}
            </Button>
          </div>
  
          {/* Follow-up indicator */}
          {followUp && !currentQuestion?.evaluation && (
            <div className="mt-6 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: isDark ? '#e5e7eb' : '#374151' }}>
              <div className="text-xs font-medium mb-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{L('interview.followUpQuestion')}</div>
              <div className={isUrdu ? 'urdu-text' : ''}>{(isUrdu && urduFollowUp) || followUp}</div>
            </div>
          )}
  
          {/* Nudge feedback */}
          {nudge && (
            <div className={`mt-6 px-4 py-3 rounded-lg text-sm ${isUrdu ? 'urdu-text' : ''}`} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              {!isUrdu && <strong>️ {L('interview.answerNeeded')}</strong>} {(isUrdu && urduNudge) || nudge}
            </div>
          )}
  
          {/* JD traceability badge */}
          {currentQuestion?.matchedTerms && (
            <div className="mt-6">
              <QuestionTraceBadge matchedTerms={currentQuestion.matchedTerms} language={language} />
            </div>
          )}
        </div>
      )}
  
      {/* Answer input area */}
      {currentQuestion && !isComplete && (
        <div className="px-6 pb-8 max-w-2xl mx-auto w-full">
          {/* Voice / Text toggle */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <Button
              variant={useTypedFallback ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => setUseTypedFallback(false)}
            >
              🎤 {L('interview.voice')}
            </Button>
            <Button
              variant={useTypedFallback ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setUseTypedFallback(true)}
            >
              ⌨️ {L('interview.type')}
            </Button>
          </div>
  
          {/* Mic recorder */}
          {!useTypedFallback && (
            <div className="space-y-4">
              <MicRecorder
                isSpeaking={isSpeaking}
                onTranscriptChange={setMicTranscript}
                resetKey={`${currentQuestion?.questionId || ''}|${followUp || ''}`}
                onUnsupported={() => setUseTypedFallback(true)}
                autoStart={!isSpeaking}
                language={language}
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={submitAnswer}
                  disabled={isLoading || isSpeaking || !micTranscript?.trim()}
                  className="flex-1"
                >
                  {isLoading ? L('interview.processing') : L('interview.submitAnswer')}
                </Button>
              </div>
            </div>
          )}
  
          {/* Typed fallback */}
          {useTypedFallback && (
            <TypedFallback
              value={typedTranscript}
              onChange={setTypedTranscript}
              onSubmit={submitAnswer}
              isSpeaking={isSpeaking}
              disabled={isLoading}
            />
          )}
        </div>
      )}

        {/* Completion screen */}
        {isComplete && (() => {
          // Calculate summary statistics
          const totalScore = evaluations.length > 0
            ? evaluations.reduce((sum, e) => sum + (typeof e?.score === 'number' ? e.score : 0), 0)
            : 0;
          const avgScore = evaluations.length > 0 ? Math.round(totalScore / evaluations.length) : 0;
          const highScores = evaluations.filter(e => e?.score >= 70).length;
          const lowScores = evaluations.filter(e => e?.score < 40).length;

          return (
            <div className="flex-1 flex items-center justify-center px-6 py-8">
              <div className="max-w-2xl w-full space-y-6">
                <Card className={terminationMessage ? 'border-danger/30/50' : 'border-success/30'}>
                  <CardContent className="text-center py-8 space-y-4">
                    {terminationMessage ? (
                      <>
                        <div className="text-2xl font-bold text-danger">{L('interview.terminated')}</div>
                        <div className="text-danger text-sm max-w-md mx-auto">{terminationMessage}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-success">{L('interview.technical.complete')}</div>
                        
                        {/* Overall Score Display */}
                        <div className="inline-flex items-center gap-4 surface-text bg-surface-hover rounded-xl px-6 py-4 ">
                          <div className="text-center">
                            <div className={`text-4xl font-bold ${avgScore >= 70 ? 'text-success' : avgScore >= 40 ? 'text-warning' : 'text-danger'}`}>
                              {avgScore}
                            </div>
                            <div className="text-xs text-text-muted uppercase tracking-wide">{L('interview.overallScore')}</div>
                          </div>
                          <div className="h-12 w-px bg-bg-hover"></div>
                          <div className="text-left space-y-1">
                            <div className="text-sm text-text-muted">
                              <span className="text-text-muted">{L('interview.questionsCount')}</span> {evaluations.length}
                            </div>
                            <div className="text-sm text-text-muted">
                              <span className="text-success">✓ {highScores}</span> {L('interview.strongAnswers')}
                            </div>
                            {lowScores > 0 && (
                              <div className="text-sm text-text-muted">
                                <span className="text-danger">⚠ {lowScores}</span> {L('interview.needImprovement')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Performance Summary */}
                        <div className="text-sm text-text-muted max-w-md mx-auto">
                          {avgScore >= 70 
                            ? L('interview.technical.perfGreat')
                            : avgScore >= 40
                            ? L('interview.technical.perfGood')
                            : L('interview.technical.perfPoor')}
                        </div>
                      </>
                    )}
                    <div className="flex justify-center gap-3 mt-4">
                      <Button variant="secondary" onClick={() => onNavigate('results')}>
                        {L('interview.viewResults')}
                      </Button>
                      <Button variant="primary" onClick={() => onNavigate('mode-selection')}>
                        {L('interview.tryAnotherMode')}
                      </Button>
                      <Button variant="secondary" onClick={handleResetSession}>
                        {L('interview.technical.restart')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary of all evaluations */}
                {evaluations.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <span>{L('interview.detailedFeedback')}</span>
                      <span className="text-sm font-normal text-text-muted">({evaluations.length} {L('interview.questionsLabel')})</span>
                    </h3>
                    {evaluations.map((evaluation, idx) => (
                      <EvidenceCard
                        key={idx}
                        evaluation={urduEvaluations[idx] || evaluation}
                        language={language}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Loading state */}
        {isLoading && !currentQuestion && !isComplete && (
          <div className="flex-1 flex items-center justify-center">
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-text-muted">{L('interview.technical.setup')}</div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
};

export default TechnicalInterview;
