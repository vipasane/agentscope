/**
 * Core type definitions for AgentScope
 * Unified configuration interfaces for agent architectures
 */

// ============================================================================
// Error Types
// ============================================================================

export type ErrorSeverity = 'fatal' | 'warning' | 'info';

export interface ScanError {
  severity: ErrorSeverity;
  code: string;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface Agent {
  /** Unique identifier for the agent */
  name: string;
  /** File path where the agent is defined */
  path: string;
  /** Human-readable description */
  description?: string;
  /** Tools/capabilities available to this agent */
  tools?: string[];
  /** Other agents this agent can delegate to */
  delegatesTo?: string[];
  /** Agent type classification */
  type?: AgentType;
  /** Category for multi-file organization (v1.2) */
  category?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export type AgentType =
  | 'coordinator'
  | 'worker'
  | 'specialist'
  | 'reviewer'
  | 'custom'
  | string;

// ============================================================================
// Skill Types
// ============================================================================

export interface Skill {
  /** Unique skill identifier */
  name: string;
  /** File path where the skill is defined */
  path: string;
  /** Human-readable description */
  description?: string;
  /** Trigger patterns that invoke this skill */
  triggers?: string[];
  /** Dependencies on other skills */
  dependencies?: string[];
  /** Whether the skill is enabled */
  enabled?: boolean;
}

// ============================================================================
// Hook Types
// ============================================================================

export interface Hook {
  /** Hook event name */
  event: HookEvent;
  /** File path to the hook script */
  path: string;
  /** Shell command to execute */
  command?: string;
  /** Working directory for execution */
  workingDirectory?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether hook is enabled */
  enabled?: boolean;
  /** Additional metadata about the hook */
  metadata?: {
    /** Hook type (command or prompt) */
    type?: 'command' | 'prompt';
    /** Matcher pattern for tool filtering */
    matcher?: string;
    /** Continue execution on error */
    continueOnError?: boolean;
    /** LLM prompt content */
    prompt?: string;
  };
}

/**
 * Hook event types (2026.01 schema)
 * @see https://json.schemastore.org/claude-code-settings.json
 */
export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'
  | 'UserPromptSubmit'
  | 'SessionStart'
  | 'SessionEnd'
  | 'PreCompact';

// ============================================================================
// Command Types
// ============================================================================

export interface Command {
  /** Command name (e.g., "/commit") */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Allowed tools for this command */
  allowedTools?: string[];
  /** Disallowed tools for this command */
  disallowedTools?: string[];
  /** Custom prompt/instructions */
  prompt?: string;
}

// ============================================================================
// MCP Server Types
// ============================================================================

export interface McpServer {
  /** Server identifier */
  name: string;
  /** Command to start the server */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Whether server is disabled */
  disabled?: boolean;
  /** Server type classification */
  type?: McpServerType;
  /** Tools provided by this server */
  tools?: string[];
}

export type McpServerType =
  | 'stdio'
  | 'sse'
  | 'websocket'
  | 'custom';

// ============================================================================
// Scan Metadata
// ============================================================================

export interface ScanMetadata {
  /** Timestamp of the scan */
  scannedAt: Date;
  /** Root directory that was scanned */
  rootPath: string;
  /** AgentScope version used */
  version: string;
  /** Duration of scan in milliseconds */
  duration: number;
  /** Number of files scanned */
  filesScanned: number;
  /** Any errors encountered during scan */
  errors: ScanError[];
}

// ============================================================================
// Plugin Types (from Claude Code schema 2026.01)
// ============================================================================

export type MarketplaceSourceType = 'github' | 'git' | 'url' | 'npm' | 'file' | 'directory';

export interface Plugin {
  /** Plugin identifier (format: plugin-id@marketplace-id) */
  id: string;
  /** Plugin name */
  name: string;
  /** Marketplace where plugin is installed from */
  marketplace?: string;
  /** Whether plugin is enabled */
  enabled: boolean;
  /** Plugin version if known */
  version?: string;
  /** Plugin description */
  description?: string;
  /** Source location */
  source?: {
    type: MarketplaceSourceType;
    location: string;
  };
}

// ============================================================================
// Permission Types (from Claude Code schema 2026.01)
// ============================================================================

export interface PermissionRule {
  /** Permission rule pattern (e.g., "Bash(npm run:*)", "Read(./.env)") */
  pattern: string;
  /** Rule type */
  type: 'allow' | 'deny' | 'ask';
  /** Tool this rule applies to */
  tool?: string;
  /** Description of what this rule does */
  description?: string;
}

export interface PermissionSummary {
  /** Number of allow rules */
  allowCount: number;
  /** Number of deny rules */
  denyCount: number;
  /** Number of ask rules */
  askCount: number;
  /** All permission rules */
  rules: PermissionRule[];
  /** Default permission mode */
  defaultMode?: 'acceptEdits' | 'bypassPermissions' | 'default' | 'plan';
  /** Additional scoped directories */
  additionalDirectories?: string[];
}

// ============================================================================
// Main Configuration Interface
// ============================================================================

export interface AgentScopeConfig {
  /** Discovered agents */
  agents: Agent[];
  /** Discovered skills */
  skills: Skill[];
  /** Configured hooks */
  hooks: Hook[];
  /** Custom commands */
  commands: Command[];
  /** MCP server configurations */
  mcpServers: McpServer[];
  /** Installed plugins */
  plugins: Plugin[];
  /** Permission configuration */
  permissions: PermissionSummary;
  /** Scan metadata */
  metadata: ScanMetadata;
}

// ============================================================================
// Parsing Options
// ============================================================================

export interface ScanOptions {
  /** Root directory to scan */
  rootPath: string;
  /** Include user-level configs (~/.claude/) */
  includeUserConfig?: boolean;
  /** Output format */
  format?: 'json' | 'markdown' | 'mermaid';
  /** Output directory for generated files */
  outputDir?: string;
  /** Verbose logging */
  verbose?: boolean;
  /** Validate only, don't generate output */
  validateOnly?: boolean;
  /** Diagram generation options */
  diagramOptions?: DiagramOptions;
}

export type ZoomLevel = 'summary' | 'category' | 'detail';

export interface DiagramOptions {
  /** Zoom level: summary (categories only), category (grouped), detail (full) */
  level?: ZoomLevel;
  /** Compact mode - names only, no descriptions */
  compact?: boolean;
  /** Filter by categories */
  categories?: string[];
  /** Filter by agent types */
  types?: string[];
  /** Filter by name pattern (glob-like) */
  pattern?: string;
  /** Maximum agents per category before collapsing */
  maxPerCategory?: number;
  /** Theme name (light, dark, high-contrast-light, high-contrast-dark, colorblind-light, colorblind-dark) */
  theme?: string;
  /** Path to custom theme JSON file */
  themePath?: string;
}

// ============================================================================
// Generator Types
// ============================================================================

export type DiagramType =
  | 'component-map'
  | 'hierarchy'
  | 'dataflow';

export interface GeneratorOptions {
  /** Output directory */
  outputDir: string;
  /** Diagram types to generate */
  diagrams?: DiagramType[];
  /** Include metadata in output */
  includeMetadata?: boolean;
  /** Custom title for documentation */
  title?: string;
  /** Diagram generation options (level, compact, filters) */
  diagramOptions?: DiagramOptions;
}

export interface GeneratedOutput {
  /** Path to generated file */
  path: string;
  /** Type of output */
  type: 'diagram' | 'documentation' | 'json';
  /** Content of the generated file */
  content: string;
}
