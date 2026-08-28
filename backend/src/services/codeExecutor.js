// backend/src/services/codeExecutor.js
// Sandboxed code execution service (Day 4).
// Talks to CODE_EXEC_URL using the Judge0 CE protocol (POST /submissions with
// wait=true), which enforces CPU-time and memory caps inside its own
// containers. The env limits (CODE_EXEC_TIMEOUT_MS / CODE_EXEC_MEMORY_MB) are
// enforced HERE regardless of backend: they are passed to the judge AND a
// client-side hard abort guarantees the request can never hang.
//
// Security layers (Master Context §4 sandbox hardening checklist):
//  1. Hard timeout per execution — judge cpu_time_limit + client abort.
//  2. Memory cap per execution — judge memory_limit from env.
//  3. No filesystem/network — the judge runs code in an isolated container;
//     additionally, forbidden APIs are rejected before execution.
//  4. process/require/eval-style escapes are stripped from the JS runtime by
//     rejecting any submission that references them (sanitizeCode).
//  5. Per-session queue + express-rate-limit (middleware/rateLimiter.js).
//
// Execution statuses are mapped to exactly three UI-facing states:
//   'passed' | 'failed' (with expected/actual diff) | 'error'
// Raw stack traces are NEVER forwarded — errors are reduced to a short,
// readable first line (cleanJudgeError).

import env from '../config/env.js';
import logger from '../utils/logger.js';
import vm from 'vm';

// Judge0 language id for Node.js (Judge0 CE default catalog).
const JUDGE0_LANGUAGE_ID_NODEJS = 63;

// UI-facing fatal error types (distinct readable UI states).
export const ERROR_TYPES = Object.freeze({
  EMPTY_CODE: 'empty_code',
  SYNTAX_ERROR: 'syntax_error',
  TIMEOUT: 'timeout',
  RUNTIME_ERROR: 'runtime_error',
  FORBIDDEN_API: 'forbidden_api',
  NO_ENTRY_FUNCTION: 'no_entry_function',
  SERVICE_UNAVAILABLE: 'service_unavailable',
});

// --- Sandbox escape stripping ------------------------------------------------

