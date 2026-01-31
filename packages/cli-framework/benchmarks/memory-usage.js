/**
 * Benchmark: Memory Usage
 *
 * Measures memory footprint of CLI framework components.
 */

const formatBytes = (bytes) => {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
};

const measureMemory = (label, fn) => {
  if (global.gc) global.gc();
  const before = process.memoryUsage();

  fn();

  if (global.gc) global.gc();
  const after = process.memoryUsage();

  const heapDelta = after.heapUsed - before.heapUsed;

  console.log(`${label}:`);
  console.log(`  Heap delta:  ${formatBytes(heapDelta)}`);
  console.log(`  Heap used:   ${formatBytes(after.heapUsed)}`);
  console.log(`  Total:       ${formatBytes(after.rss)}`);
  console.log('');
};

console.log('\n📊 Memory Usage Benchmark\n');
console.log(`Note: Run with --expose-gc for accurate measurements\n`);

// Baseline
measureMemory('Baseline', () => {});

// Import framework
measureMemory('After import', () => {
  const { CommandRegistry, ArgumentParser, OutputFormatter } = require('../dist/index.js');
});

// Create instances
measureMemory('After instances', () => {
  const { CommandRegistry, ArgumentParser, OutputFormatter } = require('../dist/index.js');
  const cli = new CommandRegistry();
  const parser = new ArgumentParser();
  const formatter = new OutputFormatter();
});

// Register commands
measureMemory('After registering 100 commands', () => {
  const { CommandRegistry } = require('../dist/index.js');
  const cli = new CommandRegistry();

  for (let i = 0; i < 100; i++) {
    cli.register({
      name: `command${i}`,
      description: `Test command ${i}`,
      action: async () => {},
    });
  }
});

console.log('✅ Benchmark complete');
