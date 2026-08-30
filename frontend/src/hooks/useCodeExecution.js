// frontend/src/hooks/useCodeExecution.js
// Manages sandboxed run/submit state for the coding interview (Day 4).
// Backend contract:
//   POST /api/coding/run    -> { publicTestResults, executionError }
//   POST /api/coding/submit -> { hiddenTestResults, evaluation, executionError }
// executionError is a { type, message } fatal state (empty_code, syntax_error,
// timeout, runtime_error, forbidden_api, no_entry_function, service_unavailable)
// rendered by TestResultPanel as a distinct readable UI state.

import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

export const useCodeExecution = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicTestResults, setPublicTestResults] = useState(null);
  const [hiddenTestResults, setHiddenTestResults] = useState(null);
  const [executionError, setExecutionError] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [networkError, setNetworkError] = useState(null);

  const clearResults = useCallback(() => {
    setPublicTestResults(null);
    setHiddenTestResults(null);
    setExecutionError(null);
    setNetworkError(null);
  }, []);

  const runTests = useCallback(async (sessionId, code, language = 'javascript') => {
    setIsRunning(true);
    setNetworkError(null);
    setExecutionError(null);
    setHiddenTestResults(null);
    try {
      const result = await apiClient.runCodingTests({ sessionId, code, language });
      setPublicTestResults(result.publicTestResults || []);
      setExecutionError(result.executionError || null);
      return result;
    } catch (err) {
      const msg = err.message || '';
      const friendly = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')
        ? 'Code execution service is unreachable. Check your internet connection and try again.'
        : msg || 'Failed to run tests';
      setNetworkError(friendly);
      throw err;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const submitSolution = useCallback(async (sessionId, code, language = 'javascript') => {
    setIsSubmitting(true);
    setNetworkError(null);
    setExecutionError(null);
    try {
      const result = await apiClient.submitCodingSolution({ sessionId, code, language });
      setHiddenTestResults(result.hiddenTestResults || []);
      setExecutionError(result.executionError || null);
      if (result.evaluation) setEvaluation(result.evaluation);
      return result;
    } catch (err) {
      const msg = err.message || '';
      const friendly = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')
        ? 'Code execution service is unreachable. Your code is auto-saved locally — you can retry when the connection is back.'
        : msg || 'Failed to submit solution';
      setNetworkError(friendly);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    isRunning,
    isSubmitting,
    publicTestResults,
    hiddenTestResults,
    executionError,
    evaluation,
    networkError,
    runTests,
    submitSolution,
    clearResults,
  };
};

export default useCodeExecution;
