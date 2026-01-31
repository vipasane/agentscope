/**
 * Performance benchmarks for OutputFormatter
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OutputFormatter } from '../src/output/OutputFormatter.js';
import type { TableColumn } from '../src/types.js';

describe('OutputFormatter Performance', () => {
  it('should format large tables efficiently', () => {
    const formatter = new OutputFormatter({ color: false });

    // Generate 1000 rows of data
    const data = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      active: i % 2 === 0,
      score: Math.random() * 100,
    }));

    const columns: TableColumn[] = [
      { header: 'ID', field: 'id', width: 10 },
      { header: 'Name', field: 'name', width: 20 },
      { header: 'Email', field: 'email', width: 30 },
      { header: 'Active', field: 'active', width: 10 },
      { header: 'Score', field: 'score', width: 10 },
    ];

    const start = performance.now();

    const result = formatter.table(data, columns);

    const duration = performance.now() - start;

    console.log(`Formatted 1000-row table in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 100, `Expected < 100ms, got ${duration}ms`);
    assert.ok(result.length > 0);
  });

  it('should format JSON efficiently', () => {
    const formatter = new OutputFormatter();

    // Generate complex nested structure
    const data = {
      users: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        profile: {
          email: `user${i}@example.com`,
          age: 20 + (i % 50),
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
      })),
    };

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      formatter.json(data);
    }

    const duration = performance.now() - start;

    console.log(`Formatted JSON 100 times in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 200, `Expected < 200ms, got ${duration}ms`);
  });

  it('should format YAML efficiently', () => {
    const formatter = new OutputFormatter();

    const data = {
      config: {
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'secret',
          },
        },
        services: ['web', 'api', 'worker'],
      },
    };

    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      formatter.yaml(data);
    }

    const duration = performance.now() - start;

    console.log(`Formatted YAML 1000 times in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 200, `Expected < 200ms, got ${duration}ms`);
  });

  it('should handle wide tables efficiently', () => {
    const formatter = new OutputFormatter({ color: false });

    // Generate data with 50 columns
    const data = Array.from({ length: 100 }, (_, i) => {
      const row: Record<string, unknown> = { id: i };
      for (let j = 0; j < 50; j++) {
        row[`col${j}`] = `value${i}-${j}`;
      }
      return row;
    });

    const columns: TableColumn[] = [
      { header: 'ID', field: 'id', width: 5 },
      ...Array.from({ length: 50 }, (_, j) => ({
        header: `Col ${j}`,
        field: `col${j}`,
        width: 15,
      })),
    ];

    const start = performance.now();

    const result = formatter.table(data, columns);

    const duration = performance.now() - start;

    console.log(`Formatted 100x50 table in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 150, `Expected < 150ms, got ${duration}ms`);
    assert.ok(result.length > 0);
  });

  it('should create boxes efficiently', () => {
    const formatter = new OutputFormatter({ color: false });

    const content = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n');

    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      formatter.box(content, 'Title');
    }

    const duration = performance.now() - start;

    console.log(`Created 1000 boxes in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 100, `Expected < 100ms, got ${duration}ms`);
  });

  it('should format trees efficiently', () => {
    const formatter = new OutputFormatter({ color: false });

    // Generate deep tree structure
    const data = Array.from({ length: 100 }, (_, i) => ({
      label: `Node ${i}`,
      children: Array.from({ length: 10 }, (_, j) => ({
        label: `Child ${i}-${j}`,
      })),
    }));

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      formatter.tree(data);
    }

    const duration = performance.now() - start;

    console.log(`Formatted 100 trees in ${duration.toFixed(2)}ms`);
    assert.ok(duration < 200, `Expected < 200ms, got ${duration}ms`);
  });
});
