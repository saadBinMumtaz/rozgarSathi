import { runCode, ERROR_TYPES, sanitizeCode } from '../src/services/codeExecutor.js';

console.log('========================================');
console.log('SANDBOX HARDENING PASS');
console.log('========================================');
console.log();

// TEST 1: Infinite Loop
console.log('--- TEST 1: Infinite Loop ---');
const start1 = Date.now();
const r1 = await runCode({ 
  code: 'function test() { while(true) {} }', 
  tests: [{ input: [], expected: true }]
});
const elapsed1 = Date.now() - start1;
console.log('Type:', r1.fatalError?.type);
console.log('Message:', r1.fatalError?.message);
console.log('Elapsed:', elapsed1, 'ms');
console.log('PASS:', r1.fatalError?.type === ERROR_TYPES.TIMEOUT && elapsed1 <= 6000);
console.log();

// TEST 2: Sandbox Escape Attempts
console.log('--- TEST 2: Sandbox Escape Attempts ---');

// 2a: process access
console.log('2a: process access');
const san1 = sanitizeCode('function test() { return process.env; }');
console.log('  sanitizeCode ok:', san1.ok, 'violations:', san1.violations);
const r2a = await runCode({ code: 'function test() { return process.env; }', tests: [{ input: [], expected: null }] });
console.log('  Result type:', r2a.fatalError?.type);
console.log('  PASS:', r2a.fatalError?.type === ERROR_TYPES.FORBIDDEN_API);
console.log();

// 2b: require access
console.log('2b: require access');
const san2 = sanitizeCode('function test() { return require("fs"); }');
console.log('  sanitizeCode ok:', san2.ok, 'violations:', san2.violations);
const r2b = await runCode({ code: 'function test() { return require("fs"); }', tests: [{ input: [], expected: null }] });
console.log('  Result type:', r2b.fatalError?.type);
console.log('  PASS:', r2b.fatalError?.type === ERROR_TYPES.FORBIDDEN_API);
console.log();

// 2c: eval access
console.log('2c: eval access');
const san3 = sanitizeCode('function test() { return eval("1+1"); }');
console.log('  sanitizeCode ok:', san3.ok, 'violations:', san3.violations);
const r2c = await runCode({ code: 'function test() { return eval("1+1"); }', tests: [{ input: [], expected: 2 }] });
console.log('  Result type:', r2c.fatalError?.type);
console.log('  PASS:', r2c.fatalError?.type === ERROR_TYPES.FORBIDDEN_API);
console.log();

// 2d: fetch access
console.log('2d: fetch access');
const san4 = sanitizeCode('function test() { return fetch("http://evil.com"); }');
console.log('  sanitizeCode ok:', san4.ok, 'violations:', san4.violations);
const r2d = await runCode({ code: 'function test() { return fetch("http://evil.com"); }', tests: [{ input: [], expected: null }] });
console.log('  Result type:', r2d.fatalError?.type);
console.log('  PASS:', r2d.fatalError?.type === ERROR_TYPES.FORBIDDEN_API);
console.log();

// TEST 3: Memory Exhaustion
console.log('--- TEST 3: Memory Exhaustion ---');
const start3 = Date.now();
const r3 = await runCode({ 
  code: 'function test() { const a = []; while(true) { a.push("x".repeat(1000)); } }', 
  tests: [{ input: [], expected: null }],
  timeoutMs: 3000
});
const elapsed3 = Date.now() - start3;
console.log('Type:', r3.fatalError?.type);
console.log('Message:', r3.fatalError?.message);
console.log('Elapsed:', elapsed3, 'ms');
console.log('PASS:', r3.fatalError?.type === ERROR_TYPES.TIMEOUT);
console.log();

// TEST 4: Verify Server-Side Enforcement
console.log('--- TEST 4: Server-Side Enforcement ---');
console.log('Checking codeExecutor.js for server-side timeout...');
import fs from 'fs';
const executorCode = fs.readFileSync('./src/services/codeExecutor.js', 'utf-8');
const hasVmTimeout = executorCode.includes('vm.runInContext') && executorCode.includes('timeout:');
const hasClientOnly = executorCode.includes('setTimeout') && !executorCode.includes('vm.runInContext');
console.log('Uses vm.runInContext with timeout:', hasVmTimeout);
console.log('PASS:', hasVmTimeout && !hasClientOnly);
console.log();

// TEST 5: Parallel Sessions
console.log('--- TEST 5: Parallel Sessions ---');
const session1Code = 'function test(x) { return x * 2; }';
const session2Code = 'function test(x) { return x * 3; }';

const [r5a, r5b] = await Promise.all([
  runCode({ code: session1Code, tests: [{ input: [5], expected: 10 }] }),
  runCode({ code: session2Code, tests: [{ input: [5], expected: 15 }] })
]);

console.log('Session 1 result:', r5a.results[0]?.actual, '(expected: 10)');
console.log('Session 2 result:', r5b.results[0]?.actual, '(expected: 15)');
console.log('No state leak:', r5a.results[0]?.actual === 10 && r5b.results[0]?.actual === 15);
console.log('PASS:', r5a.results[0]?.actual === 10 && r5b.results[0]?.actual === 15);
console.log();

console.log('========================================');
console.log('HARDENING PASS COMPLETE');
console.log('========================================');
