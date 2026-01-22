/**
 * Unit tests for Permission Parser module
 *
 * Tests parsing of permission rules from Claude Code settings.json (schema 2026.01).
 * Covers the permission DSL patterns for allow, deny, and ask rules.
 */

import { describe, it, expect } from 'vitest';
import {
  PermissionParser,
  parsePermissions,
  parsePattern,
  validatePattern,
  validatePermissionPattern,
  extractToolFromPattern,
  matchesPattern,
  isKnownTool,
  isValidDefaultMode,
  KNOWN_TOOLS,
  VALID_DEFAULT_MODES,
} from '../../../src/core/scanner/permission-parser.js';

// ============================================================================
// Pattern Parsing Tests
// ============================================================================

describe('parsePattern', () => {
  describe('tool-call patterns', () => {
    it('should parse simple Bash pattern', () => {
      const result = parsePattern('Bash(npm run lint)');
      expect(result.patternType).toBe('tool-call');
      expect(result.tool).toBe('Bash');
      expect(result.argument).toBe('npm run lint');
      expect(result.hasGlob).toBe(false);
      expect(result.isPrefix).toBe(false);
    });

    it('should parse Bash prefix pattern with :*', () => {
      const result = parsePattern('Bash(npm run:*)');
      expect(result.patternType).toBe('tool-call');
      expect(result.tool).toBe('Bash');
      expect(result.argument).toBe('npm run:*');
      expect(result.isPrefix).toBe(true);
      expect(result.hasGlob).toBe(true);
    });

    it('should parse Bash glob pattern', () => {
      const result = parsePattern('Bash(git * main)');
      expect(result.patternType).toBe('tool-call');
      expect(result.tool).toBe('Bash');
      expect(result.argument).toBe('git * main');
      expect(result.hasGlob).toBe(true);
    });

    it('should parse Read file pattern', () => {
      const result = parsePattern('Read(./.env)');
      expect(result.patternType).toBe('tool-call');
      expect(result.tool).toBe('Read');
      expect(result.argument).toBe('./.env');
      expect(result.hasGlob).toBe(false);
    });

    it('should parse Read glob pattern with **', () => {
      const result = parsePattern('Read(./secrets/**)');
      expect(result.patternType).toBe('tool-call');
      expect(result.tool).toBe('Read');
      expect(result.argument).toBe('./secrets/**');
      expect(result.hasGlob).toBe(true);
    });

    it('should parse Write pattern', () => {
      const result = parsePattern('Write(./.claude/*)');
      expect(result.patternType).toBe('tool-call');
      expect(result.tool).toBe('Write');
      expect(result.argument).toBe('./.claude/*');
      expect(result.hasGlob).toBe(true);
    });

    it('should parse WebFetch domain restriction', () => {
      const result = parsePattern('WebFetch(domain:example.com)');
      expect(result.patternType).toBe('tool-call');
      expect(result.tool).toBe('WebFetch');
      expect(result.argument).toBe('domain:example.com');
    });

    it('should parse Edit pattern', () => {
      const result = parsePattern('Edit(./src/**/*.ts)');
      expect(result.patternType).toBe('tool-call');
      expect(result.tool).toBe('Edit');
      expect(result.argument).toBe('./src/**/*.ts');
      expect(result.hasGlob).toBe(true);
    });

    it('should handle whitespace', () => {
      const result = parsePattern('  Bash(npm test)  ');
      expect(result.patternType).toBe('tool-call');
      expect(result.tool).toBe('Bash');
      expect(result.argument).toBe('npm test');
    });
  });

  describe('MCP tool patterns', () => {
    it('should parse MCP tool pattern', () => {
      const result = parsePattern('mcp__github__list_repos');
      expect(result.patternType).toBe('mcp-tool');
      expect(result.tool).toBeNull();
      expect(result.argument).toBeNull();
      expect(result.mcpServer).toBe('github');
      expect(result.mcpTool).toBe('list_repos');
    });

    it('should parse MCP tool with dashes', () => {
      const result = parsePattern('mcp__my-server__my-tool');
      expect(result.patternType).toBe('mcp-tool');
      expect(result.mcpServer).toBe('my-server');
      expect(result.mcpTool).toBe('my-tool');
    });

    it('should parse MCP tool with numbers', () => {
      const result = parsePattern('mcp__server123__tool456');
      expect(result.patternType).toBe('mcp-tool');
      expect(result.mcpServer).toBe('server123');
      expect(result.mcpTool).toBe('tool456');
    });
  });

  describe('invalid patterns', () => {
    it('should mark empty string as invalid', () => {
      const result = parsePattern('');
      expect(result.patternType).toBe('invalid');
    });

    it('should mark pattern without parentheses as invalid', () => {
      const result = parsePattern('Bash npm run lint');
      expect(result.patternType).toBe('invalid');
    });

    it('should mark pattern with missing closing parenthesis as invalid', () => {
      const result = parsePattern('Bash(npm run lint');
      expect(result.patternType).toBe('invalid');
    });

    it('should mark incomplete MCP pattern as invalid', () => {
      const result = parsePattern('mcp__github');
      expect(result.patternType).toBe('invalid');
    });

    it('should mark random string as invalid', () => {
      const result = parsePattern('random string');
      expect(result.patternType).toBe('invalid');
    });
  });
});

