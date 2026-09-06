// frontend/src/pages/BehavioralInterview.jsx
// Behavioral interview page — orchestrates voice pipeline, session management,
// answer submission, EvidenceCard, Urdu toggle, and progress tracking.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from '../hooks/useSession';
import { useTabLock } from '../hooks/useTabLock';
import { VoiceQuestionPlayer } from '../components/shared/VoiceQuestionPlayer';
import { MicRecorder } from '../components/behavioral/MicRecorder';
import { TypedFallback } from '../components/behavioral/TypedFallback';
import { FollowUpBubble } from '../components/behavioral/FollowUpBubble';
import { QuestionTraceBadge } from '../components/shared/QuestionTraceBadge';
import { EvidenceCard } from '../components/shared/EvidenceCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { ProgressBar } from '../design-system/ProgressBar';
import { RobotAvatar } from '../components/shared/RobotAvatar';
import { WaveformAnimation } from '../components/shared/WaveformAnimation';
import { InterviewCompletion } from '../components/shared/InterviewCompletion';
import { TypewriterText } from '../components/shared/TypewriterText';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { t } from '../i18n/translations';

const MAX_QUESTIONS = 5;

export const BehavioralInterview = ({ jdAnalysisId, onNavigate, language = 'english', isUrdu = false, userId, isDark = false, isActive = true }) => {
  const {
    sessionId,
    currentQuestion,
    evaluations,
    followUp,
    nudge,
    isLoading,
    isComplete,
    error,
    createAndFetchFirst,
    answerQuestion,
    resetSession,
    resume,
  } = useSession({ mode: 'behavioral', userId });

  const [typedAnswer, setTypedAnswer] = useState('');
  const [micTranscript, setMicTranscript] = useState('');
  const [useTypedFallback, setUseTypedFallback] = useState(false);
  const [urduQuestionText, setUrduQuestionText] = useState(null);
  const [urduNudge, setUrduNudge] = useState(null);
  const [urduFollowUp, setUrduFollowUp] = useState(null);
  const [isTranslatingUrdu, setIsTranslatingUrdu] = useState(false);
  const [urduEvaluations, setUrduEvaluations] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [terminationMessage, setTerminationMessage] = useState(null);
  const { isLocked: tabConflict, dismissWarning: dismissTabWarning } = useTabLock(sessionId, 'behavioral');
  const { speak, cancel, isSpeaking, isSupported: ttsSupported } = useTextToSpeech();
  const initRef = useRef(false); // Prevent duplicate initialization
  const justCreatedRef = useRef(false); // Track if we just created a new session

  const L = (key) => t(key, language);

  // Session initialization and resume logic — mirrors TechnicalInterview pattern.
  // Uses createAndFetchFirst to atomically create session + fetch first question.
  useEffect(() => {
    // Prevent duplicate initialization
    if (initRef.current) return;

    if (!sessionId) {
      // No session exists — create a new one and fetch first question atomically
      initRef.current = true;
      justCreatedRef.current = true;
      createAndFetchFirst('behavioral', jdAnalysisId, userId, language)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, jdAnalysisId, isComplete]);

  // Track question count from evaluations
  useEffect(() => {
    setQuestionCount(evaluations.length + (currentQuestion ? 1 : 0));
  }, [evaluations.length, currentQuestion]);

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

  // Cancel TTS (local + cloud) when page becomes inactive (hidden but still mounted)
  useEffect(() => {
    if (!isActive) {
      cancel();
    }
  }, [isActive, cancel]);

  // Reset init flag when returning to this page after navigating away while complete.
  // This prevents deadlock if the user navigates Results → Landing → Dashboard → Start Interview.
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (isActive && !prevActiveRef.current && isComplete) {
      initRef.current = false;
    }
    prevActiveRef.current = isActive;
  }, [isActive, isComplete]);

  // Cleanup on unmount: stop all media (local TTS, cloud Audio, DOM audio) and notify other components
  useEffect(() => {
    return () => {
      // Stop local + cloud TTS (covers new Audio() objects that querySelectorAll misses)
      cancel();
      // Stop any DOM audio elements (e.g. VoiceQuestionPlayer)
      document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      // Notify other mounted interview components to stop their media
      window.dispatchEvent(new CustomEvent('rozgar:interview-cleanup'));
    };
  }, [cancel]);

  // Listen for cleanup event from other components (e.g. when navigating between interview modes)
  useEffect(() => {
    const handleCleanup = () => {
      cancel();
    };
    window.addEventListener('rozgar:interview-cleanup', handleCleanup);
    return () => window.removeEventListener('rozgar:interview-cleanup', handleCleanup);
  }, [cancel]);

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
        setUrduQuestionText(currentQuestion.questionText); // fallback
      })
      .finally(() => setIsTranslatingUrdu(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.questionId, currentQuestion?.questionText, isUrdu]);

  // Auto-translate the short-answer nudge to Urdu (display + speak) in Urdu mode.
  // Mirrors the question flow: reuse translateQuestion; gate on ready text so the
  // English nudge is never spoken before its Urdu translation arrives.
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

  // Auto-translate the context-aware STAR follow-up to Urdu (display + speak).
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
          translated.push(ev); // fallback to English
        }
        if (cancelled) break;
      }
      if (!cancelled) setUrduEvaluations(translated);
    };
    translate();
    return () => { cancelled = true; };
  }, [isUrdu, isComplete, evaluations]);

  const handleResetSession = useCallback(() => {
    resetSession();
    setTypedAnswer('');
    setMicTranscript('');
    setUrduQuestionText(null);
    setUrduNudge(null);
    setUrduFollowUp(null);
    setTerminationMessage(null);
    // Reset init flag to allow re-initialization
    initRef.current = false;
  }, [resetSession]);

  const handleSubmitAnswer = async () => {
    const transcript = useTypedFallback ? typedAnswer : micTranscript;
    if (!transcript?.trim()) return;

    try {
      const result = await answerQuestion(currentQuestion.questionId, transcript, language);
      // Clear the (possibly invalid) answer so the candidate starts fresh on the
      // re-ask after a nudge, and on every normal transition.
      setTypedAnswer('');
      setMicTranscript('');
      // Clear Urdu translation when moving to next question
      setUrduQuestionText(null);
      // Handle termination
      if (result?.terminationReason === 'profanity' && result?.message) {
        setTerminationMessage(result.message);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };

  // Determine which text to speak and display (precedence: follow-up > question).
  // The nudge feedback is shown separately in the amber box below, not in VoiceQuestionPlayer.
  // In Urdu mode, use the translated Urdu text; while its translation is still in-flight
  // the value is null so VoiceQuestionPlayer stays silent instead of speaking English.
  let speakText;
  if (followUp) speakText = isUrdu ? urduFollowUp : followUp;
  else speakText = isUrdu && urduQuestionText ? urduQuestionText : currentQuestion?.questionText;

  const displayQuestionText = isUrdu && urduQuestionText
    ? urduQuestionText
    : currentQuestion?.questionText;
  const displayNudge = (isUrdu && urduNudge) || nudge;
  const displayFollowUp = (isUrdu && urduFollowUp) || followUp;

  const displayCount = Math.min(questionCount, MAX_QUESTIONS);
  const progress = (displayCount / MAX_QUESTIONS) * 100;

  // Derive robot avatar state from interview phase
  const avatarState = isComplete ? 'positive'
    : isLoading ? 'thinking'
    : isSpeaking ? 'speaking'
    : currentQuestion ? 'neutral'
    : 'neutral';
  if (isLoading && !currentQuestion) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
        <WaveformAnimation isActive />
        <div className="text-center space-y-2 animate-pulse-soft">
          <p className="text-sm font-medium text-text-muted">{L('interview.behavioral.setup')}</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <InterviewCompletion
        mode="behavioral"
        evaluations={evaluations}
        terminationMessage={terminationMessage}
        onNavigate={onNavigate}
        onReset={handleResetSession}
        language={language}
        translatedEvaluations={urduEvaluations.length > 0 ? urduEvaluations : null}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary page-enter">
      {/* Top bar: Back + Refresh + Progress */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('mode-selection')}
            className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong rounded"
          >
            {L('interview.back')}
          </button>
          <button
            onClick={handleResetSession}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors duration-150 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong rounded"
            title={L('interview.refreshInterview')}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{L('interview.refreshInterview')}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success">Q{displayCount}/{MAX_QUESTIONS}</Badge>
          {currentQuestion?.topic && <Badge variant="warning">{currentQuestion.topic}</Badge>}
        </div>
      </div>

      {/* Progress bar (subtle) */}
      <div className="px-6">
        <ProgressBar value={progress} label={`${L('interview.progress')}: ${displayCount}/${MAX_QUESTIONS} ${L('interview.questionsLabel')}`} />
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
          <div className="rounded-full flex items-center justify-center relative z-10 ring-2 ring-border-theme/30 shadow-lg"
            style={{ width: 220, height: 220, backgroundColor: 'var(--color-surface)', border: '3px solid var(--color-border-strong)' }}
          >
            <RobotAvatar
              size={180}
              state={avatarState}
              style={{ color: 'var(--color-surface-text)' }}
            />
          </div>

          {/* Question text with typewriter effect */}
          <div className="mt-8 text-center max-w-2xl min-h-[3.5rem]">
            <p className="text-xl md:text-2xl font-semibold leading-relaxed text-text-primary">
              <TypewriterText text={speakText} speed={33} />
            </p>
          </div>

          {/* Urdu translation indicator */}
          {isUrdu && isTranslatingUrdu && (
            <div className="mt-4 text-xs animate-pulse-soft text-text-muted">{L('interview.translating')}</div>
          )}

          {/* Repeat Question button */}
          <div className="mt-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                speak(speakText, language, followUp || currentQuestion.questionText);
              }}
              className="flex items-center gap-2 text-text-muted hover:text-text-primary"
            >
              <RefreshCw size={18} />
              {L('interview.repeatQuestion')}
            </Button>
          </div>

          {/* Follow-up bubble */}
          {followUp && <FollowUpBubble text={displayFollowUp} language={language} />}

          {/* Nudge feedback */}
          {nudge && (
            <div className={`mt-6 px-4 py-3 rounded-lg text-sm ${isUrdu ? 'urdu-text' : ''}`} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              {!isUrdu && <strong>️ {L('interview.answerNeeded')}</strong>} {displayNudge}
            </div>
          )}

          {/* JD traceability badge */}
          {currentQuestion?.matchedTerms && currentQuestion.matchedTerms.length > 0 && (
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

          {useTypedFallback ? (
            <TypedFallback
              value={typedAnswer}
              onChange={setTypedAnswer}
              onSubmit={handleSubmitAnswer}
              isSpeaking={isSpeaking}
              disabled={isLoading}
            />
          ) : (
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
                  onClick={handleSubmitAnswer}
                  disabled={isLoading || isSpeaking || !micTranscript?.trim()}
                  className="flex-1"
                >
                  {isLoading ? L('interview.processing') : L('interview.submitAnswer')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !currentQuestion && !isComplete && (
        <div className="flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-text-muted">{L('interview.behavioral.setup')}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BehavioralInterview;
