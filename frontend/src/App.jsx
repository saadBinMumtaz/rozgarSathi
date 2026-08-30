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
import SignupSignin from './pages/SignupSignin';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import Toast from './design-system/Toast';
import { ThemeToggle } from './design-system/ThemeToggle';
import { useLanguage } from './hooks/useLanguage';
import { useTheme } from './hooks/useTheme';
import { AuthProvider, useAuth } from './context/AuthContext';

const APP_STATE_KEY = 'rozgar-sathi-app-state-v1';
const USER_ID_KEY = 'rozgar-sathi-user-id';

// Pages that should trigger full cleanup (TTS, speech, timers) when navigating away
const INTERVIEW_PAGES = new Set(['behavioral-interview', 'technical-interview', 'coding-interview']);

// Protected pages — require authentication
const PROTECTED_PAGES = new Set(['dashboard', 'results', 'session-history']);

/**
 * Centralized cleanup: stops TTS, speech synthesis, audio, and dispatches a
 * custom event so interview hooks can stop speech recognition / probe timers.
 */
const stopAllInterviewMedia = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  document.querySelectorAll('audio').forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
  window.dispatchEvent(new CustomEvent('rozgar:interview-cleanup'));
};

const AppContent = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

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

  // Restore page from localStorage on mount
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
  const [showGuestModal, setShowGuestModal] = useState(false);
  const { language, setLanguage, isUrdu } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();

  const prevPageRef = useRef(currentPage);
  const skipPushRef = useRef(false);

  // --- Browser history integration ---
  useEffect(() => {
    const stateObj = { page: currentPage };
    if (skipPushRef.current) {
      skipPushRef.current = false;
    } else if (window.history.state?.page === currentPage) {
      // Already at this page
    } else if (!window.history.state?.page) {
      window.history.replaceState(stateObj, '', '');
    } else {
      window.history.pushState(stateObj, '', '');
    }
    prevPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    const handlePopState = (event) => {
      const page = event.state?.page;
      if (page) {
        skipPushRef.current = true;
        setCurrentPage(page);
      } else {
        skipPushRef.current = true;
        setCurrentPage('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Cleanup when navigating away from interview pages ---
  useEffect(() => {
    const wasInterview = INTERVIEW_PAGES.has(prevPageRef.current);
    const isInterview = INTERVIEW_PAGES.has(currentPage);
    if (wasInterview && currentPage !== prevPageRef.current) {
      stopAllInterviewMedia();
    }
  }, [currentPage]);

  // --- Auth guard: redirect from protected pages if not authenticated ---
  useEffect(() => {
    if (authLoading) return;
    if (PROTECTED_PAGES.has(currentPage) && !isAuthenticated) {
      setShowGuestModal(true);
      setCurrentPage('landing');
    }
  }, [currentPage, isAuthenticated, authLoading]);

  // Persist current page
  const localStorageTimerRef = useRef(null);
  useEffect(() => {
    if (localStorageTimerRef.current) clearTimeout(localStorageTimerRef.current);
    localStorageTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(APP_STATE_KEY, JSON.stringify({ page: currentPage }));
      } catch {}
    }, 100);
    return () => {
      if (localStorageTimerRef.current) clearTimeout(localStorageTimerRef.current);
    };
  }, [currentPage]);

  // Track visited pages
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

  useEffect(() => {
    setVisitedPages((prev) => {
      const next = new Set(prev);
      next.add(currentPage);
      return next;
    });
  }, [currentPage]);

  const shouldRender = (page) => visitedPages.has(page);

  // Navigation handler with auth guard
  const navigateTo = (page) => {
    if (page === 'landing') {
      try {
        localStorage.removeItem(APP_STATE_KEY);
        setVisitedPages(new Set(['landing']));
        stopAllInterviewMedia();
      } catch {}
    } else if (INTERVIEW_PAGES.has(prevPageRef.current) && !INTERVIEW_PAGES.has(page)) {
      stopAllInterviewMedia();
    }

    // Auth guard for protected pages
    if (PROTECTED_PAGES.has(page) && !isAuthenticated) {
      setShowGuestModal(true);
      return;
    }

    setCurrentPage(page);
  };

  const handleTrySampleJD = useCallback(({ text, sampleId }) => {
    setPendingSampleJD({ text, sampleId });
    navigateTo('jd-input');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalysisComplete = useCallback((result) => {
    setJdAnalysis(result);
    setToastMessage({ type: 'success', message: 'Job Description successfully analyzed and saved to MongoDB!' });
    navigateTo('mode-selection');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuthComplete = useCallback(() => {
    setToastMessage({ type: 'success', message: 'Welcome! You are now signed in.' });
    navigateTo('landing');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading while auth is being restored
  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-text-primary flex items-center justify-center font-black text-xl text-bg-primary mx-auto">
            RS
          </div>
          <p className="text-sm text-text-muted animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-text-primary selection:text-bg-primary">
      {/* Global theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} size="md" />
      </div>

      {/* Auth page */}
      <div className={currentPage === 'auth' ? '' : 'hidden'}>
        {shouldRender('auth') && (
          <SignupSignin
            onNavigate={navigateTo}
            onAuthComplete={handleAuthComplete}
            guestId={userId}
          />
        )}
      </div>

      {/* Landing page */}
      <div className={currentPage === 'landing' ? '' : 'hidden'}>
        {shouldRender('landing') && (
          <Landing
            onNavigate={navigateTo}
            onTrySampleJD={handleTrySampleJD}
            isAuthenticated={isAuthenticated}
            user={user}
            isDark={isDark}
          />
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
              userId={isAuthenticated && user ? String(user._id) : userId}
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
              userId={isAuthenticated && user ? String(user._id) : userId}
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
              userId={isAuthenticated && user ? String(user._id) : userId}
            />
          </ErrorBoundary>
        )}
      </div>

      <div className={currentPage === 'results' ? '' : 'hidden'}>
        {shouldRender('results') && (
          <Results
            userId={isAuthenticated && user ? String(user._id) : userId}
            onNavigate={navigateTo}
          />
        )}
      </div>

      <div className={currentPage === 'dashboard' ? '' : 'hidden'}>
        {shouldRender('dashboard') && (
          <Dashboard
            userId={isAuthenticated && user ? String(user._id) : userId}
            onNavigate={navigateTo}
          />
        )}
      </div>

      <div className={currentPage === 'session-history' ? '' : 'hidden'}>
        {shouldRender('session-history') && (
          <SessionHistory
            userId={isAuthenticated && user ? String(user._id) : userId}
            onNavigate={navigateTo}
          />
        )}
      </div>

      {/* Guest signup modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="surface-text bg-surface rounded-xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-text-primary/20 flex items-center justify-center mx-auto">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-bold text-text-primary">Sign Up to Track Progress</h3>
              <p className="text-sm text-text-muted">
                Create a free account to save your interview sessions, view your dashboard, and track your readiness scores over time.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowGuestModal(false);
                  navigateTo('auth');
                }}
                className="w-full bg-text-primary text-bg-primary hover:opacity-90 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
              >
                Create Account / Sign In
              </button>
              <button
                onClick={() => {
                  setShowGuestModal(false);
                  navigateTo('landing');
                }}
                className="w-full surface-text bg-surface-hover text-text-muted hover:bg-surface-hover/80 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
              >
                Continue as Guest
              </button>
            </div>

            <p className="text-xs text-text-muted text-center">
              Guest sessions are temporary. Sign up to keep your progress.
            </p>
          </div>
        </div>
      )}

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

export const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
