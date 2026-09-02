// frontend/src/hooks/useSession.js
// Manages interview session state (behavioral, technical, coding).
// Exposes: createSession, loadSession, answerQuestion, currentQuestion, evaluations, etc.
// Persists to localStorage for page refresh recovery.
//
// Usage:
//   const session = useSession({ mode: 'behavioral' }); // or 'technical'
//   const session = useSession({ mode: 'technical', storageKey: 'my-custom-key' });

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';

// Default storage keys per mode
const DEFAULT_STORAGE_KEYS = {
  behavioral: 'rozgar-sathi-behavioral-session-v2',
  technical: 'rozgar-sathi-technical-session-v2',
};

// Load initial state from localStorage synchronously to prevent race conditions
const loadInitialState = (storageKey) => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        sessionId: data.sessionId || null,
        currentQuestion: data.currentQuestion || null,
        evaluations: data.evaluations || [],
        isComplete: data.isComplete || false,
      };
    }
  } catch (err) {
    console.error('Failed to load session from localStorage:', err);
  }
  return { sessionId: null, currentQuestion: null, evaluations: [], isComplete: false };
};

export const useSession = ({ mode = 'behavioral', storageKey } = {}) => {
  const resolvedStorageKey = storageKey || DEFAULT_STORAGE_KEYS[mode] || DEFAULT_STORAGE_KEYS.behavioral;
  const initialState = loadInitialState(resolvedStorageKey);
  const [sessionId, setSessionId] = useState(initialState.sessionId);
  const [currentQuestion, setCurrentQuestion] = useState(initialState.currentQuestion);
  const [evaluations, setEvaluations] = useState(initialState.evaluations);
  const [followUp, setFollowUp] = useState(null);
  const [nudge, setNudge] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(initialState.isComplete);
  const [error, setError] = useState(null);

  // Save session to localStorage with debounce to avoid excessive writes
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (sessionId) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(
            resolvedStorageKey,
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
      }, 150); // 150ms debounce
    }
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [sessionId, currentQuestion, evaluations, isComplete, resolvedStorageKey]);

  const createSession = useCallback(async (mode, jdAnalysisId, userId) => {
    setIsLoading(true);
    setError(null);
    // Reset state so stale data from a previous session doesn't carry over
    setEvaluations([]);
    setCurrentQuestion(null);
    setFollowUp(null);
    setNudge(null);
    setIsComplete(false);
    localStorage.removeItem(resolvedStorageKey);
    try {
      const result = await apiClient.createSession(mode, jdAnalysisId, userId);
      setSessionId(result.sessionId);
      setIsLoading(false);
      return result.sessionId;
    } catch (err) {
      setError(err.message || 'Failed to create session');
      setIsLoading(false);
      throw err;
    }
  }, [resolvedStorageKey]);

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

  const answerQuestion = useCallback(async (questionId, transcript, language = 'english') => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    setIsLoading(true);
    setError(null);
    setNudge(null);
    setFollowUp(null);

    try {
      // Use the appropriate API call based on mode
      const result = mode === 'technical'
        ? await apiClient.answerTechnical(sessionId, questionId, transcript, language)
        : await apiClient.answerBehavioral(sessionId, questionId, transcript, language);

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
        setFollowUp(null); // Clear any prior follow-up (especially after invalid input)
        // If the server flagged the previous answer as invalid, show the feedback message.
        if (result.nudge) {
          setNudge(result.nudge);
        }
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
  }, [sessionId, mode]);

  const resetSession = useCallback(() => {
    setSessionId(null);
    setCurrentQuestion(null);
    setEvaluations([]);
    setFollowUp(null);
    setNudge(null);
    setIsComplete(false);
    setError(null);
    localStorage.removeItem(resolvedStorageKey);
  }, [resolvedStorageKey]);

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
