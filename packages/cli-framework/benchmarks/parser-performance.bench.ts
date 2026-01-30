/**
 * Performance benchmarks for ArgumentParser
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ArgumentParser } from '../src/parser/ArgumentParser.js';

describe('ArgumentParser Performance', () => {
  it('should parse 1000 simple arguments under 100ms', () => {
    const parser = new ArgumentParser();
    parser.addOption({
      name: 'verbose',
      short: 'v',
      long: 'verbose',
      type: 'boolean',
      description: 'Verbose',
    });

    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      parser.parse(['--verbose']);
    }

    const duration = performance.now() - start;

    console.log(`Parsed 1000 simple args in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 100, `Expected < 100ms, got ${duration}ms`);
  });

  it('should parse complex arguments efficiently', () => {
    const parser = new ArgumentParser();

    parser.addOption({
      name: 'env',
      long: 'env',
      type: 'string',
      description: 'Environment',
      choices: ['dev', 'staging', 'prod'],
    });

    parser.addOption({
      name: 'replicas',
      short: 'r',
      long: 'replicas',
      type: 'number',
      description: 'Replicas',
      validate: (v) => (v as number) > 0 && (v as number) <= 10,
    });

    parser.addArgument({
      name: 'files',
      description: 'Files',
      multiple: true,
    });

    const start = performance.now();

    for (let i = 0; i < 500; i++) {
      parser.parse([
        '--env',
        'prod',
        '--replicas',
        '5',
        'file1.txt',
        'file2.txt',
        'file3.txt',
      ]);
    }

    const duration = performance.now() - start;

    console.log(`Parsed 500 complex args in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 100, `Expected < 100ms, got ${duration}ms`);
  });

  it('should handle many options efficiently', () => {
    const parser = new ArgumentParser();

    // Add 50 options
    for (let i = 0; i < 50; i++) {
      parser.addOption({
        name: `option${i}`,
        long: `option${i}`,
        type: 'string',
        description: `Option ${i}`,
      });
    }

    const args: string[] = [];
    for (let i = 0; i < 50; i++) {
      args.push(`--option${i}`, `value${i}`);
    }

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      parser.parse(args);
    }

    const duration = performance.now() - start;

    console.log(`Parsed 100 iterations with 50 options in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 200, `Expected < 200ms, got ${duration}ms`);
  });

  it('should parse variadic arguments efficiently', () => {
    const parser = new ArgumentParser();

    parser.addArgument({
      name: 'files',
      description: 'Files',
      multiple: true,
    });

    // Create args with 100 files
    const args: string[] = [];
    for (let i = 0; i < 100; i++) {
      args.push(`file${i}.txt`);
    }

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      parser.parse(args);
    }

    const duration = performance.now() - start;

    console.log(`Parsed 100 iterations with 100 files in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 100, `Expected < 100ms, got ${duration}ms`);
  });

  it('should handle memory efficiently', () => {
    const iterations = 10000;
    const parsers: ArgumentParser[] = [];

    const start = performance.now();

    // Create many parser instances
    for (let i = 0; i < iterations; i++) {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'test',
        long: 'test',
        type: 'string',
        description: 'Test',
      });
      parser.parse(['--test', 'value']);
      parsers.push(parser);
    }

    const duration = performance.now() - start;

    console.log(`Created and used ${iterations} parsers in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 1000, `Expected < 1000ms, got ${duration}ms`);

    // Cleanup
    parsers.length = 0;
  });
});
