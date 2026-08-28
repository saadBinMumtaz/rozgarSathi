// backend/tests/coding.test.js
// Day 4 coding judge — pure-logic tests (no judge / no Mongo needed).
// Covers: sandbox-escape stripping, entry-function detection, harness
// building, canonical output comparison, Judge0 status mapping (three UI
// states, no stack traces), runCode fatal guards, and coding scoring floors.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeCode,
  extractEntryFunction,
  buildProgram,
  compareOutput,
  mapJudgeResult,
  runCode,
  ERROR_TYPES,
} from '../src/services/codeExecutor.js';
import { evaluateCodingSubmission } from '../src/services/scoring.js';

const b64 = (s) => Buffer.from(s, 'utf-8').toString('base64');

describe('sanitizeCode — sandbox escape stripping', () => {
  test('accepts clean solution code', () => {
    const result = sanitizeCode('function reverseWords(s) {\n  return s.trim().split(" ").reverse().join(" ");\n}');
    assert.equal(result.ok, true);
    assert.deepEqual(result.violations, []);
  });

  test('flags require / process / eval escapes', () => {
    assert.equal(sanitizeCode('const fs = require("fs");').ok, false);
    assert.equal(sanitizeCode('process.exit(0)').ok, false);
    assert.equal(sanitizeCode('eval("1+1")').ok, false);
    assert.equal(sanitizeCode('new Function("return 1")').ok, false);
  });

  test('flags network APIs', () => {
    assert.equal(sanitizeCode('fetch("http://evil.example")').ok, false);
    assert.equal(sanitizeCode('new XMLHttpRequest()').ok, false);
    assert.equal(sanitizeCode('new WebSocket("ws://x")').ok, false);
  });

  test('lists every violated API name', () => {
    const result = sanitizeCode('const cp = require("child_process"); eval("x");');
    assert.ok(result.violations.includes('require()'));
    assert.ok(result.violations.includes('child_process'));
    assert.ok(result.violations.includes('eval()'));
  });
});

describe('extractEntryFunction', () => {
  test('finds function declaration from starter code', () => {
    assert.equal(extractEntryFunction('function pairWithSum(arr, k) {\n}', 'whatever'), 'pairWithSum');
  });

  test('finds arrow function from submission when starter is absent', () => {
    assert.equal(extractEntryFunction('', 'const mostFrequent = (arr) => 1;'), 'mostFrequent');
    assert.equal(extractEntryFunction('', 'let solve = async (x) => x;'), 'solve');
  });

  test('returns null when nothing callable exists', () => {
    assert.equal(extractEntryFunction('', 'const x = 5;'), null);
  });
});

describe('buildProgram — judge harness', () => {
  test('wraps candidate code with a harness calling the entry function', () => {
    const program = buildProgram('function f(a) { return a + 1; }', 'f', [41]);
    assert.ok(program.includes('function f(a)'));
    assert.ok(program.includes('f(...__args)'));
    assert.ok(program.includes('[41]'));
    assert.ok(program.includes('__RUNTIME_ERROR__'));
  });
});

describe('compareOutput — canonical comparison', () => {
  test('matches primitives', () => {
    assert.deepEqual(compareOutput('42', 42), { equal: true, actual: 42 });
    assert.deepEqual(compareOutput('"abc"', 'abc'), { equal: true, actual: 'abc' });
  });

  test('ignores object key order', () => {
    const { equal } = compareOutput('{"b":1,"a":2}', { a: 2, b: 1 });
    assert.equal(equal, true);
  });

  test('detects mismatches', () => {
    assert.equal(compareOutput('3', 4).equal, false);
    assert.equal(compareOutput('[1,2]', [2, 1]).equal, false);
  });

  test('non-JSON stdout is reported as raw actual', () => {
    const { equal, actual } = compareOutput('not json', 1);
    assert.equal(equal, false);
    assert.equal(actual, 'not json');
  });
});

