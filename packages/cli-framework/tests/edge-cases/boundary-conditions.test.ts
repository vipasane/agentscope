/**
 * Edge case and boundary condition tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ArgumentParser } from '../../src/parser/ArgumentParser.js';
import { OutputFormatter } from '../../src/output/OutputFormatter.js';
import { ValidationError } from '../../src/utils/validators.js';
import { c, stripColors, displayWidth } from '../../src/utils/colors.js';

describe('Edge Cases and Boundary Conditions', () => {
  describe('ArgumentParser Edge Cases', () => {
    it('should handle empty arguments array', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'verbose',
        long: 'verbose',
        type: 'boolean',
        description: 'Verbose',
        default: false,
      });

      const args = parser.parse([]);
      assert.equal(args.verbose, false);
    });

    it('should handle single dash as argument', () => {
      const parser = new ArgumentParser();
      parser.addArgument({
        name: 'file',
        description: 'File',
        required: true,
      });

      const args = parser.parse(['-']);
      assert.equal(args.file, '-');
    });

    it('should handle double dash separator', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'verbose',
        short: 'v',
        long: 'verbose',
        type: 'boolean',
        description: 'Verbose',
      });

      parser.addArgument({
        name: 'files',
        description: 'Files',
        multiple: true,
      });

      const args = parser.parse(['-v', '--', '--not-a-flag', '-also-not-a-flag']);
      assert.equal(args.verbose, true);
      // Note: Current implementation treats -- as regular args
      // This behavior may vary by design
    });

    it('should handle option with empty string value', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'name',
        long: 'name',
        type: 'string',
        description: 'Name',
      });

      const args = parser.parse(['--name', '']);
      assert.equal(args.name, '');
    });

    it('should handle option with equals sign in value', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'config',
        long: 'config',
        type: 'string',
        description: 'Config',
      });

      const args = parser.parse(['--config=key=value']);
      assert.equal(args.config, 'key=value');
    });

    it('should handle zero as number value', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'port',
        long: 'port',
        type: 'number',
        description: 'Port',
      });

      const args = parser.parse(['--port', '0']);
      assert.equal(args.port, 0);
    });

    it('should handle negative numbers', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'offset',
        long: 'offset',
        type: 'number',
        description: 'Offset',
      });

      const args = parser.parse(['--offset', '-100']);
      assert.equal(args.offset, -100);
    });

    it('should handle very large numbers', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'limit',
        long: 'limit',
        type: 'number',
        description: 'Limit',
      });

      const args = parser.parse(['--limit', '999999999999']);
      assert.equal(args.limit, 999999999999);
    });

    it('should handle floating point numbers', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'ratio',
        long: 'ratio',
        type: 'number',
        description: 'Ratio',
      });

      const args = parser.parse(['--ratio', '3.14159']);
      assert.ok(Math.abs((args.ratio as number) - 3.14159) < 0.00001);
    });

    it('should handle scientific notation', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'value',
        long: 'value',
        type: 'number',
        description: 'Value',
      });

      const args = parser.parse(['--value', '1e5']);
      assert.equal(args.value, 100000);
    });

    it('should handle unicode in arguments', () => {
      const parser = new ArgumentParser();
      parser.addArgument({
        name: 'text',
        description: 'Text',
        required: true,
      });

      const unicodeText = '你好世界 🌍 مرحبا';
      const args = parser.parse([unicodeText]);
      assert.equal(args.text, unicodeText);
    });

    it('should handle whitespace in option values', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'message',
        long: 'message',
        type: 'string',
        description: 'Message',
      });

      const args = parser.parse(['--message', '  leading and trailing  ']);
      assert.equal(args.message, '  leading and trailing  ');
    });

    it('should handle newlines in values', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'text',
        long: 'text',
        type: 'string',
        description: 'Text',
      });

      const args = parser.parse(['--text', 'line1\nline2\nline3']);
      assert.equal(args.text, 'line1\nline2\nline3');
    });

    it('should handle options with same prefix', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'verbose',
        long: 'verbose',
        type: 'boolean',
        description: 'Verbose',
      });

      parser.addOption({
        name: 'verbosity',
        long: 'verbosity',
        type: 'number',
        description: 'Verbosity level',
      });

      const args1 = parser.parse(['--verbose']);
      assert.equal(args1.verbose, true);
      assert.equal(args1.verbosity, undefined);

      const args2 = parser.parse(['--verbosity', '3']);
      assert.equal(args2.verbose, undefined);
      assert.equal(args2.verbosity, 3);
    });

    it('should handle default false for boolean', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'flag',
        long: 'flag',
        type: 'boolean',
        description: 'Flag',
        default: false,
      });

      const args = parser.parse([]);
      assert.equal(args.flag, false);
    });

    it('should handle default true for boolean', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'enabled',
        long: 'enabled',
        type: 'boolean',
        description: 'Enabled',
        default: true,
      });

      const args = parser.parse([]);
      assert.equal(args.enabled, true);
    });
  });

  describe('OutputFormatter Edge Cases', () => {
    it('should handle empty data arrays', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.table([], [
        { header: 'Name', field: 'name' },
      ]);

      assert.ok(result.includes('No data'));
    });

    it('should handle missing fields in data', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        { name: 'Alice' },
        { age: 30 }, // Missing name
        {}, // Missing both
      ];

      const result = formatter.table(data, [
        { header: 'Name', field: 'name' },
        { header: 'Age', field: 'age' },
      ]);

      assert.ok(result.includes('Alice'));
    });

    it('should handle very long cell values', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        {
          short: 'short',
          long: 'a'.repeat(1000),
        },
      ];

      const result = formatter.table(data, [
        { header: 'Short', field: 'short', width: 10 },
        { header: 'Long', field: 'long', width: 20 },
      ]);

      assert.ok(result.length > 0);
    });

    it('should handle zero-width columns', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [{ name: 'Alice' }];

      const result = formatter.table(data, [
        { header: 'Name', field: 'name', width: 0 },
      ]);

      assert.ok(result.includes('Alice'));
    });

    it('should handle special characters in data', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [
        { text: '│ ├─ └─ ┌─' },
        { text: '<>&"\'`' },
        { text: '\t\n\r' },
      ];

      const result = formatter.table(data, [
        { header: 'Text', field: 'text' },
      ]);

      assert.ok(result.length > 0);
    });

    it('should handle null prototype objects', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = Object.create(null);
      data.name = 'Test';

      const result = formatter.json(data);
      assert.ok(result.includes('Test'));
    });

    it('should handle circular references safely', () => {
      const formatter = new OutputFormatter();

      // JSON.stringify will throw on circular refs
      const circular: any = { name: 'test' };
      circular.self = circular;

      assert.throws(() => formatter.json(circular));
    });

    it('should handle very deep nesting', () => {
      const formatter = new OutputFormatter();

      let deep: any = { value: 'bottom' };
      for (let i = 0; i < 100; i++) {
        deep = { nested: deep };
      }

      const result = formatter.json(deep);
      assert.ok(result.includes('bottom'));
    });

    it('should handle empty strings', () => {
      const formatter = new OutputFormatter({ color: false });
      const data = [{ name: '', value: '' }];

      const result = formatter.table(data, [
        { header: 'Name', field: 'name' },
        { header: 'Value', field: 'value' },
      ]);

      assert.ok(result.length > 0);
    });

    it('should handle box with empty content', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.box('');

      assert.ok(result.includes('┌'));
      assert.ok(result.includes('└'));
    });

    it('should handle tree with no data', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.tree([]);

      assert.equal(result, '');
    });

    it('should handle list with no items', () => {
      const formatter = new OutputFormatter({ color: false });
      const result = formatter.list([]);

      assert.equal(result, '');
    });
  });

  describe('Color Utility Edge Cases', () => {
    it('should handle empty string', () => {
      const result = c.red('');
      assert.ok(result !== null);
    });

    it('should strip colors from string with no colors', () => {
      const result = stripColors('plain text');
      assert.equal(result, 'plain text');
    });

    it('should calculate display width correctly', () => {
      const coloredText = c.red('Hello');
      const width = displayWidth(coloredText);
      assert.equal(width, 5); // "Hello" is 5 characters
    });

    it('should handle multiple color codes', () => {
      const text = c.red(c.bold('Text'));
      const width = displayWidth(text);
      assert.equal(width, 4); // "Text" is 4 characters
    });

    it('should handle malformed ANSI codes', () => {
      const malformed = '\x1b[Hello';
      const stripped = stripColors(malformed);
      // Should not crash
      assert.ok(stripped.length >= 0);
    });
  });

  describe('Validator Edge Cases', () => {
    it('should handle undefined in required validation', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'required',
        long: 'required',
        type: 'string',
        description: 'Required',
        required: true,
      });

      assert.throws(() => parser.parse([]), ValidationError);
    });

    it('should handle boundary values in range validation', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'value',
        long: 'value',
        type: 'number',
        description: 'Value',
        validate: (v) => {
          const num = v as number;
          return (num >= 0 && num <= 100) || 'Must be 0-100';
        },
      });

      // Test boundaries
      const args1 = parser.parse(['--value', '0']);
      assert.equal(args1.value, 0);

      const args2 = parser.parse(['--value', '100']);
      assert.equal(args2.value, 100);

      // Test outside boundaries
      assert.throws(() => parser.parse(['--value', '-1']), ValidationError);
      assert.throws(() => parser.parse(['--value', '101']), ValidationError);
    });

    it('should handle custom validator returning boolean', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'value',
        long: 'value',
        type: 'string',
        description: 'Value',
        validate: (v) => (v as string).length <= 10,
      });

      const args = parser.parse(['--value', 'short']);
      assert.equal(args.value, 'short');

      assert.throws(() => parser.parse(['--value', 'a'.repeat(20)]), ValidationError);
    });

    it('should handle custom validator returning string', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'email',
        long: 'email',
        type: 'string',
        description: 'Email',
        validate: (v) => {
          const email = v as string;
          return email.includes('@') || 'Invalid email format';
        },
      });

      const args = parser.parse(['--email', 'user@example.com']);
      assert.equal(args.email, 'user@example.com');

      try {
        parser.parse(['--email', 'invalid']);
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok((error as Error).message.includes('Invalid email format'));
      }
    });
  });

  describe('Concurrency Edge Cases', () => {
    it('should handle parallel parsing safely', async () => {
      const results = await Promise.all(
        Array.from({ length: 100 }, async (_, i) => {
          const parser = new ArgumentParser();
          parser.addOption({
            name: 'id',
            long: 'id',
            type: 'number',
            description: 'ID',
          });

          return parser.parse(['--id', i.toString()]);
        })
      );

      results.forEach((args, i) => {
        assert.equal(args.id, i);
      });
    });

    it('should handle multiple formatters concurrently', async () => {
      const results = await Promise.all(
        Array.from({ length: 50 }, async (_, i) => {
          const formatter = new OutputFormatter({ color: false });
          const data = [{ id: i, name: `Item ${i}` }];

          return formatter.table(data, [
            { header: 'ID', field: 'id' },
            { header: 'Name', field: 'name' },
          ]);
        })
      );

      assert.equal(results.length, 50);
      results.forEach((result, i) => {
        assert.ok(result.includes(`Item ${i}`));
      });
    });
  });
});