// ============================================================================
// Pattern Validation Tests
// ============================================================================

describe('validatePattern', () => {
  describe('valid patterns', () => {
    it('should validate simple Bash pattern', () => {
      const result = validatePattern('Bash(npm run lint)');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Read pattern', () => {
      const result = validatePattern('Read(./.env)');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate MCP pattern', () => {
      const result = validatePattern('mcp__github__list_repos');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate WebFetch domain pattern', () => {
      const result = validatePattern('WebFetch(domain:example.com)');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('invalid patterns', () => {
    it('should reject empty pattern', () => {
      const result = validatePattern('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Empty pattern');
    });

    it('should reject malformed pattern', () => {
      const result = validatePattern('Bash npm run lint');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Malformed'))).toBe(true);
    });

    it('should reject pattern with unbalanced parentheses', () => {
      const result = validatePattern('Bash((npm run lint)');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unbalanced'))).toBe(true);
    });
  });

  describe('security validation', () => {
    it('should reject command substitution', () => {
      const result = validatePattern('Bash($(rm -rf /))');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('injection'))).toBe(true);
    });

    it('should reject backtick command substitution', () => {
      const result = validatePattern('Bash(`rm -rf /`)');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('injection'))).toBe(true);
    });

    it('should reject command chaining with semicolon', () => {
      const result = validatePattern('Bash(npm run lint; rm -rf /)');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('injection'))).toBe(true);
    });

    it('should reject command chaining with &&', () => {
      const result = validatePattern('Bash(npm run lint && rm -rf /)');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('injection'))).toBe(true);
    });

    it('should reject command chaining with ||', () => {
      const result = validatePattern('Bash(npm run lint || rm -rf /)');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('injection'))).toBe(true);
    });

    it('should reject patterns with newlines', () => {
      const result = validatePattern('Bash(npm run lint\nrm -rf /)');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('injection'))).toBe(true);
    });
  });

  describe('warnings for overly permissive patterns', () => {
    it('should warn about Bash(*)', () => {
      const result = validatePattern('Bash(*)');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes('permissive'))).toBe(true);
    });

    it('should warn about Read(**)', () => {
      const result = validatePattern('Read(**)');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes('permissive'))).toBe(true);
    });

    it('should warn about Write(**)', () => {
      const result = validatePattern('Write(**)');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes('permissive'))).toBe(true);
    });
  });

  describe('warnings for unknown tools', () => {
    it('should warn about unknown tool', () => {
      const result = validatePattern('UnknownTool(test)');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes('Unknown tool'))).toBe(true);
    });
  });
});

// ============================================================================
// Permission Parser Tests
// ============================================================================

