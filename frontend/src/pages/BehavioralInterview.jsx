// frontend/src/pages/BehavioralInterview.jsx
// Behavioral interview page — orchestrates voice pipeline, session management,
// answer submission, EvidenceCard, Urdu toggle, and progress tracking.

import React, { useEffect, useState, useRef } from 'react';
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
import { TypewriterText } from '../components/shared/TypewriterText';
import { Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
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
    createSession,
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
  const justCreatedRef = useRef(false); // Track if we just created a new session

  const L = (key) => t(key, language);

  // Initialize / resume session whenever the session id changes.
  // BUT skip resume if interview is already complete (prevents overwriting local state).
  // ALSO skip resume if we just created a new session (prevents loading stale data).
  useEffect(() => {
    if (!sessionId) {
      justCreatedRef.current = true; // Mark that we're about to create a new session
      createSession('behavioral', jdAnalysisId, userId).catch((err) => {
        console.error('Failed to create session:', err);
        justCreatedRef.current = false; // Reset on failure
      });
    } else if (!isComplete && !justCreatedRef.current) {
      // Only resume if:
      // 1. Interview is NOT already complete
      // 2. We did NOT just create this session (it's a page refresh recovery)
      resume().catch((err) => {
        console.error('Failed to resume session:', err);
        resetSession();
      });
    } else if (justCreatedRef.current) {
      // We just created a new session, mark it as handled
      justCreatedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

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

  // Cancel TTS when page becomes inactive (hidden but still mounted)
  useEffect(() => {
    if (!isActive) {
      cancel();
    }
  }, [isActive, cancel]);

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

  if (isLoading && !currentQuestion) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-icon-active" />
      </div>
    );
  }

  if (isComplete) {
    // Calculate summary statistics
    const totalScore = evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + (typeof e?.score === 'number' ? e.score : 0), 0)
      : 0;
    const avgScore = evaluations.length > 0 ? Math.round(totalScore / evaluations.length) : 0;
    const highScores = evaluations.filter(e => e?.score >= 70).length;
    const lowScores = evaluations.filter(e => e?.score < 40).length;

    return (
      <div className="min-h-screen bg-bg-primary p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className={terminationMessage ? 'border-danger/30/50' : 'border-success/30'}>
            <CardContent className="text-center py-8 space-y-4">
              {terminationMessage ? (
                <>
                  <div className="text-2xl font-bold text-danger">{L('interview.terminated')}</div>
                  <div className="text-danger text-sm max-w-md mx-auto">{terminationMessage}</div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-success mx-auto" size={48} />
                  <div className="text-2xl font-bold text-success">{L('interview.behavioral.complete')}</div>
                  
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
                      ? L('interview.behavioral.perfGreat')
                      : avgScore >= 40
                      ? L('interview.behavioral.perfGood')
                      : L('interview.behavioral.perfPoor')}
                  </div>
                </>
              )}
              <div className="flex justify-center gap-3 mt-4">
                <Button variant="secondary" onClick={() => onNavigate('results')}>
                  {L('interview.viewResults')}
                </Button>
                <Button variant="primary" onClick={() => { resetSession(); onNavigate('mode-selection'); }}>
                  {L('interview.tryAnotherMode')}
                </Button>
                <Button variant="secondary" onClick={resetSession}>
                  {L('interview.behavioral.restart')}
                </Button>
              </div>
            </CardContent>
          </Card>

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
  }

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
              if (!sessionId) {
                createSession('behavioral', jdAnalysisId, userId).catch(() => {});
              } else {
                resetSession();
              }
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
              <TypewriterText text={speakText} speed={33} />
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
                speak(speakText, language, followUp || currentQuestion.questionText);
              }}
              className="flex items-center gap-2"
              style={{ color: isDark ? '#ffffff' : '#111111' }}
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
