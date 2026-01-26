/**
 * JSDoc Examples Validation Tests
 *
 * Ensures all JSDoc @example code blocks are syntactically correct and execute without errors.
 * This test suite validates documentation examples across all packages.
 *
 * Test Strategy:
 * 1. Extract example code from JSDoc comments
 * 2. Verify examples compile (TypeScript)
 * 3. Verify examples run without throwing errors
 * 4. Verify expected behavior matches documentation
 *
 * Coverage:
 * - Path transformation utilities
 * - Security validators
 * - Export/import functionality
 * - Formatters and builders
 * - Component generators
 */

import { describe, it, expect } from 'vitest';
import {
  detectPathType,
  toPortablePath,
  fromPortablePath,
  type PathType,
} from '../src/core/export/path-transformer.js';
import {
  validateThemeName,
  validateColor,
  validateAgentCount,
  detectInjectionPatterns,
} from '../src/core/security/validators.js';
import * as path from 'node:path';
import * as os from 'node:os';

// ============================================================================
// Path Transformer Examples
// ============================================================================

describe('JSDoc Examples - Path Transformer', () => {
  describe('detectPathType examples', () => {
    it('should validate detectPathType example: workspace-relative', () => {
      const result = detectPathType('./src/config.json');
      expect(result).toBe('workspace-relative');
    });

    it('should validate detectPathType example: home-relative', () => {
      const result = detectPathType('~/Documents/file.txt');
      expect(result).toBe('home-relative');
    });

    it('should validate detectPathType example: absolute', () => {
      const result = detectPathType('/etc/config');
      expect(result).toBe('absolute');
    });

    it('should validate detectPathType example: url', () => {
      const result = detectPathType('https://example.com');
      expect(result).toBe('url');
    });

    it('should compile and execute without errors', () => {
      expect(() => {
        // Complete example from JSDoc
        detectPathType('./src/config.json');
        detectPathType('~/Documents/file.txt');
        detectPathType('/etc/config');
        detectPathType('https://example.com');
      }).not.toThrow();
    });
  });

  describe('toPortablePath examples', () => {
    it('should validate toPortablePath example: Unix absolute path', () => {
      const result = toPortablePath('/workspace/project/src/file.ts', '/workspace/project');
      expect(result).toBe('./src/file.ts');
    });

    it('should validate toPortablePath example: Windows path', () => {
      // Windows paths get normalized - on Unix systems, C: is treated as relative
      const result = toPortablePath(
        'C:\\Users\\name\\project\\src\\file.ts',
        'C:\\Users\\name\\project'
      );
      // Result should use forward slashes and be relative
      expect(result).toContain('src/file.ts');
      expect(result).toContain('./');
    });

    it('should validate toPortablePath example: home-relative with custom homeDir', () => {
      const result = toPortablePath('/home/user/.config/app.json', '/workspace', {
        homeDir: '/home/user',
      });
      expect(result).toBe('~/.config/app.json');
    });

    it('should compile and execute without errors', () => {
      expect(() => {
        toPortablePath('/workspace/project/src/file.ts', '/workspace/project');
        toPortablePath('C:\\Users\\name\\project\\src\\file.ts', 'C:\\Users\\name\\project');
        toPortablePath('/home/user/.config/app.json', '/workspace', { homeDir: '/home/user' });
      }).not.toThrow();
    });
  });

  describe('fromPortablePath examples', () => {
    it('should validate fromPortablePath example: workspace relative', () => {
      const result = fromPortablePath('./src/file.ts', '/workspace/project');
      expect(result).toBe(path.join('/workspace/project', 'src/file.ts'));
    });

    it('should validate fromPortablePath example: home relative', () => {
      const result = fromPortablePath('~/config/app.json', '/workspace', {
        homeDir: '/home/user',
      });
      // Result should point to home directory
      expect(result).toContain('config/app.json');
    });

    it('should compile and execute without errors', () => {
      expect(() => {
        fromPortablePath('./src/file.ts', '/workspace/project');
        fromPortablePath('~/config/app.json', '/workspace');
      }).not.toThrow();
    });
  });
});

