/**
 * Tests for OutputFormatter
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OutputFormatter } from '../../src/output/OutputFormatter.js';

describe('OutputFormatter', () => {
  describe('JSON', () => {
    it('should format as JSON', () => {
      const formatter = new OutputFormatter();
      const data = { name: 'Alice', age: 30 };
      const result = formatter.json(data);
      assert.equal(result, JSON.stringify(data, null, 2));
    });

    it('should format as compact JSON', () => {
      const formatter = new OutputFormatter();
      const data = { name: 'Alice', age: 30 };
      const result = formatter.json(data, false);
      assert.equal(result, JSON.stringify(data));
    });
  });

  describe('YAML', () => {
    it('should format simple object as YAML', () => {
      const formatter = new OutputFormatter();
      const data = { name: 'Alice', age: 30 };
      const result = formatter.yaml(data);
      assert.match(result, /name: Alice/);
      assert.match(result, /age: 30/);
    });

    it('should format array as YAML', () => {
      const formatter = new OutputFormatter();
      const data = ['Alice', 'Bob', 'Charlie'];
      const result = formatter.yaml(data);
      assert.match(result, /- Alice/);
      assert.match(result, /- Bob/);
    });

    it('should format nested object as YAML', () => {
      const formatter = new OutputFormatter();
      const data = {
        user: {
          name: 'Alice',
          age: 30,
        },
      };
      const result = formatter.yaml(data);
      assert.match(result, /user:/);
      assert.match(result, /name: Alice/);
    });
  });

  describe('Table', () => {
    it('should format data as table', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const columns = [
        { header: 'ID', field: 'id' },
        { header: 'Name', field: 'name' },
      ];

      const result = formatter.table(data, columns);
      assert.match(result, /ID/);
      assert.match(result, /Name/);
      assert.match(result, /Alice/);
      assert.match(result, /Bob/);
    });

    it('should handle empty data', () => {
      const formatter = new OutputFormatter({ color: false, quiet: false });
      const result = formatter.table([], []);
      assert.match(result, /No data/);
    });
  });

  describe('Box', () => {
    it('should create a box around text', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.box('Hello');
      assert.match(result, /┌/);
      assert.match(result, /└/);
      assert.match(result, /Hello/);
    });

    it('should create a box with title', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.box('Hello', 'Title');
      assert.match(result, /Title/);
      assert.match(result, /Hello/);
    });
  });

  describe('List', () => {
    it('should format a list', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.list(['Item 1', 'Item 2', 'Item 3']);
      assert.match(result, /Item 1/);
      assert.match(result, /Item 2/);
      assert.match(result, /Item 3/);
    });
  });

  describe('Tree', () => {
    it('should format a tree structure', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        {
          label: 'Parent',
          children: [
            { label: 'Child 1' },
            { label: 'Child 2' },
          ],
        },
      ];

      const result = formatter.tree(data);
      assert.match(result, /Parent/);
      assert.match(result, /Child 1/);
      assert.match(result, /Child 2/);
    });
  });
});
