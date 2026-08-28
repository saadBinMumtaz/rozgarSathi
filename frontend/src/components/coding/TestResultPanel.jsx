// frontend/src/components/coding/TestResultPanel.jsx
// Renders sandboxed execution feedback (Day 4).
//  1. Fatal execution errors get a DISTINCT readable state per type:
//     empty_code / syntax_error / timeout / runtime_error / forbidden_api /
//     no_entry_function / service_unavailable — never a raw stack trace.
//  2. Every test case is rendered individually (input / expected / actual /
//     pass-fail). There is deliberately NO aggregate "3/5 passed" summary.

import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import {
  CheckCircle2,
  XCircle,
  FileWarning,
  Braces,
  TimerOff,
  Bug,
  ShieldAlert,
  FunctionSquare,
  ServerCrash,
  Clock,
  Loader2,
} from 'lucide-react';

// Distinct readable state per fatal error type (icon + heading + tone).
const ERROR_STATE_CONFIG = {
  empty_code: {
    icon: FileWarning,
    heading: 'Nothing to run',
    tone: 'border-slate-600 bg-slate-800/60 text-slate-300',
    iconColor: 'text-slate-400',
  },
  syntax_error: {
    icon: Braces,
    heading: 'Syntax error',
    tone: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    iconColor: 'text-amber-400',
  },
  timeout: {
    icon: TimerOff,
    heading: 'Time limit exceeded',
    tone: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
    iconColor: 'text-orange-400',
    hint: 'Your code ran longer than the allowed time — check for infinite loops or an O(n²) loop that could be O(n).',
  },
  runtime_error: {
    icon: Bug,
    heading: 'Runtime error',
    tone: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    iconColor: 'text-rose-400',
  },
  forbidden_api: {
    icon: ShieldAlert,
    heading: 'Blocked: restricted API',
    tone: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    iconColor: 'text-rose-400',
  },
  no_entry_function: {
    icon: FunctionSquare,
    heading: 'Entry function not found',
    tone: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    iconColor: 'text-amber-400',
  },
  service_unavailable: {
    icon: ServerCrash,
    heading: 'Judge unavailable',
    tone: 'border-slate-600 bg-slate-800/60 text-slate-300',
    iconColor: 'text-slate-400',
  },
};

const formatValue = (value) => {
  if (value === undefined) return '—';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined) return '';
  const ms = Math.round(seconds * 1000);
  return `${ms}ms`;
};

const ExecutionErrorState = memo(({ error }) => {
  const config = ERROR_STATE_CONFIG[error.type] || ERROR_STATE_CONFIG.runtime_error;
  const Icon = config.icon;
  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3.5 flex items-start gap-3 ${config.tone}`}
    >
      <Icon size={20} className={`mt-0.5 shrink-0 ${config.iconColor}`} />
      <div className="min-w-0">
        <div className="text-sm font-semibold">{config.heading}</div>
        <div className="text-sm mt-0.5 opacity-90 break-words">{error.message}</div>
        {config.hint && <div className="text-xs mt-1.5 opacity-75">{config.hint}</div>}
      </div>
    </div>
  );
});
ExecutionErrorState.displayName = 'ExecutionErrorState';

const TestRow = memo(({ test, index }) => {
  const passed = Boolean(test.passed);
  const executionTime = test.executionTime;
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle2 size={16} className="text-emerald-400" />
          ) : (
            <XCircle size={16} className="text-rose-400" />
          )}
          <span className="text-sm font-medium text-slate-200">Test {index + 1}</span>
          <Badge variant={passed ? 'success' : 'destructive'}>{passed ? 'Passed' : 'Failed'}</Badge>
        </div>
        {executionTime !== null && executionTime !== undefined && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={11} />
            <span className="font-mono">{formatTime(executionTime)}</span>
          </div>
        )}
      </div>
      <div className="grid gap-1 text-xs font-mono">
        <div className="text-slate-400">
          <span className="text-slate-500">input&nbsp;&nbsp;&nbsp;&nbsp;:</span>{' '}
          <span className="text-slate-300 break-all">{formatValue(test.input)}</span>
        </div>
        <div className="text-slate-400">
          <span className="text-slate-500">expected :</span>{' '}
          <span className="text-emerald-300 break-all">{formatValue(test.expected)}</span>
        </div>
        <div className="text-slate-400">
          <span className="text-slate-500">actual&nbsp;&nbsp;&nbsp;:</span>{' '}
          <span className={passed ? 'text-emerald-300 break-all' : 'text-rose-300 break-all'}>
            {formatValue(test.actual)}
          </span>
        </div>
      </div>
    </div>
  );
});
TestRow.displayName = 'TestRow';

export const TestResultPanel = memo(({
  title = 'Test Results',
  results = [],
  executionError = null,
  isEmpty = false,
  isExecuting = false,
}) => {
  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {isExecuting && (
            <div className="flex items-center gap-2 text-xs text-indigo-400">
              <Loader2 size={14} className="animate-spin" />
              <span>Executing...</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {executionError && <ExecutionErrorState error={executionError} />}

        {!executionError && !isExecuting && isEmpty && (
          <div className="text-sm text-slate-500 py-4 text-center">
            Run your code against the public tests to see results here.
          </div>
        )}

        {results.map((test, index) => (
          <TestRow key={index} test={test} index={index} />
        ))}
      </CardContent>
    </Card>
  );
});
TestResultPanel.displayName = 'TestResultPanel';

export default TestResultPanel;
