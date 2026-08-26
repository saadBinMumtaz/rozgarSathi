import React from 'react';
import { Button } from '../design-system/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { ProgressBar } from '../design-system/ProgressBar';
import { ScoreRing } from '../design-system/ScoreRing';
import { sampleJDs, sampleSeniorityOrder } from '../data/sampleJD';

export const Landing = ({ onNavigate, onTrySampleJD }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/30">
            RS
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Rozgar Sathi</span>
        </div>
        <Badge variant="primary">AI Interview Twin v1.0</Badge>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl space-y-12 text-center relative z-10">
        <div className="space-y-4">
          <Badge variant="info" className="mb-2">Day 1 Core Platform</Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Your Personal <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">AI Interview Twin</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            Practice spoken Behavioral, Technical, and Live Coding interviews tailored specifically to your target Job Description.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center gap-4 flex-wrap">
          <Button size="lg" variant="primary" onClick={() => onNavigate('jd-input')}>
            Start JD Analysis & Practice →
          </Button>
          {/* Sec. 15.1: pick a sample JD first (grouped by seniority), then it
              pre-fills the textarea and runs the analyze flow on arrival */}
          <select
            value=""
            onChange={(e) => {
              const sample = sampleJDs.find((s) => s.id === e.target.value);
              if (sample) onTrySampleJD({ text: sample.text, sampleId: sample.id });
            }}
            aria-label="Load a sample job description"
            className="text-base font-semibold bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-indigo-300 hover:border-indigo-500 focus:outline-none focus:border-indigo-500 cursor-pointer"
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

        {/* Feature Cards Grid demonstrating Design System Primitives */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 text-left">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="primary">Mode 1</Badge>
                <ScoreRing score={8.5} max={10} size={50} strokeWidth={5} label="" />
              </div>
              <CardTitle>🎤 Spoken Behavioral</CardTitle>
              <CardDescription>STAR structure & communication coaching</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressBar value={85} label="Communication Benchmark" />
              <p className="text-xs text-slate-400 mt-2">Voice-driven questions with adaptive follow-ups.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="info">Mode 2</Badge>
                <ScoreRing score={7.8} max={10} size={50} strokeWidth={5} label="" />
              </div>
              <CardTitle>💻 Technical Q&A</CardTitle>
              <CardDescription>JD tech stack & seniority probing</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressBar value={78} label="Tech Stack Depth" />
              <p className="text-xs text-slate-400 mt-2">Live difficulty adjustment per competency.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="success">Mode 3</Badge>
                <ScoreRing score={9.2} max={10} size={50} strokeWidth={5} label="" />
              </div>
              <CardTitle>🧩 Live Coding</CardTitle>
              <CardDescription>LeetCode sandbox & AI interviewer probes</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressBar value={92} label="Code Execution & Probing" />
              <p className="text-xs text-slate-400 mt-2">Monaco editor with sandboxed execution.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Landing;
