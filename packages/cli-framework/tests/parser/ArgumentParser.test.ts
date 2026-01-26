/**
 * Tests for ArgumentParser
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ArgumentParser } from '../../src/parser/ArgumentParser.js';
import { ValidationError } from '../../src/utils/validators.js';

describe('ArgumentParser', () => {
  describe('Options', () => {
    it('should parse boolean options', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'verbose',
        short: 'v',
        long: 'verbose',
        type: 'boolean',
        description: 'Verbose output',
      });

      const args = parser.parse(['--verbose']);
      assert.equal(args.verbose, true);
    });

    it('should parse string options', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'name',
        short: 'n',
        long: 'name',
        type: 'string',
        description: 'Name',
      });

      const args = parser.parse(['--name', 'Alice']);
      assert.equal(args.name, 'Alice');
    });

    it('should parse number options', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'port',
        short: 'p',
        long: 'port',
        type: 'number',
        description: 'Port',
      });

      const args = parser.parse(['--port', '3000']);
      assert.equal(args.port, 3000);
    });

    it('should parse short options', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'verbose',
        short: 'v',
        long: 'verbose',
        type: 'boolean',
        description: 'Verbose',
      });

      const args = parser.parse(['-v']);
      assert.equal(args.verbose, true);
    });

    it('should parse options with equals sign', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'name',
        long: 'name',
        type: 'string',
        description: 'Name',
      });

      const args = parser.parse(['--name=Alice']);
      assert.equal(args.name, 'Alice');
    });

    it('should apply default values', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'port',
        long: 'port',
        type: 'number',
        description: 'Port',
        default: 3000,
      });

      const args = parser.parse([]);
      assert.equal(args.port, 3000);
    });

    it('should validate required options', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'name',
        long: 'name',
        type: 'string',
        description: 'Name',
        required: true,
      });

      assert.throws(() => parser.parse([]), ValidationError);
    });

    it('should validate choices', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'format',
        long: 'format',
        type: 'string',
        description: 'Format',
        choices: ['json', 'yaml'],
      });

      assert.throws(() => parser.parse(['--format', 'xml']), ValidationError);
      const args = parser.parse(['--format', 'json']);
      assert.equal(args.format, 'json');
    });

    it('should validate custom validation', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'email',
        long: 'email',
        type: 'string',
        description: 'Email',
        validate: (value) => {
          const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return regex.test(value as string) || 'Invalid email';
        },
      });

      assert.throws(() => parser.parse(['--email', 'invalid']), ValidationError);
      const args = parser.parse(['--email', 'test@example.com']);
      assert.equal(args.email, 'test@example.com');
    });
  });

  describe('Positional Arguments', () => {
    it('should parse required positional arguments', () => {
      const parser = new ArgumentParser();
      parser.addArgument({
        name: 'file',
        description: 'File path',
        required: true,
      });

      const args = parser.parse(['test.txt']);
      assert.equal(args.file, 'test.txt');
    });

    it('should parse optional positional arguments', () => {
      const parser = new ArgumentParser();
      parser.addArgument({
        name: 'file',
        description: 'File path',
        required: false,
        default: 'default.txt',
      });

      const args = parser.parse([]);
      assert.equal(args.file, 'default.txt');
    });

    it('should parse multiple positional arguments', () => {
      const parser = new ArgumentParser();
      parser.addArgument({
        name: 'files',
        description: 'Files',
        multiple: true,
      });

      const args = parser.parse(['a.txt', 'b.txt', 'c.txt']);
      assert.deepEqual(args.files, ['a.txt', 'b.txt', 'c.txt']);
    });

    it('should validate required arguments', () => {
      const parser = new ArgumentParser();
      parser.addArgument({
        name: 'file',
        description: 'File',
        required: true,
      });

      assert.throws(() => parser.parse([]), ValidationError);
    });
  });

  describe('Mixed Arguments', () => {
    it('should parse options and positional arguments', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'verbose',
        short: 'v',
        long: 'verbose',
        type: 'boolean',
        description: 'Verbose',
      });
      parser.addArgument({
        name: 'file',
        description: 'File',
        required: true,
      });

      const args = parser.parse(['--verbose', 'test.txt']);
      assert.equal(args.verbose, true);
      assert.equal(args.file, 'test.txt');
    });

    it('should collect unknown positional args in _', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'verbose',
        short: 'v',
        long: 'verbose',
        type: 'boolean',
        description: 'Verbose',
      });

      const args = parser.parse(['--verbose', 'extra', 'args']);
      assert.equal(args.verbose, true);
      assert.deepEqual(args._, ['extra', 'args']);
    });
  });

  describe('Error Handling', () => {
    it('should throw on unknown option', () => {
      const parser = new ArgumentParser();
      assert.throws(() => parser.parse(['--unknown']), ValidationError);
    });

    it('should throw on invalid number', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'port',
        long: 'port',
        type: 'number',
        description: 'Port',
      });

      assert.throws(() => parser.parse(['--port', 'invalid']), ValidationError);
    });

    it('should throw on missing required option value', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'name',
        long: 'name',
        type: 'string',
        description: 'Name',
      });

      assert.throws(() => parser.parse(['--name']), ValidationError);
    });
  });
});
