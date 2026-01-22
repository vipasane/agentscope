# AgentScope TypeScript Interfaces

> **Version**: 1.0
> **Date**: January 2026
> **Status**: Ready for Implementation

This document defines all TypeScript interfaces for the AgentScope unified configuration model and component contracts.

---

## Table of Contents

1. [Core Domain Model](#1-core-domain-model)
2. [Parser Interfaces](#2-parser-interfaces)
3. [Generator Interfaces](#3-generator-interfaces)
4. [Validation Interfaces](#4-validation-interfaces)
5. [CLI Interfaces](#5-cli-interfaces)
6. [Utility Types](#6-utility-types)

---

## 1. Core Domain Model

### 1.1 Aggregate Root: AgentScopeConfig

The primary output of a scan operation.

```typescript
/**
 * Root configuration object representing all scanned agent configurations.
 * This is the primary output of the scan operation and input to generators.
 */
interface AgentScopeConfig {
  /** Metadata about the scan */
  meta: ScanMeta;

  /** All discovered agents */
  agents: Agent[];

  /** All discovered skills */
  skills: Skill[];

  /** All discovered hooks */
  hooks: Hook[];

  /** All discovered commands */
  commands: Command[];

  /** All discovered MCP servers */
  mcpServers: MCPServer[];

  /** Project-level settings */
  settings: Settings;

  /** Errors and warnings from the scan */
  errors: ScanError[];
}

/**
 * Metadata about the scan operation.
 */
interface ScanMeta {
  /** Project name (from package.json or directory name) */
  name: string;

  /** AgentScope version used for the scan */
  version: string;

  /** ISO 8601 timestamp of the scan */
  scanDate: string;

  /** Absolute path to the scanned project */
  projectPath: string;

  /** Frameworks detected in the project */
  frameworks: Framework[];

  /** Duration of the scan in milliseconds */
  scanDurationMs: number;
}

/**
 * Supported frameworks.
 */
type Framework = 'claude-code' | 'mcp';
```

### 1.2 Agent Entity

```typescript
/**
 * Represents a Claude Code agent configuration.
 */
interface Agent {
  /** Unique identifier (derived from filename or explicit id) */
  id: string;

  /** Human-readable name */
  name: string;

  /** Agent description */
  description: string;

  /** Where this agent was defined */
  source: ConfigSource;

  /** Absolute path to the source file */
  sourcePath: string;

  /** Tools this agent is allowed to use */
  allowedTools: string[];

  /** Tools this agent is denied from using */
  deniedTools: string[];

  /** Skill IDs this agent can use */
  skills: string[];

  /** Agent type classification */
  type: AgentType;

  /** Raw configuration snippet for documentation */
  configSnippet: string;

  /** Additional custom properties */
  metadata: Record<string, unknown>;
}

/**
 * Agent type classification.
 */
type AgentType = 'primary' | 'subagent' | 'specialist' | 'custom';

/**
 * Where a configuration was sourced from.
 */
type ConfigSource = 'project' | 'user';
```

### 1.3 Skill Value Object

```typescript
/**
 * Represents a reusable skill definition.
 */
interface Skill {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Skill description */
  description: string;

  /** Source of this skill definition */
  source: ConfigSource;

  /** Absolute path to the source file */
  sourcePath: string;

  /** Tools allowed when this skill is active */
  allowedTools: string[];

  /** Triggers that activate this skill (e.g., slash commands) */
  triggers: string[];

  /** Instructions/prompt content for the skill */
  instructions: string;

  /** Raw configuration snippet for documentation */
  configSnippet: string;
}
```

### 1.4 Hook Value Object

```typescript
/**
 * Represents a lifecycle hook configuration.
 */
interface Hook {
  /** Unique identifier */
  id: string;

  /** Hook event type */
  event: HookEvent;

  /** Handler command or script */
  handler: string;

  /** Optional matcher pattern for conditional hooks */
  matcher?: HookMatcher;

  /** Source of this hook definition */
  source: ConfigSource;

  /** Absolute path to the source file */
  sourcePath: string;

  /** Raw configuration snippet for documentation */
  configSnippet: string;
}

/**
 * Supported hook events.
 */
type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Stop'
  | 'SubagentStop';

/**
 * Hook matcher configuration.
 */
interface HookMatcher {
  /** Tool name pattern to match */
  toolName?: string;

  /** File path pattern to match */
  filePath?: string;
}
```

### 1.5 Command Value Object

```typescript
/**
 * Represents a slash command definition.
 */
interface Command {
  /** Unique identifier (the command name without slash) */
  id: string;

  /** Command name as used (e.g., 'review' for /review) */
  name: string;

  /** Command description */
  description: string;

  /** Source of this command definition */
  source: ConfigSource;

  /** Absolute path to the source file */
  sourcePath: string;

  /** Tools allowed when this command is invoked */
  allowedTools: string[];

  /** Instructions/prompt content for the command */
  instructions: string;

  /** Raw configuration snippet for documentation */
  configSnippet: string;
}
```

### 1.6 MCP Server Entity

```typescript
/**
 * Represents an MCP (Model Context Protocol) server configuration.
 */
interface MCPServer {
  /** Unique identifier (server name from .mcp.json) */
  id: string;

  /** Human-readable name */
  name: string;

  /** Server execution command */
  command: string;

  /** Command arguments */
  args: string[];

  /** Environment variables */
  env: Record<string, string>;

  /** Tools provided by this server */
  tools: MCPTool[];

  /** Source file path */
  sourcePath: string;

  /** Raw configuration snippet for documentation */
  configSnippet: string;
}

/**
 * Represents a tool provided by an MCP server.
 */
interface MCPTool {
  /** Tool name */
  name: string;

  /** Tool description (if available) */
  description?: string;
}
```

### 1.7 Settings Value Object

```typescript
/**
 * Represents project-level settings.
 */
interface Settings {
  /** Whether hooks are enabled */
  hooksEnabled: boolean;

  /** Default model to use */
  defaultModel?: string;

  /** Custom settings from settings.json */
  custom: Record<string, unknown>;

  /** Source of settings */
  source: ConfigSource;

  /** Absolute path to settings file */
  sourcePath?: string;
}
```

### 1.8 Error Types

```typescript
/**
 * Error level classification.
 */
type ErrorLevel = 'fatal' | 'warning' | 'info';

/**
 * Represents an error or warning from the scan process.
 */
interface ScanError {
  /** Error severity level */
  level: ErrorLevel;

  /** Error code for programmatic handling */
  code: ErrorCode;

  /** Human-readable error message */
  message: string;

  /** File where the error occurred */
  file?: string;

  /** Line number in the file */
  line?: number;

  /** Column number in the file */
  column?: number;

  /** Suggested fix */
  suggestion?: string;
}

/**
 * Error codes for categorization.
 */
type ErrorCode =
  // Fatal errors (E0xx)
  | 'E001' // Invalid YAML syntax
  | 'E002' // Invalid JSON syntax
  | 'E003' // File read permission denied
  | 'E004' // Required file not found
  | 'E005' // Schema validation failed
  // Warnings (W0xx)
  | 'W001' // Agent references missing skill
  | 'W002' // MCP server has no tools defined
  | 'W003' // Duplicate agent ID
  | 'W004' // Circular reference detected
  | 'W005' // Deprecated configuration format
  // Info (I0xx)
  | 'I001' // Deprecated config format detected
  | 'I002' // Empty configuration file
  | 'I003' // Using default value;
```

---

## 2. Parser Interfaces

### 2.1 Parser Plugin Interface

```typescript
/**
 * Interface that all parser plugins must implement.
 */
interface ParserPlugin {
  /** Unique identifier for this parser */
  readonly name: string;

  /** Frameworks this parser can handle */
  readonly frameworks: readonly Framework[];

  /**
   * Detect if this parser should handle the given project.
   * @param projectPath - Absolute path to the project root
   * @returns true if this parser should be used
   */
  detect(projectPath: string): Promise<boolean>;

  /**
   * Parse configurations from the project.
   * @param projectPath - Absolute path to the project root
   * @param options - Parser options
   * @returns Partial configuration (will be merged with other parsers)
   */
  parse(projectPath: string, options?: ParserOptions): Promise<PartialConfig>;
}

/**
 * Options for parser execution.
 */
interface ParserOptions {
  /** Include user-level configurations */
  includeUserConfig?: boolean;

  /** File patterns to include */
  include?: string[];

  /** File patterns to exclude */
  exclude?: string[];

  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Partial configuration returned by a single parser.
 * Will be merged to create the full AgentScopeConfig.
 */
interface PartialConfig {
  /** Framework that produced this config */
  framework: Framework;

  /** Parsed agents (may be empty) */
  agents?: Agent[];

  /** Parsed skills (may be empty) */
  skills?: Skill[];

  /** Parsed hooks (may be empty) */
  hooks?: Hook[];

  /** Parsed commands (may be empty) */
  commands?: Command[];

  /** Parsed MCP servers (may be empty) */
  mcpServers?: MCPServer[];

  /** Parsed settings (may be empty) */
  settings?: Partial<Settings>;

  /** Errors encountered during parsing */
  errors: ScanError[];
}
```

### 2.2 Parser Registry Interface

```typescript
/**
 * Registry for parser plugins.
 */
interface ParserRegistry {
  /**
   * Register a parser plugin.
   * @param parser - The parser to register
   */
  register(parser: ParserPlugin): void;

  /**
   * Get all registered parsers.
   */
  getAll(): readonly ParserPlugin[];

  /**
   * Get parsers that can handle the given project.
   * @param projectPath - Absolute path to the project
   */
  detectParsers(projectPath: string): Promise<ParserPlugin[]>;

  /**
   * Get a specific parser by name.
   * @param name - Parser name
   */
  getByName(name: string): ParserPlugin | undefined;
}
```

---

## 3. Generator Interfaces

### 3.1 Generator Interface

```typescript
/**
 * Interface for all generators (diagrams, documentation, etc.)
 */
interface Generator<TOutput = string> {
  /** Unique identifier for this generator */
  readonly name: string;

  /**
   * Generate output from the configuration.
   * @param config - The unified configuration
   * @param options - Generator-specific options
   */
  generate(config: AgentScopeConfig, options?: GeneratorOptions): Promise<TOutput>;
}

/**
 * Base options for all generators.
 */
interface GeneratorOptions {
  /** Enable verbose output */
  verbose?: boolean;
}
```

### 3.2 Diagram Generator Interface

```typescript
/**
 * Supported diagram types.
 */
type DiagramType =
  | 'component-map'
  | 'workflow-sequence'
  | 'hierarchy'
  | 'dataflow'
  | 'permissions'
  | 'hooks';

/**
 * Interface for Mermaid diagram generators.
 */
interface DiagramGenerator extends Generator<string> {
  /** Type of diagram this generator produces */
  readonly diagramType: DiagramType;

  /**
   * Generate a Mermaid diagram string.
   * @param config - The unified configuration
   * @param options - Diagram-specific options
   */
  generate(config: AgentScopeConfig, options?: DiagramOptions): Promise<string>;
}

/**
 * Options for diagram generation.
 */
interface DiagramOptions extends GeneratorOptions {
  /** Mermaid theme */
  theme?: 'default' | 'dark' | 'forest' | 'neutral';

  /** Diagram direction (for flowcharts) */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';

  /** Include source paths in nodes */
  includePaths?: boolean;

  /** Maximum nodes before grouping */
  maxNodes?: number;
}

/**
 * Result of diagram generation.
 */
interface DiagramResult {
  /** Diagram type */
  type: DiagramType;

  /** Mermaid diagram source */
  content: string;

  /** Title for the diagram */
  title: string;

  /** Optional description */
  description?: string;
}
```

### 3.3 Documentation Generator Interface

```typescript
/**
 * Supported documentation output types.
 */
type DocType = 'readme' | 'agents' | 'skills' | 'hooks' | 'mcps';

/**
 * Interface for documentation generators.
 */
interface DocsGenerator extends Generator<GeneratedFile[]> {
  /**
   * Generate documentation files.
   * @param config - The unified configuration
   * @param diagrams - Pre-generated diagrams to embed
   * @param options - Documentation options
   */
  generate(
    config: AgentScopeConfig,
    options?: DocsOptions
  ): Promise<GeneratedFile[]>;
}

/**
 * Options for documentation generation.
 */
interface DocsOptions extends GeneratorOptions {
  /** Output directory */
  outputDir: string;

  /** Include code snippets */
  includeSnippets?: boolean;

  /** Include raw JSON output */
  includeRaw?: boolean;

  /** Diagrams to embed in README */
  diagrams?: DiagramResult[];
}

/**
 * Represents a generated file.
 */
interface GeneratedFile {
  /** Relative path from output directory */
  path: string;

  /** File content */
  content: string;

  /** Whether this file already existed */
  overwritten?: boolean;
}
```

---

## 4. Validation Interfaces

### 4.1 Validator Interface

```typescript
/**
 * Result of validation.
 */
interface ValidationResult {
  /** Whether validation passed (no fatal errors) */
  valid: boolean;

  /** All errors from validation */
  errors: ScanError[];

  /** The validated (possibly modified) config */
  config: AgentScopeConfig;
}

/**
 * Validator service interface.
 */
interface Validator {
  /**
   * Validate a configuration.
   * @param config - Configuration to validate
   * @param options - Validation options
   */
  validate(config: AgentScopeConfig, options?: ValidationOptions): ValidationResult;

  /**
   * Validate a partial configuration from a parser.
   * @param partial - Partial configuration to validate
   */
  validatePartial(partial: PartialConfig): ValidationResult;
}

/**
 * Options for validation.
 */
interface ValidationOptions {
  /** Treat warnings as errors */
  strict?: boolean;

  /** Skip reference validation */
  skipRefCheck?: boolean;

  /** Error codes to ignore */
  ignore?: ErrorCode[];
}
```

### 4.2 Zod Schema Types

```typescript
import { z } from 'zod';

/**
 * Zod schema for Agent validation.
 */
const AgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  source: z.enum(['project', 'user']),
  sourcePath: z.string(),
  allowedTools: z.array(z.string()).default([]),
  deniedTools: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  type: z.enum(['primary', 'subagent', 'specialist', 'custom']).default('custom'),
  configSnippet: z.string(),
  metadata: z.record(z.unknown()).default({}),
});

/**
 * Zod schema for Skill validation.
 */
const SkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  source: z.enum(['project', 'user']),
  sourcePath: z.string(),
  allowedTools: z.array(z.string()).default([]),
  triggers: z.array(z.string()).default([]),
  instructions: z.string().default(''),
  configSnippet: z.string(),
});

/**
 * Zod schema for MCPServer validation.
 */
const MCPServerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
  })).default([]),
  sourcePath: z.string(),
  configSnippet: z.string(),
});

/**
 * Zod schema for full AgentScopeConfig validation.
 */
const AgentScopeConfigSchema = z.object({
  meta: z.object({
    name: z.string(),
    version: z.string(),
    scanDate: z.string().datetime(),
    projectPath: z.string(),
    frameworks: z.array(z.enum(['claude-code', 'mcp'])),
    scanDurationMs: z.number(),
  }),
  agents: z.array(AgentSchema),
  skills: z.array(SkillSchema),
  hooks: z.array(z.any()), // Full schema defined separately
  commands: z.array(z.any()), // Full schema defined separately
  mcpServers: z.array(MCPServerSchema),
  settings: z.object({
    hooksEnabled: z.boolean().default(true),
    defaultModel: z.string().optional(),
    custom: z.record(z.unknown()).default({}),
    source: z.enum(['project', 'user']),
    sourcePath: z.string().optional(),
  }),
  errors: z.array(z.any()), // Full schema defined separately
});

// Type inference from schemas
type AgentFromSchema = z.infer<typeof AgentSchema>;
type SkillFromSchema = z.infer<typeof SkillSchema>;
type MCPServerFromSchema = z.infer<typeof MCPServerSchema>;
type AgentScopeConfigFromSchema = z.infer<typeof AgentScopeConfigSchema>;
```

---

## 5. CLI Interfaces

### 5.1 CLI Options

```typescript
/**
 * Options for the scan command.
 */
interface ScanOptions {
  /** Output directory for generated files */
  output: string;

  /** Output format */
  format: 'md' | 'json';

  /** Specific diagram to generate (overrides defaults) */
  diagram?: DiagramType;

  /** Generate all diagram types */
  allDiagrams: boolean;

  /** Fail on warnings */
  strict: boolean;

  /** Skip user-level configurations */
  projectOnly: boolean;

  /** Enable verbose output */
  verbose: boolean;
}

/**
 * Options for the validate command.
 */
interface ValidateOptions {
  /** Fail on warnings */
  strict: boolean;

  /** Output format for validation results */
  format: 'text' | 'json';

  /** Skip user-level configurations */
  projectOnly: boolean;

  /** Enable verbose output */
  verbose: boolean;
}
```

### 5.2 CLI Output

```typescript
/**
 * Result of a scan operation for CLI output.
 */
interface ScanOutput {
  /** Summary statistics */
  summary: {
    agentCount: number;
    skillCount: number;
    hookCount: number;
    commandCount: number;
    mcpServerCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };

  /** Generated files */
  files: GeneratedFile[];

  /** All errors and warnings */
  errors: ScanError[];

  /** Scan duration */
  durationMs: number;

  /** Exit code (0 for success, 1 for fatal errors) */
  exitCode: 0 | 1;
}
```

---

## 6. Utility Types

### 6.1 Result Types

```typescript
/**
 * Generic result type for operations that can fail.
 */
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type.
 */
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
```

### 6.2 File Discovery Types

```typescript
/**
 * Discovered file with metadata.
 */
interface DiscoveredFile {
  /** Absolute file path */
  path: string;

  /** Relative path from project root */
  relativePath: string;

  /** File type classification */
  type: FileType;

  /** Source (project or user level) */
  source: ConfigSource;
}

/**
 * Classification of discovered files.
 */
type FileType =
  | 'agent'
  | 'skill'
  | 'command'
  | 'hook'
  | 'settings'
  | 'mcp'
  | 'claude-md'
  | 'unknown';

/**
 * File discovery options.
 */
interface DiscoveryOptions {
  /** Include user-level files */
  includeUser: boolean;

  /** Custom glob patterns */
  patterns?: string[];

  /** Patterns to exclude */
  exclude?: string[];
}
```

### 6.3 Template Types

```typescript
/**
 * Context for README template rendering.
 */
interface ReadmeTemplateContext {
  meta: ScanMeta;
  summary: {
    agentCount: number;
    skillCount: number;
    hookCount: number;
    commandCount: number;
    mcpServerCount: number;
  };
  diagrams: DiagramResult[];
  agents: Agent[];
  mcpServers: MCPServer[];
  errors: ScanError[];
  generatedAt: string;
}

/**
 * Context for AGENTS.md template rendering.
 */
interface AgentsTemplateContext {
  meta: ScanMeta;
  agents: Array<Agent & {
    resolvedSkills: Skill[];
    toolCount: number;
  }>;
  generatedAt: string;
}
```

---

## Appendix: Type Export Index

```typescript
// src/core/model/index.ts - Public exports

// Core types
export type {
  AgentScopeConfig,
  ScanMeta,
  Framework,
  Agent,
  AgentType,
  ConfigSource,
  Skill,
  Hook,
  HookEvent,
  HookMatcher,
  Command,
  MCPServer,
  MCPTool,
  Settings,
  ScanError,
  ErrorLevel,
  ErrorCode,
};

// Parser types
export type {
  ParserPlugin,
  ParserOptions,
  PartialConfig,
  ParserRegistry,
};

// Generator types
export type {
  Generator,
  GeneratorOptions,
  DiagramType,
  DiagramGenerator,
  DiagramOptions,
  DiagramResult,
  DocType,
  DocsGenerator,
  DocsOptions,
  GeneratedFile,
};

// Validation types
export type {
  ValidationResult,
  Validator,
  ValidationOptions,
};

// CLI types
export type {
  ScanOptions,
  ValidateOptions,
  ScanOutput,
};

// Utility types
export type {
  Result,
  AsyncResult,
  DiscoveredFile,
  FileType,
  DiscoveryOptions,
};
```

---

*Document Version: 1.0 | January 2026 | Interface Specification*
