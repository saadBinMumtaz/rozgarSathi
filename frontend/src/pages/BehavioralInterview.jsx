// frontend/src/pages/BehavioralInterview.jsx
// Behavioral interview page — orchestrates voice pipeline, session management,
// answer submission, EvidenceCard, Urdu toggle, and progress tracking.

import React, { useEffect, useState } from 'react';
import { useSession } from '../hooks/useSession';
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
import { Loader2, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';

const MAX_QUESTIONS = 5;

export const BehavioralInterview = ({ jdAnalysisId, onNavigate, language = 'english', isUrdu = false }) => {
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
  const [isTranslatingUrdu, setIsTranslatingUrdu] = useState(false);
  const [urduEvaluations, setUrduEvaluations] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [terminationMessage, setTerminationMessage] = useState(null);

  // Initialize / resume session whenever the session id changes.
  useEffect(() => {
    if (!sessionId) {
      createSession('behavioral', jdAnalysisId).catch((err) => {
        console.error('Failed to create session:', err);
      });
    } else {
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
      if (result?.nextAction !== 'nudge') {
        setTypedAnswer('');
        setMicTranscript('');
      }
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

  // Determine which text to speak and display
  const speakText = nudge || followUp || (isUrdu && urduQuestionText ? urduQuestionText : currentQuestion?.questionText);
  const displayQuestionText = isUrdu && urduQuestionText
    ? urduQuestionText
    : currentQuestion?.questionText;

  const displayCount = Math.min(questionCount, MAX_QUESTIONS);
  const progress = (displayCount / MAX_QUESTIONS) * 100;

  if (isLoading && !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className={terminationMessage ? 'border-rose-700/50' : 'border-emerald-700/50'}>
            <CardContent className="text-center py-8 space-y-4">
              {terminationMessage ? (
                <>
                  <div className="text-2xl font-bold text-rose-400">Interview Terminated</div>
                  <div className="text-rose-300 text-sm max-w-md mx-auto">{terminationMessage}</div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-emerald-500 mx-auto" size={48} />
                  <div className="text-2xl font-bold text-emerald-400">Interview Complete!</div>
                  <div className="text-slate-400">
                    You answered {evaluations.length} questions.
                    Overall score:{' '}
                    <span className="text-white font-semibold">
                      {evaluations.length > 0
                        ? Math.round(evaluations.reduce((sum, e) => sum + (e.score || 0), 0) / evaluations.length)
                        : 0}
                      /100
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-center gap-3 mt-4">
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">Question Feedback Summary</h3>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
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
          <div className="p-3 bg-rose-900/30 border border-rose-700 rounded-md text-rose-300 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              variant="link"
              className="shrink-0 underline text-rose-300 hover:text-rose-200"
              onClick={() => {
                if (!sessionId) {
                  createSession('behavioral', jdAnalysisId).catch(() => {});
                } else {
                  resetSession();
                }
              }}
            >
              {sessionId ? 'Restart interview' : 'Retry'}
            </Button>
          </div>
        )}

        {/* Voice question player */}
        {speakText && (
          <VoiceQuestionPlayer text={speakText} onSpeakingChange={setIsSpeaking} language={language} />
        )}

        {/* Urdu translation indicator */}
        {isUrdu && isTranslatingUrdu && (
          <div className="text-xs text-slate-400 animate-pulse">Translating to Urdu...</div>
        )}
        {isUrdu && urduQuestionText && (
          <div className="text-xs text-slate-400">Showing question in Urdu</div>
        )}

        {/* JD traceability badge */}
        {currentQuestion?.matchedTerms && currentQuestion.matchedTerms.length > 0 && (
          <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <QuestionTraceBadge matchedTerms={currentQuestion.matchedTerms} />
          </div>
        )}

        {/* Follow-up bubble */}
        {followUp && <FollowUpBubble text={followUp} />}

        {/* Nudge */}
        {nudge && (
          <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700 rounded-md text-amber-300 text-sm">
            <strong>Nudge:</strong> {nudge}
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
              <div className="text-slate-400">Setting up your behavioral interview...</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BehavioralInterview;
