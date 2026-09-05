import React, { useEffect, useState } from 'react';
import { Button } from '../design-system/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { ProgressBar } from '../design-system/ProgressBar';
import { ScoreRing } from '../design-system/ScoreRing';
import { Skeleton } from '../design-system/Skeleton';
import { apiClient } from '../api/client';
import { sampleJDs, sampleSeniorityOrder } from '../data/sampleJD';
import { ArrowLeft } from 'lucide-react';
import { t } from '../i18n/translations';

export const JDInput = ({ onAnalysisComplete, onNavigate, pendingSampleJD, onSampleJDConsumed, language = 'english', isAuthenticated = false }) => {
  const [jdText, setJdText] = useState('');
  const [currentSampleId, setCurrentSampleId] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const L = (key) => t(key, language);

  // Core analyze flow — used by both the form submit and the sample-JD button
  // so the existing POST /api/jd/analyze path stays identical.
  const runAnalysis = async (text) => {
    if (!text.trim()) {
      setError(L('jdInput.errorEmpty'));
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Step 1: Analyze JD
      const jdResult = await apiClient.analyzeJD(text, currentSampleId);

      // Step 2: If résumé file attached, analyze it with linked JD
      let resumeResult = null;
      if (resumeFile) {
        try {
          resumeResult = await apiClient.analyzeResume(resumeFile, jdResult._id || jdResult.jdAnalysisId);
        } catch (resumeErr) {
          console.warn(`Résumé analysis failed: ${resumeErr.message}. Continuing without it.`);
          // Don't block the flow if résumé analysis fails
        }
      }

      setIsLoading(false);
      onAnalysisComplete({ ...jdResult, resumeAnalysis: resumeResult });
    } catch (err) {
      setIsLoading(false);
      setError(err.message || L('jdInput.errorGeneric'));
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
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 md:px-12 pb-12 space-y-8">
        {/* Back button */}
        <div className="pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(isAuthenticated ? 'landing' : 'home')}
            className="text-text-muted hover:text-text-primary"
          >
            <ArrowLeft size={16} className="mr-1" /> {L('jdInput.backHome')}
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary">{L('jdInput.title')}</h1>
          <p className="text-text-muted text-sm md:text-base">
            {L('jdInput.subtitle')}
          </p>
        </div>

        {/* Demo Score Ring & Progress Bar Component Audit Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="flex items-center gap-4 surface-text bg-surface">
            <ScoreRing score={9.0} max={10} size={55} strokeWidth={6} label="Target Fit" />
            <div>
              <h4 className="text-sm font-bold text-text-primary">{L('jdInput.twinEngine')}</h4>
              <p className="text-xs text-text-muted">{L('jdInput.twinEngineDesc')}</p>
            </div>
          </Card>

          <Card className="flex flex-col justify-center surface-text bg-surface">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-text-muted">{L('jdInput.pipeline')}</span>
              <Badge variant="success">{L('jdInput.pipelineReady')}</Badge>
            </div>
            <ProgressBar value={100} label={L('jdInput.aiValidation')} showValue={false} />
          </Card>
        </div>

        {/* Input Form Card */}
        <Card hover={false}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Description Textarea */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-text-primary">
                  {L('jdInput.jdLabel')} <span className="text-danger">*</span>
                </label>
                {/* Sample JD picker — fixtures grouped by seniority (sampleJD.js) */}
                <select
                  value=""
                  onChange={handleSampleSelect}
                  disabled={isLoading}
                  aria-label="Load a sample job description"
                  className="text-xs bg-surface rounded-md px-2 py-1.5 text-surface-text hover:border-border-strong focus:outline-none focus:border-border-strong cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    {L('jdInput.sampleJD')}
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
                placeholder={L('jdInput.jdPlaceholder')}
                rows={10}
                className="w-full bg-surface rounded-lg p-4 text-sm text-surface-text placeholder-surface-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong transition-all font-mono"
              />
            </div>

            {/* Optional Résumé Upload Field */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-text-primary">
                  {L('jdInput.resumeLabel')} <span className="text-xs text-text-muted font-normal">{L('jdInput.resumeOptional')}</span>
                </label>
                <Badge variant="secondary">Day 3 Gap Analysis</Badge>
              </div>
              <div className="surface-text flex items-center gap-4 bg-surface rounded-lg p-3">
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="text-xs text-surface-text file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:surface-text file:bg-surface-hover file:text-surface-text hover:file:bg-surface-hover"
                />
                {resumeFile && <span className="text-xs text-success font-medium">✓ {resumeFile.name} {L('jdInput.resumeAttached')}</span>}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-danger/10 rounded-lg text-xs text-danger">
                {error}
              </div>
            )}

            {/* Loading Skeleton state during AI extraction */}
            {isLoading && (
              <div className="space-y-3 py-4">
                <p className="text-xs text-icon-active animate-pulse font-medium">
                  {L('jdInput.analyzing')}
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
                {L('jdInput.submit')}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default JDInput;
