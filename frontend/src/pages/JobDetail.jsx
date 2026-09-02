// frontend/src/pages/JobDetail.jsx
// Shows full details of a selected job listing with "Start Practicing" action.

import React from 'react';
import { Button } from '../design-system/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import PageHeader from '../components/shared/PageHeader';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, MapPin, Building2, Briefcase, Clock,
  ExternalLink, Target, Globe,
} from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
};

const sourceLabels = {
  arbeitnow: 'Arbeitnow',
  adzuna: 'Adzuna',
};

export const JobDetail = ({ job, onNavigate, onStartPracticing, isDark, isAuthenticated }) => {
  const { logout } = useAuth();

  if (!job) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
        <PageHeader
          isDark={isDark}
          onNavigate={onNavigate}
          currentPage="find-jobs"
          isAuthenticated={isAuthenticated}
          onLogout={() => { logout(); onNavigate('landing'); }}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <p className="text-text-muted">No job selected.</p>
            <Button variant="secondary" onClick={() => onNavigate('find-jobs')}>
              <ArrowLeft size={16} className="mr-1" /> Back to Jobs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const postedDate = formatDate(job.postedAt);
  const hasDescription = job.description && job.description.trim().length >= 50;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Navigation Header */}
      <PageHeader
        isDark={isDark}
        onNavigate={onNavigate}
        currentPage="find-jobs"
        isAuthenticated={isAuthenticated}
        onLogout={() => { logout(); onNavigate('landing'); }}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 md:px-12 pb-12 space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('find-jobs')}
          className="text-text-muted hover:text-text-primary"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Jobs
        </Button>

        {/* Job Header */}
        <Card className="surface-text bg-surface" hover={false}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-text-primary">{job.title}</h1>
                <div className="flex items-center gap-2 text-text-muted">
                  <Building2 size={16} />
                  <span className="text-base">{job.company}</span>
                </div>
              </div>
              {job.source && (
                <Badge variant="secondary" className="text-xs">
                  via {sourceLabels[job.source] || job.source}
                </Badge>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} /> {job.location}
              </span>
              {job.employmentType && (
                <span className="flex items-center gap-1.5">
                  <Briefcase size={14} /> {job.employmentType}
                </span>
              )}
              {postedDate && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> Posted {postedDate}
                </span>
              )}
              {job.salary && (
                <span className="font-medium text-text-primary">{job.salary}</span>
              )}
            </div>

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, i) => (
                    <Badge key={i} variant="primary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Apply link */}
            {job.applicationUrl && (
              <a
                href={job.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-text-primary hover:underline"
              >
                <ExternalLink size={14} /> Apply on {sourceLabels[job.source] || 'provider site'}
              </a>
            )}
          </CardContent>
        </Card>

        {/* Job Description */}
        <Card className="surface-text bg-surface" hover={false}>
          <CardHeader>
            <CardTitle className="text-base">Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            {hasDescription ? (
              <div className="prose prose-sm max-w-none text-text-muted whitespace-pre-wrap leading-relaxed">
                {job.description}
              </div>
            ) : (
              <p className="text-text-muted text-sm italic">
                No detailed description available for this listing.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {hasDescription ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => onStartPracticing(job)}
              className="flex-1"
            >
              <Target size={16} className="mr-2" /> Start Practicing for This Job
            </Button>
          ) : (
            <Button variant="ghost" size="lg" disabled className="flex-1">
              Description not available for practice
            </Button>
          )}
          {job.applicationUrl && (
            <a
              href={job.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="secondary" size="lg" className="w-full">
                <Globe size={16} className="mr-2" /> Apply Now
              </Button>
            </a>
          )}
        </div>
      </main>
    </div>
  );
};

export default JobDetail;
