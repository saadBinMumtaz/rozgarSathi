import React, { useState, useEffect, useCallback, useRef } from 'react';
import Landing from './pages/Landing';
import JDInput from './pages/JDInput';
import ModeSelection from './pages/ModeSelection';
import BehavioralInterview from './pages/BehavioralInterview';
import TechnicalInterview from './pages/TechnicalInterview';
import CodingInterview from './pages/CodingInterview';
import Results from './pages/Results';
import Dashboard from './pages/Dashboard';
import SessionHistory from './pages/SessionHistory';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import Toast from './design-system/Toast';
import { ThemeToggle } from './design-system/ThemeToggle';
import { useLanguage } from './hooks/useLanguage';
import { useTheme } from './hooks/useTheme';

const APP_STATE_KEY = 'rozgar-sathi-app-state-v1';
const USER_ID_KEY = 'rozgar-sathi-user-id';

// Pages that should trigger full cleanup (TTS, speech, timers) when navigating away
const INTERVIEW_PAGES = new Set(['behavioral-interview', 'technical-interview', 'coding-interview']);

/**
 * Centralized cleanup: stops TTS, speech synthesis, audio, and dispatches a
 * custom event so interview hooks can stop speech recognition / probe timers.
 * Called when navigating away from any interview page.
 */
const stopAllInterviewMedia = () => {
  // Stop browser speech synthesis (TTS)
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  // Pause all audio elements (cloud TTS MP3 players, etc.)
  document.querySelectorAll('audio').forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
  // Signal speech recognition hooks and probe timers to stop
  window.dispatchEvent(new CustomEvent('rozgar:interview-cleanup'));
};

