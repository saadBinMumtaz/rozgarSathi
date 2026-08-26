// frontend/src/pages/BehavioralInterview.jsx
// Behavioral interview page — orchestrates voice pipeline, session management,
// and answer submission.

import React, { useEffect, useState } from 'react';
import { useSession } from '../hooks/useSession';
import { VoiceQuestionPlayer } from '../components/shared/VoiceQuestionPlayer';
import { MicRecorder } from '../components/behavioral/MicRecorder';
import { TypedFallback } from '../components/behavioral/TypedFallback';
import { FollowUpBubble } from '../components/behavioral/FollowUpBubble';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Loader2, CheckCircle2 } from 'lucide-react';

export const BehavioralInterview = ({ jdAnalysisId, onNavigate }) => {
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

  // Initialize / resume session whenever the session id changes.
  useEffect(() => {
    if (!sessionId) {
      createSession('behavioral', jdAnalysisId).catch((err) => {
        console.error('Failed to create session:', err);
      });
    } else {
      // Fresh session (no questions yet) -> backend returns the first question;
      // existing session (page refresh) -> rebuild state from the backend.
      resume().catch((err) => {
        console.error('Failed to resume session:', err);
        resetSession();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleSubmitAnswer = async () => {
    const transcript = useTypedFallback ? typedAnswer : micTranscript;
    if (!transcript?.trim()) return;

    try {
      const result = await answerQuestion(currentQuestion.questionId, transcript);
      // Keep the typed text when nudged so the candidate can expand it;
      // clear inputs only when the interview actually moved on.
      if (result?.nextAction !== 'nudge') {
        setTypedAnswer('');
        setMicTranscript('');
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };

  // Determine which text to speak (question or follow-up or nudge)
  const speakText = nudge || followUp || currentQuestion?.questionText;

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
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={28} />
              Interview Complete
            </CardTitle>
            <CardDescription>
              You've completed the behavioral interview. Your responses have been saved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-400 mb-2">Questions Answered:</div>
                <div className="text-2xl font-bold text-slate-100">{evaluations.length}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-2">Average Score:</div>
                <div className="text-2xl font-bold text-indigo-400">
                  {evaluations.length > 0
                    ? Math.round(
                        evaluations.reduce((sum, e) => sum + (e.score || 0), 0) / evaluations.length
                      )
                    : 0}
                  /100
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  resetSession();
                  onNavigate('mode-selection');
                }}
                className="w-full mt-4"
              >
                Start Another Interview →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Behavioral Interview</CardTitle>
              <Badge variant="info">
                Question {evaluations.length + 1}
              </Badge>
            </div>
            <CardDescription>
              Answer the interviewer's questions using the STAR method (Situation, Task, Action, Result).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-rose-900/30 border border-rose-700 rounded-md text-rose-300 text-sm flex items-center justify-between gap-3">
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
              <VoiceQuestionPlayer text={speakText} onSpeakingChange={setIsSpeaking} />
            )}

            {/* Follow-up bubble */}
            {followUp && <FollowUpBubble text={followUp} />}

            {/* Nudge */}
            {nudge && (
              <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700 rounded-md text-amber-300 text-sm">
                <strong>Nudge:</strong> {nudge}
              </div>
            )}

            {/* Input area: Mic or Typed */}
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
      </div>
    </div>
  );
};

export default BehavioralInterview;
