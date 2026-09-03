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
import { t } from '../../i18n/translations';

// Distinct readable state per fatal error type (icon + heading + tone).
const ERROR_STATE_CONFIG = {
  empty_code: {
    icon: FileWarning,
    heading: 'Nothing to run',
    tone: 'border-border-theme surface-text bg-surface-hover text-text-muted',
    iconColor: 'text-text-muted',
  },
  syntax_error: {
    icon: Braces,
    heading: 'Syntax error',
    tone: 'border-warning/30/40 bg-warning/10 text-warning',
    iconColor: 'text-warning',
  },
  timeout: {
    icon: TimerOff,
    heading: 'Time limit exceeded',
    tone: 'border-warning/40 bg-warning/10 text-warning',
    iconColor: 'text-warning',
    hint: 'Your code ran longer than the allowed time — check for infinite loops or an O(n²) loop that could be O(n).',
  },
  runtime_error: {
    icon: Bug,
    heading: 'Runtime error',
    tone: 'border-danger/30/40 bg-danger/10 text-danger',
    iconColor: 'text-danger',
  },
  forbidden_api: {
    icon: ShieldAlert,
    heading: 'Blocked: restricted API',
    tone: 'border-danger/30/40 bg-danger/10 text-danger',
    iconColor: 'text-danger',
  },
  no_entry_function: {
    icon: FunctionSquare,
    heading: 'Entry function not found',
    tone: 'border-warning/30/40 bg-warning/10 text-warning',
    iconColor: 'text-warning',
  },
  service_unavailable: {
    icon: ServerCrash,
    heading: 'Judge unavailable',
    tone: 'border-border-theme surface-text bg-surface-hover text-text-muted',
    iconColor: 'text-text-muted',
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

const TestRow = memo(({ test, index, language = 'english' }) => {
  const L = (key) => t(key, language);
  const passed = Boolean(test.passed);
  const executionTime = test.executionTime;
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        passed ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle2 size={16} className="text-success" />
          ) : (
            <XCircle size={16} className="text-danger" />
          )}
          <span className="text-sm font-medium text-text-primary">{L('test.test')} {index + 1}</span>
          <Badge variant={passed ? 'success' : 'destructive'}>{passed ? L('test.passed') : L('test.failed')}</Badge>
        </div>
        {executionTime !== null && executionTime !== undefined && (
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Clock size={11} />
            <span className="font-mono">{formatTime(executionTime)}</span>
          </div>
        )}
      </div>
      <div className="grid gap-1 text-xs font-mono">
        <div className="text-text-muted">
          <span className="text-text-muted">input&nbsp;&nbsp;&nbsp;&nbsp;:</span>{' '}
          <span className="text-text-muted break-all">{formatValue(test.input)}</span>
        </div>
        <div className="text-text-muted">
          <span className="text-text-muted">expected :</span>{' '}
          <span className="text-success break-all">{formatValue(test.expected)}</span>
        </div>
        <div className="text-text-muted">
          <span className="text-text-muted">actual&nbsp;&nbsp;&nbsp;:</span>{' '}
          <span className={passed ? 'text-success break-all' : 'text-danger break-all'}>
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
  language = 'english',
}) => {
  const L = (key) => t(key, language);
  return (
    <Card className="border-border-theme surface-text bg-surface">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {isExecuting && (
            <div className="flex items-center gap-2 text-xs text-icon-active">
              <Loader2 size={14} className="animate-spin" />
              <span>{L('test.executing')}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {executionError && <ExecutionErrorState error={executionError} />}

        {!executionError && !isExecuting && isEmpty && (
          <div className="text-sm text-text-muted py-4 text-center">
            {L('test.runPrompt')}
          </div>
        )}

        {results.map((test, index) => (
          <TestRow key={index} test={test} index={index} language={language} />
        ))}
      </CardContent>
    </Card>
  );
});
TestResultPanel.displayName = 'TestResultPanel';

export default TestResultPanel;
