/**
 * Benchmark: Argument Parsing Performance
 *
 * Measures parsing speed for various argument patterns.
 */

import { performance } from 'node:perf_hooks';
import { ArgumentParser } from '../dist/index.js';

const iterations = 10000;

// Setup parser
const parser = new ArgumentParser();
parser.addOption({ name: 'verbose', short: 'v', long: 'verbose', type: 'boolean', description: 'Verbose' });
parser.addOption({ name: 'port', short: 'p', long: 'port', type: 'number', description: 'Port' });
parser.addOption({ name: 'env', short: 'e', long: 'env', type: 'string', description: 'Environment' });
parser.addArgument({ name: 'command', description: 'Command' });

const testCases = [
  { name: 'Simple boolean', args: ['--verbose'] },
  { name: 'Multiple flags', args: ['-v', '-p', '3000'] },
  { name: 'Long with equals', args: ['--port=3000', '--env=production'] },
  { name: 'Mixed args', args: ['deploy', '--verbose', '--env', 'staging', '-p', '8080'] },
];

console.log('\n📊 Argument Parsing Performance\n');
console.log(`Iterations: ${iterations.toLocaleString()}\n`);

for (const testCase of testCases) {
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    parser.parse(testCase.args);
  }

  const elapsed = performance.now() - startTime;
  const perOp = (elapsed / iterations).toFixed(3);
  const opsPerSec = (iterations / (elapsed / 1000)).toLocaleString();

  console.log(`${testCase.name}:`);
  console.log(`  Total:      ${elapsed.toFixed(2)}ms`);
  console.log(`  Per op:     ${perOp}ms`);
  console.log(`  Ops/sec:    ${opsPerSec}`);
  console.log('');
}

console.log('✅ Benchmark complete');
