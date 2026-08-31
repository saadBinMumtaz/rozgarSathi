// frontend/src/pages/BehavioralInterview.jsx
// Behavioral interview page — orchestrates voice pipeline, session management,
// answer submission, EvidenceCard, Urdu toggle, and progress tracking.

import React, { useEffect, useState } from 'react';
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
import PageHeader from '../components/shared/PageHeader';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

const MAX_QUESTIONS = 5;

export const BehavioralInterview = ({ jdAnalysisId, onNavigate, language = 'english', isUrdu = false, userId, isDark }) => {
  const { logout } = useAuth();
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
  } = useSession();

  const [isSpeaking, setIsSpeaking] = useState(false);
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

  // Initialize / resume session whenever the session id changes.
  // BUT skip resume if interview is already complete (prevents overwriting local state).
  useEffect(() => {
    if (!sessionId) {
      createSession('behavioral', jdAnalysisId, userId).catch((err) => {
        console.error('Failed to create session:', err);
      });
    } else if (!isComplete) {
      // Only resume if interview is NOT already complete
      resume().catch((err) => {
        console.error('Failed to resume session:', err);
        resetSession();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Track question count from evaluations
  useEffect(() => {
    setQuestionCount(evaluations.length + (currentQuestion ? 1 : 0));
  }, [evaluations.length, currentQuestion]);

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
    };
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
                  <div className="text-2xl font-bold text-danger">Interview Terminated</div>
                  <div className="text-danger text-sm max-w-md mx-auto">{terminationMessage}</div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-success mx-auto" size={48} />
                  <div className="text-2xl font-bold text-success">Behavioral Interview Complete!</div>
                  
                  {/* Overall Score Display */}
                  <div className="inline-flex items-center gap-4 surface-text bg-surface-hover rounded-xl px-6 py-4 ">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${avgScore >= 70 ? 'text-success' : avgScore >= 40 ? 'text-warning' : 'text-danger'}`}>
                        {avgScore}
                      </div>
                      <div className="text-xs text-text-muted uppercase tracking-wide">Overall Score</div>
                    </div>
                    <div className="h-12 w-px bg-bg-hover"></div>
                    <div className="text-left space-y-1">
                      <div className="text-sm text-text-muted">
                        <span className="text-text-muted">Questions:</span> {evaluations.length}
                      </div>
                      <div className="text-sm text-text-muted">
                        <span className="text-success">✓ {highScores}</span> strong answers
                      </div>
                      {lowScores > 0 && (
                        <div className="text-sm text-text-muted">
                          <span className="text-danger">⚠ {lowScores}</span> need improvement
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div className="text-sm text-text-muted max-w-md mx-auto">
                    {avgScore >= 70 
                      ? 'Great performance! Your answers demonstrated strong behavioral competencies.'
                      : avgScore >= 40
                      ? 'Good effort! Review the feedback below to strengthen your answers.'
                      : 'Review the detailed feedback below to improve your STAR method responses.'}
                  </div>
                </>
              )}
              <div className="flex justify-center gap-3 mt-4">
                <Button variant="secondary" onClick={() => onNavigate('results')}>
                  View Results
                </Button>
                <Button variant="primary" onClick={() => { resetSession(); onNavigate('mode-selection'); }}>
                  Try Another Mode
                </Button>
                <Button variant="secondary" onClick={resetSession}>
                  Restart Behavioral
                </Button>
              </div>
            </CardContent>
          </Card>

          {evaluations.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <span>Detailed Feedback</span>
                <span className="text-sm font-normal text-text-muted">({evaluations.length} questions)</span>
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
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Navigation Header */}
      <PageHeader
        isDark={isDark}
        onNavigate={onNavigate}
        currentPage="behavioral-interview"
        isAuthenticated={true}
        onLogout={() => { logout(); onNavigate('landing'); }}
      />

      {/* Interview Content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Interview Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => onNavigate('mode-selection')}>
                ← Back
              </Button>
              <Badge variant="primary">🎤 Behavioral Interview</Badge>
              <Badge variant="success">Question {displayCount} of {MAX_QUESTIONS}</Badge>
            </div>
            {currentQuestion?.topic && (
              <Badge variant="warning">{currentQuestion.topic}</Badge>
            )}
          </div>

        {/* Progress bar */}
        <ProgressBar value={progress} label={`Progress: ${displayCount}/${MAX_QUESTIONS} questions`} />

        {/* Error banner */}
        {error && (
          <div className="p-3 bg-danger/10  rounded-md text-danger text-sm flex items-center justify-between gap-3" role="alert">
            <span>{error.includes('Failed to fetch') || error.includes('network')
              ? 'Server is unreachable. Check your connection and retry.'
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
              {sessionId ? 'Restart interview' : 'Retry'}
            </Button>
          </div>
        )}

        {/* Tab conflict warning */}
        {tabConflict && (
          <div className="p-3 bg-warning/10  rounded-md text-warning text-sm flex items-center justify-between gap-3" role="alert">
            <span>Another tab is running this same interview. Answers may conflict — close the other tab or <button onClick={dismissTabWarning} className="underline font-medium">continue here anyway</button>.</span>
          </div>
        )}

        {/* Voice question player */}
        {speakText && (
          <VoiceQuestionPlayer
            text={speakText}
            fallbackText={followUp ? followUp : currentQuestion?.questionText}
            onSpeakingChange={setIsSpeaking}
            language={language}
          />
        )}

        {/* Urdu translation indicator */}
        {isUrdu && isTranslatingUrdu && (
          <div className="text-xs text-text-muted animate-pulse">Translating to Urdu...</div>
        )}
        {isUrdu && urduQuestionText && (
          <div className="text-xs text-text-muted">Showing question in Urdu</div>
        )}

        {/* JD traceability badge */}
        {currentQuestion?.matchedTerms && currentQuestion.matchedTerms.length > 0 && (
          <div className="mb-4 p-3 surface-text bg-surface-hover  rounded-lg">
            <QuestionTraceBadge matchedTerms={currentQuestion.matchedTerms} />
          </div>
        )}

        {/* Follow-up bubble */}
        {followUp && <FollowUpBubble text={displayFollowUp} language={language} />}

        {/* Invalid-answer / nudge feedback — shown + spoken in the active language */}
        {nudge && (
          <div className={`mb-4 p-3 bg-warning/10  rounded-md text-warning text-sm ${isUrdu ? 'urdu-text text-right' : ''}`}>
            {!isUrdu && <strong>⚠️ Answer needed:</strong>} {displayNudge}
          </div>
        )}

        {/* Latest evaluation — REMOVED from live view, shown only on completion */}

        {/* Input area: Mic or Typed */}
        {currentQuestion && !isComplete && (
          <Card>
            <CardHeader>
              <CardTitle>Your Answer</CardTitle>
              <CardDescription>
                {followUp
                  ? 'Answer the follow-up question above.'
                  : 'Answer the behavioral question using the STAR method (Situation, Task, Action, Result).'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Voice / Text toggle */}
              <div className="flex items-center gap-3 mb-4">
                <Button
                  variant={useTypedFallback ? 'ghost' : 'secondary'}
                  size="sm"
                  onClick={() => setUseTypedFallback(false)}
                >
                  🎤 Use Voice
                </Button>
                <Button
                  variant={useTypedFallback ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setUseTypedFallback(true)}
                >
                  ⌨️ Type Answer
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
                      {isLoading ? 'Processing...' : 'Submit Answer'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setUseTypedFallback(true)}
                      disabled={isLoading || isSpeaking}
                    >
                      Switch to typing
                    </Button>
                  </div>
                </div>
              )}

              {/* Switch back to mic option */}
              {useTypedFallback && (
                <div className="mt-3 text-center">
                  <Button
                    variant="link"
                    onClick={() => setUseTypedFallback(false)}
                  >
                    Switch back to voice input
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && !currentQuestion && !isComplete && (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-text-muted">Setting up your behavioral interview...</div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
};

export default BehavioralInterview;