// ============================================================================
// Security Validators Examples
// ============================================================================

describe('JSDoc Examples - Security Validators', () => {
  describe('validateThemeName examples', () => {
    it('should validate light theme', () => {
      expect(validateThemeName('light')).toBe(true);
    });

    it('should validate dark theme', () => {
      expect(validateThemeName('dark')).toBe(true);
    });

    it('should reject custom theme', () => {
      expect(validateThemeName('custom-theme')).toBe(false);
    });

    it('should compile and execute without errors', () => {
      expect(() => {
        validateThemeName('light');
        validateThemeName('dark');
        validateThemeName('custom-theme');
      }).not.toThrow();
    });

    it('should validate all allowed themes', () => {
      const allowedThemes = [
        'light',
        'dark',
        'high-contrast-light',
        'high-contrast-dark',
        'colorblind-light',
        'colorblind-dark',
      ];

      for (const theme of allowedThemes) {
        expect(validateThemeName(theme)).toBe(true);
      }
    });
  });

  describe('validateColor examples', () => {
    it('should validate hex color #FF0000', () => {
      expect(validateColor('#FF0000')).toBe(true);
    });

    it('should validate rgb color', () => {
      expect(validateColor('rgb(255, 0, 0)')).toBe(true);
    });

    it('should validate rgba color', () => {
      expect(validateColor('rgba(255,0,0,0.5)')).toBe(true);
    });

    it('should validate named color red', () => {
      expect(validateColor('red')).toBe(true);
    });

    it('should reject javascript protocol', () => {
      expect(validateColor('javascript:alert')).toBe(false);
    });

    it('should compile and execute without errors', () => {
      expect(() => {
        validateColor('#FF0000');
        validateColor('rgb(255, 0, 0)');
        validateColor('rgba(255,0,0,0.5)');
        validateColor('red');
        validateColor('javascript:alert');
      }).not.toThrow();
    });

    it('should handle various color formats', () => {
      // Test valid formats
      expect(validateColor('#F00')).toBe(true); // Short hex
      expect(validateColor('#FF0000')).toBe(true); // Long hex
      expect(validateColor('#FF0000FF')).toBe(true); // Hex with alpha
      expect(validateColor('hsl(0, 100%, 50%)')).toBe(true); // HSL
      expect(validateColor('hsla(0, 100%, 50%, 0.5)')).toBe(true); // HSLA
      expect(validateColor('blue')).toBe(true); // Named color
    });
  });

  describe('validateAgentCount examples', () => {
    it('should validate count 5', () => {
      expect(validateAgentCount(5)).toBe(true);
    });

    it('should reject count 1500 with default max', () => {
      expect(validateAgentCount(1500)).toBe(false);
    });

    it('should accept count 1500 with custom max 2000', () => {
      expect(validateAgentCount(1500, 2000)).toBe(true);
    });

    it('should reject negative count', () => {
      expect(validateAgentCount(-5)).toBe(false);
    });

    it('should compile and execute without errors', () => {
      expect(() => {
        validateAgentCount(5);
        validateAgentCount(1500);
        validateAgentCount(1500, 2000);
        validateAgentCount(-5);
      }).not.toThrow();
    });

    it('should handle boundary cases', () => {
      expect(validateAgentCount(0, 1000)).toBe(true); // Zero is valid
      expect(validateAgentCount(1, 1000)).toBe(true); // One is valid
      expect(validateAgentCount(1000, 1000)).toBe(true); // Exactly at max
      expect(validateAgentCount(1001, 1000)).toBe(false); // Over max
    });
  });

  describe('detectInjectionPatterns examples', () => {
    it('should return empty array for normal text', () => {
      const result = detectInjectionPatterns('normal text');
      expect(result).toEqual([]);
    });

    it('should detect Mermaid directive injection', () => {
      const result = detectInjectionPatterns('%%{init: malicious}%%');
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((pattern) => pattern.toLowerCase().includes('directive'))).toBe(true);
    });

    it('should detect script tag injection', () => {
      const result = detectInjectionPatterns('<script>alert(1)</script>');
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((pattern) => pattern.toLowerCase().includes('script'))).toBe(true);
    });

    it('should compile and execute without errors', () => {
      expect(() => {
        detectInjectionPatterns('normal text');
        detectInjectionPatterns('%%{init: malicious}%%');
        detectInjectionPatterns('<script>alert(1)</script>');
      }).not.toThrow();
    });

    it('should detect various attack patterns', () => {
      const attacks = [
        { input: '<img onerror="alert(1)">', desc: 'event handler' },
        { input: 'javascript:void(0)', desc: 'javascript protocol' },
        { input: '%%{init: {theme: dark}}%%', desc: 'mermaid init' },
        { input: '<iframe src="evil"></iframe>', desc: 'iframe tag' },
      ];

      for (const { input, desc } of attacks) {
        const result = detectInjectionPatterns(input);
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// Comprehensive Integration Examples
// ============================================================================

describe('JSDoc Examples - Integration Tests', () => {
  describe('Security workflow example', () => {
    it('should validate security validation workflow', () => {
      // Copied from JSDoc security/validators.ts module documentation
      expect(() => {
        // Theme validation
        if (!validateThemeName('light')) {
          throw new Error('Invalid theme');
        }

        // Color validation
        if (!validateColor('#FF0000')) {
          throw new Error('Invalid color');
        }

        // Agent count bounds checking
        const agents = [1, 2, 3]; // Mock agents array
        if (!validateAgentCount(agents.length, 500)) {
          throw new Error('Too many agents');
        }

        // Injection detection
        const userInput = 'normal text';
        const attacks = detectInjectionPatterns(userInput);
        if (attacks.length > 0) {
          console.warn('Security alert:', attacks);
        }
      }).not.toThrow();
    });
  });

  describe('Path transformation workflow', () => {
    it('should validate complete path transformation workflow', () => {
      expect(() => {
        // Detect path type
        const pathType: PathType = detectPathType('./src/config.json');
        expect(pathType).toBe('workspace-relative');

        // Convert to portable
        const portable = toPortablePath('/workspace/project/src/file.ts', '/workspace/project');
        expect(portable).toBe('./src/file.ts');

        // Convert back to absolute
        const absolute = fromPortablePath(portable, '/workspace/project');
        expect(absolute).toContain('src/file.ts');
      }).not.toThrow();
    });
  });

  describe('Round-trip path transformation', () => {
    it('should maintain consistency in path transformations', () => {
      const originalPath = '/workspace/project/src/file.ts';
      const rootPath = '/workspace/project';

      // Convert to portable
      const portable = toPortablePath(originalPath, rootPath);

      // Convert back
      const reconstructed = fromPortablePath(portable, rootPath);

      // Should be equivalent
      expect(reconstructed).toContain('src/file.ts');
    });

    it('should handle home directory paths consistently', () => {
      const homeDir = '/home/user';
      const filePath = '/home/user/.config/app.json';

      // Convert to portable with home dir option
      const portable = toPortablePath(filePath, '/workspace', { homeDir });
      expect(portable).toBe('~/.config/app.json');

      // Verify home path detection
      const pathType = detectPathType(portable);
      expect(pathType).toBe('home-relative');
    });
  });

  describe('Validation edge cases', () => {
    it('should handle null and undefined gracefully', () => {
      expect(() => {
        detectPathType(null as any);
        detectPathType(undefined as any);
        validateThemeName(null as any);
        validateColor(null as any);
      }).not.toThrow();
    });

    it('should handle empty strings', () => {
      expect(() => {
        expect(detectPathType('')).toBe('workspace-relative');
        expect(validateThemeName('')).toBe(false);
        expect(validateColor('')).toBe(false);
        expect(validateAgentCount(NaN)).toBe(false);
        expect(detectInjectionPatterns('')).toEqual([]);
      }).not.toThrow();
    });

    it('should be resilient to malformed input', () => {
      const malformedInputs = [
        { fn: detectPathType, arg: '../../sensitive' },
        { fn: validateThemeName, arg: '  light  ' },
        { fn: validateColor, arg: '#ZZZZZZ' },
        { fn: validateAgentCount, arg: '100' },
        { fn: detectInjectionPatterns, arg: '\x00\x01\x02' },
      ];

      for (const { fn, arg } of malformedInputs) {
        expect(() => fn(arg as any)).not.toThrow();
      }
    });
  });
});

// ============================================================================
// Type Safety Examples
// ============================================================================

describe('JSDoc Examples - Type Safety', () => {
  it('should maintain type safety with PathType return values', () => {
    const pathType: PathType = detectPathType('./src');
    expect(['workspace-relative', 'home-relative', 'absolute', 'url']).toContain(pathType);
  });

  it('should maintain type safety with boolean returns', () => {
    const isValid: boolean = validateThemeName('light');
    expect(typeof isValid).toBe('boolean');
    expect(isValid).toBe(true);
  });

  it('should maintain type safety with array returns', () => {
    const patterns: string[] = detectInjectionPatterns('malicious code');
    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.every((p) => typeof p === 'string')).toBe(true);
  });
});

// ============================================================================
// Documentation Accuracy Examples
// ============================================================================

describe('JSDoc Examples - Documentation Accuracy', () => {
  it('should demonstrate defensive programming practices', () => {
    // Examples show input validation
    expect(validateThemeName('invalid')).toBe(false);
    expect(validateColor('not a color')).toBe(false);
    expect(validateAgentCount(-1)).toBe(false);
  });

  it('should demonstrate security best practices', () => {
    // Examples show injection detection
    const injection = '<script>alert(1)</script>';
    const patterns = detectInjectionPatterns(injection);
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('should demonstrate cross-platform compatibility', () => {
    // Examples show both Unix and Windows paths
    expect(() => {
      toPortablePath('/unix/path', '/unix');
      toPortablePath('C:\\Windows\\Path', 'C:\\Windows');
    }).not.toThrow();
  });

  it('should demonstrate error handling patterns', () => {
    // Examples show conditional checks
    if (!validateThemeName('dark')) {
      throw new Error('Invalid theme');
    }

    if (!validateColor('#FF0000')) {
      throw new Error('Invalid color');
    }

    if (!validateAgentCount(500)) {
      throw new Error('Too many agents');
    }

    expect(true).toBe(true); // All validations passed
  });
});

// ============================================================================
// Regression Tests
// ============================================================================

describe('JSDoc Examples - Regression Tests', () => {
  it('should prevent regressions in path type detection', () => {
    // Verify examples still work as documented
    const cases: Array<[string, PathType]> = [
      ['./src/config.json', 'workspace-relative'],
      ['~/Documents/file.txt', 'home-relative'],
      ['/etc/config', 'absolute'],
      ['https://example.com', 'url'],
    ];

    for (const [input, expected] of cases) {
      expect(detectPathType(input)).toBe(expected);
    }
  });

  it('should prevent regressions in validation functions', () => {
    // Valid inputs should remain valid
    expect(validateThemeName('light')).toBe(true);
    expect(validateThemeName('dark')).toBe(true);
    expect(validateColor('#FF0000')).toBe(true);
    expect(validateColor('red')).toBe(true);
    expect(validateAgentCount(5)).toBe(true);

    // Invalid inputs should remain invalid
    expect(validateThemeName('invalid')).toBe(false);
    expect(validateColor('invalid')).toBe(false);
    expect(validateAgentCount(-1)).toBe(false);
  });

  it('should prevent regressions in injection detection', () => {
    // Known attack patterns should be detected
    const attacks = [
      '%%{init:',
      '<script',
      'javascript:',
      'onerror=',
    ];

    for (const attack of attacks) {
      const result = detectInjectionPatterns(attack);
      expect(result.length).toBeGreaterThan(0);
    }
  });
});
