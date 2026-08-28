import React, { useState, useEffect, useCallback, useRef } from 'react';
import Landing from './pages/Landing';
import JDInput from './pages/JDInput';
import ModeSelection from './pages/ModeSelection';
import BehavioralInterview from './pages/BehavioralInterview';
import TechnicalInterview from './pages/TechnicalInterview';
import CodingInterview from './pages/CodingInterview';
import Toast from './design-system/Toast';
import { useLanguage } from './hooks/useLanguage';

const APP_STATE_KEY = 'rozgar-sathi-app-state-v1';

export const App = () => {
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
      } catch {}
    }
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
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
          <BehavioralInterview
            jdAnalysisId={jdAnalysis?._id || jdAnalysis?.id}
            onNavigate={navigateTo}
            language={language}
            isUrdu={isUrdu}
          />
        )}
      </div>

      <div className={currentPage === 'technical-interview' ? '' : 'hidden'}>
        {shouldRender('technical-interview') && (
          <TechnicalInterview
            jdAnalysisId={jdAnalysis?._id || jdAnalysis?.id}
            onNavigate={navigateTo}
            language={language}
            isUrdu={isUrdu}
          />
        )}
      </div>

      <div className={currentPage === 'coding-interview' ? '' : 'hidden'}>
        {shouldRender('coding-interview') && (
          <CodingInterview
            jdAnalysisId={jdAnalysis?._id || jdAnalysis?.id}
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