describe('mapJudgeResult — Judge0 status mapping (3 UI states)', () => {
  test('status 3 (Accepted) completes with decoded stdout', () => {
    const outcome = mapJudgeResult({ status: { id: 3 }, stdout: b64('"ok"') });
    assert.equal(outcome.kind, 'completed');
    assert.equal(outcome.stdout, '"ok"');
  });

  test('status 5 maps to timeout', () => {
    const outcome = mapJudgeResult({ status: { id: 5 } });
    assert.equal(outcome.kind, 'error');
    assert.equal(outcome.errorType, ERROR_TYPES.TIMEOUT);
  });

  test('status 6 maps to syntax_error without leaking stack traces', () => {
    const raw = '/tmp/buildsrv/judge/sub_91/main.js:2\n  const x = ;\n          ^\nSyntaxError: Unexpected token';
    const outcome = mapJudgeResult({ status: { id: 6 }, compile_output: b64(raw) });
    assert.equal(outcome.errorType, ERROR_TYPES.SYNTAX_ERROR);
    assert.ok(!outcome.message.includes('/tmp/buildsrv'));
    assert.ok(outcome.message.length <= 200);
  });

  test('status 7/8 map to memory runtime errors', () => {
    assert.equal(mapJudgeResult({ status: { id: 7 } }).errorType, ERROR_TYPES.RUNTIME_ERROR);
    assert.equal(mapJudgeResult({ status: { id: 8 } }).errorType, ERROR_TYPES.RUNTIME_ERROR);
  });

  test('status 9-14 prefer the harness runtime marker', () => {
    const stdout = b64('__RUNTIME_ERROR__ TypeError: Cannot read properties of null');
    const outcome = mapJudgeResult({ status: { id: 9 }, stdout });
    assert.equal(outcome.errorType, ERROR_TYPES.RUNTIME_ERROR);
    assert.ok(outcome.message.includes('TypeError'));
  });

  test('status 15/16 map to service_unavailable', () => {
    assert.equal(mapJudgeResult({ status: { id: 15 } }).errorType, ERROR_TYPES.SERVICE_UNAVAILABLE);
    assert.equal(mapJudgeResult({ status: { id: 1 } }).errorType, ERROR_TYPES.SERVICE_UNAVAILABLE);
  });
});

describe('runCode — fatal guards (no judge needed)', () => {
  const tests = [{ input: [1], expected: 1 }];

  test('empty code → empty_code', async () => {
    const { fatalError } = await runCode({ code: '   ', language: 'javascript', tests });
    assert.equal(fatalError.type, ERROR_TYPES.EMPTY_CODE);
  });

  test('forbidden API → forbidden_api before execution', async () => {
    const { fatalError } = await runCode({
      code: 'function f(x) { return require("fs"); }',
      language: 'javascript',
      tests,
      starterCode: 'function f(x) {\n}',
    });
    assert.equal(fatalError.type, ERROR_TYPES.FORBIDDEN_API);
  });

  test('no entry function → no_entry_function', async () => {
    const { fatalError } = await runCode({
      code: 'const x = 5;',
      language: 'javascript',
      tests,
      starterCode: '',
    });
    assert.equal(fatalError.type, ERROR_TYPES.NO_ENTRY_FUNCTION);
  });

  test('unsupported language is rejected', async () => {
    const { fatalError } = await runCode({ code: 'print(1)', language: 'python', tests });
    assert.equal(fatalError.type, ERROR_TYPES.RUNTIME_ERROR);
  });
});

describe('evaluateCodingSubmission — scoring floors', () => {
  test('empty code floors at 0', () => {
    const evaluation = evaluateCodingSubmission({ hiddenResults: [{ passed: true }], code: '' });
    assert.equal(evaluation.score, 0);
    assert.equal(evaluation.confidenceLevel, 'high');
  });

  test('all hidden tests passed scores high with evidence', () => {
    const hidden = [{ passed: true }, { passed: true }];
    const evaluation = evaluateCodingSubmission({ hiddenResults: hidden, code: 'function f(x) { return x; }' });
    assert.ok(evaluation.score >= 80);
    assert.ok(evaluation.evidence[0].includes('2/2 hidden tests'));
  });

  test('partial passes score proportionally', () => {
    const hidden = [{ passed: true }, { passed: false }];
    const full = evaluateCodingSubmission({ hiddenResults: hidden.map(() => ({ passed: true })), code: 'function f(x) { return x; }' });
    const half = evaluateCodingSubmission({ hiddenResults: hidden, code: 'function f(x) { return x; }' });
    assert.ok(half.score < full.score);
  });

  test('no hidden tests → low confidence', () => {
    const evaluation = evaluateCodingSubmission({ hiddenResults: [], code: 'function f(x) { return x; }' });
    assert.equal(evaluation.confidenceLevel, 'low');
  });
});
