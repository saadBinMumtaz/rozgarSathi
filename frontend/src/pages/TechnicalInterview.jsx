// frontend/src/pages/TechnicalInterview.jsx
// Technical Q&A interview page — Day 3.
// Reuses VoiceQuestionPlayer.jsx (shared TTS), MicRecorder, TypedFallback.
// Wires DifficultyIndicator and EvidenceCard.

import React, { useState, useEffect, useCallback } from 'react';
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
import { apiClient } from '../api/client';
import { useTabLock } from '../hooks/useTabLock';

const TECHNICAL_SESSION_KEY = 'rozgar-sathi-technical-session-v1';

export const TechnicalInterview = ({ jdAnalysisId, onNavigate, language = 'english', isUrdu = false, userId }) => {
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [followUp, setFollowUp] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useTypedFallback, setUseTypedFallback] = useState(false);
  const [micTranscript, setMicTranscript] = useState('');
  const [typedTranscript, setTypedTranscript] = useState('');
  const [difficultyInfo, setDifficultyInfo] = useState({ current: 'medium', previous: null, ratingDelta: 0 });
  const [questionCount, setQuestionCount] = useState(0);
  const [urduQuestionText, setUrduQuestionText] = useState(null);
  const [urduFollowUp, setUrduFollowUp] = useState(null);
  const [nudge, setNudge] = useState(null);
  const [urduNudge, setUrduNudge] = useState(null);
  const [isTranslatingUrdu, setIsTranslatingUrdu] = useState(false);
  const [urduEvaluations, setUrduEvaluations] = useState([]);
  const [terminationMessage, setTerminationMessage] = useState(null);
  const { isLocked: tabConflict, dismissWarning: dismissTabWarning } = useTabLock(sessionId, 'technical');

  const MAX_QUESTIONS = 5;

  // Clear any previous session on mount — always start fresh
  useEffect(() => {
    try {
      localStorage.removeItem(TECHNICAL_SESSION_KEY);
    } catch (err) {
      console.error('Failed to clear technical session:', err);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (sessionId) {
      try {
        localStorage.setItem(
          TECHNICAL_SESSION_KEY,
          JSON.stringify({ sessionId, currentQuestion, evaluations, isComplete, questionCount })
        );
      } catch (err) {
        console.error('Failed to save technical session:', err);
      }
    }
  }, [sessionId, currentQuestion, evaluations, isComplete, questionCount]);

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

  const handleAnswerResult = useCallback((result) => {
    // Clear any prior invalid-answer feedback; only re-set it for a 'nudge'.
    setNudge(null);
    if (result.nextAction === 'first_question') {
      setCurrentQuestion(result.nextQuestion);
      setQuestionCount(1);
      setDifficultyInfo({ current: result.nextQuestion.difficulty, previous: null, ratingDelta: 0 });
    } else if (result.nextAction === 'nudge') {
      // Direct invalid-answer feedback — re-asks the SAME question/follow-up.
      setNudge(result.nudge);
    } else if (result.nextAction === 'followup') {
      setFollowUp(result.followUp);
    } else if (result.nextAction === 'next_question') {
      if (result.evaluation) {
        setEvaluations((prev) => [...prev, result.evaluation]);
      }
      setCurrentQuestion(result.nextQuestion);
      setQuestionCount((prev) => prev + 1);
      setFollowUp(null);
      setUrduQuestionText(null); // Clear for auto-translate of new question
      // If the server flagged the previous answer as invalid, show the feedback message.
      if (result.nudge) {
        setNudge(result.nudge);
      }
      if (result.difficultyChange) {
        setDifficultyInfo({
          current: result.difficultyChange.to,
          previous: result.difficultyChange.from,
          ratingDelta: result.ratingDelta || 0,
        });
      }
    } else if (result.nextAction === 'complete') {
      if (result.evaluation) {
        setEvaluations((prev) => [...prev, result.evaluation]);
      }
      if (result.terminationReason === 'profanity' && result.message) {
        setTerminationMessage(result.message);
      }
      setIsComplete(true);
      setCurrentQuestion(null);
    }
  }, []);

  // Create a new technical session
  const createSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.createSession('technical', jdAnalysisId, userId);
      setSessionId(result.sessionId);
      // Fetch first question
      const answerResult = await apiClient.answerTechnical(result.sessionId, null, '');
      handleAnswerResult(answerResult);
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  }, [jdAnalysisId, handleAnswerResult]);

  // Start the interview
  useEffect(() => {
    if (!sessionId && jdAnalysisId && !isComplete) {
      createSession();
    }
  }, []);

  const submitAnswer = useCallback(async () => {
    // Strict limit: prevent submitting more than MAX_QUESTIONS
    if (questionCount >= MAX_QUESTIONS) {
      setIsComplete(true);
      setCurrentQuestion(null);
      return;
    }

    const transcript = useTypedFallback ? typedTranscript.trim() : micTranscript.trim();
    if (!transcript || !sessionId) return;

    setIsLoading(true);
    setError(null);
    setMicTranscript('');
    setTypedTranscript('');

    try {
      const result = await apiClient.answerTechnical(sessionId, currentQuestion?.questionId, transcript, language);
      handleAnswerResult(result);
    } catch (err) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, currentQuestion, micTranscript, typedTranscript, useTypedFallback, handleAnswerResult, language, questionCount]);

  const resetSession = () => {
    setSessionId(null);
    setCurrentQuestion(null);
    setEvaluations([]);
    setFollowUp(null);
    setNudge(null);
    setUrduNudge(null);
    setIsLoading(false);
    setIsComplete(false);
    setError(null);
    setMicTranscript('');
    setTypedTranscript('');
    setQuestionCount(0);
    setDifficultyInfo({ current: 'medium', previous: null, ratingDelta: 0 });
    localStorage.removeItem(TECHNICAL_SESSION_KEY);
  };

  const activeTranscript = useTypedFallback ? typedTranscript : micTranscript;
  const progress = (questionCount / MAX_QUESTIONS) * 100;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('mode-selection')}>
              ← Back
            </Button>
            <Badge variant="primary">💻 Technical Q&A</Badge>
            <Badge variant="success">Question {Math.min(questionCount, MAX_QUESTIONS)} of {MAX_QUESTIONS}</Badge>
          </div>
          <DifficultyIndicator
            current={difficultyInfo.current}
            previous={difficultyInfo.previous}
            ratingDelta={difficultyInfo.ratingDelta}
          />
        </div>

        {/* Progress bar */}
        <ProgressBar value={progress} label={`Progress: ${questionCount}/${MAX_QUESTIONS} questions`} />

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
                if (!sessionId) createSession();
                else resetSession();
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

        {/* Voice question player — shows the current question (or follow-up if active).
            The nudge feedback is shown separately in the amber box below. */}
        {currentQuestion && (
          <VoiceQuestionPlayer
            text={followUp
              ? (isUrdu ? urduFollowUp : followUp)
              : (isUrdu && urduQuestionText ? urduQuestionText : currentQuestion.questionText)}
            fallbackText={followUp || currentQuestion.questionText}
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

        {/* Follow-up display */}

        {/* JD traceability badge */}
        {currentQuestion?.matchedTerms && (
          <div className="mb-4 p-3 surface-text bg-surface-hover  rounded-lg">
            <QuestionTraceBadge matchedTerms={currentQuestion.matchedTerms} />
          </div>
        )}
        {followUp && !currentQuestion?.evaluation && (
          <div className="surface-text bg-surface-hover  rounded-lg p-4">
            <div className="text-xs text-icon-active font-medium mb-1">Follow-up question</div>
            <div className={`text-text-primary ${isUrdu ? 'urdu-text text-right' : ''}`}>{(isUrdu && urduFollowUp) || followUp}</div>
          </div>
        )}

        {/* Invalid-answer / nudge feedback — shown + spoken in the active language */}
        {nudge && (
          <div className={`mb-4 p-3 bg-warning/10  rounded-md text-warning text-sm ${isUrdu ? 'urdu-text text-right' : ''}`}>
            {!isUrdu && <strong>⚠️ Answer needed:</strong>} {(isUrdu && urduNudge) || nudge}
          </div>
        )}

        {/* Latest evaluation — REMOVED from live view, shown only on completion */}

        {/* Answer input area */}
        {currentQuestion && !isComplete && (
          <Card>
            <CardHeader>
              <CardTitle>Your Answer</CardTitle>
              <CardDescription>
                {followUp
                  ? 'Answer the follow-up question above.'
                  : 'Answer the technical question spoken/read above.'}
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

              {/* Switch back to voice */}
              {useTypedFallback && (
                <div className="mt-3 text-center">
                  <Button variant="link" onClick={() => setUseTypedFallback(false)}>
                    Switch back to voice input
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
            <div className="space-y-6">
              <Card className={terminationMessage ? 'border-danger/30/50' : 'border-success/30'}>
                <CardContent className="text-center py-8 space-y-4">
                  {terminationMessage ? (
                    <>
                      <div className="text-2xl font-bold text-danger">Interview Terminated</div>
                      <div className="text-danger text-sm max-w-md mx-auto">{terminationMessage}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-success">Technical Interview Complete!</div>
                      
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
                          ? 'Great performance! Your technical knowledge and explanations were solid.'
                          : avgScore >= 40
                          ? 'Good effort! Review the feedback below to deepen your technical understanding.'
                          : 'Review the detailed feedback below to strengthen your technical answers.'}
                      </div>
                    </>
                  )}
                  <div className="flex justify-center gap-3 mt-4">
                    <Button variant="secondary" onClick={() => onNavigate('results')}>
                      View Results
                    </Button>
                    <Button variant="primary" onClick={() => onNavigate('mode-selection')}>
                      Try Another Mode
                    </Button>
                    <Button variant="secondary" onClick={resetSession}>
                      Restart Technical
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Summary of all evaluations */}
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
          );
        })()}

        {/* Loading state */}
        {isLoading && !currentQuestion && !isComplete && (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-text-muted">Setting up your technical interview...</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TechnicalInterview;
