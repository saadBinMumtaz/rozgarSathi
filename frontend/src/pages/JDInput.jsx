import React, { useEffect, useState } from 'react';
import { Button } from '../design-system/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { ProgressBar } from '../design-system/ProgressBar';
import { ScoreRing } from '../design-system/ScoreRing';
import { Skeleton } from '../design-system/Skeleton';
import { apiClient } from '../api/client';
import { sampleJDs, sampleSeniorityOrder } from '../data/sampleJD';

export const JDInput = ({ onAnalysisComplete, onNavigate, pendingSampleJD, onSampleJDConsumed }) => {
  const [jdText, setJdText] = useState('');
  const [currentSampleId, setCurrentSampleId] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Core analyze flow — used by both the form submit and the sample-JD button
  // so the existing POST /api/jd/analyze path stays identical.
  const runAnalysis = async (text) => {
    if (!text.trim()) {
      setError('Please paste a Job Description before proceeding.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await apiClient.analyzeJD(text, currentSampleId);
      setIsLoading(false);
      onAnalysisComplete(result);
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Failed to analyze Job Description. Please try again.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runAnalysis(jdText);
  };

  // Sec. 15.1: pick a sample JD (grouped by seniority) and pre-fill the
  // textarea. The user clicks "Analyze JD & Select Interview Mode" to run.
  const handleSampleSelect = (e) => {
    const sample = sampleJDs.find((s) => s.id === e.target.value);
    if (!sample) return;
    setJdText(sample.text);
    setCurrentSampleId(sample.id);
  };

  // Auto-fill when arriving from the Landing page's "Try a sample JD" picker.
  // The user then clicks Analyze to run.
  useEffect(() => {
    if (pendingSampleJD) {
      setJdText(pendingSampleJD.text);
      setCurrentSampleId(pendingSampleJD.sampleId);
      onSampleJDConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-8">
        <Button
          variant="link"
          className="text-slate-400 hover:text-white flex items-center gap-2"
          onClick={() => onNavigate('landing')}
        >
          ← Back to Home
        </Button>
        <Badge variant="primary">Step 1 of 2: Job Context</Badge>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">Paste Job Description</h1>
          <p className="text-slate-400 text-sm md:text-base">
            Rozgar Sathi will analyze key technical skills, experience level, and behavioral competencies.
          </p>
        </div>

        {/* Demo Score Ring & Progress Bar Component Audit Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="flex items-center gap-4 bg-slate-900/40">
            <ScoreRing score={9.0} max={10} size={55} strokeWidth={6} label="Target Fit" />
            <div>
              <h4 className="text-sm font-bold text-slate-200">Personalized Twin Engine</h4>
              <p className="text-xs text-slate-400">Questions are 100% matched to your pasted job context.</p>
            </div>
          </Card>

          <Card className="flex flex-col justify-center bg-slate-900/40">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-300">Extraction Pipeline</span>
              <Badge variant="success">Ready</Badge>
            </div>
            <ProgressBar value={100} label="AI Schema Validation" showValue={false} />
          </Card>
        </div>

        {/* Input Form Card */}
        <Card hover={false}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Description Textarea */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-200">
                  Job Description Text <span className="text-rose-400">*</span>
                </label>
                {/* Sample JD picker — fixtures grouped by seniority (sampleJD.js) */}
                <select
                  value=""
                  onChange={handleSampleSelect}
                  disabled={isLoading}
                  aria-label="Load a sample job description"
                  className="text-xs bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-indigo-300 hover:border-indigo-500 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    ✨ Try a sample JD…
                  </option>
                  {sampleSeniorityOrder.map((group) => (
                    <optgroup key={group} label={group}>
                      {sampleJDs
                        .filter((s) => s.seniority === group)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <textarea
                value={jdText}
                onChange={(e) => {
                  setJdText(e.target.value);
                  setCurrentSampleId(null); // manual edit ≠ sample
                }}
                placeholder="Paste the full job description text here..."
                rows={10}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>

            {/* Optional Résumé Upload Field */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-200">
                  Candidate Résumé <span className="text-xs text-slate-500 font-normal">(Optional — PDF/Text)</span>
                </label>
                <Badge variant="secondary">Day 3 Gap Analysis</Badge>
              </div>
              <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-lg p-3">
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700"
                />
                {resumeFile && <span className="text-xs text-emerald-400 font-medium">✓ {resumeFile.name} attached</span>}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
                {error}
              </div>
            )}

            {/* Loading Skeleton state during AI extraction */}
            {isLoading && (
              <div className="space-y-3 py-4">
                <p className="text-xs text-indigo-400 animate-pulse font-medium">
                  ⚡ Analyzing Job Description with Qwen AI...
                </p>
                <Skeleton height="h-4" width="w-3/4" />
                <Skeleton height="h-4" width="w-1/2" />
                <Skeleton height="h-4" width="w-5/6" />
              </div>
            )}

            {/* Submit CTA */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                size="lg"
                variant="primary"
                isLoading={isLoading}
                disabled={!jdText.trim()}
              >
                Analyze JD & Select Interview Mode →
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default JDInput;
