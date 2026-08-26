import React, { useState } from 'react';
import Landing from './pages/Landing';
import JDInput from './pages/JDInput';
import ModeSelection from './pages/ModeSelection';
import BehavioralInterview from './pages/BehavioralInterview';
import TechnicalInterview from './pages/TechnicalInterview';
import Toast from './design-system/Toast';

export const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [jdAnalysis, setJdAnalysis] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [pendingSampleJD, setPendingSampleJD] = useState(null);

  // Sec. 15.1: Landing's "Try a sample JD" hands the fixture text + sampleId
  // over to JDInput, which pre-fills the textarea and runs the analyze flow.
  const handleTrySampleJD = ({ text, sampleId }) => {
    setPendingSampleJD({ text, sampleId });
    setCurrentPage('jd-input');
  };

  const handleAnalysisComplete = (result) => {
    setJdAnalysis(result);
    setToastMessage({ type: 'success', message: 'Job Description successfully analyzed and saved to MongoDB!' });
    setCurrentPage('mode-selection');
  };

  const handleSelectMode = (mode) => {
    setSelectedMode(mode);
    if (mode === 'behavioral') {
      setCurrentPage('behavioral-interview');
    } else if (mode === 'technical') {
      setCurrentPage('technical-interview');
    } else {
      setToastMessage({
        type: 'info',
        message: `Selected ${mode.toUpperCase()} mode. (Day 5 interview logic will launch here!)`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {currentPage === 'landing' && (
        <Landing onNavigate={setCurrentPage} onTrySampleJD={handleTrySampleJD} />
      )}

      {currentPage === 'jd-input' && (
        <JDInput
          onAnalysisComplete={handleAnalysisComplete}
          onNavigate={setCurrentPage}
          pendingSampleJD={pendingSampleJD}
          onSampleJDConsumed={() => setPendingSampleJD(null)}
        />
      )}

      {currentPage === 'mode-selection' && (
        <ModeSelection
          jdAnalysis={jdAnalysis}
          onSelectMode={handleSelectMode}
          onNavigate={setCurrentPage}
        />
      )}

      {currentPage === 'behavioral-interview' && (
        <BehavioralInterview
          jdAnalysisId={jdAnalysis?._id || jdAnalysis?.id}
          onNavigate={setCurrentPage}
        />
      )}

      {currentPage === 'technical-interview' && (
        <TechnicalInterview
          jdAnalysisId={jdAnalysis?._id || jdAnalysis?.id}
          onNavigate={setCurrentPage}
        />
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

export default App;
