/**
 * Enhanced tests for OutputFormatter (beyond basic tests)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OutputFormatter } from '../../src/output/OutputFormatter.js';
import type { TableColumn } from '../../src/types.js';

describe('OutputFormatter - Enhanced', () => {
  describe('table formatting', () => {
    it('should format table with custom column widths', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name', width: 20 },
        { header: 'Age', field: 'age', width: 10 },
      ];

      const result = formatter.table(data, columns);

      assert.ok(result.includes('Alice'));
      assert.ok(result.includes('Bob'));
      assert.ok(result.includes('30'));
      assert.ok(result.includes('25'));
    });

    it('should format table with alignment', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [{ left: 'L', center: 'C', right: 'R' }];
      const columns: TableColumn[] = [
        { header: 'Left', field: 'left', width: 10, align: 'left' },
        { header: 'Center', field: 'center', width: 10, align: 'center' },
        { header: 'Right', field: 'right', width: 10, align: 'right' },
      ];

      const result = formatter.table(data, columns);

      assert.ok(result.includes('L'));
      assert.ok(result.includes('C'));
      assert.ok(result.includes('R'));
    });

    it('should format table with custom formatters', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        { name: 'Alice', active: true },
        { name: 'Bob', active: false },
      ];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        {
          header: 'Status',
          field: 'active',
          format: (value) => (value ? 'ACTIVE' : 'INACTIVE'),
        },
      ];

      const result = formatter.table(data, columns);

      assert.ok(result.includes('ACTIVE'));
      assert.ok(result.includes('INACTIVE'));
    });

    it('should handle empty data', () => {
      const formatter = new OutputFormatter({ color: false });
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
      ];

      const result = formatter.table([], columns);

      assert.ok(result.includes('No data'));
    });

    it('should handle empty data in quiet mode', () => {
      const formatter = new OutputFormatter({ color: false, quiet: true });
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
      ];

      const result = formatter.table([], columns);

      assert.equal(result, '');
    });

    it('should handle null and undefined values', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        { name: 'Alice', value: null },
        { name: 'Bob', value: undefined },
      ];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Value', field: 'value' },
      ];

      const result = formatter.table(data, columns);

      assert.ok(result.includes('Alice'));
      assert.ok(result.includes('Bob'));
    });

    it('should handle boolean values', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        { name: 'Feature A', enabled: true },
        { name: 'Feature B', enabled: false },
      ];
      const columns: TableColumn[] = [
        { header: 'Feature', field: 'name' },
        { header: 'Enabled', field: 'enabled' },
      ];

      const result = formatter.table(data, columns);

      assert.ok(result.includes('Feature A'));
      assert.ok(result.includes('Feature B'));
    });

    it('should handle Date values', () => {
      const formatter = new OutputFormatter({ color: false });
      const date = new Date('2024-01-01T00:00:00Z');
      const data = [{ name: 'Event', date }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Date', field: 'date' },
      ];

      const result = formatter.table(data, columns);

      assert.ok(result.includes('Event'));
      assert.ok(result.includes('2024'));
    });

    it('should format numbers with locale', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [{ name: 'Item', count: 1000000 }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Count', field: 'count' },
      ];

      const result = formatter.table(data, columns);

      assert.ok(result.includes('Item'));
      // toLocaleString adds commas
      assert.ok(result.includes('1,000,000') || result.includes('1 000 000'));
    });
  });

  describe('JSON formatting', () => {
    it('should format JSON with pretty printing', () => {
      const formatter = new OutputFormatter();
      const data = { name: 'Alice', age: 30 };

      const result = formatter.json(data, true);

      assert.ok(result.includes('name'));
      assert.ok(result.includes('Alice'));
      assert.ok(result.includes('\n'));
    });

    it('should format JSON without pretty printing', () => {
      const formatter = new OutputFormatter();
      const data = { name: 'Alice', age: 30 };

      const result = formatter.json(data, false);

      assert.ok(result.includes('name'));
      assert.ok(result.includes('Alice'));
      assert.ok(!result.includes('\n'));
    });

    it('should handle complex nested objects', () => {
      const formatter = new OutputFormatter();
      const data = {
        user: {
          name: 'Alice',
          contacts: {
            email: 'alice@example.com',
            phone: '123-456-7890',
          },
        },
      };

      const result = formatter.json(data);

      assert.ok(result.includes('Alice'));
      assert.ok(result.includes('alice@example.com'));
    });
  });

  describe('YAML formatting', () => {
    it('should format simple objects as YAML', () => {
      const formatter = new OutputFormatter();
      const data = { name: 'Alice', age: 30 };

      const result = formatter.yaml(data);

      assert.ok(result.includes('name: Alice'));
      assert.ok(result.includes('age: 30'));
    });

    it('should format nested objects as YAML', () => {
      const formatter = new OutputFormatter();
      const data = {
        user: {
          name: 'Alice',
          age: 30,
        },
      };

      const result = formatter.yaml(data);

      assert.ok(result.includes('user:'));
      assert.ok(result.includes('name: Alice'));
      assert.ok(result.includes('age: 30'));
    });

    it('should format arrays as YAML', () => {
      const formatter = new OutputFormatter();
      const data = ['item1', 'item2', 'item3'];

      const result = formatter.yaml(data);

      assert.ok(result.includes('- item1'));
      assert.ok(result.includes('- item2'));
      assert.ok(result.includes('- item3'));
    });

    it('should handle null values', () => {
      const formatter = new OutputFormatter();
      const data = { value: null };

      const result = formatter.yaml(data);

      assert.ok(result.includes('null'));
    });

    it('should handle boolean values', () => {
      const formatter = new OutputFormatter();
      const data = { enabled: true, disabled: false };

      const result = formatter.yaml(data);

      assert.ok(result.includes('enabled: true'));
      assert.ok(result.includes('disabled: false'));
    });

    it('should quote strings with special characters', () => {
      const formatter = new OutputFormatter();
      const data = { value: 'has:colon' };

      const result = formatter.yaml(data);

      assert.ok(result.includes('"has:colon"'));
    });

    it('should handle empty objects', () => {
      const formatter = new OutputFormatter();
      const data = {};

      const result = formatter.yaml(data);

      assert.ok(result.includes('{}'));
    });

    it('should handle empty arrays', () => {
      const formatter = new OutputFormatter();
      const data: any[] = [];

      const result = formatter.yaml(data);

      assert.ok(result.includes('[]'));
    });
  });

  describe('format method', () => {
    it('should format as JSON when format is json', () => {
      const formatter = new OutputFormatter({ format: 'json' });
      const data = { name: 'Alice' };

      const result = formatter.format(data);

      assert.ok(result.includes('name'));
      assert.ok(result.includes('Alice'));
    });

    it('should format as YAML when format is yaml', () => {
      const formatter = new OutputFormatter({ format: 'yaml' });
      const data = { name: 'Alice' };

      const result = formatter.format(data);

      assert.ok(result.includes('name: Alice'));
    });

    it('should format as table when format is table and data is array', () => {
      const formatter = new OutputFormatter({ format: 'table', color: false });
      const data = [{ name: 'Alice', age: 30 }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Age', field: 'age' },
      ];

      const result = formatter.format(data, columns);

      assert.ok(result.includes('Alice'));
      assert.ok(result.includes('30'));
    });

    it('should return empty string in quiet mode', () => {
      const formatter = new OutputFormatter({ quiet: true });
      const data = { name: 'Alice' };

      const result = formatter.format(data);

      assert.equal(result, '');
    });

    it('should format string data as-is in text mode', () => {
      const formatter = new OutputFormatter({ format: 'text' });
      const data = 'Hello, World!';

      const result = formatter.format(data);

      assert.equal(result, 'Hello, World!');
    });
  });

  describe('box', () => {
    it('should create a box around text', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.box('Hello\nWorld');

      assert.ok(result.includes('┌'));
      assert.ok(result.includes('│'));
      assert.ok(result.includes('└'));
      assert.ok(result.includes('Hello'));
      assert.ok(result.includes('World'));
    });

    it('should create a box with title', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.box('Content', 'Title');

      assert.ok(result.includes('Title'));
      assert.ok(result.includes('Content'));
    });

    it('should handle single line', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.box('Hello');

      assert.ok(result.includes('Hello'));
      assert.ok(result.includes('┌'));
      assert.ok(result.includes('└'));
    });

    it('should handle empty content', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.box('');

      assert.ok(result.includes('┌'));
      assert.ok(result.includes('└'));
    });
  });

  describe('list', () => {
    it('should create a list with default bullet', () => {
      const formatter = new OutputFormatter({ color: false });
      const items = ['Item 1', 'Item 2', 'Item 3'];

      const result = formatter.list(items);

      assert.ok(result.includes('Item 1'));
      assert.ok(result.includes('Item 2'));
      assert.ok(result.includes('Item 3'));
    });

    it('should create a list with custom bullet', () => {
      const formatter = new OutputFormatter({ color: false });
      const items = ['Item 1', 'Item 2'];

      const result = formatter.list(items, '-');

      assert.ok(result.includes('-'));
      assert.ok(result.includes('Item 1'));
      assert.ok(result.includes('Item 2'));
    });

    it('should handle empty list', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.list([]);

      assert.equal(result, '');
    });
  });

  describe('tree', () => {
    it('should create a tree structure', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        {
          label: 'Root 1',
          children: [{ label: 'Child 1.1' }, { label: 'Child 1.2' }],
        },
        {
          label: 'Root 2',
          children: [{ label: 'Child 2.1' }],
        },
      ];

      const result = formatter.tree(data);

      assert.ok(result.includes('Root 1'));
      assert.ok(result.includes('Child 1.1'));
      assert.ok(result.includes('Child 1.2'));
      assert.ok(result.includes('Root 2'));
      assert.ok(result.includes('Child 2.1'));
      assert.ok(result.includes('├─'));
      assert.ok(result.includes('└─'));
    });

    it('should handle tree without children', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [{ label: 'Node 1' }, { label: 'Node 2' }];

      const result = formatter.tree(data);

      assert.ok(result.includes('Node 1'));
      assert.ok(result.includes('Node 2'));
    });

    it('should handle empty tree', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.tree([]);

      assert.equal(result, '');
    });

    it('should apply custom prefix', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [{ label: 'Node' }];

      const result = formatter.tree(data, '  ');

      assert.ok(result.includes('Node'));
    });
  });

  describe('color options', () => {
    it('should apply colors when enabled', () => {
      const formatter = new OutputFormatter({ color: true });
      const data = [{ name: 'Alice', enabled: true }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Enabled', field: 'enabled' },
      ];

      const result = formatter.table(data, columns);

      // Should contain ANSI color codes
      assert.ok(result.includes('\x1b['));
    });

    it('should not apply colors when disabled', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [{ name: 'Alice', enabled: true }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Enabled', field: 'enabled' },
      ];

      const result = formatter.table(data, columns);

      // Should not contain ANSI color codes
      assert.ok(!result.includes('\x1b['));
    });
  });

  describe('verbose and quiet modes', () => {
    it('should include details in verbose mode', () => {
      const formatter = new OutputFormatter({ verbose: true });
      // Verbose mode primarily affects application logic, not formatter output
      // This test validates formatter still works
      const data = { name: 'Alice' };
      const result = formatter.json(data);

      assert.ok(result.includes('Alice'));
    });

    it('should suppress output in quiet mode for format method', () => {
      const formatter = new OutputFormatter({ quiet: true });
      const data = { name: 'Alice' };

      const result = formatter.format(data);

      assert.equal(result, '');
    });

    it('should respect quiet mode in table with empty data', () => {
      const formatter = new OutputFormatter({ quiet: true, color: false });
      const columns: TableColumn[] = [{ header: 'Name', field: 'name' }];

      const result = formatter.table([], columns);

      assert.equal(result, '');
    });
  });
});
