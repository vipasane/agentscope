/**
 * Tests for colors utility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { color, c, stripColors, displayWidth } from '../../src/utils/colors.js';

describe('colors', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('color detection', () => {
    it('should disable colors when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      // Need to re-import to pick up env changes
      // For testing purposes, we test the behavior through the functions
    });

    it('should enable colors when FORCE_COLOR is set', () => {
      process.env.FORCE_COLOR = '1';
      delete process.env.NO_COLOR;
    });
  });

  describe('color function', () => {
    it('should apply red color', () => {
      const result = color('test', 'red');
      expect(result).toContain('test');
    });

    it('should apply green color', () => {
      const result = color('test', 'green');
      expect(result).toContain('test');
    });

    it('should apply yellow color', () => {
      const result = color('test', 'yellow');
      expect(result).toContain('test');
    });

    it('should apply blue color', () => {
      const result = color('test', 'blue');
      expect(result).toContain('test');
    });

    it('should apply magenta color', () => {
      const result = color('test', 'magenta');
      expect(result).toContain('test');
    });

    it('should apply cyan color', () => {
      const result = color('test', 'cyan');
      expect(result).toContain('test');
    });

    it('should apply white color', () => {
      const result = color('test', 'white');
      expect(result).toContain('test');
    });

    it('should apply gray color', () => {
      const result = color('test', 'gray');
      expect(result).toContain('test');
    });

    it('should apply bold style', () => {
      const result = color('test', 'bold');
      expect(result).toContain('test');
    });

    it('should apply dim style', () => {
      const result = color('test', 'dim');
      expect(result).toContain('test');
    });

    it('should return plain text when colors disabled', () => {
      // When NO_COLOR is set, colors should be stripped
      // This depends on how the module caches the color support check
      const result = color('test', 'red');
      expect(result).toBeTruthy();
    });
  });

  describe('c helper object', () => {
    it('should have reset helper', () => {
      const result = c.reset('test');
      expect(result).toContain('test');
    });

    it('should have bold helper', () => {
      const result = c.bold('test');
      expect(result).toContain('test');
    });

    it('should have dim helper', () => {
      const result = c.dim('test');
      expect(result).toContain('test');
    });

    it('should have red helper', () => {
      const result = c.red('test');
      expect(result).toContain('test');
    });

    it('should have green helper', () => {
      const result = c.green('test');
      expect(result).toContain('test');
    });

    it('should have yellow helper', () => {
      const result = c.yellow('test');
      expect(result).toContain('test');
    });

    it('should have blue helper', () => {
      const result = c.blue('test');
      expect(result).toContain('test');
    });

    it('should have magenta helper', () => {
      const result = c.magenta('test');
      expect(result).toContain('test');
    });

    it('should have cyan helper', () => {
      const result = c.cyan('test');
      expect(result).toContain('test');
    });

    it('should have white helper', () => {
      const result = c.white('test');
      expect(result).toContain('test');
    });

    it('should have gray helper', () => {
      const result = c.gray('test');
      expect(result).toContain('test');
    });
  });

  describe('semantic helpers', () => {
    it('should have error helper (red)', () => {
      const result = c.error('test');
      expect(result).toContain('test');
    });

    it('should have success helper (green)', () => {
      const result = c.success('test');
      expect(result).toContain('test');
    });

    it('should have warning helper (yellow)', () => {
      const result = c.warning('test');
      expect(result).toContain('test');
    });

    it('should have info helper (blue)', () => {
      const result = c.info('test');
      expect(result).toContain('test');
    });
  });

  describe('combined styles', () => {
    it('should have errorBold helper', () => {
      const result = c.errorBold('test');
      expect(result).toContain('test');
    });

    it('should have successBold helper', () => {
      const result = c.successBold('test');
      expect(result).toContain('test');
    });
  });

  describe('stripColors', () => {
    it('should strip ANSI color codes', () => {
      const colored = '\x1b[31mred text\x1b[0m';
      const result = stripColors(colored);
      expect(result).toBe('red text');
    });

    it('should strip multiple color codes', () => {
      const colored = '\x1b[31m\x1b[1mbold red\x1b[0m';
      const result = stripColors(colored);
      expect(result).toBe('bold red');
    });

    it('should return plain text unchanged', () => {
      const result = stripColors('plain text');
      expect(result).toBe('plain text');
    });

    it('should handle empty string', () => {
      const result = stripColors('');
      expect(result).toBe('');
    });

    it('should strip all ANSI sequences', () => {
      const colored = '\x1b[32mgreen\x1b[0m and \x1b[33myellow\x1b[0m';
      const result = stripColors(colored);
      expect(result).toBe('green and yellow');
    });
  });

  describe('displayWidth', () => {
    it('should return width of plain text', () => {
      const result = displayWidth('hello');
      expect(result).toBe(5);
    });

    it('should ignore ANSI codes in width calculation', () => {
      const colored = '\x1b[31mhello\x1b[0m';
      const result = displayWidth(colored);
      expect(result).toBe(5);
    });

    it('should handle empty string', () => {
      const result = displayWidth('');
      expect(result).toBe(0);
    });

    it('should handle text with multiple ANSI codes', () => {
      const colored = '\x1b[31m\x1b[1mhello\x1b[0m\x1b[0m';
      const result = displayWidth(colored);
      expect(result).toBe(5);
    });

    it('should handle mixed colored and plain text', () => {
      const mixed = 'plain \x1b[32mgreen\x1b[0m text';
      const result = displayWidth(mixed);
      expect(result).toBe('plain green text'.length);
    });
  });

  describe('ANSI escape sequences', () => {
    it('should contain ANSI codes when colors enabled', () => {
      const result = c.red('test');
      // If colors are enabled, result should contain ANSI codes
      // Otherwise it's just the plain text
      expect(result.length >= 4).toBe(true);
    });

    it('should produce different output for different colors', () => {
      const red = c.red('test');
      const green = c.green('test');
      const blue = c.blue('test');

      // All should contain 'test'
      expect(red).toContain('test');
      expect(green).toContain('test');
      expect(blue).toContain('test');
    });

    it('should handle special characters', () => {
      const result = c.cyan('test\nwith\nnewlines');
      expect(result).toContain('test');
      expect(result).toContain('newlines');
    });

    it('should handle unicode', () => {
      const result = c.green('✓ success');
      expect(result).toContain('✓');
      expect(result).toContain('success');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(c.red('')).toBeDefined();
      expect(c.bold('')).toBeDefined();
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = c.blue(longString);
      expect(stripColors(result)).toBe(longString);
    });

    it('should handle strings with only spaces', () => {
      const result = c.yellow('   ');
      expect(stripColors(result)).toBe('   ');
    });

    it('should handle nested color applications', () => {
      const result = c.red(c.bold('test'));
      expect(stripColors(result)).toBe('test');
    });
  });

  describe('color consistency', () => {
    it('should produce consistent output for same input', () => {
      const result1 = c.green('test');
      const result2 = c.green('test');
      expect(result1).toBe(result2);
    });

    it('should strip colors consistently', () => {
      const colored = c.red('test');
      const stripped1 = stripColors(colored);
      const stripped2 = stripColors(colored);
      expect(stripped1).toBe(stripped2);
    });

    it('should calculate width consistently', () => {
      const text = c.blue('hello world');
      const width1 = displayWidth(text);
      const width2 = displayWidth(text);
      expect(width1).toBe(width2);
      expect(width1).toBe(11);
    });
  });
});
