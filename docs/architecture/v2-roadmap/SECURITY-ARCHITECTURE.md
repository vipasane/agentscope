# AgentScope Security Architecture

> **Version**: 1.0
> **Date**: January 2026
> **Status**: Ready for Implementation
> **Aligned With**: PRD v2.0 Section 13 (Security Considerations)

---

## Table of Contents

1. [Security Principles](#1-security-principles)
2. [Threat Model](#2-threat-model)
3. [Security Controls](#3-security-controls)
4. [AIDefence Integration](#4-aidefence-integration)
5. [Claims-Based Authorization](#5-claims-based-authorization)
6. [Security Validation Checklist](#6-security-validation-checklist)
7. [Implementation Requirements](#7-implementation-requirements)
8. [Security Testing Strategy](#8-security-testing-strategy)

---

## 1. Security Principles

AgentScope adheres to these core security principles from PRD v2.0:

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **No Code Execution** | AgentScope only reads and parses files | Never use `eval()`, `new Function()`, or dynamic code execution |
| **No Network Access** | All operations are local filesystem only | No HTTP clients, no external API calls |
| **No Secrets Handling** | Does not parse or expose API keys | Redact patterns matching secrets in output |
| **Path Validation** | Prevents directory traversal attacks | Validate all paths stay within project root |
| **Input Sanitization** | All parsed content is sanitized before output | Escape special characters in generated Markdown |

### Defense in Depth Layers

```
+---------------------------------------------------------------+
|                     Layer 1: Input Validation                  |
|  Zod schemas, path validation, file type checks               |
+---------------------------------------------------------------+
|                     Layer 2: Processing Safety                 |
|  No code execution, sandboxed parsing, size limits            |
+---------------------------------------------------------------+
|                     Layer 3: Output Sanitization               |
|  Markdown escaping, PII redaction, safe content only          |
+---------------------------------------------------------------+
|                     Layer 4: Runtime Protection                |
|  Resource limits, timeout guards, graceful degradation        |
+---------------------------------------------------------------+
```

---

## 2. Threat Model

### 2.1 STRIDE Analysis

| Threat Category | Risk Level | Attack Vector | Mitigation |
|-----------------|------------|---------------|------------|
| **Spoofing** | LOW | N/A - local CLI tool, no auth | No mitigation needed |
| **Tampering** | MEDIUM | Malicious config files parsed | Input validation, Zod schemas |
| **Repudiation** | LOW | N/A - no audit trail needed | Logging for debugging only |
| **Information Disclosure** | HIGH | Secrets in config exposed in docs | PII detection, secret redaction |
| **Denial of Service** | MEDIUM | Large/recursive configs | Size limits, depth limits, timeouts |
| **Elevation of Privilege** | MEDIUM | Path traversal to read system files | Path validation, project root containment |

### 2.2 Detailed Threat Analysis

#### T1: Input Validation Threats (Malformed YAML/JSON/MD)

**Attack Vectors:**
- Malformed YAML causing parser crashes
- JSON with circular references
- Markdown with embedded scripts
- UTF-8 encoding attacks (homoglyphs, bidirectional text)

**DREAD Score:**
| Factor | Score | Rationale |
|--------|-------|-----------|
| Damage | 3 | Can crash CLI, corrupt output |
| Reproducibility | 9 | Trivial to craft malformed files |
| Exploitability | 7 | Just create bad config file |
| Affected Users | 5 | User running the scan |
| Discoverability | 8 | Common attack pattern |
| **Total** | **6.4** | **HIGH Priority** |

**Mitigations:**
```typescript
// SEC-T1-001: Strict YAML parsing with error boundaries
const parseYAMLSafe = (content: string, maxSize: number = 1_000_000): unknown => {
  if (content.length > maxSize) {
    throw new SecurityError('YAML content exceeds maximum size limit');
  }
  try {
    return yaml.load(content, {
      schema: yaml.CORE_SCHEMA,  // Minimal safe schema
      json: true                  // JSON-compatible mode
    });
  } catch (error) {
    throw new ParseError(`Invalid YAML: ${error.message}`);
  }
};

// SEC-T1-002: JSON parsing with depth limits
const parseJSONSafe = (content: string, maxDepth: number = 20): unknown => {
  let depth = 0;
  const result = JSON.parse(content, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      depth++;
      if (depth > maxDepth) {
        throw new SecurityError('JSON exceeds maximum nesting depth');
      }
    }
    return value;
  });
  return result;
};
```

#### T2: Path Traversal Attacks (Directory Escape)

**Attack Vectors:**
- `../../../etc/passwd` in config paths
- Symlink following to escape project root
- Absolute paths pointing outside project
- URL-encoded path segments (`%2e%2e%2f`)

**DREAD Score:**
| Factor | Score | Rationale |
|--------|-------|-----------|
| Damage | 8 | Can read arbitrary system files |
| Reproducibility | 9 | Well-known attack pattern |
| Exploitability | 6 | Requires crafted config file |
| Affected Users | 7 | Any user running scan |
| Discoverability | 9 | OWASP Top 10 |
| **Total** | **7.8** | **CRITICAL Priority** |

**Mitigations:**
```typescript
// SEC-T2-001: Path validation with traversal prevention
import * as path from 'path';
import * as fs from 'fs';

interface PathValidationResult {
  valid: boolean;
  normalizedPath: string | null;
  error?: string;
}

const validatePath = (
  inputPath: string,
  projectRoot: string
): PathValidationResult => {
  // Decode URL-encoded characters
  const decoded = decodeURIComponent(inputPath);

  // Normalize the path
  const normalized = path.normalize(decoded);

  // Resolve to absolute path
  const absolute = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(projectRoot, normalized);

  // Check for traversal patterns
  if (normalized.includes('..') || decoded.includes('%2e')) {
    return {
      valid: false,
      normalizedPath: null,
      error: 'Path traversal detected'
    };
  }

  // Verify path starts with project root
  const realProjectRoot = fs.realpathSync(projectRoot);
  if (!absolute.startsWith(realProjectRoot)) {
    return {
      valid: false,
      normalizedPath: null,
      error: 'Path escapes project root'
    };
  }

  // Check for symlinks escaping root
  try {
    const realPath = fs.realpathSync(absolute);
    if (!realPath.startsWith(realProjectRoot)) {
      return {
        valid: false,
        normalizedPath: null,
        error: 'Symlink escapes project root'
      };
    }
  } catch {
    // File doesn't exist yet, that's okay for write operations
  }

  return {
    valid: true,
    normalizedPath: absolute
  };
};
```

#### T3: Injection via Config Content (XSS in Generated Output)

**Attack Vectors:**
- Script tags in agent descriptions
- Markdown link injection
- Mermaid code injection
- HTML injection in generated docs

**DREAD Score:**
| Factor | Score | Rationale |
|--------|-------|-----------|
| Damage | 5 | XSS if docs viewed in browser |
| Reproducibility | 8 | Easy to inject content |
| Exploitability | 5 | Requires viewing in vulnerable context |
| Affected Users | 6 | Anyone viewing generated docs |
| Discoverability | 7 | Common web attack |
| **Total** | **6.2** | **HIGH Priority** |

**Mitigations:**
```typescript
// SEC-T3-001: Content sanitization for Markdown output
const UNSAFE_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
  /<object\b[^>]*>[\s\S]*?<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi,  // Event handlers
];

const sanitizeMarkdownContent = (content: string): string => {
  let sanitized = content;

  // Remove dangerous HTML
  for (const pattern of UNSAFE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // Escape Mermaid code fence injection
  sanitized = sanitized.replace(/```mermaid/gi, '\\`\\`\\`mermaid');

  // Escape potential HTML in text
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return sanitized;
};

// SEC-T3-002: Safe Mermaid node labels
const sanitizeMermaidLabel = (label: string): string => {
  // Mermaid-safe characters only
  return label
    .replace(/[<>{}|\\]/g, '')
    .replace(/"/g, "'")
    .substring(0, 100);  // Length limit
};
```

#### T4: DoS via Large/Recursive Configs

**Attack Vectors:**
- Multi-gigabyte config files
- Deeply nested YAML structures
- Circular references in MCP definitions
- Billions laughs (XML bomb equivalent in YAML)

**DREAD Score:**
| Factor | Score | Rationale |
|--------|-------|-----------|
| Damage | 4 | Memory exhaustion, crash |
| Reproducibility | 9 | Easy to create large files |
| Exploitability | 8 | Just drop malicious file in project |
| Affected Users | 5 | User running scan |
| Discoverability | 7 | Known attack pattern |
| **Total** | **6.6** | **HIGH Priority** |

**Mitigations:**
```typescript
// SEC-T4-001: Resource limits for file processing
interface ResourceLimits {
  maxFileSize: number;      // bytes
  maxTotalSize: number;     // bytes across all files
  maxDepth: number;         // nesting depth
  maxFiles: number;         // number of files to process
  timeoutMs: number;        // processing timeout
}

const DEFAULT_LIMITS: ResourceLimits = {
  maxFileSize: 1_000_000,      // 1MB per file
  maxTotalSize: 10_000_000,    // 10MB total
  maxDepth: 20,                 // 20 levels deep
  maxFiles: 1000,               // 1000 files max
  timeoutMs: 30_000             // 30 second timeout
};

// SEC-T4-002: Processing with timeout
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> => {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new SecurityError(`Operation '${operation}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

// SEC-T4-003: Memory-bounded processing
const processWithMemoryLimit = async (
  files: string[],
  limits: ResourceLimits
): Promise<void> => {
  let totalSize = 0;

  for (const file of files.slice(0, limits.maxFiles)) {
    const stats = await fs.promises.stat(file);

    if (stats.size > limits.maxFileSize) {
      throw new SecurityError(
        `File '${file}' exceeds max size (${stats.size} > ${limits.maxFileSize})`
      );
    }

    totalSize += stats.size;
    if (totalSize > limits.maxTotalSize) {
      throw new SecurityError(
        `Total size exceeds limit (${totalSize} > ${limits.maxTotalSize})`
      );
    }
  }
};
```

---

## 3. Security Controls

### 3.1 InputValidator (Zod Schemas)

```typescript
// src/security/input-validator.ts
import { z } from 'zod';

// SEC-CTL-001: Agent configuration schema
const AgentConfigSchema = z.object({
  id: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, 'Invalid agent ID format'),
  name: z.string()
    .min(1)
    .max(200)
    .transform(sanitizeMarkdownContent),
  description: z.string()
    .max(5000)
    .optional()
    .transform(val => val ? sanitizeMarkdownContent(val) : undefined),
  source: z.enum(['project', 'user']),
  sourcePath: z.string()
    .refine(path => !path.includes('..'), 'Path traversal not allowed'),
  allowedTools: z.array(z.string().max(100)).max(100),
  skills: z.array(z.string().max(100)).max(100),
  configSnippet: z.string()
    .max(50000)
    .transform(sanitizeMarkdownContent)
});

// SEC-CTL-002: MCP server configuration schema
const MCPServerSchema = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
  command: z.string()
    .max(500)
    .refine(cmd => {
      // Disallow shell metacharacters
      const dangerous = /[;&|`$(){}[\]<>!#]/;
      return !dangerous.test(cmd);
    }, 'Command contains unsafe characters'),
  args: z.array(z.string().max(200)).max(50),
  env: z.record(z.string().max(100), z.string().max(1000)).optional()
});

// SEC-CTL-003: Full config schema
const AgentScopeConfigSchema = z.object({
  meta: z.object({
    name: z.string().max(200),
    version: z.string().max(50),
    scanDate: z.string().datetime(),
    projectPath: z.string().max(500)
  }),
  agents: z.array(AgentConfigSchema).max(500),
  skills: z.array(z.object({
    id: z.string().max(100),
    name: z.string().max(200),
    description: z.string().max(5000).optional()
  })).max(500),
  hooks: z.array(z.object({
    id: z.string().max(100),
    event: z.string().max(100),
    handler: z.string().max(500)
  })).max(100),
  commands: z.array(z.object({
    name: z.string().max(100),
    description: z.string().max(500).optional()
  })).max(200),
  mcpServers: z.array(MCPServerSchema).max(50),
  settings: z.record(z.unknown()).optional(),
  errors: z.array(z.object({
    level: z.enum(['fatal', 'warning', 'info']),
    message: z.string().max(1000),
    file: z.string().max(500),
    suggestion: z.string().max(500).optional()
  })).max(1000)
});

export class InputValidator {
  /**
   * Validate agent configuration against Zod schema
   * SEC-CTL-001
   */
  static validateAgentConfig(config: unknown): z.infer<typeof AgentConfigSchema> {
    return AgentConfigSchema.parse(config);
  }

  /**
   * Validate MCP server configuration
   * SEC-CTL-002
   */
  static validateMCPServer(config: unknown): z.infer<typeof MCPServerSchema> {
    return MCPServerSchema.parse(config);
  }

  /**
   * Validate full AgentScope configuration
   * SEC-CTL-003
   */
  static validateFullConfig(config: unknown): z.infer<typeof AgentScopeConfigSchema> {
    return AgentScopeConfigSchema.parse(config);
  }

  /**
   * Safe partial validation that returns errors instead of throwing
   */
  static validateSafe<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): { success: true; data: T } | { success: false; errors: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
  }
}
```

### 3.2 PathValidator (Traversal Prevention)

```typescript
// src/security/path-validator.ts
import * as path from 'path';
import * as fs from 'fs';

export interface PathValidationOptions {
  allowSymlinks: boolean;
  allowedExtensions: string[];
  maxPathLength: number;
}

const DEFAULT_OPTIONS: PathValidationOptions = {
  allowSymlinks: false,
  allowedExtensions: ['.md', '.yaml', '.yml', '.json', '.txt'],
  maxPathLength: 500
};

export class PathValidator {
  private projectRoot: string;
  private options: PathValidationOptions;

  constructor(projectRoot: string, options: Partial<PathValidationOptions> = {}) {
    this.projectRoot = fs.realpathSync(projectRoot);
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Validate a file path is safe to read
   * SEC-CTL-004
   */
  validateReadPath(inputPath: string): {
    valid: boolean;
    resolvedPath: string | null;
    error?: string;
  } {
    // Length check
    if (inputPath.length > this.options.maxPathLength) {
      return {
        valid: false,
        resolvedPath: null,
        error: `Path exceeds maximum length of ${this.options.maxPathLength}`
      };
    }

    // Decode and normalize
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(inputPath);
    } catch {
      return {
        valid: false,
        resolvedPath: null,
        error: 'Invalid URL encoding in path'
      };
    }

    // Check for null bytes
    if (decodedPath.includes('\0')) {
      return {
        valid: false,
        resolvedPath: null,
        error: 'Null byte detected in path'
      };
    }

    // Check for traversal patterns
    const traversalPatterns = ['..', '%2e%2e', '..%2f', '%2f..'];
    for (const pattern of traversalPatterns) {
      if (decodedPath.toLowerCase().includes(pattern)) {
        return {
          valid: false,
          resolvedPath: null,
          error: 'Path traversal pattern detected'
        };
      }
    }

    // Resolve to absolute path
    const normalized = path.normalize(decodedPath);
    const absolute = path.isAbsolute(normalized)
      ? normalized
      : path.resolve(this.projectRoot, normalized);

    // Verify within project root
    if (!absolute.startsWith(this.projectRoot + path.sep) &&
        absolute !== this.projectRoot) {
      return {
        valid: false,
        resolvedPath: null,
        error: 'Path is outside project root'
      };
    }

    // Check extension
    const ext = path.extname(absolute).toLowerCase();
    if (!this.options.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        resolvedPath: null,
        error: `File extension '${ext}' not allowed`
      };
    }

    // Check symlinks if not allowed
    if (!this.options.allowSymlinks) {
      try {
        const realPath = fs.realpathSync(absolute);
        if (!realPath.startsWith(this.projectRoot)) {
          return {
            valid: false,
            resolvedPath: null,
            error: 'Symlink points outside project root'
          };
        }
      } catch {
        // File doesn't exist, that's checked elsewhere
      }
    }

    return {
      valid: true,
      resolvedPath: absolute
    };
  }

  /**
   * Validate output path is safe to write
   * SEC-CTL-005
   */
  validateWritePath(inputPath: string, allowCreate: boolean = true): {
    valid: boolean;
    resolvedPath: string | null;
    error?: string;
  } {
    const readValidation = this.validateReadPath(inputPath);
    if (!readValidation.valid) {
      return readValidation;
    }

    const resolvedPath = readValidation.resolvedPath!;

    // For write operations, verify parent directory exists
    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      if (!allowCreate) {
        return {
          valid: false,
          resolvedPath: null,
          error: 'Parent directory does not exist'
        };
      }
      // Validate parent path too
      const parentValidation = this.validateReadPath(parentDir);
      if (!parentValidation.valid) {
        return {
          valid: false,
          resolvedPath: null,
          error: `Parent directory path invalid: ${parentValidation.error}`
        };
      }
    }

    return {
      valid: true,
      resolvedPath
    };
  }

  /**
   * Batch validate multiple paths
   * SEC-CTL-006
   */
  validatePaths(paths: string[]): Map<string, {
    valid: boolean;
    resolvedPath: string | null;
    error?: string;
  }> {
    const results = new Map();
    for (const p of paths) {
      results.set(p, this.validateReadPath(p));
    }
    return results;
  }
}
```

### 3.3 SafeExecutor (No Code Execution Principle)

```typescript
// src/security/safe-executor.ts

/**
 * SafeExecutor ensures no dynamic code execution occurs
 * SEC-CTL-007
 *
 * This module provides static analysis patterns to detect and prevent
 * dangerous code execution patterns.
 */

// Patterns that indicate potential code execution - MUST NOT exist in codebase
const FORBIDDEN_PATTERNS = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\bsetTimeout\s*\(\s*["'`]/,
  /\bsetInterval\s*\(\s*["'`]/,
  /\bvm\.runIn/,
  /\bchild_process\.exec\b/,
  /\bexecSync\b/,
  /\bspawnSync.*shell\s*:\s*true/,
  /\brequire\s*\(\s*[^"'`]/,  // Dynamic require
  /\bimport\s*\(\s*[^"'`]/,    // Dynamic import
] as const;

export class SafeExecutor {
  /**
   * Analyze code for dangerous execution patterns
   * Used in CI/pre-commit hooks
   */
  static analyzeForDangerousPatterns(code: string): {
    safe: boolean;
    violations: Array<{
      pattern: string;
      line: number;
      context: string;
    }>;
  } {
    const violations: Array<{
      pattern: string;
      line: number;
      context: string;
    }> = [];

    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            pattern: pattern.source,
            line: i + 1,
            context: line.trim().substring(0, 100)
          });
        }
      }
    }

    return {
      safe: violations.length === 0,
      violations
    };
  }

  /**
   * Safe YAML loading - uses safe schema only
   * SEC-CTL-008
   */
  static safeYAMLLoad(content: string): unknown {
    // Import js-yaml only in this safe context
    const yaml = require('js-yaml');

    // Use CORE_SCHEMA which doesn't support custom tags
    return yaml.load(content, {
      schema: yaml.CORE_SCHEMA,
      json: true
    });
  }

  /**
   * Safe JSON loading with reviver for sanitization
   * SEC-CTL-009
   */
  static safeJSONParse(content: string, maxDepth: number = 20): unknown {
    let currentDepth = 0;

    return JSON.parse(content, (key, value) => {
      // Track nesting depth
      if (typeof value === 'object' && value !== null) {
        currentDepth++;
        if (currentDepth > maxDepth) {
          throw new Error('JSON exceeds maximum nesting depth');
        }
      }

      // Sanitize string values
      if (typeof value === 'string') {
        // Remove potential JS URIs
        if (value.toLowerCase().startsWith('javascript:')) {
          return '[REDACTED]';
        }
        // Remove data URIs that could contain scripts
        if (value.toLowerCase().startsWith('data:text/html')) {
          return '[REDACTED]';
        }
      }

      return value;
    });
  }
}
```

### 3.4 Output Sanitization

```typescript
// src/security/output-sanitizer.ts

/**
 * OutputSanitizer ensures generated Markdown is safe
 * SEC-CTL-010
 */
export class OutputSanitizer {
  private static readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  /**
   * Escape HTML special characters
   */
  static escapeHTML(text: string): string {
    return text.replace(/[&<>"'`=/]/g, char => this.HTML_ENTITIES[char]);
  }

  /**
   * Sanitize content for Markdown output
   */
  static sanitizeForMarkdown(content: string): string {
    let sanitized = content;

    // Remove script tags and event handlers
    sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<[^>]*\s+on\w+\s*=[\s\S]*?>/gi, (match) => {
      return match.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    });

    // Remove iframes, objects, embeds
    sanitized = sanitized.replace(/<iframe\b[\s\S]*?(?:<\/iframe>|\/?>)/gi, '');
    sanitized = sanitized.replace(/<object\b[\s\S]*?(?:<\/object>|\/?>)/gi, '');
    sanitized = sanitized.replace(/<embed\b[^>]*\/?>/gi, '');

    // Remove javascript: and data: URIs
    sanitized = sanitized.replace(/\b(href|src)\s*=\s*["']?\s*javascript:/gi, '$1="');
    sanitized = sanitized.replace(/\b(href|src)\s*=\s*["']?\s*data:/gi, '$1="');

    // Escape angle brackets in non-HTML contexts
    sanitized = sanitized.replace(/<(?!\/?(a|b|i|em|strong|code|pre|p|br|hr|ul|ol|li|h[1-6])\b)/gi, '&lt;');

    return sanitized;
  }

  /**
   * Sanitize text for use in Mermaid diagram labels
   */
  static sanitizeForMermaid(label: string): string {
    return label
      // Remove characters that break Mermaid syntax
      .replace(/[<>{}|\\[\]]/g, '')
      // Escape quotes
      .replace(/"/g, "'")
      // Remove newlines
      .replace(/[\r\n]/g, ' ')
      // Limit length
      .substring(0, 100)
      // Trim whitespace
      .trim();
  }

  /**
   * Sanitize file path for display (not for use in fs operations)
   */
  static sanitizePathForDisplay(filePath: string): string {
    return filePath
      // Remove potential sensitive path components
      .replace(/\/users\/[^\/]+\//gi, '/users/[USER]/')
      .replace(/\/home\/[^\/]+\//gi, '/home/[USER]/')
      .replace(/C:\\Users\\[^\\]+\\/gi, 'C:\\Users\\[USER]\\')
      // Escape for Markdown
      .replace(/\\/g, '\\\\')
      .replace(/\|/g, '\\|');
  }
}
```

---

## 4. AIDefence Integration

### 4.1 Overview

AIDefence provides runtime protection against AI manipulation threats. For AgentScope v1.0, integration is optional but recommended for security-conscious deployments.

### 4.2 Prompt Manipulation Detection

```typescript
// src/security/aidefence-integration.ts

interface ThreatScanResult {
  safe: boolean;
  threats: Array<{
    type: 'prompt-injection' | 'jailbreak' | 'pii' | 'manipulation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location?: { start: number; end: number };
  }>;
  sanitizedContent?: string;
}

/**
 * AIDefence integration for scanning user prompts and config content
 * SEC-AI-001
 */
export class AIDefenceScanner {
  /**
   * Scan content for prompt injection attempts
   */
  static scanForPromptInjection(content: string): ThreatScanResult {
    const threats: ThreatScanResult['threats'] = [];

    // Pattern: Instruction override attempts
    const overridePatterns = [
      /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|commands?)/gi,
      /disregard\s+(all\s+)?(previous|prior|above)/gi,
      /forget\s+(everything|all)\s+(you|previously)/gi,
      /new\s+instructions?:\s*/gi,
      /system\s*:\s*/gi,
      /\[INST\]/gi,
      /<<SYS>>/gi,
    ];

    for (const pattern of overridePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        threats.push({
          type: 'prompt-injection',
          severity: 'high',
          description: `Potential instruction override: "${match[0]}"`,
          location: {
            start: match.index!,
            end: match.index! + match[0].length
          }
        });
      }
    }

    // Pattern: Role manipulation
    const rolePatterns = [
      /you\s+are\s+(now\s+)?a\s/gi,
      /act\s+as\s+(if\s+you\s+are\s+)?a\s/gi,
      /pretend\s+(to\s+be|you\s+are)/gi,
      /roleplay\s+as/gi,
    ];

    for (const pattern of rolePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        threats.push({
          type: 'manipulation',
          severity: 'medium',
          description: `Potential role manipulation: "${match[0]}"`,
          location: {
            start: match.index!,
            end: match.index! + match[0].length
          }
        });
      }
    }

    return {
      safe: threats.length === 0,
      threats
    };
  }

  /**
   * Scan for PII in configuration files
   * SEC-AI-002
   */
  static scanForPII(content: string): ThreatScanResult {
    const threats: ThreatScanResult['threats'] = [];

    const piiPatterns: Array<{
      pattern: RegExp;
      type: string;
      severity: 'medium' | 'high' | 'critical';
    }> = [
      // API Keys and Tokens
      {
        pattern: /\b(sk-[a-zA-Z0-9]{20,})\b/g,
        type: 'OpenAI API Key',
        severity: 'critical'
      },
      {
        pattern: /\b(sk-ant-[a-zA-Z0-9-]+)\b/g,
        type: 'Anthropic API Key',
        severity: 'critical'
      },
      {
        pattern: /\b(ghp_[a-zA-Z0-9]{36})\b/g,
        type: 'GitHub Personal Access Token',
        severity: 'critical'
      },
      {
        pattern: /\b(gho_[a-zA-Z0-9]{36})\b/g,
        type: 'GitHub OAuth Token',
        severity: 'critical'
      },
      {
        pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
        type: 'AWS Access Key',
        severity: 'critical'
      },

      // Secrets in config
      {
        pattern: /\b(password|passwd|pwd)\s*[:=]\s*["']?[^\s"']+/gi,
        type: 'Password',
        severity: 'critical'
      },
      {
        pattern: /\b(secret|token|key)\s*[:=]\s*["']?[a-zA-Z0-9+/=]{20,}/gi,
        type: 'Secret/Token',
        severity: 'high'
      },

      // Personal information
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        type: 'Email Address',
        severity: 'medium'
      },
      {
        pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
        type: 'Potential SSN',
        severity: 'high'
      },
      {
        pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        type: 'Potential Credit Card',
        severity: 'critical'
      },
    ];

    for (const { pattern, type, severity } of piiPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        threats.push({
          type: 'pii',
          severity,
          description: `${type} detected`,
          location: {
            start: match.index!,
            end: match.index! + match[0].length
          }
        });
      }
    }

    return {
      safe: threats.length === 0,
      threats,
      sanitizedContent: this.redactPII(content, threats)
    };
  }

  /**
   * Redact PII from content
   */
  private static redactPII(
    content: string,
    threats: ThreatScanResult['threats']
  ): string {
    let redacted = content;

    // Sort by location descending to preserve indices
    const sortedThreats = [...threats]
      .filter(t => t.location)
      .sort((a, b) => b.location!.start - a.location!.start);

    for (const threat of sortedThreats) {
      if (threat.location) {
        const before = redacted.substring(0, threat.location.start);
        const after = redacted.substring(threat.location.end);
        redacted = before + '[REDACTED]' + after;
      }
    }

    return redacted;
  }

  /**
   * Combined security scan
   * SEC-AI-003
   */
  static fullScan(content: string): ThreatScanResult {
    const injectionResult = this.scanForPromptInjection(content);
    const piiResult = this.scanForPII(content);

    const allThreats = [...injectionResult.threats, ...piiResult.threats];

    return {
      safe: allThreats.length === 0,
      threats: allThreats,
      sanitizedContent: piiResult.sanitizedContent
    };
  }
}
```

### 4.3 Behavioral Analysis

```typescript
// src/security/behavioral-analyzer.ts

interface BehaviorMetrics {
  fileCount: number;
  totalSize: number;
  uniqueExtensions: Set<string>;
  maxDepth: number;
  averageFileSize: number;
  configDensity: number;  // configs per directory
}

interface AnomalyReport {
  hasAnomalies: boolean;
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    metric: string;
    observed: number;
    expected: string;
  }>;
}

/**
 * Behavioral analysis for detecting anomalous configurations
 * SEC-AI-004
 */
export class BehavioralAnalyzer {
  // Baseline thresholds based on typical Claude Code projects
  private static readonly BASELINES = {
    maxConfigFiles: 100,
    maxTotalSize: 5_000_000,  // 5MB
    maxDepth: 10,
    maxAgents: 50,
    maxMCPServers: 20,
    maxSkillsPerAgent: 20,
    avgFileSizeMin: 100,
    avgFileSizeMax: 50_000
  };

  /**
   * Analyze scan results for anomalous patterns
   */
  static analyzeForAnomalies(metrics: BehaviorMetrics): AnomalyReport {
    const anomalies: AnomalyReport['anomalies'] = [];

    // Check file count
    if (metrics.fileCount > this.BASELINES.maxConfigFiles) {
      anomalies.push({
        type: 'excessive-files',
        severity: 'medium',
        description: 'Unusually high number of configuration files',
        metric: 'fileCount',
        observed: metrics.fileCount,
        expected: `<= ${this.BASELINES.maxConfigFiles}`
      });
    }

    // Check total size
    if (metrics.totalSize > this.BASELINES.maxTotalSize) {
      anomalies.push({
        type: 'excessive-size',
        severity: 'high',
        description: 'Configuration files exceed expected total size',
        metric: 'totalSize',
        observed: metrics.totalSize,
        expected: `<= ${this.BASELINES.maxTotalSize} bytes`
      });
    }

    // Check nesting depth
    if (metrics.maxDepth > this.BASELINES.maxDepth) {
      anomalies.push({
        type: 'excessive-depth',
        severity: 'medium',
        description: 'Configuration structure is unusually deep',
        metric: 'maxDepth',
        observed: metrics.maxDepth,
        expected: `<= ${this.BASELINES.maxDepth}`
      });
    }

    // Check average file size (could indicate binary/malformed content)
    if (metrics.averageFileSize > this.BASELINES.avgFileSizeMax) {
      anomalies.push({
        type: 'large-average-size',
        severity: 'medium',
        description: 'Average configuration file size is unusually large',
        metric: 'averageFileSize',
        observed: metrics.averageFileSize,
        expected: `<= ${this.BASELINES.avgFileSizeMax} bytes`
      });
    }

    // Check for suspicious file extensions
    const expectedExtensions = new Set(['.md', '.yaml', '.yml', '.json', '.txt']);
    const unexpectedExtensions = [...metrics.uniqueExtensions]
      .filter(ext => !expectedExtensions.has(ext.toLowerCase()));

    if (unexpectedExtensions.length > 0) {
      anomalies.push({
        type: 'unexpected-extensions',
        severity: 'low',
        description: `Unexpected file extensions: ${unexpectedExtensions.join(', ')}`,
        metric: 'extensions',
        observed: unexpectedExtensions.length,
        expected: 'Only .md, .yaml, .yml, .json, .txt'
      });
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies
    };
  }
}
```

---

## 5. Claims-Based Authorization

### 5.1 Design Overview (Future Multi-User Support)

For v1.0, AgentScope is a single-user CLI tool. However, the architecture supports claims-based authorization for future multi-user scenarios.

```typescript
// src/security/claims-authorization.ts

/**
 * Claims-based authorization design for future multi-user support
 * SEC-AUTH-001
 */

interface Claim {
  type: string;
  value: string | string[];
  issuer: string;
  issuedAt: Date;
  expiresAt?: Date;
}

interface Principal {
  id: string;
  claims: Claim[];
}

interface AuthorizationPolicy {
  id: string;
  description: string;
  requiredClaims: Array<{
    type: string;
    values?: string[];
    operator: 'equals' | 'contains' | 'any' | 'all';
  }>;
  effect: 'allow' | 'deny';
}

// Default claims for v1.0 (single user)
const DEFAULT_CLAIMS: Claim[] = [
  {
    type: 'role',
    value: 'owner',
    issuer: 'agentscope',
    issuedAt: new Date()
  },
  {
    type: 'permission',
    value: ['read', 'write', 'scan'],
    issuer: 'agentscope',
    issuedAt: new Date()
  }
];

// Predefined roles for future multi-user
const ROLE_DEFINITIONS = {
  owner: {
    permissions: ['read', 'write', 'scan', 'delete', 'configure'],
    namespaces: ['*']
  },
  admin: {
    permissions: ['read', 'write', 'scan', 'configure'],
    namespaces: ['*']
  },
  editor: {
    permissions: ['read', 'write', 'scan'],
    namespaces: ['project']
  },
  viewer: {
    permissions: ['read'],
    namespaces: ['project']
  }
};

export class ClaimsAuthorizer {
  /**
   * Check if principal is authorized for action
   * SEC-AUTH-002
   */
  static authorize(
    principal: Principal,
    resource: string,
    action: string,
    policies: AuthorizationPolicy[]
  ): { allowed: boolean; reason: string; policy?: string } {
    // Find applicable policies
    const applicablePolicies = policies.filter(p =>
      this.policyMatchesResource(p, resource, action)
    );

    // Check deny policies first (deny overrides allow)
    for (const policy of applicablePolicies.filter(p => p.effect === 'deny')) {
      if (this.principalMatchesPolicy(principal, policy)) {
        return {
          allowed: false,
          reason: policy.description,
          policy: policy.id
        };
      }
    }

    // Check allow policies
    for (const policy of applicablePolicies.filter(p => p.effect === 'allow')) {
      if (this.principalMatchesPolicy(principal, policy)) {
        return {
          allowed: true,
          reason: policy.description,
          policy: policy.id
        };
      }
    }

    // Default deny
    return {
      allowed: false,
      reason: 'No matching allow policy'
    };
  }

  private static policyMatchesResource(
    policy: AuthorizationPolicy,
    resource: string,
    action: string
  ): boolean {
    // Implementation for resource matching
    return true; // Simplified for v1.0
  }

  private static principalMatchesPolicy(
    principal: Principal,
    policy: AuthorizationPolicy
  ): boolean {
    for (const requirement of policy.requiredClaims) {
      const claim = principal.claims.find(c => c.type === requirement.type);
      if (!claim) return false;

      const claimValues = Array.isArray(claim.value) ? claim.value : [claim.value];

      switch (requirement.operator) {
        case 'equals':
          if (!requirement.values?.some(v => claimValues.includes(v))) {
            return false;
          }
          break;
        case 'contains':
          if (!requirement.values?.every(v => claimValues.includes(v))) {
            return false;
          }
          break;
        case 'any':
          if (!requirement.values?.some(v => claimValues.includes(v))) {
            return false;
          }
          break;
        case 'all':
          if (!requirement.values?.every(v => claimValues.includes(v))) {
            return false;
          }
          break;
      }
    }
    return true;
  }
}
```

### 5.2 Namespace Isolation

```typescript
// src/security/namespace-isolation.ts

/**
 * Namespace isolation for future multi-tenant support
 * SEC-AUTH-003
 */

interface Namespace {
  id: string;
  name: string;
  type: 'project' | 'user' | 'global';
  owner: string;
  permissions: Map<string, string[]>;  // principal -> permissions
}

export class NamespaceManager {
  private namespaces: Map<string, Namespace> = new Map();

  /**
   * Check if principal can access resource in namespace
   */
  canAccess(
    principalId: string,
    namespaceId: string,
    permission: string
  ): boolean {
    const namespace = this.namespaces.get(namespaceId);
    if (!namespace) return false;

    // Owner always has access
    if (namespace.owner === principalId) return true;

    // Check explicit permissions
    const principalPermissions = namespace.permissions.get(principalId);
    if (!principalPermissions) return false;

    return principalPermissions.includes(permission) ||
           principalPermissions.includes('*');
  }

  /**
   * Isolate paths by namespace
   * SEC-AUTH-004
   */
  getIsolatedPath(basePath: string, namespaceId: string): string {
    // For v1.0, no isolation needed (single user)
    // Future: return path.join(basePath, 'namespaces', namespaceId)
    return basePath;
  }
}
```

---

## 6. Security Validation Checklist

### 6.1 Pre-Commit Security Hooks

```yaml
# .husky/pre-commit (hook configuration)
# SEC-CHECK-001

#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run security checks before commit
npm run security:check
```

```json
// package.json scripts section
{
  "scripts": {
    "security:check": "npm run security:audit && npm run security:scan",
    "security:audit": "npm audit --audit-level=high",
    "security:scan": "tsx scripts/security-scan.ts",
    "security:sast": "semgrep scan --config=p/typescript --config=p/security-audit"
  }
}
```

```typescript
// scripts/security-scan.ts
// SEC-CHECK-002

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { SafeExecutor } from '../src/security/safe-executor';

async function runSecurityScan(): Promise<void> {
  console.log('Running AgentScope Security Scan...\n');

  const issues: Array<{
    file: string;
    line: number;
    severity: string;
    message: string;
  }> = [];

  // 1. Scan for dangerous code patterns
  const sourceFiles = await glob('src/**/*.ts');

  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const analysis = SafeExecutor.analyzeForDangerousPatterns(content);

    if (!analysis.safe) {
      for (const violation of analysis.violations) {
        issues.push({
          file,
          line: violation.line,
          severity: 'HIGH',
          message: `Dangerous pattern: ${violation.pattern}`
        });
      }
    }
  }

  // 2. Check for hardcoded secrets
  const allFiles = await glob(['src/**/*', 'tests/**/*', '*.json', '*.yaml']);
  const secretPatterns = [
    /(['"])(sk-[a-zA-Z0-9]{20,})\1/g,
    /(['"])(sk-ant-[a-zA-Z0-9-]+)\1/g,
    /(['"])(ghp_[a-zA-Z0-9]{36})\1/g,
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
  ];

  for (const file of allFiles) {
    if (fs.statSync(file).isDirectory()) continue;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        for (const pattern of secretPatterns) {
          if (pattern.test(lines[i])) {
            issues.push({
              file,
              line: i + 1,
              severity: 'CRITICAL',
              message: 'Potential hardcoded secret detected'
            });
          }
          pattern.lastIndex = 0;  // Reset regex
        }
      }
    } catch {
      // Skip binary files
    }
  }

  // 3. Check package.json for known vulnerable patterns
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const dangerousDeps = ['eval-js', 'serialize-javascript@<3.1.0'];

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  for (const dep of dangerousDeps) {
    const [name, version] = dep.split('@');
    if (allDeps[name]) {
      issues.push({
        file: 'package.json',
        line: 0,
        severity: 'HIGH',
        message: `Potentially dangerous dependency: ${name}`
      });
    }
  }

  // Output results
  if (issues.length === 0) {
    console.log('No security issues found.');
    process.exit(0);
  }

  console.log(`Found ${issues.length} security issue(s):\n`);

  for (const issue of issues) {
    console.log(`[${issue.severity}] ${issue.file}:${issue.line}`);
    console.log(`  ${issue.message}\n`);
  }

  // Exit with error if critical issues found
  const criticalCount = issues.filter(i =>
    i.severity === 'CRITICAL' || i.severity === 'HIGH'
  ).length;

  if (criticalCount > 0) {
    console.log(`\n${criticalCount} critical/high severity issues found. Commit blocked.`);
    process.exit(1);
  }
}

runSecurityScan().catch(console.error);
```

### 6.2 CI/CD Security Scanning

```yaml
# .github/workflows/security.yml
# SEC-CHECK-003

name: Security Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Dependency vulnerability scanning
      - name: npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true

      - name: Snyk vulnerability scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
        continue-on-error: true

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Static Application Security Testing
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/typescript
            p/security-audit
            p/owasp-top-ten
            p/nodejs
          generateSarif: true

      - name: Upload SARIF file
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: semgrep.sarif
        if: always()

  secret-scanning:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for scanning

      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

  dependency-review:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Dependency Review
        uses: actions/dependency-review-action@v3
        with:
          fail-on-severity: high
          deny-licenses: GPL-3.0, AGPL-3.0
          allow-ghsas: false

  custom-security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run custom security scan
        run: npm run security:scan
```

### 6.3 SAST/Dependency Scanning

```typescript
// scripts/dependency-scan.ts
// SEC-CHECK-004

import { execSync } from 'child_process';
import * as fs from 'fs';

interface VulnerabilityReport {
  summary: {
    total: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  vulnerabilities: Array<{
    package: string;
    severity: string;
    title: string;
    fixAvailable: boolean;
    recommendation: string;
  }>;
}

async function runDependencyScan(): Promise<VulnerabilityReport> {
  // Run npm audit
  let auditOutput: string;
  try {
    auditOutput = execSync('npm audit --json', { encoding: 'utf-8' });
  } catch (error: any) {
    auditOutput = error.stdout || '{}';
  }

  const audit = JSON.parse(auditOutput);

  const report: VulnerabilityReport = {
    summary: {
      total: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0
    },
    vulnerabilities: []
  };

  if (audit.metadata?.vulnerabilities) {
    report.summary = {
      total: audit.metadata.vulnerabilities.total || 0,
      critical: audit.metadata.vulnerabilities.critical || 0,
      high: audit.metadata.vulnerabilities.high || 0,
      moderate: audit.metadata.vulnerabilities.moderate || 0,
      low: audit.metadata.vulnerabilities.low || 0
    };
  }

  if (audit.vulnerabilities) {
    for (const [pkg, data] of Object.entries(audit.vulnerabilities)) {
      const vuln = data as any;
      report.vulnerabilities.push({
        package: pkg,
        severity: vuln.severity,
        title: vuln.via?.[0]?.title || 'Unknown vulnerability',
        fixAvailable: !!vuln.fixAvailable,
        recommendation: vuln.fixAvailable
          ? `Run: npm audit fix`
          : 'Manual review required'
      });
    }
  }

  return report;
}

// Run and output
runDependencyScan().then(report => {
  console.log('Dependency Security Scan Results');
  console.log('================================\n');
  console.log(`Total vulnerabilities: ${report.summary.total}`);
  console.log(`  Critical: ${report.summary.critical}`);
  console.log(`  High: ${report.summary.high}`);
  console.log(`  Moderate: ${report.summary.moderate}`);
  console.log(`  Low: ${report.summary.low}`);

  if (report.vulnerabilities.length > 0) {
    console.log('\nDetails:');
    for (const vuln of report.vulnerabilities) {
      console.log(`\n[${vuln.severity.toUpperCase()}] ${vuln.package}`);
      console.log(`  ${vuln.title}`);
      console.log(`  Fix: ${vuln.recommendation}`);
    }
  }

  // Exit with error if critical vulnerabilities
  if (report.summary.critical > 0) {
    process.exit(1);
  }
});
```

---

## 7. Implementation Requirements

### 7.1 Security Module Structure

```
src/
├── security/
│   ├── index.ts                    # Public API exports
│   ├── input-validator.ts          # Zod schemas (SEC-CTL-001-003)
│   ├── path-validator.ts           # Path traversal prevention (SEC-CTL-004-006)
│   ├── safe-executor.ts            # No code execution (SEC-CTL-007-009)
│   ├── output-sanitizer.ts         # Markdown sanitization (SEC-CTL-010)
│   ├── aidefence-integration.ts    # Prompt/PII scanning (SEC-AI-001-003)
│   ├── behavioral-analyzer.ts      # Anomaly detection (SEC-AI-004)
│   ├── claims-authorization.ts     # Future auth (SEC-AUTH-001-002)
│   └── namespace-isolation.ts      # Future namespaces (SEC-AUTH-003-004)
├── errors/
│   └── security-error.ts           # Security-specific errors
└── types/
    └── security.ts                 # Security type definitions
```

### 7.2 Implementation Priority

| Priority | Control | ID | Rationale |
|----------|---------|-----|-----------|
| **P0** | Path validation | SEC-CTL-004-006 | Prevents critical traversal attacks |
| **P0** | Input validation | SEC-CTL-001-003 | Prevents parser exploits |
| **P0** | No code execution | SEC-CTL-007-009 | Core security principle |
| **P1** | Output sanitization | SEC-CTL-010 | Prevents XSS in docs |
| **P1** | PII detection | SEC-AI-002 | Prevents secret exposure |
| **P1** | Pre-commit hooks | SEC-CHECK-001-002 | Development security |
| **P2** | CI/CD scanning | SEC-CHECK-003-004 | Automated verification |
| **P2** | Prompt injection | SEC-AI-001 | Defense against AI manipulation |
| **P3** | Behavioral analysis | SEC-AI-004 | Anomaly detection |
| **P3** | Claims authorization | SEC-AUTH-001-004 | Future multi-user |

### 7.3 Dependencies

```json
{
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "husky": "^9.0.0",
    "semgrep": "^1.50.0"
  }
}
```

---

## 8. Security Testing Strategy

### 8.1 Unit Tests for Security Controls

```typescript
// tests/unit/security/path-validator.test.ts
import { describe, it, expect } from 'vitest';
import { PathValidator } from '../../../src/security/path-validator';

describe('PathValidator', () => {
  const validator = new PathValidator('/project/root');

  describe('validateReadPath', () => {
    it('should allow paths within project root', () => {
      const result = validator.validateReadPath('src/index.ts');
      expect(result.valid).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      const attacks = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f',
        'src/../../../etc/passwd',
        'src/....//....//etc/passwd'
      ];

      for (const attack of attacks) {
        const result = validator.validateReadPath(attack);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('traversal');
      }
    });

    it('should reject null bytes', () => {
      const result = validator.validateReadPath('src/index.ts\0.exe');
      expect(result.valid).toBe(false);
    });

    it('should reject disallowed extensions', () => {
      const result = validator.validateReadPath('src/malware.exe');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('extension');
    });
  });
});
```

### 8.2 Integration Tests

```typescript
// tests/integration/security/scan-security.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { scan } from '../../../src/cli/commands/scan';

describe('Scan Security Integration', () => {
  const testDir = '/tmp/agentscope-security-test';

  beforeAll(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.claude'));
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  it('should not expose secrets in generated documentation', async () => {
    // Create config with secret
    await fs.writeFile(
      path.join(testDir, '.claude', 'config.yaml'),
      `
api_key: EXAMPLE_API_KEY_FOR_TESTING
agent:
  name: test-agent
`
    );

    const result = await scan(testDir);

    // Verify secret is redacted
    expect(result.docs).not.toContain('EXAMPLE_API_KEY_FOR_TESTING');
    expect(result.docs).toContain('[REDACTED]');
  });

  it('should handle malicious YAML safely', async () => {
    // Create malicious YAML (billion laughs attempt)
    await fs.writeFile(
      path.join(testDir, '.claude', 'attack.yaml'),
      `
a: &a ["lol","lol","lol"]
b: &b [*a,*a,*a]
c: &c [*b,*b,*b]
d: &d [*c,*c,*c]
e: &e [*d,*d,*d]
`
    );

    // Should handle gracefully without memory explosion
    await expect(scan(testDir)).resolves.toBeDefined();
  });
});
```

### 8.3 Security Test Coverage Requirements

| Category | Minimum Coverage | Tests Required |
|----------|------------------|----------------|
| Path validation | 100% | All traversal patterns |
| Input validation | 90% | Valid + invalid schemas |
| Output sanitization | 100% | XSS patterns |
| PII detection | 95% | All PII types |
| Resource limits | 80% | Size, depth, timeout |

---

## Appendix A: Security Error Codes

| Code | Name | Description |
|------|------|-------------|
| SEC-001 | PATH_TRAVERSAL | Path traversal attack detected |
| SEC-002 | PATH_ESCAPE | Path escapes project root |
| SEC-003 | SYMLINK_ESCAPE | Symlink points outside project |
| SEC-004 | INVALID_EXTENSION | File extension not allowed |
| SEC-005 | NULL_BYTE | Null byte in path |
| SEC-006 | SIZE_EXCEEDED | File/total size limit exceeded |
| SEC-007 | DEPTH_EXCEEDED | Nesting depth limit exceeded |
| SEC-008 | TIMEOUT | Processing timeout exceeded |
| SEC-009 | PARSE_ERROR | Failed to parse input safely |
| SEC-010 | SCHEMA_VIOLATION | Input failed Zod validation |
| SEC-011 | DANGEROUS_PATTERN | Dangerous code pattern detected |
| SEC-012 | PII_DETECTED | Sensitive data detected |
| SEC-013 | INJECTION_DETECTED | Injection attempt detected |

---

## Appendix B: Security Checklist for Code Review

- [ ] No use of `eval()`, `new Function()`, or dynamic code execution
- [ ] All file paths validated with `PathValidator`
- [ ] All user input validated with Zod schemas
- [ ] All output sanitized before writing
- [ ] Resource limits applied to all parsing operations
- [ ] Timeouts applied to all async operations
- [ ] No hardcoded secrets or credentials
- [ ] Error messages don't expose internal details
- [ ] Logging doesn't include sensitive data
- [ ] Dependencies checked for known vulnerabilities

---

*Document Version: 1.0 | January 2026 | Status: Ready for Implementation*
