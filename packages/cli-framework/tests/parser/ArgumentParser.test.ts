/**
 * Tests for ArgumentParser
 */

import { describe, it, expect } from 'vitest';
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
      expect(args.verbose).toBe(true);
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
      expect(args.name).toBe('Alice');
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
      expect(args.port).toBe(3000);
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
      expect(args.verbose).toBe(true);
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
      expect(args.name).toBe('Alice');
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
      expect(args.port).toBe(3000);
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

      expect(() => parser.parse([])).toThrow(ValidationError);
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

      expect(() => parser.parse(['--format', 'xml'])).toThrow(ValidationError);
      const args = parser.parse(['--format', 'json']);
      expect(args.format).toBe('json');
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

      expect(() => parser.parse(['--email', 'invalid'])).toThrow(ValidationError);
      const args = parser.parse(['--email', 'test@example.com']);
      expect(args.email).toBe('test@example.com');
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
      expect(args.file).toBe('test.txt');
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
      expect(args.file).toBe('default.txt');
    });

    it('should parse multiple positional arguments', () => {
      const parser = new ArgumentParser();
      parser.addArgument({
        name: 'files',
        description: 'Files',
        multiple: true,
      });

      const args = parser.parse(['a.txt', 'b.txt', 'c.txt']);
      expect(args.files).toEqual(['a.txt', 'b.txt', 'c.txt']);
    });

    it('should validate required arguments', () => {
      const parser = new ArgumentParser();
      parser.addArgument({
        name: 'file',
        description: 'File',
        required: true,
      });

      expect(() => parser.parse([])).toThrow(ValidationError);
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
      expect(args.verbose).toBe(true);
      expect(args.file).toBe('test.txt');
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
      expect(args.verbose).toBe(true);
      expect(args._).toEqual(['extra', 'args']);
    });
  });

  describe('Error Handling', () => {
    it('should throw on unknown option', () => {
      const parser = new ArgumentParser();
      expect(() => parser.parse(['--unknown'])).toThrow(ValidationError);
    });

    it('should throw on invalid number', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'port',
        long: 'port',
        type: 'number',
        description: 'Port',
      });

      expect(() => parser.parse(['--port', 'invalid'])).toThrow(ValidationError);
    });

    it('should throw on missing required option value', () => {
      const parser = new ArgumentParser();
      parser.addOption({
        name: 'name',
        long: 'name',
        type: 'string',
        description: 'Name',
      });

      expect(() => parser.parse(['--name'])).toThrow(ValidationError);
    });
  });
});