export const App = () => {
  // Persistent userId — generated once, stored in localStorage, reused across all sessions
  const [userId] = useState(() => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = 'user_' + (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2));
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  });

  // Restore page from localStorage on mount (survives page reload)
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const stored = localStorage.getItem(APP_STATE_KEY);
      if (stored) {
        const { page } = JSON.parse(stored);
        if (page) return page;
      }
    } catch {}
    return 'landing';
  });
  const [jdAnalysis, setJdAnalysis] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [pendingSampleJD, setPendingSampleJD] = useState(null);
  const { language, setLanguage, isUrdu } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();

  // Track previous page to detect navigation away from interviews
  const prevPageRef = useRef(currentPage);
  // Flag: skip pushState when the page change came from browser back/forward (popstate)
  const skipPushRef = useRef(false);

  // --- Browser history integration (back/forward button support) ---
  // Push state on page changes so browser back/forward works within the app.
  // Guard: only pushState when the current history state doesn't already match
  // the target page. This prevents duplicate entries from React StrictMode
  // double-firing effects, or any other re-render that re-triggers this effect.
  useEffect(() => {
    const stateObj = { page: currentPage };
    if (skipPushRef.current) {
      // This page change came from popstate (browser back/forward) —
      // don't create a new history entry, just update the ref.
      skipPushRef.current = false;
    } else if (window.history.state?.page === currentPage) {
      // History already points to this page — nothing to do.
    } else if (!window.history.state?.page) {
      // Initial mount or no state yet — replace (no extra history entry).
      window.history.replaceState(stateObj, '', '');
    } else {
      // Genuine forward navigation — push a new history entry.
      window.history.pushState(stateObj, '', '');
    }
    prevPageRef.current = currentPage;
  }, [currentPage]);

  // Listen for browser back/forward (popstate) and sync React state
  useEffect(() => {
    const handlePopState = (event) => {
      const page = event.state?.page;
      if (page) {
        skipPushRef.current = true; // Don't pushState for this change
        setCurrentPage(page);
      } else {
        // No state — user went before the app, navigate to landing
        skipPushRef.current = true;
        setCurrentPage('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Cleanup when navigating away from interview pages ---
  // Because App.jsx uses CSS hidden (not unmount), interview components stay
  // mounted and their cleanup effects never fire. This effect detects navigation
  // away from interview pages and triggers centralized cleanup.
  useEffect(() => {
    const wasInterview = INTERVIEW_PAGES.has(prevPageRef.current);
    const isInterview = INTERVIEW_PAGES.has(currentPage);
    if (wasInterview && currentPage !== prevPageRef.current) {
      stopAllInterviewMedia();
    }
  }, [currentPage]);

  // Persist current page to localStorage with debounce to avoid excessive writes
  const localStorageTimerRef = useRef(null);
  useEffect(() => {
    if (localStorageTimerRef.current) {
      clearTimeout(localStorageTimerRef.current);
    }
    localStorageTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(APP_STATE_KEY, JSON.stringify({ page: currentPage }));
      } catch {}
    }, 100); // 100ms debounce
    return () => {
      if (localStorageTimerRef.current) {
        clearTimeout(localStorageTimerRef.current);
      }
    };
  }, [currentPage]);

  // Track which pages have been visited (to keep components mounted)
  const [visitedPages, setVisitedPages] = useState(() => {
    try {
      const stored = localStorage.getItem(APP_STATE_KEY);
      if (stored) {
        const { page } = JSON.parse(stored);
        return page ? new Set([page]) : new Set(['landing']);
      }
    } catch {}
    return new Set(['landing']);
  });

  // Update visited pages when navigating
  useEffect(() => {
    setVisitedPages((prev) => {
      const next = new Set(prev);
      next.add(currentPage);
      return next;
    });
  }, [currentPage]);

  // Helper to check if a page should be rendered
  const shouldRender = (page) => visitedPages.has(page);

  // Memoize navigation handlers to prevent unnecessary re-renders
  const handleTrySampleJD = useCallback(({ text, sampleId }) => {
    setPendingSampleJD({ text, sampleId });
    navigateTo('jd-input');
  }, []);

  const handleAnalysisComplete = useCallback((result) => {
    setJdAnalysis(result);
    setToastMessage({ type: 'success', message: 'Job Description successfully analyzed and saved to MongoDB!' });
    navigateTo('mode-selection');
  }, []);

  const handleSelectMode = useCallback((mode) => {
    setSelectedMode(mode);
    if (mode === 'behavioral') {
      navigateTo('behavioral-interview');
    } else if (mode === 'technical') {
      navigateTo('technical-interview');
    } else if (mode === 'coding') {
      navigateTo('coding-interview');
    } else {
      setToastMessage({
        type: 'info',
        message: `Selected ${mode.toUpperCase()} mode.`,
      });
    }
  }, []);

  // Wrap setCurrentPage to clear persisted state when returning to landing
  const navigateTo = (page) => {
    if (page === 'landing') {
      try {
        localStorage.removeItem(APP_STATE_KEY);
        // Clear visited pages to unmount all components and free memory
        setVisitedPages(new Set(['landing']));
        // Cleanup any running interview media before going home
        stopAllInterviewMedia();
      } catch {}
    } else if (INTERVIEW_PAGES.has(prevPageRef.current) && !INTERVIEW_PAGES.has(page)) {
      // Navigating away from an interview to a non-interview page
      stopAllInterviewMedia();
    }
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-text-primary selection:text-bg-primary">
      {/* Global theme toggle — always visible, fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} size="md" />
      </div>
      {/* Render all visited pages, hide inactive ones with CSS */}
      <div className={currentPage === 'landing' ? '' : 'hidden'}>
        {shouldRender('landing') && (
          <Landing onNavigate={navigateTo} onTrySampleJD={handleTrySampleJD} />
        )}
      </div>

      <div className={currentPage === 'jd-input' ? '' : 'hidden'}>
        {shouldRender('jd-input') && (
          <JDInput
            onAnalysisComplete={handleAnalysisComplete}
            onNavigate={navigateTo}
            pendingSampleJD={pendingSampleJD}
            onSampleJDConsumed={() => setPendingSampleJD(null)}
          />
        )}
      </div>

      <div className={currentPage === 'mode-selection' ? '' : 'hidden'}>
        {shouldRender('mode-selection') && (
          <ModeSelection
            jdAnalysis={jdAnalysis}
            onSelectMode={handleSelectMode}
            onNavigate={navigateTo}
            language={language}
            setLanguage={setLanguage}
          />
        )}
      </div>

      <div className={currentPage === 'behavioral-interview' ? '' : 'hidden'}>
        {shouldRender('behavioral-interview') && (
          <ErrorBoundary modeLabel="Behavioral Interview" onNavigate={navigateTo}>
            <BehavioralInterview
              jdAnalysisId={jdAnalysis?._id || jdAnalysis?.id}
              onNavigate={navigateTo}
              language={language}
              isUrdu={isUrdu}
              userId={userId}
            />
          </ErrorBoundary>
        )}
      </div>

      <div className={currentPage === 'technical-interview' ? '' : 'hidden'}>
        {shouldRender('technical-interview') && (
          <ErrorBoundary modeLabel="Technical Interview" onNavigate={navigateTo}>
            <TechnicalInterview
              jdAnalysisId={jdAnalysis?._id || jdAnalysis?.id}
              onNavigate={navigateTo}
              language={language}
              isUrdu={isUrdu}
              userId={userId}
            />
          </ErrorBoundary>
        )}
      </div>

      <div className={currentPage === 'coding-interview' ? '' : 'hidden'}>
        {shouldRender('coding-interview') && (
          <ErrorBoundary modeLabel="Coding Interview" onNavigate={navigateTo}>
            <CodingInterview
              jdAnalysisId={jdAnalysis?._id || jdAnalysis?.id}
              onNavigate={navigateTo}
              userId={userId}
            />
          </ErrorBoundary>
        )}
      </div>

      <div className={currentPage === 'results' ? '' : 'hidden'}>
        {shouldRender('results') && (
          <Results
            userId={userId}
            onNavigate={navigateTo}
          />
        )}
      </div>

      <div className={currentPage === 'dashboard' ? '' : 'hidden'}>
        {shouldRender('dashboard') && (
          <Dashboard
            userId={userId}
            onNavigate={navigateTo}
          />
        )}
      </div>

      <div className={currentPage === 'session-history' ? '' : 'hidden'}>
        {shouldRender('session-history') && (
          <SessionHistory
            userId={userId}
            onNavigate={navigateTo}
          />
        )}
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default App;
