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
  // Uses content-based (name) matching instead of index-based to handle reordering
  const diffChanges = React.useMemo(() => {
    if (!result?.originalResumeData || !result?.tailoredResume) return null;
    const orig = result.originalResumeData;
    const tailored = result.tailoredResume;
    const summaryChanged = (orig.summary || '') !== (tailored.summary || '');

    // Content-based matching: find tailored projects by name, not by index
    const tailoredByName = new Map(
      (tailored.projects || []).map(p => [p.name?.toLowerCase().trim(), p])
    );
    const origByName = new Map(
      (orig.projects || []).map(p => [p.name?.toLowerCase().trim(), p])
    );

    const projectChanges = (orig.projects || []).map(op => {
      const tp = tailoredByName.get(op.name?.toLowerCase().trim());
      if (!tp) return { name: op.name, changed: true, origBullets: op.bullets || [op.description].filter(Boolean), newBullets: [], status: 'removed' };
      const origB = op.bullets || [op.description].filter(Boolean);
      const newB = tp.bullets || [tp.description].filter(Boolean);
      const changed = origB.join('|') !== newB.join('|') || op.name !== tp.name;
      return { name: tp.name || op.name, changed, origBullets: origB, newBullets: newB, status: changed ? 'modified' : 'unchanged' };
    });

    // Detect newly added projects (in tailored but not in original)
    (tailored.projects || []).forEach(tp => {
      if (!origByName.has(tp.name?.toLowerCase().trim())) {
        const newB = tp.bullets || [tp.description].filter(Boolean);
        projectChanges.push({ name: tp.name, changed: true, origBullets: [], newBullets: newB, status: 'added' });
      }
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

    // Experience diff (content-based by company+title)
    const tailoredExpByKey = new Map(
      (tailored.experience || []).map(e => [`${e.company}|${e.title}`.toLowerCase(), e])
    );
    const experienceChanges = (orig.experience || []).map(oe => {
      const key = `${oe.company}|${oe.title}`.toLowerCase();
      const te = tailoredExpByKey.get(key);
      if (!te) return { title: oe.title, company: oe.company, changed: true, origBullets: oe.responsibilities || oe.bullets || [], newBullets: [], status: 'removed' };
      const origB = oe.responsibilities || oe.bullets || [];
      const newB = te.bullets || te.responsibilities || [];
      const changed = origB.join('|') !== newB.join('|');
      return { title: te.title, company: te.company, changed, origBullets: origB, newBullets: newB, status: changed ? 'modified' : 'unchanged' };
    });

    return { summaryChanged, projectChanges, skillChanges, orderChanged, experienceChanges };
  }, [result]);

  // Preview accent color and font (reused across all preview sections)
  const ACCENT = '30, 64, 120'; // dark blue RGB
  const PREVIEW_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

  // Compute quick-lookup sets for inline change highlighting in preview
  const inlineHighlights = React.useMemo(() => {
    if (!diffChanges || !showHighlight) return null;

    // Which project names were modified (content-based)
    const changedProjects = new Set(
      (diffChanges.projectChanges || []).filter(p => p.changed).map(p => p.name?.toLowerCase().trim())
    );

    // Per-project bullet change tracking
    const projBulletChanges = {};
    (diffChanges.projectChanges || []).forEach(pc => {
      projBulletChanges[pc.name?.toLowerCase().trim()] = new Set(
        pc.newBullets.map((b, i) => (b !== pc.origBullets?.[i] ? b : null)).filter(Boolean)
      );
    });

    // Which experience entries were modified
    const changedExperience = new Set(
      (diffChanges.experienceChanges || []).filter(e => e.changed).map(e => `${e.company}|${e.title}`.toLowerCase())
    );

    // Per-experience bullet change tracking
    const expBulletChanges = {};
    (diffChanges.experienceChanges || []).forEach(ec => {
      const key = `${ec.company}|${ec.title}`.toLowerCase();
      expBulletChanges[key] = new Set(
        ec.newBullets.map((b, i) => (b !== ec.origBullets?.[i] ? b : null)).filter(Boolean)
      );
    });

    // Skill categories that were reordered
    const reorderedSkills = new Set(
      Object.entries(diffChanges.skillChanges || {}).filter(([, c]) => c.reordered).map(([cat]) => cat)
    );

    // Original project order (for detecting reorder position)
    const origProjectOrder = (result?.originalResumeData?.projects || []).map(p => p.name?.toLowerCase().trim());

    return {
      summaryChanged: diffChanges.summaryChanged,
      changedProjects,
      projBulletChanges,
      changedExperience,
      expBulletChanges,
      reorderedSkills,
      orderChanged: diffChanges.orderChanged,
      origProjectOrder,
      skillChanges: diffChanges.skillChanges || {},
    };
  }, [diffChanges, showHighlight, result]);

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
    const marginL = 18;
    const marginR = 18;
    const contentW = pageW - marginL - marginR;
    const BOTTOM_MARGIN = 18;
    let y = 18;

    // Brand accent color (restrained dark blue)
    const ACCENT = [30, 64, 120]; // RGB

    const checkPage = (needed) => {
      if (y + needed > pageH - BOTTOM_MARGIN) {
        doc.addPage();
        y = 18;
      }
    };

    const drawSectionHeader = (title) => {
      checkPage(14);
      y += 4;
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ACCENT);
      doc.text(title.toUpperCase(), marginL, y);
      y += 2;
      doc.setDrawColor(...ACCENT);
      doc.setLineWidth(0.35);
      doc.line(marginL, y, pageW - marginR, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
    };

    const drawBullet = (text, indent = marginL + 4) => {
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const bulletText = `\u2022  ${text}`;
      const lines = doc.splitTextToSize(bulletText, contentW - 8);
      checkPage(lines.length * 4.2 + 2);
      doc.text(lines, indent, y);
      y += lines.length * 4.2 + 1.8;
      doc.setTextColor(0, 0, 0);
    };

    // ── HEADER: Name ──
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(resume.contact?.name || 'Your Name', pageW / 2, y, { align: 'center' });
    y += 8;

    // ── Contact line (with clickable URLs) ──
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
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
      const sep = '   |   ';
      const sepW = doc.getTextWidth(sep);
      const widths = contactParts.map(p => doc.getTextWidth(p.text));
      const totalW = widths.reduce((a, b) => a + b, 0) + sepW * (contactParts.length - 1);
      let cx = (pageW - totalW) / 2;
      contactParts.forEach((part, i) => {
        if (part.url && part.url.startsWith('http')) {
          doc.setTextColor(...ACCENT);
          doc.text(part.text, cx, y);
          const tw = widths[i];
          doc.link(cx, y - doc.internal.getLineHeight() + doc.internal.getFontSize() * 0.85, tw, doc.internal.getFontSize() + 2, { type: 'uri', url: part.url });
          doc.setTextColor(80, 80, 80);
        } else {
          doc.text(part.text, cx, y);
        }
        cx += widths[i];
        if (i < contactParts.length - 1) {
          doc.setTextColor(160, 160, 160);
          doc.text(sep, cx, y);
          doc.setTextColor(80, 80, 80);
          cx += sepW;
        }
      });
      y += 7;
    }

    // ── SUMMARY (always show if present) ──
    if (resume.summary) {
      drawSectionHeader('Professional Summary');
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(resume.summary, contentW);
      doc.text(lines, marginL, y);
      y += lines.length * 4.2 + 2;
      doc.setTextColor(0, 0, 0);
    }

    // ── EDUCATION ──
    if (resume.education?.length > 0) {
      drawSectionHeader('Education');
      resume.education.forEach((edu) => {
        checkPage(16);
        const degreeLine = edu.degree ? (edu.field ? `${edu.degree} in ${edu.field}` : edu.degree) : '';
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        doc.text(degreeLine, marginL, y);
        if (edu.dates || edu.graduationDate) {
          const dateStr = edu.dates || edu.graduationDate;
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          const dateW = doc.getTextWidth(dateStr);
          doc.text(dateStr, pageW - marginR - dateW, y);
        }
        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const instLine = [edu.institution, edu.gpa ? `GPA: ${edu.gpa}` : ''].filter(Boolean).join('  |  ');
        doc.text(instLine, marginL, y);
        y += 5;
        if (edu.coursework?.length > 0) {
          doc.setFontSize(8.5);
          doc.setTextColor(80, 80, 80);
          const cwText = `Coursework: ${edu.coursework.join(', ')}`;
          const cwLines = doc.splitTextToSize(cwText, contentW);
          doc.text(cwLines, marginL, y);
          y += cwLines.length * 4 + 1;
        }
        doc.setTextColor(0, 0, 0);
        y += 2;
      });
    }

    // ── PROJECTS ──
    if (resume.projects?.length > 0) {
      drawSectionHeader('Projects');
      resume.projects.forEach((proj) => {
        checkPage(22);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        doc.text(proj.name, marginL, y);
        y += 5;
        if (proj.subtitle) {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text(proj.subtitle, marginL, y);
          y += 4.5;
        }
        doc.setTextColor(0, 0, 0);
        const bullets = proj.bullets || (proj.description ? [proj.description] : []);
        bullets.forEach((b) => drawBullet(b));
        if (proj.technologies?.length > 0) {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(80, 80, 80);
          const techText = `Technologies: ${proj.technologies.join(', ')}`;
          const techLines = doc.splitTextToSize(techText, contentW);
          checkPage(techLines.length * 4 + 2);
          doc.text(techLines, marginL, y);
          y += techLines.length * 4 + 2;
          doc.setTextColor(0, 0, 0);
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
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(40, 40, 40);
          doc.text(`${cat.label}: `, marginL, y);
          const labelW = doc.getTextWidth(`${cat.label}: `);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 50, 50);
          const skillText = items.join(', ');
          const skillLines = doc.splitTextToSize(skillText, contentW - labelW);
          doc.text(skillLines[0], marginL + labelW, y);
          if (skillLines.length > 1) {
            y += 4.2;
            doc.text(skillLines.slice(1), marginL + labelW, y);
          }
          doc.setTextColor(0, 0, 0);
          y += skillLines.length * 4.2 + 2;
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
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        const certLine = [certName, issuer].filter(Boolean).join(' \u2014 ');
        const lines = doc.splitTextToSize(`\u2022  ${certLine}`, contentW - 4);
        doc.text(lines, marginL + 4, y);
        y += lines.length * 4.2;
        if (date) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text(date, marginL + 7, y);
          y += 4;
        }
        doc.setTextColor(0, 0, 0);
      });
    }

    // ── EXPERIENCE ──
    if (resume.experience?.length > 0) {
      drawSectionHeader('Professional Experience');
      resume.experience.forEach((exp) => {
        checkPage(20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        doc.text(exp.title || '', marginL, y);
        if (exp.startDate || exp.endDate) {
          const dateStr = `${exp.startDate || ''} \u2013 ${exp.endDate || ''}`.trim();
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          const dateW = doc.getTextWidth(dateStr);
          doc.text(dateStr, pageW - marginR - dateW, y);
        }
        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(70, 70, 70);
        doc.text(exp.company || '', marginL, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
        const bullets = exp.bullets || exp.responsibilities || [];
        bullets.forEach((b) => drawBullet(b));
        y += 2;
      });
    }

    doc.save('tailored-resume.pdf');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Upload Resume
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-text-primary">
                {L('resumeTailor.uploadTitle')}
              </h2>
              <p className="text-sm text-text-muted">
                {L('resumeTailor.uploadFormats')}
              </p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: isDark ? '#374151' : '#d1d5db' }}>
              <Upload size={48} className="mx-auto mb-4 text-text-muted" />
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
                  <span className="text-sm font-medium text-text-primary">
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
              <h2 className="text-2xl font-bold mb-2 text-text-primary">
                {prefilledJob ? L('resumeTailor.prefilledTitle') : L('resumeTailor.pasteJDTitle')}
              </h2>
              <p className="text-sm text-text-muted">
                {prefilledJob
                  ? `${L('resumeTailor.tailoringFor')} ${prefilledJob.title} ${prefilledJob.company}`
                  : L('resumeTailor.pasteBelow')}
              </p>
            </div>

            {prefilledJob && (
              <div className="p-4 rounded-lg border" style={{ backgroundColor: isDark ? '#1f2937' : '#f9fafb', borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-blue-500" />
                  <span className="font-medium text-sm text-text-primary">
                    {prefilledJob.title}
                  </span>
                </div>
                <div className="text-xs text-text-muted">
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
              <h2 className="text-2xl font-bold mb-2 text-text-primary">
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
                      <div className="text-4xl font-bold mb-2 text-text-primary">
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
                        <p className="text-sm text-text-muted">{L('resumeTailor.noMatched')}</p>
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
                        <p className="text-sm text-text-muted">{L('resumeTailor.noMissing')}</p>
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
                          <span className="text-text-primary">{change}</span>
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
                <h2 className="text-xl font-bold text-text-primary">
                  {L('resumeTailor.previewTitle')}
                </h2>
                <p className="text-xs mt-1 text-text-muted">
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
                className="mx-auto"
                style={{
                  maxWidth: '820px',
                  backgroundColor: '#ffffff',
                  color: '#1a1a1a',
                  padding: '48px 52px',
                  fontFamily: PREVIEW_FONT,
                  lineHeight: '1.5',
                  border: isDark ? '1px solid #374151' : '1px solid #e2e8f0',
                  borderRadius: '2px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                {/* Name */}
                <div className="text-center pb-4" style={{ borderBottom: '2px solid #1a1a1a' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '0.5px', color: '#111', fontFamily: PREVIEW_FONT, margin: 0 }}>
                    {result.tailoredResume.contact?.name}
                  </h1>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2.5" style={{ fontSize: '12px', color: '#555' }}>
                    {result.tailoredResume.contact?.email && <span>{result.tailoredResume.contact.email}</span>}
                    {result.tailoredResume.contact?.phone && <span style={{ color: '#ccc' }}>|</span>}
                    {result.tailoredResume.contact?.phone && <span>{result.tailoredResume.contact.phone}</span>}
                    {result.tailoredResume.contact?.linkedin && <span style={{ color: '#ccc' }}>|</span>}
                    {result.tailoredResume.contact?.linkedin && <span>{result.tailoredResume.contact.linkedin}</span>}
                    {result.tailoredResume.contact?.github && <span style={{ color: '#ccc' }}>|</span>}
                    {result.tailoredResume.contact?.github && <span>{result.tailoredResume.contact.github}</span>}
                  </div>
                </div>

                {/* Professional Summary */}
                {result.tailoredResume.summary && (
                  <div style={{ marginTop: '20px' }}>
                    <h2 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgb(30, 64, 120)', borderBottom: '1px solid rgb(30, 64, 120)', paddingBottom: '4px', marginBottom: '10px', fontFamily: PREVIEW_FONT, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Professional Summary</span>
                      {inlineHighlights?.summaryChanged && (
                        <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.5px', color: '#16a34a', backgroundColor: '#22c55e12', border: '1px solid #22c55e40', borderRadius: '3px', padding: '1px 6px', textTransform: 'uppercase' }}>AI-Rewritten</span>
                      )}
                    </h2>
                    <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#333', margin: 0, padding: inlineHighlights?.summaryChanged ? '8px 10px' : 0, backgroundColor: inlineHighlights?.summaryChanged ? '#f0fdf4' : 'transparent', borderRadius: inlineHighlights?.summaryChanged ? '4px' : 0, borderLeft: inlineHighlights?.summaryChanged ? '3px solid #22c55e' : 'none' }}>
                      {result.tailoredResume.summary}
                    </p>
                  </div>
                )}

                {/* Education */}
                {result.tailoredResume.education?.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgb(30, 64, 120)', borderBottom: '1px solid rgb(30, 64, 120)', paddingBottom: '4px', marginBottom: '10px', marginTop: '20px', fontFamily: PREVIEW_FONT }}>
                      Education
                    </h2>
                    {result.tailoredResume.education.map((edu, idx) => (
                      <div key={idx} style={{ marginBottom: '10px' }}>
                        <div className="flex justify-between items-baseline">
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', fontFamily: PREVIEW_FONT }}>
                            {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                          </span>
                          <span style={{ fontSize: '12px', color: '#666', flexShrink: 0, marginLeft: '16px' }}>
                            {edu.dates || edu.graduationDate || ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '2px', color: '#555' }}>
                          {[edu.institution, edu.gpa ? `GPA: ${edu.gpa}` : ''].filter(Boolean).join(' | ')}
                        </div>
                        {edu.coursework?.length > 0 && (
                          <div style={{ fontSize: '11px', marginTop: '2px', fontStyle: 'italic', color: '#666' }}>
                            Coursework: {edu.coursework.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {result.tailoredResume.projects?.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgb(30, 64, 120)', borderBottom: '1px solid rgb(30, 64, 120)', paddingBottom: '4px', marginBottom: '10px', marginTop: '20px', fontFamily: PREVIEW_FONT }}>
                      Projects
                    </h2>
                    {result.tailoredResume.projects.map((proj, idx) => {
                      const bullets = proj.bullets || (proj.description ? [proj.description] : []);
                      const projKey = proj.name?.toLowerCase().trim();
                      const projChanged = inlineHighlights?.changedProjects?.has(projKey);
                      const origIdx = inlineHighlights?.origProjectOrder?.indexOf(projKey);
                      const wasReordered = inlineHighlights?.orderChanged && origIdx !== idx && origIdx >= 0;
                      return (
                        <div key={idx} style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', fontFamily: PREVIEW_FONT }}>{proj.name}</span>
                            {projChanged && <span style={{ fontSize: '9px', fontWeight: 600, color: '#16a34a', backgroundColor: '#22c55e12', border: '1px solid #22c55e40', borderRadius: '3px', padding: '0px 5px', textTransform: 'uppercase' }}>Modified</span>}
                            {wasReordered && !projChanged && <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgb(30, 64, 120)', backgroundColor: '#3b82f610', border: '1px solid #3b82f630', borderRadius: '3px', padding: '0px 5px', textTransform: 'uppercase' }}>Reordered</span>}
                          </div>
                          {proj.subtitle && (
                            <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#666', marginBottom: '4px' }}>{proj.subtitle}</div>
                          )}
                          {bullets.map((b, bi) => {
                            const bulletChanged = inlineHighlights?.projBulletChanges?.[projKey]?.has(b);
                            return (
                              <div key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', marginLeft: '14px', lineHeight: '1.5', color: '#333', padding: bulletChanged ? '2px 6px' : '1px 0', backgroundColor: bulletChanged ? '#f0fdf4' : 'transparent', borderRadius: bulletChanged ? '3px' : 0, borderLeft: bulletChanged ? '2px solid #22c55e' : 'none', marginBottom: '3px' }}>
                                <span style={{ color: bulletChanged ? '#16a34a' : '#888', flexShrink: 0 }}>{'\u2022'}</span>
                                <span>{b}</span>
                              </div>
                            );
                          })}
                          {proj.technologies?.length > 0 && (
                            <div style={{ fontSize: '11px', marginTop: '4px', fontStyle: 'italic', color: '#666' }}>
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
                    <div>
                      <h2 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgb(30, 64, 120)', borderBottom: '1px solid rgb(30, 64, 120)', paddingBottom: '4px', marginBottom: '10px', marginTop: '20px', fontFamily: PREVIEW_FONT }}>
                        Skills
                      </h2>
                      {active.map((cat) => {
                        const reordered = inlineHighlights?.reorderedSkills?.has(cat.key);
                        const catChanges = inlineHighlights?.skillChanges?.[cat.key];
                        return (
                          <div key={cat.key} style={{ fontSize: '12px', marginBottom: '5px', display: 'flex', alignItems: 'flex-start', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: '#333', fontFamily: PREVIEW_FONT }}>{cat.label}: </span>
                            <span style={{ color: '#444' }}>{s[cat.key].join(', ')}</span>
                            {reordered && <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgb(30, 64, 120)', backgroundColor: '#3b82f610', border: '1px solid #3b82f630', borderRadius: '3px', padding: '0px 5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Reordered by JD</span>}
                            {catChanges?.added?.length > 0 && <span style={{ fontSize: '10px', color: '#16a34a' }}>+{catChanges.added.join(', ')}</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Certifications */}
                {result.tailoredResume.certifications?.length > 0 && (
                  <div className="mt-4">
                    <h2 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgb(30, 64, 120)', borderBottom: '1px solid rgb(30, 64, 120)', paddingBottom: '4px', marginBottom: '10px', marginTop: '20px', fontFamily: PREVIEW_FONT }}>
                      Certifications & Courses
                    </h2>
                    {result.tailoredResume.certifications.map((cert, idx) => {
                      const name = typeof cert === 'string' ? cert : (cert.name || '');
                      const issuer = typeof cert === 'object' ? cert.issuer : '';
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', marginLeft: '14px', marginBottom: '4px', color: '#333', lineHeight: '1.5' }}>
                          <span style={{ color: '#888', flexShrink: 0 }}>{'\u2022'}</span>
                          <span>{name}{issuer ? ` \u2014 ${issuer}` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Experience */}
                {result.tailoredResume.experience?.length > 0 && (
                  <div className="mt-4">
                    <h2 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgb(30, 64, 120)', borderBottom: '1px solid rgb(30, 64, 120)', paddingBottom: '4px', marginBottom: '10px', marginTop: '20px', fontFamily: PREVIEW_FONT }}>
                      Professional Experience
                    </h2>
                    {result.tailoredResume.experience.map((exp, idx) => {
                      const bullets = exp.bullets || exp.responsibilities || [];
                      const expKey = `${exp.company}|${exp.title}`.toLowerCase();
                      const expChanged = inlineHighlights?.changedExperience?.has(expKey);
                      return (
                        <div key={idx} style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', fontFamily: PREVIEW_FONT }}>{exp.title}</span>
                              {expChanged && <span style={{ fontSize: '9px', fontWeight: 600, color: '#16a34a', backgroundColor: '#22c55e12', border: '1px solid #22c55e40', borderRadius: '3px', padding: '0px 5px', textTransform: 'uppercase' }}>Modified</span>}
                            </div>
                            <span style={{ fontSize: '12px', color: '#666', flexShrink: 0, marginLeft: '16px' }}>
                              {exp.startDate}{exp.endDate ? ` \u2013 ${exp.endDate}` : ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#555', marginBottom: '4px' }}>{exp.company}</div>
                          {bullets.map((b, bi) => {
                            const bulletChanged = inlineHighlights?.expBulletChanges?.[expKey]?.has(b);
                            return (
                              <div key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', marginLeft: '14px', lineHeight: '1.5', color: '#333', padding: bulletChanged ? '2px 6px' : '1px 0', backgroundColor: bulletChanged ? '#f0fdf4' : 'transparent', borderRadius: bulletChanged ? '3px' : 0, borderLeft: bulletChanged ? '2px solid #22c55e' : 'none', marginBottom: '3px' }}>
                                <span style={{ color: bulletChanged ? '#16a34a' : '#888', flexShrink: 0 }}>{'\u2022'}</span>
                                <span>{b}</span>
                              </div>
                            );
                          })}
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

            {/* Change Highlight Panel: ORIGINAL -> AI-TAILORED */}
            {showHighlight && diffChanges && (
              <div
                className="mx-auto mt-4 rounded-lg border overflow-hidden"
                style={{
                  maxWidth: '800px',
                  backgroundColor: isDark ? '#111827' : '#f9fafb',
                  borderColor: isDark ? '#374151' : '#d1d5db',
                }}
              >
                {/* Panel header */}
                <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6', borderBottom: `1px solid ${isDark ? '#374151' : '#d1d5db'}` }}>
                  <h3 className="text-sm font-bold flex items-center gap-2 text-text-primary">
                    <Sparkles size={16} className="text-blue-500" />
                    ORIGINAL &rarr; AI-TAILORED
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#ef444433', border: '1px solid #ef4444' }}></span>
                      Original
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#22c55e33', border: '1px solid #22c55e' }}></span>
                      AI-Tailored
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Summary change */}
                  {diffChanges.summaryChanged && (
                    <div>
                      <div className="text-xs font-bold mb-2 uppercase tracking-wide text-text-muted">Professional Summary</div>
                      {result.originalResumeData.summary && (
                        <div className="text-xs p-2.5 rounded mb-1.5" style={{ backgroundColor: '#ef444410', border: '1px solid #ef444430', color: isDark ? '#fca5a5' : '#b91c1c', textDecoration: 'line-through', opacity: 0.75 }}>
                          {result.originalResumeData.summary}
                        </div>
                      )}
                      <div className="text-xs p-2.5 rounded" style={{ backgroundColor: '#22c55e12', border: '1px solid #22c55e40', color: isDark ? '#86efac' : '#15803d' }}>
                        {result.tailoredResume.summary}
                      </div>
                    </div>
                  )}

                  {/* Experience changes */}
                  {diffChanges.experienceChanges?.filter(e => e.changed).length > 0 && (
                    <div>
                      <div className="text-xs font-bold mb-2 uppercase tracking-wide text-text-muted">Experience Bullets</div>
                      {diffChanges.experienceChanges.filter(e => e.changed).map((exp, idx) => (
                        <div key={idx} className="mb-3 ml-2">
                          <div className="text-xs font-semibold mb-1.5 text-text-primary">{exp.title} <span className="font-normal text-text-muted">at {exp.company}</span></div>
                          {exp.origBullets.map((b, bi) => {
                            const newB = exp.newBullets[bi];
                            const bulletChanged = b !== newB;
                            return (
                              <div key={bi} className="mb-1.5 pl-2" style={{ borderLeft: `2px solid ${bulletChanged ? '#3b82f6' : (isDark ? '#374151' : '#e5e7eb')}` }}>
                                {bulletChanged && (
                                  <div className="text-xs py-0.5 px-1.5 rounded mb-0.5" style={{ color: isDark ? '#fca5a5' : '#b91c1c', opacity: 0.7, textDecoration: 'line-through' }}>
                                    {b}
                                  </div>
                                )}
                                {newB && bulletChanged && (
                                  <div className="text-xs py-0.5 px-1.5 rounded" style={{ backgroundColor: '#22c55e12', color: isDark ? '#86efac' : '#15803d' }}>
                                    {newB}
                                  </div>
                                )}
                                {newB && !bulletChanged && (
                                  <div className="text-xs py-0.5 px-1.5 text-text-muted">{newB}</div>
                                )}
                              </div>
                            );
                          })}
                          {exp.newBullets.length > exp.origBullets.length && (
                            exp.newBullets.slice(exp.origBullets.length).map((newB, bi) => (
                              <div key={`new-${bi}`} className="mb-1.5 pl-2" style={{ borderLeft: '2px solid #22c55e' }}>
                                <div className="text-xs py-0.5 px-1.5 rounded" style={{ backgroundColor: '#22c55e12', color: isDark ? '#86efac' : '#15803d' }}>
                                  + {newB}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Project changes */}
                  {diffChanges.projectChanges?.filter(p => p.changed).length > 0 && (
                    <div>
                      <div className="text-xs font-bold mb-2 uppercase tracking-wide text-text-muted">Project Descriptions</div>
                      {diffChanges.projectChanges.filter(p => p.changed).map((proj, idx) => (
                        <div key={idx} className="mb-3 ml-2">
                          <div className="text-xs font-semibold mb-1.5 text-text-primary">
                            {proj.name}
                            {proj.status === 'added' && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: '#22c55e20', color: '#16a34a' }}>NEW</span>}
                          </div>
                          {proj.status === 'added' ? (
                            proj.newBullets.map((b, bi) => (
                              <div key={bi} className="mb-1 pl-2" style={{ borderLeft: '2px solid #22c55e' }}>
                                <div className="text-xs py-0.5 px-1.5 rounded" style={{ backgroundColor: '#22c55e12', color: isDark ? '#86efac' : '#15803d' }}>
                                  + {b}
                                </div>
                              </div>
                            ))
                          ) : (
                            proj.origBullets.map((b, bi) => {
                              const newB = proj.newBullets[bi];
                              const bulletChanged = b !== newB;
                              return (
                                <div key={bi} className="mb-1.5 pl-2" style={{ borderLeft: `2px solid ${bulletChanged ? '#3b82f6' : (isDark ? '#374151' : '#e5e7eb')}` }}>
                                  {bulletChanged && (
                                    <div className="text-xs py-0.5 px-1.5 rounded mb-0.5" style={{ color: isDark ? '#fca5a5' : '#b91c1c', opacity: 0.7, textDecoration: 'line-through' }}>
                                      {b}
                                    </div>
                                  )}
                                  {newB && bulletChanged && (
                                    <div className="text-xs py-0.5 px-1.5 rounded" style={{ backgroundColor: '#22c55e12', color: isDark ? '#86efac' : '#15803d' }}>
                                      {newB}
                                    </div>
                                  )}
                                  {newB && !bulletChanged && (
                                    <div className="text-xs py-0.5 px-1.5 text-text-muted">{newB}</div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skill reorder */}
                  {Object.keys(diffChanges.skillChanges || {}).length > 0 && (
                    <div>
                      <div className="text-xs font-bold mb-2 uppercase tracking-wide text-text-muted">Skills Reordered</div>
                      {Object.entries(diffChanges.skillChanges).map(([cat, changes]) => (
                        <div key={cat} className="text-xs mb-1.5 ml-2 flex items-center gap-2">
                          <span className="font-medium text-text-primary capitalize">{cat}: </span>
                          {changes.reordered && <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}>REORDERED BY JD</span>}
                          {changes.added?.length > 0 && (
                            <span style={{ color: '#16a34a' }}>+{changes.added.join(', ')}</span>
                          )}
                          {changes.removed?.length > 0 && (
                            <span style={{ color: '#ef4444', textDecoration: 'line-through', opacity: 0.7 }}>{changes.removed.join(', ')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Project reordering notice */}
                  {diffChanges.orderChanged && (
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded" style={{ backgroundColor: '#3b82f610', border: '1px solid #3b82f630' }}>
                      <span style={{ color: '#3b82f6' }}>&#8645;</span>
                      <span style={{ color: '#3b82f6' }}>Projects reordered by JD relevance</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-bg-primary text-text-primary page-enter">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-sm mb-4 hover:underline text-text-muted"
          >
            {L('resumeTailor.backDashboard')}
          </button>
          <h1 className="text-3xl font-bold text-text-primary">
            {L('resumeTailor.title')}
          </h1>
          <p className="mt-2 text-text-muted">
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
