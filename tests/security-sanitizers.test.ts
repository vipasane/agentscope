/**
 * Security Sanitizers Test
 *
 * Tests for DESIGN-001 security implementation
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeId,
  sanitizeNodeLabel,
  sanitizePath,
  validateThemeName,
  validateColor,
  validateAgentCount,
  detectInjectionPatterns,
} from '../src/core/security/index.js';

describe('Security Validators', () => {
  describe('validateThemeName', () => {
    it('should accept valid theme names', () => {
      expect(validateThemeName('light')).toBe(true);
      expect(validateThemeName('dark')).toBe(true);
      expect(validateThemeName('high-contrast-light')).toBe(true);
      expect(validateThemeName('high-contrast-dark')).toBe(true);
      expect(validateThemeName('colorblind-light')).toBe(true);
      expect(validateThemeName('colorblind-dark')).toBe(true);
    });

    it('should reject invalid theme names', () => {
      expect(validateThemeName('custom-theme')).toBe(false);
      expect(validateThemeName('malicious')).toBe(false);
      expect(validateThemeName('')).toBe(false);
      expect(validateThemeName('%%{init: bad}%%')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(validateThemeName('LIGHT')).toBe(true);
      expect(validateThemeName('Dark')).toBe(true);
    });
  });

  describe('validateColor', () => {
    it('should accept valid hex colors', () => {
      expect(validateColor('#FF0000')).toBe(true);
      expect(validateColor('#f00')).toBe(true);
      expect(validateColor('#FF0000AA')).toBe(true);
    });

    it('should accept valid rgb/rgba colors', () => {
      expect(validateColor('rgb(255, 0, 0)')).toBe(true);
      expect(validateColor('rgba(255, 0, 0, 0.5)')).toBe(true);
    });

    it('should accept valid hsl/hsla colors', () => {
      expect(validateColor('hsl(0, 100%, 50%)')).toBe(true);
      expect(validateColor('hsla(0, 100%, 50%, 0.5)')).toBe(true);
    });

    it('should accept named colors', () => {
      expect(validateColor('red')).toBe(true);
      expect(validateColor('blue')).toBe(true);
      expect(validateColor('transparent')).toBe(true);
    });

    it('should reject malicious inputs', () => {
      expect(validateColor('javascript:alert(1)')).toBe(false);
      expect(validateColor('<script>alert(1)</script>')).toBe(false);
      expect(validateColor('onclick=alert(1)')).toBe(false);
    });
  });

  describe('validateAgentCount', () => {
    it('should accept valid counts', () => {
      expect(validateAgentCount(0)).toBe(true);
      expect(validateAgentCount(5)).toBe(true);
      expect(validateAgentCount(1000)).toBe(true);
    });

    it('should reject invalid counts', () => {
      expect(validateAgentCount(-1)).toBe(false);
      expect(validateAgentCount(1001)).toBe(false);
      expect(validateAgentCount(1.5)).toBe(false);
      expect(validateAgentCount(NaN)).toBe(false);
      expect(validateAgentCount(Infinity)).toBe(false);
    });

    it('should respect custom max', () => {
      expect(validateAgentCount(1500, 2000)).toBe(true);
      expect(validateAgentCount(1500, 1000)).toBe(false);
    });
  });

  describe('detectInjectionPatterns', () => {
    it('should detect directive injection', () => {
      const patterns = detectInjectionPatterns('%%{init: malicious}%%');
      expect(patterns).toContain('Directive start');
      expect(patterns).toContain('Init directive');
      expect(patterns).toContain('Directive end');
    });

    it('should detect HTML injection', () => {
      const patterns = detectInjectionPatterns('<script>alert(1)</script>');
      expect(patterns).toContain('HTML tags');
      expect(patterns).toContain('Script tags');
    });

    it('should detect JavaScript protocol', () => {
      const patterns = detectInjectionPatterns('javascript:alert(1)');
      expect(patterns).toContain('JavaScript protocol');
    });

    it('should detect event handlers', () => {
      const patterns = detectInjectionPatterns('onclick=alert(1)');
      expect(patterns).toContain('Event handlers');
    });

    it('should return empty array for clean input', () => {
      expect(detectInjectionPatterns('normal text')).toEqual([]);
    });
  });
});

describe('Security Sanitizers', () => {
  describe('sanitizeId', () => {
    it('should replace special characters with underscores', () => {
      expect(sanitizeId('my-agent-123')).toBe('my_agent_123');
      expect(sanitizeId('agent@server')).toBe('agent_server');
    });

    it('should prefix IDs starting with digits', () => {
      expect(sanitizeId('123-agent')).toBe('n_123_agent');
      expect(sanitizeId('456')).toBe('n_456');
    });

    it('should handle reserved words', () => {
      expect(sanitizeId('end')).toBe('end_node');
      expect(sanitizeId('graph')).toBe('graph_node');
      expect(sanitizeId('class')).toBe('class_node');
    });

    it('should limit length to 50 characters', () => {
      const longId = 'a'.repeat(60);
      expect(sanitizeId(longId).length).toBeLessThanOrEqual(50);
    });

    it('should handle empty strings', () => {
      expect(sanitizeId('')).toBe('unknown_node');
      expect(sanitizeId('!!!')).toBe('unknown_node');
    });

    it('should remove consecutive underscores', () => {
      expect(sanitizeId('my---agent')).toBe('my_agent');
    });
  });

  describe('sanitizeNodeLabel', () => {
    it('should escape special Mermaid characters', () => {
      expect(sanitizeNodeLabel('Agent [1]')).toBe('Agent \\[1\\]');
      expect(sanitizeNodeLabel('Value {x}')).toBe('Value \\{x\\}');
    });

    it('should remove directive patterns', () => {
      // Sanitizer removes both directives and the init: keyword
      const result = sanitizeNodeLabel('%%{init: bad}%%');
      expect(result).not.toContain('%%{');
      expect(result).not.toContain('}%%');
      expect(result).not.toContain('init:');
      // Only 'bad' should remain after sanitization
      expect(result).toBe('bad');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeNodeLabel('<script>alert(1)</script>')).toBe('alert\\(1\\)');
      expect(sanitizeNodeLabel('<b>bold</b>')).toBe('bold');
    });

    it('should remove JavaScript protocols', () => {
      expect(sanitizeNodeLabel('javascript:alert(1)')).toBe('alert\\(1\\)');
    });

    it('should limit length to 100 characters', () => {
      const longLabel = 'a'.repeat(120);
      const sanitized = sanitizeNodeLabel(longLabel);
      expect(sanitized.length).toBeLessThanOrEqual(100);
      expect(sanitized.endsWith('...')).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(sanitizeNodeLabel('')).toBe('');
    });
  });

  describe('sanitizePath', () => {
    it('should allow paths within allowed directories', () => {
      const result = sanitizePath('/workspace/file.txt', ['/workspace']);
      expect(result).toBe('/workspace/file.txt');
    });

    it('should reject path traversal attempts', () => {
      const result = sanitizePath('../../../etc/passwd', ['/workspace']);
      expect(result).toBeNull();
    });

    it('should reject paths outside allowed directories', () => {
      const result = sanitizePath('/tmp/file.txt', ['/workspace']);
      expect(result).toBeNull();
    });

    it('should handle relative paths', () => {
      const result = sanitizePath('./file.txt', [process.cwd()]);
      expect(result).not.toBeNull();
      expect(result?.startsWith(process.cwd())).toBe(true);
    });

    it('should reject paths with suspicious characters', () => {
      expect(sanitizePath('/workspace/file<.txt', ['/workspace'])).toBeNull();
      expect(sanitizePath('/workspace/file>.txt', ['/workspace'])).toBeNull();
      expect(sanitizePath('/workspace/file|.txt', ['/workspace'])).toBeNull();
    });

    it('should handle empty or invalid inputs', () => {
      expect(sanitizePath('', ['/workspace'])).toBeNull();
      expect(sanitizePath('/file.txt', [])).toBeNull();
    });
  });
});
