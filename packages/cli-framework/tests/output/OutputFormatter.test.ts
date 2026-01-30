/**
 * Tests for OutputFormatter
 */

import { describe, it, expect } from 'vitest';
import { OutputFormatter } from '../../src/output/OutputFormatter.js';

describe('OutputFormatter', () => {
  describe('JSON', () => {
    it('should format as JSON', () => {
      const formatter = new OutputFormatter();
      const data = { name: 'Alice', age: 30 };
      const result = formatter.json(data);
      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it('should format as compact JSON', () => {
      const formatter = new OutputFormatter();
      const data = { name: 'Alice', age: 30 };
      const result = formatter.json(data, false);
      expect(result).toBe(JSON.stringify(data));
    });
  });

  describe('YAML', () => {
    it('should format simple object as YAML', () => {
      const formatter = new OutputFormatter();
      const data = { name: 'Alice', age: 30 };
      const result = formatter.yaml(data);
      expect(result).toMatch(/name: Alice/);
      expect(result).toMatch(/age: 30/);
    });

    it('should format array as YAML', () => {
      const formatter = new OutputFormatter();
      const data = ['Alice', 'Bob', 'Charlie'];
      const result = formatter.yaml(data);
      expect(result).toMatch(/- Alice/);
      expect(result).toMatch(/- Bob/);
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
      expect(result).toMatch(/user:/);
      expect(result).toMatch(/name: Alice/);
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
      expect(result).toMatch(/ID/);
      expect(result).toMatch(/Name/);
      expect(result).toMatch(/Alice/);
      expect(result).toMatch(/Bob/);
    });

    it('should handle empty data', () => {
      const formatter = new OutputFormatter({ color: false, quiet: false });
      const result = formatter.table([], []);
      expect(result).toMatch(/No data/);
    });
  });

  describe('Box', () => {
    it('should create a box around text', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.box('Hello');
      expect(result).toMatch(/┌/);
      expect(result).toMatch(/└/);
      expect(result).toMatch(/Hello/);
    });

    it('should create a box with title', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.box('Hello', 'Title');
      expect(result).toMatch(/Title/);
      expect(result).toMatch(/Hello/);
    });
  });

  describe('List', () => {
    it('should format a list', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.list(['Item 1', 'Item 2', 'Item 3']);
      expect(result).toMatch(/Item 1/);
      expect(result).toMatch(/Item 2/);
      expect(result).toMatch(/Item 3/);
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
      expect(result).toMatch(/Parent/);
      expect(result).toMatch(/Child 1/);
      expect(result).toMatch(/Child 2/);
    });
  });
});