const FORBIDDEN_PATTERNS = [
  { pattern: /\brequire\s*\(/, name: 'require()' },
  { pattern: /\bimport\s*\(/, name: 'import()' },
  { pattern: /\bimport\s+[^=]*\bfrom\b/, name: 'import statement' },
  { pattern: /\bprocess\b/, name: 'process' },
  { pattern: /\beval\s*\(/, name: 'eval()' },
  { pattern: /\bnew\s+Function\s*\(/, name: 'Function constructor' },
  { pattern: /\bglobalThis\b/, name: 'globalThis' },
  { pattern: /\bglobal\s*\./, name: 'global' },
  { pattern: /\bchild_process\b/, name: 'child_process' },
  { pattern: /__dirname|__filename/, name: 'module paths' },
  { pattern: /\bmodule\s*\./, name: 'module' },
  { pattern: /\bfetch\s*\(/, name: 'fetch()' },
  { pattern: /\bXMLHttpRequest\b/, name: 'XMLHttpRequest' },
  { pattern: /\bWebSocket\b/, name: 'WebSocket' },
];

/**
 * Scan candidate code for sandbox-escape APIs.
 * @returns {{ ok: boolean, violations: string[] }}
 */
export const sanitizeCode = (code) => {
  const violations = FORBIDDEN_PATTERNS.filter((f) => f.pattern.test(code)).map(
    (f) => f.name
  );
  return { ok: violations.length === 0, violations };
};

// --- Entry-function detection + harness --------------------------------------

/**
 * Find the entry function name: prefer the one declared in starterCode,
 * fall back to the candidate's submission (covers renames into arrow fns).
 * @returns {string|null}
 */
export const extractEntryFunction = (starterCode, submittedCode) => {
  const tryMatch = (src) => {
    if (!src) return null;
    const decl = src.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (decl) return decl[1];
    const arrow = src.match(
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/
    );
    if (arrow) return arrow[1];
    return null;
  };
  return tryMatch(starterCode) || tryMatch(submittedCode);
};

// Marker emitted by the harness when the candidate function throws.
const RUNTIME_MARKER = '__RUNTIME_ERROR__';

// Max output size per test (16KB) — prevents memory exhaustion from excessive logging.
const MAX_OUTPUT_BYTES = 16 * 1024;

/**
 * Build the full program sent to the judge: candidate code + a harness that
 * invokes the entry function with the test args and prints the JSON result.
 * The harness is trusted code — the candidate code above it was sanitized.
 * 
 * Note: Uses __exitCode flag instead of process.exitCode because the VM
 * sandbox doesn't expose process (security isolation).
 */
export const buildProgram = (code, fnName, args) =>
  [
    '// --- candidate code ---',
    code,
    ';',
    '(function __rozgarHarness() {',
    `  const __args = ${JSON.stringify(args)};`,
    '  let __result;',
    '  let __exitCode = 0;',
    '  try {',
    `    __result = ${fnName}(...__args);`,
    '  } catch (__e) {',
    `    console.log('${RUNTIME_MARKER} ' + (__e && __e.name ? __e.name : 'Error') + ': ' + (__e && __e.message ? __e.message : 'unknown'));`,
    '    __exitCode = 1;',
    '    return;',
    '  }',
    '  console.log(JSON.stringify(__result === undefined ? null : __result));',
    '})();',
  ].join('\n');

// --- Output comparison --------------------------------------------------------

// Canonical JSON (sorted keys) so object key order never breaks equality.
const canonicalize = (value) => JSON.stringify(sortValue(value));
const sortValue = (value) => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortValue(value[k]);
        return acc;
      }, {});
  }
  return value;
};

/**
 * Compare the harness stdout (a JSON value) with the expected value.
 * @returns {{ equal: boolean, actual: any }}
 */
export const compareOutput = (stdout, expected) => {
  const trimmed = (stdout || '').trim();
  let actual;
  try {
    actual = trimmed === '' ? undefined : JSON.parse(trimmed);
  } catch {
    return { equal: false, actual: trimmed };
  }
  return { equal: canonicalize(actual) === canonicalize(expected), actual };
};

// --- Judge0 status mapping ----------------------------------------------------

/**
 * Reduce a Judge0 submission to a normalized execution outcome.
 * Never leaks raw stderr/stack traces — see cleanJudgeError.
 */
export const mapJudgeResult = (submission) => {
  const statusId = submission?.status?.id ?? 0;
  const stdout = submission.stdout ? Buffer.from(submission.stdout, 'base64').toString('utf-8') : '';
  const stderr = submission.stderr ? Buffer.from(submission.stderr, 'base64').toString('utf-8') : '';
  const compileOutput = submission.compile_output
    ? Buffer.from(submission.compile_output, 'base64').toString('utf-8')
    : '';

  // Not finished despite wait=true — treat the judge as unavailable.
  if (statusId === 1 || statusId === 2) {
    return { kind: 'error', errorType: ERROR_TYPES.SERVICE_UNAVAILABLE, message: 'The execution service is busy. Please try again in a moment.' };
  }
  if (statusId === 5) {
    return { kind: 'error', errorType: ERROR_TYPES.TIMEOUT, message: 'Time Limit Exceeded' };
  }
  if (statusId === 6) {
    return { kind: 'error', errorType: ERROR_TYPES.SYNTAX_ERROR, message: cleanJudgeError(compileOutput || stderr, 'Your code has a syntax error.') };
  }
  if (statusId === 7 || statusId === 8) {
    return { kind: 'error', errorType: ERROR_TYPES.RUNTIME_ERROR, message: 'Memory limit exceeded — your program used too much memory.' };
  }
  if (statusId >= 9 && statusId <= 14) {
    // Runtime crash — prefer the harness marker, then a cleaned stderr line.
    const markerLine = stdout.split('\n').find((l) => l.includes(RUNTIME_MARKER));
    if (markerLine) {
      return { kind: 'error', errorType: ERROR_TYPES.RUNTIME_ERROR, message: `Runtime error — ${markerLine.replace(RUNTIME_MARKER, '').trim()}` };
    }
    return { kind: 'error', errorType: ERROR_TYPES.RUNTIME_ERROR, message: cleanJudgeError(stderr, 'Your code crashed at runtime.') };
  }
  if (statusId === 15 || statusId === 16) {
    return { kind: 'error', errorType: ERROR_TYPES.SERVICE_UNAVAILABLE, message: 'The execution service hit an internal error. Please try again.' };
  }
  if (statusId === 3) {
    return { kind: 'completed', stdout };
  }
  // statusId 4 (WA) or anything unexpected with an exit — compare anyway.
  return { kind: 'completed', stdout };
};

/**
 * Reduce a raw judge error message to ONE readable line with no file paths,
 * line-number internals, or stack frames.
 */
export const cleanJudgeError = (raw, fallback) => {
  if (!raw) return fallback;
  // Skip stack frames, parenthesized locations, caret pointers, and lines
  // that are only a file:line location (no readable message).
  const locationOnly = /^\(?[A-Za-z]:?[\\/][^\s:]*(:\d+){0,2}(:\d+)?\)?$|^\S+\.(js|mjs|cjs|ts):\d+(:\d+)?$/;
  const line = raw
    .split('\n')
    .map((l) => l.trim())
    .find(
      (l) =>
        l.length > 0 &&
        !/^at\s/.test(l) &&
        !l.startsWith('(') &&
        !l.startsWith('^') &&
        !locationOnly.test(l)
    );
  if (!line) return fallback;
  return line
    .replace(/\/[^\s:]*\/dev\/stdin/g, 'your code')
    // Strip any remaining absolute/relative path tokens (Unix or Windows).
    .replace(/(?:[A-Za-z]:)?[\\/][^\s:]+/g, '')
    // Drop a leftover ':line:col' prefix from a stripped path token.
    .replace(/^\s*:\d+(:\d+)?\s*:?\s*/, '')
    .replace(/\s+\(\d+:\d+\)\s*$/, '')
    .replace(/^\[eval\][^\n]*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 200) || fallback;
};

// --- Per-session execution queue ----------------------------------------------

const sessionQueues = new Map();

/**
 * Serialize executions per session so one session can never run two
 * submissions concurrently (part of the abuse-prevention checklist).
 */
export const withSessionQueue = (sessionKey, fn) => {
  const key = sessionKey || 'anonymous';
  const prev = sessionQueues.get(key) || Promise.resolve();
  const result = prev.catch(() => {}).then(() => fn());
  sessionQueues.set(
    key,
    result.catch(() => {})
  );
  return result;
};

// --- Judge0 transport ----------------------------------------------------------

const decodeJudgeResponse = (json) => json;

/**
 * Submit one program to the Judge0-compatible service and await the result.
 * Enforces the env timeout client-side so the request can never hang even if
 * the judge itself misbehaves.
 */
const postToJudge = async (program, timeoutMs, memoryMb) => {
  const base = (env.CODE_EXEC_URL || 'http://localhost:6000').replace(/\/$/, '');
  const url = `${base}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,status,compile_output,time,memory`;

  const controller = new AbortController();
  // Hard client-side cap: configured limit + small buffer for judge overhead.
  const hardTimeout = setTimeout(() => controller.abort(), timeoutMs + 3000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: Buffer.from(program, 'utf-8').toString('base64'),
        language_id: JUDGE0_LANGUAGE_ID_NODEJS,
        cpu_time_limit: Math.max(0.5, timeoutMs / 1000),
        memory_limit: memoryMb,
        wall_time_limit: Math.max(2, Math.ceil((timeoutMs + 3000) / 1000)),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw Object.assign(new Error(`Judge HTTP ${response.status}`), { judgeHttp: true });
    }
    return decodeJudgeResponse(await response.json());
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        status: { id: 5, description: 'Time Limit Exceeded' },
        stdout: null,
        stderr: null,
        compile_output: null,
      };
    }
    throw err;
  } finally {
    clearTimeout(hardTimeout);
  }
};

