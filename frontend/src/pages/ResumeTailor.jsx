// frontend/src/pages/ResumeTailor.jsx
// AI Resume Tailoring feature - multi-step flow.
// Upload resume → Provide JD → Analyze → Preview → Download PDF.

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { ProgressBar } from '../design-system/ProgressBar';
import { apiClient } from '../api/client';
import { Upload, FileText, Sparkles, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { t } from '../i18n/translations';

const STEPS_KEYS = ['resumeTailor.stepUpload', 'resumeTailor.stepJD', 'resumeTailor.stepAnalysis', 'resumeTailor.stepPreview'];

export const ResumeTailor = ({ onNavigate, isDark = false, prefilledJob = null, language = 'english' }) => {
  const L = (key) => t(key, language);
  const [currentStep, setCurrentStep] = useState(0);
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState(prefilledJob?.description || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showHighlight, setShowHighlight] = useState(false);

  // Track which job we last initialized for, so we reset when it changes
  const lastJobRef = useRef(prefilledJob);

  // When a new job is selected (different object reference), reset ALL state
  // so the user starts fresh from Step 1 with no data leakage from the previous session.
  useEffect(() => {
    if (prefilledJob && prefilledJob !== lastJobRef.current) {
      lastJobRef.current = prefilledJob;
      setCurrentStep(0);
      setResumeFile(null);
      setJobDescription(prefilledJob.description || '');
      setIsProcessing(false);
      setError(null);
      setResult(null);
    }
  }, [prefilledJob]);

  // Compute diff between original and tailored resume for change highlighting
  const diffChanges = React.useMemo(() => {
    if (!result?.originalResumeData || !result?.tailoredResume) return null;
    const orig = result.originalResumeData;
    const tailored = result.tailoredResume;
    const summaryChanged = (orig.summary || '') !== (tailored.summary || '');
    const projectChanges = (orig.projects || []).map((op, i) => {
      const tp = tailored.projects?.[i];
      if (!tp) return { name: op.name, changed: true, origBullets: op.bullets || [op.description].filter(Boolean), newBullets: [] };
      const origB = op.bullets || [op.description].filter(Boolean);
      const newB = tp.bullets || [tp.description].filter(Boolean);
      const changed = origB.join('|') !== newB.join('|') || op.name !== tp.name;
      return { name: tp.name || op.name, changed, origBullets: origB, newBullets: newB };
    });
    const skillChanges = {};
    ['languages', 'frameworks', 'databases', 'developerTools', 'softSkills', 'technical', 'tools'].forEach(cat => {
      const o = orig.skills?.[cat] || [];
      const t = tailored.skills?.[cat] || [];
      if (o.join(',') !== t.join(',')) {
        skillChanges[cat] = {
          added: t.filter(s => !o.map(x => x.toLowerCase()).includes(s.toLowerCase())),
          removed: o.filter(s => !t.map(x => x.toLowerCase()).includes(s.toLowerCase())),
          reordered: o.join(',') !== t.join(',') && t.filter(s => !o.map(x => x.toLowerCase()).includes(s.toLowerCase())).length === 0,
        };
      }
    });
    const orderChanged = (orig.projects || []).map(p => p.name).join('|') !== (tailored.projects || []).map(p => p.name).join('|');
    return { summaryChanged, projectChanges, skillChanges, orderChanged };
  }, [result]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      
      if (validTypes.includes(file.type) || validExtensions.includes(ext)) {
        setResumeFile(file);
        setError(null);
      } else {
        setError(L('resumeTailor.errorUpload'));
      }
    }
  };

  const handleAnalyze = async () => {
    if (!resumeFile || !jobDescription.trim()) {
      setError(L('resumeTailor.errorBothRequired'));
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const data = await apiClient.tailorResume(resumeFile, jobDescription);
      setResult(data);
      setCurrentStep(2); // Move to analysis step
    } catch (err) {
      setError(err.message || L('resumeTailor.errorGeneric'));
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePDF = () => {
    if (!result?.tailoredResume) return;

    const doc = new jsPDF();
    const resume = result.tailoredResume;
    const pageW = 210;
    const pageH = 297;
    const marginL = 15;
    const marginR = 15;
    const contentW = pageW - marginL - marginR;
    let y = 15;

    const checkPage = (needed) => {
      if (y + needed > pageH - 15) {
        doc.addPage();
        y = 15;
      }
    };

    const drawSectionHeader = (title) => {
      checkPage(12);
      y += 2;
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text(title.toUpperCase(), marginL, y);
      y += 1.5;
      doc.setDrawColor(0);
      doc.setLineWidth(0.4);
      doc.line(marginL, y, pageW - marginR, y);
      y += 5;
    };

    const drawBullet = (text, indent = marginL + 3) => {
      doc.setFontSize(9.5);
      doc.setFont('times', 'normal');
      const bulletText = `\u2022  ${text}`;
      const lines = doc.splitTextToSize(bulletText, contentW - 6);
      checkPage(lines.length * 4.5 + 2);
      doc.text(lines, indent, y);
      y += lines.length * 4.5 + 1.5;
    };

    // ── HEADER: Name ──
    doc.setFontSize(18);
    doc.setFont('times', 'bold');
    doc.text(resume.contact?.name || 'Your Name', pageW / 2, y, { align: 'center' });
    y += 7;

    // ── Contact line (with clickable URLs) ──
    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    const contactParts = [];
    if (resume.contact?.email) contactParts.push({ text: resume.contact.email, url: `mailto:${resume.contact.email}` });
    if (resume.contact?.phone) contactParts.push({ text: resume.contact.phone });
    if (resume.contact?.linkedin) {
      const li = resume.contact.linkedin;
      const liUrl = li.startsWith('http') ? li : `https://linkedin.com/in/${li}`;
      contactParts.push({ text: li, url: liUrl });
    }
    if (resume.contact?.github) {
      const gh = resume.contact.github;
      const ghUrl = gh.startsWith('http') ? gh : `https://github.com/${gh}`;
      contactParts.push({ text: gh, url: ghUrl });
    }
    if (resume.contact?.portfolio) {
      const pf = resume.contact.portfolio;
      contactParts.push({ text: pf, url: pf.startsWith('http') ? pf : `https://${pf}` });
    }
    if (contactParts.length > 0) {
      const sep = '  |  ';
      const sepW = doc.getTextWidth(sep);
      const widths = contactParts.map(p => doc.getTextWidth(p.text));
      const totalW = widths.reduce((a, b) => a + b, 0) + sepW * (contactParts.length - 1);
      let cx = (pageW - totalW) / 2;
      contactParts.forEach((part, i) => {
        if (part.url) {
          doc.setTextColor(0, 51, 204);
          doc.text(part.text, cx, y);
          const tw = widths[i];
          doc.setLineWidth(0.15);
          doc.line(cx, y + 0.8, cx + tw, y + 0.8);
          doc.link(cx, y - doc.internal.getLineHeight() + doc.internal.getFontSize() * 0.85, tw, doc.internal.getFontSize() + 2, { type: 'uri', url: part.url });
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setTextColor(0, 0, 0);
          doc.text(part.text, cx, y);
        }
        cx += widths[i] + (i < contactParts.length - 1 ? sepW : 0);
      });
      y += 6;
    }

    // ── EDUCATION ──
    if (resume.education?.length > 0) {
      drawSectionHeader('Education');
      resume.education.forEach((edu) => {
        checkPage(15);
        const degreeLine = edu.degree ? (edu.field ? `${edu.degree} in ${edu.field}` : edu.degree) : '';
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.text(degreeLine, marginL, y);
        // Date on the right
        if (edu.dates || edu.graduationDate) {
          const dateStr = edu.dates || edu.graduationDate;
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          const dateW = doc.getTextWidth(dateStr);
          doc.text(dateStr, pageW - marginR - dateW, y);
        }
        y += 5;
        doc.setFontSize(9.5);
        doc.setFont('times', 'normal');
        const instLine = [edu.institution, edu.gpa ? `GPA: ${edu.gpa}` : ''].filter(Boolean).join('  |  ');
        doc.text(instLine, marginL, y);
        y += 5;
        if (edu.coursework?.length > 0) {
          doc.setFontSize(9);
          const cwText = `Coursework: ${edu.coursework.join(', ')}`;
          const cwLines = doc.splitTextToSize(cwText, contentW);
          doc.text(cwLines, marginL, y);
          y += cwLines.length * 4.5 + 1;
        }
        y += 1;
      });
    }

    // ── PROJECTS ──
    if (resume.projects?.length > 0) {
      drawSectionHeader('Projects');
      resume.projects.forEach((proj) => {
        checkPage(20);
        // Project name
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.text(proj.name, marginL, y);
        y += 5;
        // Subtitle if present
        if (proj.subtitle) {
          doc.setFontSize(9);
          doc.setFont('times', 'italic');
          doc.text(proj.subtitle, marginL, y);
          y += 4.5;
        }
        // Bullet points
        const bullets = proj.bullets || (proj.description ? [proj.description] : []);
        bullets.forEach((b) => drawBullet(b));
        // Technologies
        if (proj.technologies?.length > 0) {
          doc.setFontSize(9);
          doc.setFont('times', 'italic');
          const techText = `Technologies: ${proj.technologies.join(', ')}`;
          const techLines = doc.splitTextToSize(techText, contentW);
          checkPage(techLines.length * 4.5 + 2);
          doc.text(techLines, marginL, y);
          y += techLines.length * 4.5 + 2;
        }
        y += 2;
      });
    }

    // ── SKILLS ──
    const skillCategories = [
      { key: 'languages', label: 'Languages' },
      { key: 'frameworks', label: 'Frameworks & Libraries' },
      { key: 'databases', label: 'Databases' },
      { key: 'developerTools', label: 'Developer Tools' },
      { key: 'softSkills', label: 'Soft Skills' },
      // Fallback for old format
      { key: 'technical', label: 'Technical Skills' },
      { key: 'tools', label: 'Tools' },
    ];
    const hasSkills = skillCategories.some(c => resume.skills?.[c.key]?.length > 0);
    if (hasSkills) {
      drawSectionHeader('Skills');
      skillCategories.forEach((cat) => {
        const items = resume.skills?.[cat.key];
        if (items?.length > 0) {
          checkPage(8);
          doc.setFontSize(9.5);
          doc.setFont('times', 'bold');
          doc.text(`${cat.label}:`, marginL, y);
          const labelW = doc.getTextWidth(`${cat.label}: `);
          doc.setFont('times', 'normal');
          const skillText = items.join(', ');
          const skillLines = doc.splitTextToSize(skillText, contentW - labelW);
          // First line next to label, rest indented
          doc.text(skillLines[0], marginL + labelW, y);
          if (skillLines.length > 1) {
            y += 4.5;
            doc.text(skillLines.slice(1), marginL + labelW, y);
          }
          y += skillLines.length * 4.5 + 1.5;
        }
      });
    }

    // ── CERTIFICATIONS ──
    if (resume.certifications?.length > 0) {
      drawSectionHeader('Certifications & Courses');
      resume.certifications.forEach((cert) => {
        checkPage(8);
        const certName = typeof cert === 'string' ? cert : (cert.name || '');
        const issuer = typeof cert === 'object' ? cert.issuer : '';
        const date = typeof cert === 'object' ? cert.date : '';
        doc.setFontSize(9.5);
        doc.setFont('times', 'normal');
        const certLine = [certName, issuer].filter(Boolean).join(' — ');
        const lines = doc.splitTextToSize(`\u2022  ${certLine}`, contentW - 3);
        doc.text(lines, marginL + 3, y);
        y += lines.length * 4.5;
        if (date) {
          doc.setFontSize(8.5);
          doc.setFont('times', 'italic');
          doc.text(date, marginL + 6, y);
          y += 4;
        }
      });
    }

    // ── EXPERIENCE ──
    if (resume.experience?.length > 0) {
      drawSectionHeader('Professional Experience');
      resume.experience.forEach((exp) => {
        checkPage(18);
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.text(exp.title || '', marginL, y);
        if (exp.startDate || exp.endDate) {
          const dateStr = `${exp.startDate || ''} - ${exp.endDate || ''}`;
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          const dateW = doc.getTextWidth(dateStr);
          doc.text(dateStr, pageW - marginR - dateW, y);
        }
        y += 5;
        doc.setFontSize(9.5);
        doc.setFont('times', 'italic');
        doc.text(exp.company || '', marginL, y);
        y += 5;
        const bullets = exp.bullets || exp.responsibilities || [];
        bullets.forEach((b) => drawBullet(b));
        y += 2;
      });
    }

    // ── SUMMARY (only if no other sections, otherwise skip) ──
    if (resume.summary && !resume.education?.length && !resume.projects?.length && !resume.experience?.length) {
      drawSectionHeader('Summary');
      doc.setFontSize(9.5);
      doc.setFont('times', 'normal');
      const lines = doc.splitTextToSize(resume.summary, contentW);
      doc.text(lines, marginL, y);
      y += lines.length * 4.5;
    }

    doc.save('tailored-resume.pdf');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Upload Resume
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#111111' }}>
                {L('resumeTailor.uploadTitle')}
              </h2>
              <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                {L('resumeTailor.uploadFormats')}
              </p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: isDark ? '#374151' : '#d1d5db' }}>
              <Upload size={48} className="mx-auto mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }} />
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                  color: '#ffffff',
                }}
              >
                <FileText size={20} />
                {L('resumeTailor.chooseFile')}
              </label>
              {resumeFile && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <CheckCircle2 size={20} className="text-green-500" />
                  <span className="text-sm font-medium" style={{ color: isDark ? '#ffffff' : '#111111' }}>
                    {resumeFile.name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentStep(1)}
                disabled={!resumeFile}
                className="px-6 py-2"
              >
                {L('resumeTailor.nextJD')}
              </Button>
            </div>
          </div>
        );

      case 1: // Job Description
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#111111' }}>
                {prefilledJob ? L('resumeTailor.prefilledTitle') : L('resumeTailor.pasteJDTitle')}
              </h2>
              <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                {prefilledJob
                  ? `${L('resumeTailor.tailoringFor')} ${prefilledJob.title} ${prefilledJob.company}`
                  : L('resumeTailor.pasteBelow')}
              </p>
            </div>

            {prefilledJob && (
              <div className="p-4 rounded-lg border" style={{ backgroundColor: isDark ? '#1f2937' : '#f9fafb', borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-blue-500" />
                  <span className="font-medium text-sm" style={{ color: isDark ? '#ffffff' : '#111111' }}>
                    {prefilledJob.title}
                  </span>
                </div>
                <div className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {prefilledJob.company} • {prefilledJob.location}
                </div>
              </div>
            )}

            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder={L('resumeTailor.jdPlaceholder')}
              rows={12}
              className="w-full rounded-lg p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                color: isDark ? '#ffffff' : '#111111',
                border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
              }}
            />

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(0)}
                className="px-6 py-2"
              >
                {L('resumeTailor.back')}
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!jobDescription.trim() || isProcessing}
                className="px-6 py-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {L('resumeTailor.processing')}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    {L('resumeTailor.analyzeTailor')}
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 2: // Analysis
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#111111' }}>
                {L('resumeTailor.matchAnalysis')}
              </h2>
              {result?.completenessFailed && (
                <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-600 font-semibold flex items-center gap-2 mb-1">
                    <AlertCircle size={16} />
                    {L('resumeTailor.completenessFailed')}
                  </p>
                  <p className="text-xs text-red-500 ml-6">{result.validationWarning}</p>
                  <div className="mt-3 flex justify-center gap-3">
                    <Button onClick={handleAnalyze} className="px-4 py-2 text-sm">
                      <Loader2 size={14} className="mr-1" />
                      {L('resumeTailor.tryAgain')}
                    </Button>
                    <Button variant="ghost" onClick={() => setCurrentStep(3)} className="px-4 py-2 text-sm">
                      {L('resumeTailor.viewAnyway')}
                    </Button>
                  </div>
                </div>
              )}
              {result?.validationWarning && !result?.completenessFailed && (
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-sm text-yellow-600 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {result.validationWarning}
                  </p>
                </div>
              )}
            </div>

            {result?.analysis && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Match Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{L('resumeTailor.matchScore')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#111111' }}>
                        {result.analysis.matchScore}%
                      </div>
                      <ProgressBar progress={result.analysis.matchScore} />
                    </div>
                  </CardContent>
                </Card>

                {/* Matched Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{L('resumeTailor.matchedSkills')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.analysis.matchedSkills?.map((skill, idx) => (
                        <Badge key={idx} variant="success">{skill}</Badge>
                      ))}
                      {result.analysis.matchedSkills?.length === 0 && (
                        <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{L('resumeTailor.noMatched')}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Missing Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{L('resumeTailor.missingSkills')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.analysis.missingSkills?.map((skill, idx) => (
                        <Badge key={idx} variant="warning">{skill}</Badge>
                      ))}
                      {result.analysis.missingSkills?.length === 0 && (
                        <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{L('resumeTailor.noMissing')}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Changes Made */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{L('resumeTailor.whatChanged')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {result.analysis.changesMade?.map((change, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span style={{ color: isDark ? '#d1d5db' : '#374151' }}>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                onClick={() => setCurrentStep(3)}
                className="px-8 py-3 text-lg"
              >
                <Sparkles size={20} />
                {L('resumeTailor.viewTailored')}
              </Button>
            </div>
          </div>
        );

      case 3: // Preview — professional resume layout
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: isDark ? '#ffffff' : '#111111' }}>
                  {L('resumeTailor.previewTitle')}
                </h2>
                <p className="text-xs mt-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {L('resumeTailor.previewDesc')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowHighlight(!showHighlight)}
                  className="px-4 py-2 text-sm"
                >
                  {showHighlight ? L('resumeTailor.hideChanges') : L('resumeTailor.showChanges')}
                </Button>
                <Button onClick={generatePDF} className="px-5 py-2">
                  <Download size={16} className="mr-2" />
                  {L('resumeTailor.downloadPDF')}
                </Button>
              </div>
            </div>

            {result?.usedFallback && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-600 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {L('resumeTailor.fallbackWarning')}
                </p>
              </div>
            )}

            {/* Resume document */}
            {result?.tailoredResume && (
              <div
                className="mx-auto shadow-lg"
                style={{
                  maxWidth: '800px',
                  backgroundColor: '#ffffff',
                  color: '#1a1a1a',
                  padding: '40px 48px',
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  lineHeight: '1.4',
                  border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                }}
              >
                {/* Name */}
                <div className="text-center pb-3" style={{ borderBottom: '2px solid #1a1a1a' }}>
                  <h1 className="text-3xl font-bold tracking-wide" style={{ color: '#1a1a1a', fontFamily: 'Georgia, serif', margin: 0 }}>
                    {result.tailoredResume.contact?.name}
                  </h1>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-xs" style={{ color: '#444' }}>
                    {result.tailoredResume.contact?.email && <span>{result.tailoredResume.contact.email}</span>}
                    {result.tailoredResume.contact?.phone && <><span>|</span><span>{result.tailoredResume.contact.phone}</span></>}
                    {result.tailoredResume.contact?.linkedin && <><span>|</span><span>{result.tailoredResume.contact.linkedin}</span></>}
                    {result.tailoredResume.contact?.github && <><span>|</span><span>{result.tailoredResume.contact.github}</span></>}
                  </div>
                </div>

                {/* Education */}
                {result.tailoredResume.education?.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase pb-1 mb-2" style={{ color: '#1a1a1a', borderBottom: '1px solid #1a1a1a', fontFamily: 'Georgia, serif' }}>
                      Education
                    </h2>
                    {result.tailoredResume.education.map((edu, idx) => (
                      <div key={idx} className="mb-2">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-sm" style={{ color: '#1a1a1a' }}>
                            {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                          </span>
                          <span className="text-xs flex-shrink-0 ml-4" style={{ color: '#555' }}>
                            {edu.dates || edu.graduationDate || ''}
                          </span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#444' }}>
                          {[edu.institution, edu.gpa ? `GPA: ${edu.gpa}` : ''].filter(Boolean).join(' | ')}
                        </div>
                        {edu.coursework?.length > 0 && (
                          <div className="text-xs mt-0.5 italic" style={{ color: '#555' }}>
                            Coursework: {edu.coursework.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {result.tailoredResume.projects?.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase pb-1 mb-2" style={{ color: '#1a1a1a', borderBottom: '1px solid #1a1a1a', fontFamily: 'Georgia, serif' }}>
                      Projects
                    </h2>
                    {result.tailoredResume.projects.map((proj, idx) => {
                      const bullets = proj.bullets || (proj.description ? [proj.description] : []);
                      return (
                        <div key={idx} className="mb-3">
                          <div className="font-bold text-sm" style={{ color: '#1a1a1a' }}>
                            {proj.name}
                          </div>
                          {proj.subtitle && (
                            <div className="text-xs italic mb-1" style={{ color: '#555' }}>{proj.subtitle}</div>
                          )}
                          {bullets.map((b, bi) => (
                            <div key={bi} className="flex items-start gap-2 text-xs ml-3" style={{ color: '#333' }}>
                              <span style={{ color: '#1a1a1a' }}>{'\u2022'}</span>
                              <span>{b}</span>
                            </div>
                          ))}
                          {proj.technologies?.length > 0 && (
                            <div className="text-xs mt-1 italic" style={{ color: '#555' }}>
                              Technologies: {proj.technologies.join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Skills */}
                {(() => {
                  const s = result.tailoredResume.skills;
                  const cats = [
                    { key: 'languages', label: 'Languages' },
                    { key: 'frameworks', label: 'Frameworks & Libraries' },
                    { key: 'databases', label: 'Databases' },
                    { key: 'developerTools', label: 'Developer Tools' },
                    { key: 'softSkills', label: 'Soft Skills' },
                    { key: 'technical', label: 'Technical Skills' },
                    { key: 'tools', label: 'Tools' },
                  ];
                  const active = cats.filter(c => s?.[c.key]?.length > 0);
                  if (active.length === 0) return null;
                  return (
                    <div className="mt-4">
                      <h2 className="text-sm font-bold tracking-widest uppercase pb-1 mb-2" style={{ color: '#1a1a1a', borderBottom: '1px solid #1a1a1a', fontFamily: 'Georgia, serif' }}>
                        Skills
                      </h2>
                      {active.map((cat) => (
                        <div key={cat.key} className="text-xs mb-1" style={{ color: '#333' }}>
                          <span className="font-bold" style={{ color: '#1a1a1a' }}>{cat.label}: </span>
                          <span>{s[cat.key].join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Certifications */}
                {result.tailoredResume.certifications?.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase pb-1 mb-2" style={{ color: '#1a1a1a', borderBottom: '1px solid #1a1a1a', fontFamily: 'Georgia, serif' }}>
                      Certifications & Courses
                    </h2>
                    {result.tailoredResume.certifications.map((cert, idx) => {
                      const name = typeof cert === 'string' ? cert : (cert.name || '');
                      const issuer = typeof cert === 'object' ? cert.issuer : '';
                      return (
                        <div key={idx} className="flex items-start gap-2 text-xs ml-3 mb-1" style={{ color: '#333' }}>
                          <span style={{ color: '#1a1a1a' }}>{'\u2022'}</span>
                          <span>{name}{issuer ? ` \u2014 ${issuer}` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Experience */}
                {result.tailoredResume.experience?.length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase pb-1 mb-2" style={{ color: '#1a1a1a', borderBottom: '1px solid #1a1a1a', fontFamily: 'Georgia, serif' }}>
                      Professional Experience
                    </h2>
                    {result.tailoredResume.experience.map((exp, idx) => {
                      const bullets = exp.bullets || exp.responsibilities || [];
                      return (
                        <div key={idx} className="mb-3">
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-sm" style={{ color: '#1a1a1a' }}>{exp.title}</span>
                            <span className="text-xs flex-shrink-0 ml-4" style={{ color: '#555' }}>
                              {exp.startDate}{exp.endDate ? ` \u2013 ${exp.endDate}` : ''}
                            </span>
                          </div>
                          <div className="text-xs italic mb-1" style={{ color: '#555' }}>{exp.company}</div>
                          {bullets.map((b, bi) => (
                            <div key={bi} className="flex items-start gap-2 text-xs ml-3" style={{ color: '#333' }}>
                              <span style={{ color: '#1a1a1a' }}>{'\u2022'}</span>
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center gap-4 pt-2">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2"
              >
                {L('resumeTailor.backToAnalysis')}
              </Button>
            </div>

            {/* Change Highlight Panel */}
            {showHighlight && diffChanges && (
              <div
                className="mx-auto mt-4 p-5 rounded-lg border"
                style={{
                  maxWidth: '800px',
                  backgroundColor: isDark ? '#111827' : '#f9fafb',
                  borderColor: isDark ? '#374151' : '#e5e7eb',
                }}
              >
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#111111' }}>
                  <Sparkles size={16} className="text-blue-500" />
                  {L('resumeTailor.changesTitle')}
                </h3>
                <p className="text-xs mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  <span className="inline-block w-3 h-3 mr-1" style={{ backgroundColor: '#22c55e33', border: '1px solid #22c55e' }}></span>
                  {L('resumeTailor.greenAdded')} &nbsp;&nbsp;
                  <span className="inline-block w-3 h-3 mr-1" style={{ backgroundColor: '#ef444433', border: '1px solid #ef4444' }}></span>
                  {L('resumeTailor.redRemoved')} &nbsp;&nbsp;
                  <span className="text-xs italic">{L('resumeTailor.pdfClean')}</span>
                </p>

                {/* Summary change */}
                {diffChanges.summaryChanged && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold mb-1" style={{ color: isDark ? '#d1d5db' : '#374151' }}>{L('resumeTailor.summaryRewritten')}</div>
                    <div className="text-xs p-2 rounded" style={{ backgroundColor: '#22c55e15', border: '1px solid #22c55e40', color: '#16a34a' }}>
                      {result.tailoredResume.summary}
                    </div>
                  </div>
                )}

                {/* Project changes */}
                {diffChanges.projectChanges?.filter(p => p.changed).length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold mb-1" style={{ color: isDark ? '#d1d5db' : '#374151' }}>{L('resumeTailor.projectChanges')}</div>
                    {diffChanges.projectChanges.filter(p => p.changed).map((proj, idx) => (
                      <div key={idx} className="mb-2 ml-2">
                        <div className="text-xs font-medium mb-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{proj.name}</div>
                        {proj.origBullets.map((b, bi) => {
                          const newB = proj.newBullets[bi];
                          return (
                            <div key={bi} className="text-xs mb-1">
                              <div style={{ color: '#ef4444', textDecoration: 'line-through', opacity: 0.7 }}>
                                {b}
                              </div>
                              {newB && (
                                <div style={{ color: '#16a34a', backgroundColor: '#22c55e15', padding: '1px 4px', borderRadius: '2px' }}>
                                  {newB}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {/* Skill reorder */}
                {Object.keys(diffChanges.skillChanges || {}).length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold mb-1" style={{ color: isDark ? '#d1d5db' : '#374151' }}>{L('resumeTailor.skillReordering')}</div>
                    {Object.entries(diffChanges.skillChanges).map(([cat, changes]) => (
                      <div key={cat} className="text-xs mb-1 ml-2">
                        <span className="font-medium" style={{ color: isDark ? '#d1d5db' : '#374151' }}>{cat}: </span>
                        {changes.reordered && <span style={{ color: '#3b82f6' }}>{L('resumeTailor.reorderedByJd')}</span>}
                        {changes.added?.length > 0 && (
                          <span style={{ color: '#16a34a' }}> +{changes.added.join(', ')}</span>
                        )}
                        {changes.removed?.length > 0 && (
                          <span style={{ color: '#ef4444', textDecoration: 'line-through' }}> −{changes.removed.join(', ')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Project order */}
                {diffChanges.orderChanged && (
                  <div className="text-xs" style={{ color: '#3b82f6' }}>
                    {L('resumeTailor.projectsReordered')}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: isDark ? '#0a0a0a' : '#fafafa' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-sm mb-4 hover:underline"
            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
          >
            {L('resumeTailor.backDashboard')}
          </button>
          <h1 className="text-3xl font-bold" style={{ color: isDark ? '#ffffff' : '#111111' }}>
            {L('resumeTailor.title')}
          </h1>
          <p className="mt-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            {L('resumeTailor.subtitle')}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS_KEYS.map((key, idx) => (
              <div
                key={idx}
                className={`text-xs font-medium ${idx <= currentStep ? 'text-blue-500' : ''}`}
                style={{ color: idx <= currentStep ? '#3b82f6' : (isDark ? '#6b7280' : '#9ca3af') }}
              >
                {L(key)}
              </div>
            ))}
          </div>
          <ProgressBar progress={(currentStep / (STEPS_KEYS.length - 1)) * 100} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-500 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </p>
          </div>
        )}

        {/* Content */}
        <Card>
          <CardContent className="p-6">
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResumeTailor;
