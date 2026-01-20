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
}

export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'
  | 'UserPromptSubmit';

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
}

export interface GeneratedOutput {
  /** Path to generated file */
  path: string;
  /** Type of output */
  type: 'diagram' | 'documentation' | 'json';
  /** Content of the generated file */
  content: string;
}
