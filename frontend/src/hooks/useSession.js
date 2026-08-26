// frontend/src/hooks/useSession.js
// Manages behavioral interview session state.
// Exposes: createSession, loadSession, answerQuestion, currentQuestion, evaluations, etc.
// Persists to localStorage for page refresh recovery.

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

const SESSION_STORAGE_KEY = 'rozgar-sathi-behavioral-session-v2';

export const useSession = () => {
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [followUp, setFollowUp] = useState(null);
  const [nudge, setNudge] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setSessionId(data.sessionId);
        setCurrentQuestion(data.currentQuestion);
        setEvaluations(data.evaluations || []);
        setIsComplete(data.isComplete || false);
      }
    } catch (err) {
      console.error('Failed to load session from localStorage:', err);
    }
  }, []);

  // Save session to localStorage on state change
  useEffect(() => {
    if (sessionId) {
      try {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            sessionId,
            currentQuestion,
            evaluations,
            isComplete,
          })
        );
      } catch (err) {
        console.error('Failed to save session to localStorage:', err);
      }
    }
  }, [sessionId, currentQuestion, evaluations, isComplete]);

  const createSession = useCallback(async (mode, jdAnalysisId) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.createSession(mode, jdAnalysisId);
      setSessionId(result.sessionId);
      setIsLoading(false);
      return result.sessionId;
    } catch (err) {
      setError(err.message || 'Failed to create session');
      setIsLoading(false);
      throw err;
    }
  }, []);

  const loadSession = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await apiClient.getSession(id);
      setSessionId(session._id);
      setIsLoading(false);
      return session;
    } catch (err) {
      setError(err.message || 'Failed to load session');
      setIsLoading(false);
      throw err;
    }
  }, []);

  const answerQuestion = useCallback(async (questionId, transcript) => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    setIsLoading(true);
    setError(null);
    setNudge(null);
    setFollowUp(null);

    try {
      const result = await apiClient.answerBehavioral(sessionId, questionId, transcript);

      if (result.nextAction === 'first_question') {
        setCurrentQuestion(result.nextQuestion);
      } else if (result.nextAction === 'nudge') {
        setNudge(result.nudge);
      } else if (result.nextAction === 'followup') {
        // Evaluation is pushed once, on the transition that closes the question
        // (next_question / complete) — not here, to avoid double counting.
        setFollowUp(result.followUp);
      } else if (result.nextAction === 'next_question') {
        if (result.evaluation) {
          setEvaluations((prev) => [...prev, result.evaluation]);
        }
        setCurrentQuestion(result.nextQuestion);
      } else if (result.nextAction === 'complete') {
        if (result.evaluation) {
          setEvaluations((prev) => [...prev, result.evaluation]);
        }
        setIsComplete(true);
        setCurrentQuestion(null);
      } else {
        // Defensive: unknown nextAction — surface as error so the user isn't stuck.
        setError(`Unexpected server response: ${result.nextAction || 'unknown'}`);
      }

      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to submit answer');
      setIsLoading(false);
      throw err;
    }
  }, [sessionId]);

  const resetSession = useCallback(() => {
    setSessionId(null);
    setCurrentQuestion(null);
    setEvaluations([]);
    setFollowUp(null);
    setNudge(null);
    setIsComplete(false);
    setError(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  // Rebuild client state from the persisted backend session (refresh recovery).
  const resume = useCallback(async () => {
    if (!sessionId) return null;
    const s = await apiClient.getSession(sessionId);
    const qs = s.questions || [];

    if (qs.length === 0) {
      return answerQuestion(null, '');
    }

    if (s.status === 'completed') {
      setEvaluations(qs.map((q) => q.evaluation).filter(Boolean));
      setIsComplete(true);
      setCurrentQuestion(null);
      return s;
    }

    const last = qs[qs.length - 1];
    const lastFollowUp = last.followUps?.[last.followUps.length - 1];
    const pendingFollowUp =
      Boolean(last.evaluation) &&
      last.followUps?.length > 0 &&
      String(lastFollowUp).startsWith('Q:');

    if (!last.evaluation || pendingFollowUp) {
      setCurrentQuestion({
        questionId: last.questionId,
        questionText: last.questionText,
        topic: last.topic,
        difficulty: last.difficulty,
      });
      if (pendingFollowUp) setFollowUp(String(lastFollowUp).slice(2));
    } else {
      // Inconsistent legacy state: start a fresh session.
      resetSession();
    }
    return s;
  }, [sessionId, answerQuestion, resetSession]);

  return {
    sessionId,
    currentQuestion,
    evaluations,
    followUp,
    nudge,
    isLoading,
    isComplete,
    error,
    createSession,
    loadSession,
    answerQuestion,
    resetSession,
    resume,
  };
};

export default useSession;
