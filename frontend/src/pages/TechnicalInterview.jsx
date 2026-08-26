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
import { apiClient } from '../api/client';

const TECHNICAL_SESSION_KEY = 'rozgar-sathi-technical-session-v1';

export const TechnicalInterview = ({ jdAnalysisId, onNavigate }) => {
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
  const [translatedEvaluation, setTranslatedEvaluation] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const MAX_QUESTIONS = 5;

  // Resume from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TECHNICAL_SESSION_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setSessionId(data.sessionId);
        setCurrentQuestion(data.currentQuestion);
        setEvaluations(data.evaluations || []);
        setIsComplete(data.isComplete || false);
        setQuestionCount(data.questionCount || 0);
      }
    } catch (err) {
      console.error('Failed to load technical session:', err);
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

  // Create a new technical session
  const createSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.createSession('technical', jdAnalysisId);
      setSessionId(result.sessionId);
      // Fetch first question
      const answerResult = await apiClient.answerTechnical(result.sessionId, null, '');
      handleAnswerResult(answerResult);
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  }, [jdAnalysisId]);

  // Start the interview
  useEffect(() => {
    if (!sessionId && jdAnalysisId && !isComplete) {
      createSession();
    }
  }, []);

  const handleAnswerResult = (result) => {
    if (result.nextAction === 'first_question') {
      setCurrentQuestion(result.nextQuestion);
      setQuestionCount(1);
      setDifficultyInfo({ current: result.nextQuestion.difficulty, previous: null, ratingDelta: 0 });
    } else if (result.nextAction === 'followup') {
      setFollowUp(result.followUp);
    } else if (result.nextAction === 'next_question') {
      if (result.evaluation) {
        setEvaluations((prev) => [...prev, result.evaluation]);
      }
      setCurrentQuestion(result.nextQuestion);
      setQuestionCount((prev) => prev + 1);
      setFollowUp(null);
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
      setIsComplete(true);
      setCurrentQuestion(null);
    }
  };

  const submitAnswer = useCallback(async () => {
    const transcript = useTypedFallback ? typedTranscript.trim() : micTranscript.trim();
    if (!transcript || !sessionId) return;

    setIsLoading(true);
    setError(null);
    setMicTranscript('');
    setTypedTranscript('');

    try {
      const result = await apiClient.answerTechnical(sessionId, currentQuestion?.questionId, transcript);
      handleAnswerResult(result);
    } catch (err) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, currentQuestion, micTranscript, typedTranscript, useTypedFallback]);

  const resetSession = () => {
    setSessionId(null);
    setCurrentQuestion(null);
    setEvaluations([]);
    setFollowUp(null);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
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
          <div className="p-3 bg-rose-900/30 border border-rose-700 rounded-md text-rose-300 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              variant="link"
              className="shrink-0 underline text-rose-300 hover:text-rose-200"
              onClick={() => {
                if (!sessionId) createSession();
                else resetSession();
              }}
            >
              {sessionId ? 'Restart interview' : 'Retry'}
            </Button>
          </div>
        )}

        {/* Voice question player — reuses shared component from Day 2 */}
        {currentQuestion && (
          <VoiceQuestionPlayer
            text={followUp || currentQuestion.questionText}
            onSpeakingChange={setIsSpeaking}
          />
        )}

        {/* Follow-up display */}
        {followUp && !currentQuestion?.evaluation && (
          <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-lg p-4">
            <div className="text-xs text-indigo-400 font-medium mb-1">Follow-up question</div>
            <div className="text-slate-200">{followUp}</div>
          </div>
        )}

        {/* Latest evaluation */}
        {evaluations.length > 0 && (
          <EvidenceCard
            evaluation={evaluations[evaluations.length - 1]}
            translatedEvaluation={translatedEvaluation}
            onToggleUrdu={async (lang) => {
              if (lang === 'urdu') {
                if (!translatedEvaluation) {
                  setIsTranslating(true);
                  try {
                    const result = await apiClient.translateEvaluation(evaluations[evaluations.length - 1], 'urdu');
                    setTranslatedEvaluation(result.evaluation);
                  } catch (err) {
                    console.error('Translation failed:', err);
                    // Fallback: show original if translation fails
                    setTranslatedEvaluation(evaluations[evaluations.length - 1]);
                  } finally {
                    setIsTranslating(false);
                  }
                }
              } else {
                // Switching back to English — clear translated evaluation
                setTranslatedEvaluation(null);
              }
            }}
          />
        )}

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
                <MicRecorder
                  isSpeaking={isSpeaking}
                  onTranscriptChange={setMicTranscript}
                  resetKey={`${currentQuestion?.questionId || ''}|${followUp || ''}`}
                  onUnsupported={() => setUseTypedFallback(true)}
                  autoStart={!isSpeaking}
                />
              )}

              {/* Typed fallback */}
              {useTypedFallback && (
                <TypedFallback
                  value={typedTranscript}
                  onChange={setTypedTranscript}
                  onSubmit={submitAnswer}
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

              {/* Submit button (for voice mode) */}
              {!useTypedFallback && micTranscript.trim() && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={submitAnswer}
                    disabled={isLoading || !micTranscript.trim()}
                    isLoading={isLoading}
                  >
                    Submit Answer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Completion screen */}
        {isComplete && (
          <Card className="border-emerald-700/50">
            <CardContent className="text-center py-8 space-y-4">
              <div className="text-2xl font-bold text-emerald-400">Technical Interview Complete!</div>
              <div className="text-slate-400">
                You answered {evaluations.length} questions.
                Overall score:{' '}
                <span className="text-white font-semibold">
                  {evaluations.length > 0
                    ? Math.round(evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length)
                    : 0}
                  /100
                </span>
              </div>
              <div className="flex justify-center gap-3 mt-4">
                <Button variant="primary" onClick={() => onNavigate('mode-selection')}>
                  Try Another Mode
                </Button>
                <Button variant="secondary" onClick={resetSession}>
                  Restart Technical
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && !currentQuestion && !isComplete && (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-slate-400">Setting up your technical interview...</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TechnicalInterview;
