/**
 * Benchmark: CLI Startup Time
 *
 * Measures the time from module import to ready state.
 * Target: <300ms
 */

import { performance } from 'node:perf_hooks';

const startTime = performance.now();

// Import CLI framework
import { CommandRegistry, ArgumentParser, OutputFormatter } from '../dist/index.js';

const importTime = performance.now() - startTime;

// Create instances
const t1 = performance.now();
const cli = new CommandRegistry();
const parser = new ArgumentParser();
const formatter = new OutputFormatter();
const instanceTime = performance.now() - t1;

const totalTime = performance.now() - startTime;

console.log('\n📊 Startup Time Benchmark\n');
console.log(`Import time:    ${importTime.toFixed(2)}ms`);
console.log(`Instance time:  ${instanceTime.toFixed(2)}ms`);
console.log(`Total time:     ${totalTime.toFixed(2)}ms`);
console.log(`\nTarget: <300ms`);
console.log(`Status: ${totalTime < 300 ? '✅ PASS' : '❌ FAIL'}`);

process.exit(totalTime < 300 ? 0 : 1);
