// frontend/src/pages/FindJobs.jsx
// Job Discovery page — search active job listings from external providers.
// Uses the existing design system (Button, Card, Badge, Skeleton).

import React, { useState, useCallback } from 'react';
import { Button } from '../design-system/Button';
import { Card, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { Skeleton } from '../design-system/Skeleton';
import PageHeader from '../components/shared/PageHeader';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Search, MapPin, Briefcase, ExternalLink, Target,
  ArrowLeft, AlertCircle, Clock, Building2, Loader2,
  FileText,
} from 'lucide-react';
import { t } from '../i18n/translations';

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
};

const sourceLabels = {
  arbeitnow: { label: 'Arbeitnow', color: 'bg-blue-500/10 text-blue-400' },
  adzuna: { label: 'Adzuna', color: 'bg-purple-500/10 text-purple-400' },
};

export const FindJobs = ({ onNavigate, onStartPracticing, onTailorResume, isDark, isAuthenticated, language = 'english', setLanguage }) => {
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [providerStatus, setProviderStatus] = useState(null);

  const L = (key) => t(key, language);

  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    if (!query.trim() && !location.trim()) {
      setError(L('findJobs.errorKeyword'));
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const result = await apiClient.searchJobs({
        q: query.trim(),
        location: location.trim(),
        remote,
      });
      setJobs(result.jobs || []);
      setProviderStatus(result.providers);
    } catch (err) {
      setError(err.message || L('findJobs.errorSearch'));
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [query, location, remote]);

  const handleViewJob = useCallback((job) => {
    onStartPracticing?.({ type: 'view', job });
  }, [onStartPracticing]);

  const handlePracticeJob = useCallback((job) => {
    if (!job.description || job.description.trim().length < 50) {
      setError(L('findJobs.errorNoDescription'));
      return;
    }
    onStartPracticing?.({ type: 'practice', job });
  }, [onStartPracticing]);

  const handleTailorResume = useCallback((job) => {
    if (!isAuthenticated) {
      setError(L('findJobs.errorSignIn'));
      return;
    }
    if (!job.description || job.description.trim().length < 50) {
      setError(L('findJobs.errorResumeDesc'));
      return;
    }
    onTailorResume?.(job);
  }, [onTailorResume, isAuthenticated]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col page-enter">
      {/* Navigation Header */}
      <PageHeader
        isDark={isDark}
        onNavigate={onNavigate}
        currentPage="find-jobs"
        isAuthenticated={isAuthenticated}
        onLogout={() => { logout(); onNavigate('home'); }}
        language={language}
        setLanguage={setLanguage}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 md:px-12 pb-12 space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{L('findJobs.title')}</h1>
          <p className="text-sm text-text-muted mt-1">
            {L('findJobs.subtitle')}
          </p>
        </div>

        {/* Search Form */}
        <Card className="surface-text bg-surface" hover={false}>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                {/* Keyword */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={L('findJobs.keywordPlaceholder')}
                    className="w-full bg-bg-primary rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-border-strong border border-border"
                  />
                </div>

                {/* Location */}
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={L('findJobs.locationPlaceholder')}
                    className="w-full bg-bg-primary rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-border-strong border border-border"
                  />
                </div>

                {/* Search Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={loading}
                  disabled={loading}
                >
                  {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Search size={16} className="mr-2" />}
                  {L('common.search')}
                </Button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-text-muted">
                  <input
                    type="checkbox"
                    checked={remote}
                    onChange={(e) => setRemote(e.target.checked)}
                    className="rounded border-border text-text-primary focus:ring-border-strong"
                  />
                  {L('findJobs.remoteOnly')}
                </label>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-danger/10 rounded-lg border border-danger/20">
            <AlertCircle size={18} className="text-danger flex-shrink-0" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Provider Status */}
        {providerStatus && hasSearched && !loading && (
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>{L('findJobs.sources')}</span>
            {Object.entries(providerStatus).map(([name, status]) => (
              <span key={name} className={`flex items-center gap-1 ${status.ok ? 'text-success' : 'text-danger'}`}>
                {status.ok ? '✓' : '✗'} {sourceLabels[name]?.label || name}
                {status.ok && ` (${status.count})`}
              </span>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="surface-text bg-surface" hover={false}>
                <CardContent className="pt-6 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && hasSearched && jobs.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              {L('findJobs.foundJobs')} {jobs.length} {jobs.length !== 1 ? L('findJobs.jobs') : L('findJobs.job')}
            </p>
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onView={handleViewJob}
                onPractice={handlePracticeJob}
                onTailorResume={handleTailorResume}
                language={language}
              />
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && hasSearched && jobs.length === 0 && !error && (
          <div className="text-center py-12">
            <Briefcase size={40} className="text-text-muted mx-auto mb-4" />
            <p className="text-lg font-semibold text-text-primary">{L('findJobs.noJobsFound')}</p>
            <p className="text-sm text-text-muted mt-1">
              {L('findJobs.noJobsDesc')}
            </p>
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <div className="text-center py-12">
            <Target size={40} className="text-text-muted mx-auto mb-4" />
            <p className="text-lg font-semibold text-text-primary">{L('findJobs.searchForJobs')}</p>
            <p className="text-sm text-text-muted mt-1">
              {L('findJobs.searchDesc')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

/**
 * Individual job card component.
 */
const JobCard = ({ job, onView, onPractice, onTailorResume, language = 'english' }) => {
  const postedDate = formatDate(job.postedAt);
  const sourceInfo = sourceLabels[job.source] || { label: job.source, color: 'bg-surface-hover text-text-muted' };
  const hasDescription = job.description && job.description.trim().length >= 50;
  const L = (key) => t(key, language);

  return (
    <Card className="surface-text bg-surface hover:border-border-strong transition-colors" hover={false}>
      <CardContent className="pt-6 space-y-3">
        {/* Header: Title + Source */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-primary leading-snug">{job.title}</h3>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Building2 size={14} />
              <span>{job.company}</span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${sourceInfo.color}`}>
            {sourceInfo.label}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {job.location}
          </span>
          {job.employmentType && (
            <span className="flex items-center gap-1">
              <Briefcase size={12} /> {job.employmentType}
            </span>
          )}
          {postedDate && (
            <span className="flex items-center gap-1">
              <Clock size={12} /> {postedDate}
            </span>
          )}
          {job.salary && (
            <span className="font-medium text-text-primary">{job.salary}</span>
          )}
        </div>

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.skills.slice(0, 8).map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {skill}
              </Badge>
            ))}
            {job.skills.length > 8 && (
              <span className="text-[10px] text-text-muted">+{job.skills.length - 8} {L('findJobs.more')}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onView(job)}
            className="flex-1"
          >
            <ExternalLink size={14} className="mr-1" /> {L('findJobs.viewJob')}
          </Button>
          {hasDescription ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onPractice(job)}
                className="flex-1"
              >
                <Target size={14} className="mr-1" /> {L('findJobs.practice')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTailorResume(job)}
                className="flex-1"
                title={L('findJobs.tooltipTailor')}
              >
                <FileText size={14} className="mr-1" /> {L('findJobs.tailorResume')}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="flex-1 text-text-muted"
              title={L('findJobs.tooltipNoDesc')}
            >
              {L('findJobs.noDescription')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FindJobs;