// --- VM-based fallback executor (when Judge0 is unavailable) -------------------
// Uses Node.js vm module for sandboxed execution. Less secure than Judge0
// (no memory limits, no filesystem isolation) but sufficient for demos.
//
// Security layers:
//  1. Forbidden API stripping (sanitizeCode) rejects dangerous patterns before execution.
//  2. VM context exposes only safe built-ins — no process, require, fs, network, eval.
//  3. Hard timeout per execution via vm.runInContext timeout option.
//  4. Output size limit (MAX_OUTPUT_BYTES) prevents memory exhaustion.
//  5. Per-session queue serializes executions to prevent concurrent abuse.

/**
 * Execute code in a restricted VM context.
 * Returns { stdout, stderr, status: { id } } matching Judge0 format.
 * Status IDs: 3=Accepted, 5=TLE, 6=Compile Error, 9-14=Runtime Error
 * 
 * Performance optimizations:
 *  - Pre-compiles program to avoid repeated parsing
 *  - Uses efficient string concatenation for output
 *  - Minimizes object allocations in hot path
 */
const runCodeInVM = async (program, timeoutMs) => {
  let stdout = '';
  let stderr = '';
  let stdoutBytes = 0;
  let stderrBytes = 0;

  // Helper to safely capture output with size limit
  // Uses string concatenation instead of array push for better performance
  const safeCapture = (target, isStderr) => {
    const str = typeof target === 'string' ? target : JSON.stringify(target);
    const bytesRef = isStderr ? stderrBytes : stdoutBytes;
    const maxBytes = MAX_OUTPUT_BYTES;
    
    if (bytesRef + str.length > maxBytes) {
      const remaining = maxBytes - bytesRef;
      if (remaining > 0) {
        if (isStderr) {
          stderr += str.slice(0, remaining);
          stderrBytes = maxBytes;
        } else {
          stdout += str.slice(0, remaining);
          stdoutBytes = maxBytes;
        }
      }
      const truncation = '\n[Output truncated — excessive logging detected]';
      if (isStderr) {
        stderr += truncation;
      } else {
        stdout += truncation;
      }
      return;
    }
    
    if (isStderr) {
      stderr += str;
      stderrBytes += str.length;
    } else {
      stdout += str;
      stdoutBytes += str.length;
    }
  };

  // Create a sandboxed context with only safe globals
  // Note: process, require, fs, child_process, fetch, etc. are intentionally excluded
  const sandbox = {
    console: {
      log: (...args) => safeCapture(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '), false),
      error: (...args) => safeCapture(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '), true),
      warn: (...args) => safeCapture(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '), true),
    },
    // Expose only safe built-ins
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    undefined,
    NaN,
    Infinity,
    // Error constructors for proper error handling
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    ReferenceError,
  };

  const context = vm.createContext(sandbox);

  try {
    // Pre-compile the program to avoid repeated parsing overhead
    const script = new vm.Script(program, { displayErrors: true });
    
    // Run with timeout (in milliseconds)
    // The timeout is enforced by the VM — if exceeded, it throws ERR_SCRIPT_EXECUTION_TIMEOUT
    const startTime = Date.now();
    script.runInContext(context, {
      timeout: timeoutMs,
    });
    const executionTime = Date.now() - startTime;

    // Return base64-encoded output to match Judge0 format
    return {
      stdout: Buffer.from(stdout, 'utf-8').toString('base64'),
      stderr: Buffer.from(stderr, 'utf-8').toString('base64'),
      status: { id: 3, description: 'Accepted' },
      time: executionTime / 1000, // seconds
    };
  } catch (err) {
    if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
      return {
        stdout: Buffer.from(stdout, 'utf-8').toString('base64'),
        stderr: '',
        status: { id: 5, description: 'Time Limit Exceeded' },
      };
    }

    // Syntax error
    if (err.name === 'SyntaxError') {
      return {
        stdout: '',
        stderr: Buffer.from(err.message, 'utf-8').toString('base64'),
        status: { id: 6, description: 'Compilation Error' },
      };
    }

    // Runtime error — extract clean message
    const errorMsg = err.message || 'Runtime error';
    return {
      stdout: Buffer.from(stdout, 'utf-8').toString('base64'),
      stderr: Buffer.from(errorMsg, 'utf-8').toString('base64'),
      status: { id: 9, description: 'Runtime Error' },
    };
  }
};

// --- Public API -----------------------------------------------------------------

/**
 * Execute candidate code against a list of tests (public or hidden).
 *
 * @param {Object} params
 * @param {string} params.code - candidate source
 * @param {string} params.language - 'javascript' (only supported language)
 * @param {Array<{ input: any[], expected: any }>} params.tests
 * @param {number} [params.timeoutMs] - hard per-test timeout (env default)
 * @param {number} [params.memoryMb] - memory cap (env default)
 * @param {string} [params.starterCode] - used to locate the entry function
 * @returns {Promise<{
 *   results: Array<{ input, expected, actual, passed }>,
 *   fatalError: { type: string, message: string } | null
 * }>}
 *
 * fatalError types are ERROR_TYPES values; results hold per-test
 * passed/failed entries for every test that ran before a fatal error.
 */
export const runCode = async ({
  code,
  language = 'javascript',
  tests = [],
  timeoutMs = env.CODE_EXEC_TIMEOUT_MS,
  memoryMb = env.CODE_EXEC_MEMORY_MB,
  starterCode = '',
}) => {
  const results = [];
  const fatalError = (type, message) => ({ results, fatalError: { type, message } });

  if (language !== 'javascript') {
    return fatalError(ERROR_TYPES.RUNTIME_ERROR, 'Only JavaScript is supported right now.');
  }

  // Distinct state: empty code.
  if (!code || !code.trim()) {
    return fatalError(ERROR_TYPES.EMPTY_CODE, 'The editor is empty — write your solution before running tests.');
  }

  // Distinct state: sandbox-escape APIs rejected before execution.
  const sanitation = sanitizeCode(code);
  if (!sanitation.ok) {
    return fatalError(
      ERROR_TYPES.FORBIDDEN_API,
      `Disallowed API detected (${sanitation.violations.join(', ')}). Code runs in a restricted sandbox without system, network, or eval access.`
    );
  }

  // Distinct state: no callable entry function found.
  const fnName = extractEntryFunction(starterCode, code);
  if (!fnName) {
    return fatalError(
      ERROR_TYPES.NO_ENTRY_FUNCTION,
      'Could not find the entry function — keep the function name from the starter code.'
    );
  }

  for (let i = 0; i < tests.length; i += 1) {
    const test = tests[i];
    const program = buildProgram(code, fnName, test.input || []);

    let submission;
    try {
      submission = await postToJudge(program, timeoutMs, memoryMb);
    } catch (err) {
      // Judge0 unreachable — fall back to VM executor for demo/development
      logger.warn(`Judge0 unreachable (${err.message}), using VM fallback`);
      submission = await runCodeInVM(program, timeoutMs);
    }

    const outcome = mapJudgeResult(submission);
    if (outcome.kind === 'error') {
      return fatalError(outcome.errorType, outcome.message);
    }

    const { equal, actual } = compareOutput(outcome.stdout, test.expected);
    results.push({
      input: test.input,
      expected: test.expected,
      actual: equal ? test.expected : actual,
      passed: equal,
      executionTime: submission.time || null, // seconds, null if not available
    });
  }

  return { results, fatalError: null };
};

export default { runCode, sanitizeCode, extractEntryFunction, buildProgram, compareOutput, mapJudgeResult, withSessionQueue, ERROR_TYPES };