describe('PermissionParser', () => {
  describe('parse()', () => {
    it('should parse empty config', () => {
      const parser = new PermissionParser();
      const result = parser.parse(undefined);

      expect(result.summary.allowCount).toBe(0);
      expect(result.summary.denyCount).toBe(0);
      expect(result.summary.askCount).toBe(0);
      expect(result.summary.rules).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse allow rules', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        allow: ['Bash(npm run:*)', 'Read(./src/**)'],
      });

      expect(result.summary.allowCount).toBe(2);
      expect(result.summary.denyCount).toBe(0);
      expect(result.summary.askCount).toBe(0);
      expect(result.summary.rules).toHaveLength(2);
      expect(result.summary.rules.every((r) => r.type === 'allow')).toBe(true);
    });

    it('should parse deny rules', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        deny: ['Read(./.env)', 'Read(./secrets/**)'],
      });

      expect(result.summary.allowCount).toBe(0);
      expect(result.summary.denyCount).toBe(2);
      expect(result.summary.askCount).toBe(0);
      expect(result.summary.rules.every((r) => r.type === 'deny')).toBe(true);
    });

    it('should parse ask rules', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        ask: ['Bash(rm *)', 'Write(./.claude/*)'],
      });

      expect(result.summary.allowCount).toBe(0);
      expect(result.summary.denyCount).toBe(0);
      expect(result.summary.askCount).toBe(2);
      expect(result.summary.rules.every((r) => r.type === 'ask')).toBe(true);
    });

    it('should parse mixed rules', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        allow: ['Bash(npm run:*)', 'Read(./src/**)'],
        deny: ['Read(./.env)', 'Read(./secrets/**)'],
        ask: ['Bash(rm *)', 'Write(./.claude/*)'],
      });

      expect(result.summary.allowCount).toBe(2);
      expect(result.summary.denyCount).toBe(2);
      expect(result.summary.askCount).toBe(2);
      expect(result.summary.rules).toHaveLength(6);
    });

    it('should extract tool names', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        allow: ['Bash(npm run lint)', 'Read(./src/index.ts)'],
      });

      expect(result.summary.rules[0].tool).toBe('Bash');
      expect(result.summary.rules[1].tool).toBe('Read');
    });

    it('should generate descriptions', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        allow: ['Bash(npm run:*)'],
        deny: ['Read(./.env)'],
      });

      expect(result.summary.rules[0].description).toContain('Allows');
      expect(result.summary.rules[0].description).toContain('npm run');
      expect(result.summary.rules[1].description).toContain('Denies');
      expect(result.summary.rules[1].description).toContain('.env');
    });

    it('should parse defaultMode', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        defaultMode: 'acceptEdits',
      });

      expect(result.summary.defaultMode).toBe('acceptEdits');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate defaultMode', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        defaultMode: 'invalidMode',
      });

      expect(result.summary.defaultMode).toBeUndefined();
      expect(result.errors.some((e) => e.code === 'INVALID_DEFAULT_MODE')).toBe(true);
    });

    it('should parse additionalDirectories', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        additionalDirectories: ['./scripts', './docs'],
      });

      expect(result.summary.additionalDirectories).toEqual(['./scripts', './docs']);
    });

    it('should validate additionalDirectories paths', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        additionalDirectories: ['./valid', ''],
      });

      expect(result.summary.additionalDirectories).toEqual(['./valid']);
    });

    it('should handle invalid pattern types gracefully', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        allow: [123 as unknown as string, 'Bash(npm run lint)'],
      });

      expect(result.summary.allowCount).toBe(1);
      expect(result.errors.some((e) => e.code === 'INVALID_PATTERN_TYPE')).toBe(true);
    });

    it('should handle empty patterns', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        allow: ['', '  ', 'Bash(npm run lint)'],
      });

      expect(result.summary.allowCount).toBe(1);
      expect(result.errors.some((e) => e.code === 'EMPTY_PATTERN')).toBe(true);
    });

    it('should handle MCP patterns', () => {
      const parser = new PermissionParser();
      const result = parser.parse({
        allow: ['mcp__github__list_repos'],
      });

      expect(result.summary.allowCount).toBe(1);
      expect(result.summary.rules[0].tool).toBe('mcp__github');
      expect(result.summary.rules[0].description).toContain('MCP server');
    });
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe('parsePermissions', () => {
  it('should work as convenience function', () => {
    const result = parsePermissions({
      allow: ['Bash(npm run lint)'],
      deny: ['Read(./.env)'],
    });

    expect(result.summary.allowCount).toBe(1);
    expect(result.summary.denyCount).toBe(1);
  });

  it('should accept source path for error reporting', () => {
    const result = parsePermissions(
      {
        allow: ['invalid pattern'],
      },
      '/path/to/settings.json'
    );

    expect(result.errors.some((e) => e.file === '/path/to/settings.json')).toBe(true);
  });
});

describe('validatePermissionPattern', () => {
  it('should validate pattern directly', () => {
    const result = validatePermissionPattern('Bash(npm run lint)');
    expect(result.isValid).toBe(true);
  });
});

describe('extractToolFromPattern', () => {
  it('should extract tool from tool-call pattern', () => {
    expect(extractToolFromPattern('Bash(npm run lint)')).toBe('Bash');
    expect(extractToolFromPattern('Read(./.env)')).toBe('Read');
    expect(extractToolFromPattern('Write(./output.txt)')).toBe('Write');
  });

  it('should return null for MCP pattern', () => {
    expect(extractToolFromPattern('mcp__github__list_repos')).toBeNull();
  });

  it('should return null for invalid pattern', () => {
    expect(extractToolFromPattern('invalid')).toBeNull();
  });
});

// ============================================================================
// Pattern Matching Tests
// ============================================================================

describe('matchesPattern', () => {
  describe('exact matching', () => {
    it('should match exact Bash command', () => {
      expect(matchesPattern('Bash(npm run lint)', 'Bash', 'npm run lint')).toBe(true);
      expect(matchesPattern('Bash(npm run lint)', 'Bash', 'npm run test')).toBe(false);
    });

    it('should match exact file path', () => {
      expect(matchesPattern('Read(./.env)', 'Read', './.env')).toBe(true);
      expect(matchesPattern('Read(./.env)', 'Read', './.env.local')).toBe(false);
    });
  });

  describe('prefix matching', () => {
    it('should match prefix pattern', () => {
      expect(matchesPattern('Bash(npm run:*)', 'Bash', 'npm run:lint')).toBe(true);
      expect(matchesPattern('Bash(npm run:*)', 'Bash', 'npm run:test')).toBe(true);
      expect(matchesPattern('Bash(npm run:*)', 'Bash', 'npm install')).toBe(false);
    });
  });

  describe('glob matching', () => {
    it('should match * wildcard', () => {
      expect(matchesPattern('Bash(git * main)', 'Bash', 'git push main')).toBe(true);
      expect(matchesPattern('Bash(git * main)', 'Bash', 'git pull main')).toBe(true);
      expect(matchesPattern('Bash(git * main)', 'Bash', 'git push dev')).toBe(false);
    });

    it('should match ** recursive wildcard', () => {
      expect(matchesPattern('Read(./src/**)', 'Read', './src/index.ts')).toBe(true);
      expect(matchesPattern('Read(./src/**)', 'Read', './src/utils/helper.ts')).toBe(true);
      expect(matchesPattern('Read(./src/**)', 'Read', './test/index.ts')).toBe(false);
    });

    it('should match combined globs', () => {
      expect(matchesPattern('Read(./src/**/*.ts)', 'Read', './src/index.ts')).toBe(true);
      expect(matchesPattern('Read(./src/**/*.ts)', 'Read', './src/utils/helper.ts')).toBe(true);
      expect(matchesPattern('Read(./src/**/*.ts)', 'Read', './src/index.js')).toBe(false);
    });
  });

  describe('tool matching', () => {
    it('should require matching tool', () => {
      expect(matchesPattern('Bash(npm run lint)', 'Read', 'npm run lint')).toBe(false);
      expect(matchesPattern('Read(./.env)', 'Write', './.env')).toBe(false);
    });

    it('should be case-sensitive for tools', () => {
      expect(matchesPattern('Bash(npm run lint)', 'bash', 'npm run lint')).toBe(false);
      expect(matchesPattern('Bash(npm run lint)', 'BASH', 'npm run lint')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should not match MCP patterns', () => {
      expect(matchesPattern('mcp__github__list_repos', 'Bash', 'anything')).toBe(false);
    });

    it('should not match invalid patterns', () => {
      expect(matchesPattern('invalid', 'Bash', 'anything')).toBe(false);
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('isKnownTool', () => {
  it('should return true for known tools', () => {
    expect(isKnownTool('Bash')).toBe(true);
    expect(isKnownTool('Read')).toBe(true);
    expect(isKnownTool('Write')).toBe(true);
    expect(isKnownTool('Edit')).toBe(true);
    expect(isKnownTool('WebFetch')).toBe(true);
  });

  it('should return false for unknown tools', () => {
    expect(isKnownTool('Unknown')).toBe(false);
    expect(isKnownTool('bash')).toBe(false);
    expect(isKnownTool('')).toBe(false);
  });
});

describe('isValidDefaultMode', () => {
  it('should return true for valid modes', () => {
    expect(isValidDefaultMode('acceptEdits')).toBe(true);
    expect(isValidDefaultMode('bypassPermissions')).toBe(true);
    expect(isValidDefaultMode('default')).toBe(true);
    expect(isValidDefaultMode('plan')).toBe(true);
  });

  it('should return false for invalid modes', () => {
    expect(isValidDefaultMode('invalid')).toBe(false);
    expect(isValidDefaultMode('')).toBe(false);
    expect(isValidDefaultMode(null)).toBe(false);
    expect(isValidDefaultMode(undefined)).toBe(false);
  });
});

describe('KNOWN_TOOLS constant', () => {
  it('should include essential Claude Code tools', () => {
    expect(KNOWN_TOOLS).toContain('Bash');
    expect(KNOWN_TOOLS).toContain('Read');
    expect(KNOWN_TOOLS).toContain('Write');
    expect(KNOWN_TOOLS).toContain('Edit');
    expect(KNOWN_TOOLS).toContain('MultiEdit');
    expect(KNOWN_TOOLS).toContain('Glob');
    expect(KNOWN_TOOLS).toContain('Grep');
    expect(KNOWN_TOOLS).toContain('WebFetch');
    expect(KNOWN_TOOLS).toContain('WebSearch');
    expect(KNOWN_TOOLS).toContain('Task');
    expect(KNOWN_TOOLS).toContain('Skill');
  });
});

describe('VALID_DEFAULT_MODES constant', () => {
  it('should include all valid modes', () => {
    expect(VALID_DEFAULT_MODES).toContain('acceptEdits');
    expect(VALID_DEFAULT_MODES).toContain('bypassPermissions');
    expect(VALID_DEFAULT_MODES).toContain('default');
    expect(VALID_DEFAULT_MODES).toContain('plan');
    expect(VALID_DEFAULT_MODES).toHaveLength(4);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Permission Parser Integration', () => {
  it('should parse a complete permission configuration', () => {
    const config = {
      allow: ['Bash(npm run:*)', 'Read(./src/**)', 'mcp__github__list_repos'],
      deny: ['Read(./.env)', 'Read(./secrets/**)', 'Write(./node_modules/**)'],
      ask: ['Bash(rm *)', 'Write(./.claude/*)', 'Edit(./package.json)'],
      defaultMode: 'default',
      additionalDirectories: ['./scripts', './docs'],
    };

    const result = parsePermissions(config);

    // Verify counts
    expect(result.summary.allowCount).toBe(3);
    expect(result.summary.denyCount).toBe(3);
    expect(result.summary.askCount).toBe(3);

    // Verify rules
    expect(result.summary.rules).toHaveLength(9);

    // Verify defaultMode
    expect(result.summary.defaultMode).toBe('default');

    // Verify additionalDirectories
    expect(result.summary.additionalDirectories).toEqual(['./scripts', './docs']);

    // Verify no errors
    expect(result.errors.filter((e) => e.severity === 'fatal')).toHaveLength(0);
    expect(result.errors.filter((e) => e.severity === 'warning')).toHaveLength(0);
  });

  it('should handle real-world permission patterns', () => {
    const realWorldPatterns = [
      'Bash(npm run lint)',
      'Bash(npm run test)',
      'Bash(npm run build)',
      'Bash(git status)',
      'Bash(git diff)',
      'Bash(git log:*)',
      'Read(./src/**)',
      'Read(./tests/**)',
      'Read(./package.json)',
      'Write(./src/**)',
      'Edit(./src/**/*.ts)',
      'WebFetch(domain:api.github.com)',
    ];

    for (const pattern of realWorldPatterns) {
      const validation = validatePattern(pattern);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }
  });

  it('should properly validate security-sensitive patterns', () => {
    // Patterns with command injection - should fail validation
    const injectionPatterns = [
      'Bash($(whoami))',
      'Bash(cat /etc/passwd; echo)',
      'Bash(`rm -rf /`)',
    ];

    for (const pattern of injectionPatterns) {
      const validation = validatePattern(pattern);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('injection'))).toBe(true);
    }

    // Patterns that are overly permissive - should have warnings
    const permissivePatterns = [
      'Bash(*)',
      'Read(**)',
    ];

    for (const pattern of permissivePatterns) {
      const validation = validatePattern(pattern);
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some((w) => w.includes('permissive'))).toBe(true);
    }

    // Valid but sensitive patterns - should pass without errors/warnings
    const validSensitivePatterns = [
      'Bash(rm -rf /tmp/cache)',
      'Read(/etc/passwd)',
    ];

    for (const pattern of validSensitivePatterns) {
      const validation = validatePattern(pattern);
      expect(validation.isValid).toBe(true);
    }
  });
});
