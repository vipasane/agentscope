/**
 * Claude Code Settings Schema Reference
 * Based on: https://json.schemastore.org/claude-code-settings.json
 * Documentation: https://code.claude.com/docs/en/settings
 *
 * Schema Version: 2026.01
 * Last Updated: 2026-01-22
 */

// ============================================================================
// Schema Version
// ============================================================================

export const SCHEMA_VERSION = '2026.01';
export const SCHEMA_SOURCE = 'https://json.schemastore.org/claude-code-settings.json';
export const DOCS_URL = 'https://code.claude.com/docs/en/settings';

// ============================================================================
// Hook Events (from official schema)
// ============================================================================

export type HookEvent =
  | 'PreToolUse'      // Before tool execution
  | 'PostToolUse'     // After tool completion
  | 'Notification'    // On notification events
  | 'UserPromptSubmit' // When user submits prompt
  | 'Stop'            // Agent completion
  | 'SubagentStop'    // Sub-agent completion
  | 'PreCompact'      // Before context compaction
  | 'SessionStart'    // Session begins
  | 'SessionEnd';     // Session ends

export interface HookDefinition {
  /** Hook type */
  type: 'command' | 'prompt';
  /** Shell command to execute */
  command?: string;
  /** LLM prompt (use $ARGUMENTS placeholder) */
  prompt?: string;
  /** Timeout in seconds */
  timeout?: number;
  /** Pattern for tool name filtering */
  matcher?: string;
  /** Continue if hook fails */
  continueOnError?: boolean;
}

export interface HookConfig {
  /** Pattern matcher for the hook */
  matcher?: string;
  /** Array of hook definitions */
  hooks: HookDefinition[];
}

// ============================================================================
// Permission Configuration (from official schema)
// ============================================================================

export interface PermissionConfig {
  /** Permitted operations - format: ToolName(pattern) */
  allow?: string[];
  /** Blocked operations */
  deny?: string[];
  /** Always prompt for confirmation */
  ask?: string[];
  /** Default permission mode */
  defaultMode?: 'acceptEdits' | 'bypassPermissions' | 'default' | 'plan';
  /** Disable bypass permissions mode */
  disableBypassPermissionsMode?: 'disable';
  /** Additional directories to scope */
  additionalDirectories?: string[];
}

// Permission rule examples:
// - Bash(npm run lint)     - Exact match
// - Bash(npm run:*)        - Prefix matching
// - Bash(git * main)       - Glob matching
// - Read(./.env)           - File path
// - Read(./secrets/**)     - Glob file path
// - WebFetch(domain:example.com) - Domain restriction
// - mcp__server__tool      - MCP tool

// ============================================================================
// MCP Server Configuration (expanded from official schema)
// ============================================================================

export interface McpServerConfig {
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
  /** Server type */
  type?: 'stdio' | 'sse' | 'websocket' | 'custom';
  /** Tools provided by this server */
  tools?: string[];
}

export interface McpSettings {
  /** Auto-approve all project MCP servers */
  enableAllProjectMcpServers?: boolean;
  /** Approved servers from .mcp.json */
  enabledMcpjsonServers?: string[];
  /** Rejected servers from .mcp.json */
  disabledMcpjsonServers?: string[];
  /** Enterprise allowlist (undefined = all permitted) */
  allowedMcpServers?: Array<{ serverName: string }>;
  /** Enterprise denylist (takes precedence) */
  deniedMcpServers?: Array<{ serverName: string }>;
}

// ============================================================================
// Plugin Configuration (from official schema)
// ============================================================================

export type MarketplaceSource =
  | { source: 'github'; repo: string }
  | { source: 'git'; url: string }
  | { source: 'url'; url: string }
  | { source: 'npm'; package: string }
  | { source: 'file'; path: string }
  | { source: 'directory'; path: string };

export interface MarketplaceConfig {
  /** Marketplace identifier */
  id: string;
  /** Source configuration */
  source: MarketplaceSource;
}

export interface PluginConfig {
  /** Plugin identifier (format: plugin-id@marketplace-id) */
  id: string;
  /** Whether plugin is enabled */
  enabled: boolean;
  /** Plugin-specific configuration */
  config?: Record<string, unknown>;
}

export interface PluginSettings {
  /** Enabled plugins mapping: plugin-id@marketplace-id -> boolean/config */
  enabledPlugins?: Record<string, boolean | unknown>;
  /** Additional marketplace sources */
  extraKnownMarketplaces?: Record<string, { source: MarketplaceSource }>;
  /** Strict marketplace allowlist */
  strictKnownMarketplaces?: MarketplaceSource[];
  /** User-declined marketplaces */
  skippedMarketplaces?: string[];
  /** User-declined plugins */
  skippedPlugins?: string[];
  /** Per-plugin configuration */
  pluginConfigs?: Record<string, unknown>;
}

// ============================================================================
// Sandbox Configuration (from official schema)
// ============================================================================

export interface SandboxNetworkConfig {
  /** Permitted Unix socket paths */
  allowUnixSockets?: string[];
  /** Enable localhost binding */
  allowLocalBinding?: boolean;
  /** HTTP proxy port */
  httpProxyPort?: number;
  /** SOCKS proxy port */
  socksProxyPort?: number;
}

export interface SandboxConfig {
  /** Enable sandboxing */
  enabled?: boolean;
  /** Skip prompts for sandboxed commands */
  autoAllowBashIfSandboxed?: boolean;
  /** Commands never sandboxed */
  excludedCommands?: string[];
  /** Allow dangerouslyDisableSandbox bypass */
  allowUnsandboxedCommands?: boolean;
  /** Reduced strength for Docker environments */
  enableWeakerNestedSandbox?: boolean;
  /** Network configuration */
  network?: SandboxNetworkConfig;
  /** Command patterns to filesystem paths to ignore */
  ignoreViolations?: Record<string, string[]>;
}

// ============================================================================
// Environment & Core Settings (from official schema)
// ============================================================================

export interface CoreSettings {
  /** Override default model */
  model?: string;
  /** Preferred response language */
  language?: string;
  /** Output style adjustment */
  outputStyle?: string;
  /** Restrict login type */
  forceLoginMethod?: 'claudeai' | 'console';
  /** Auto-select organization */
  forceLoginOrgUUID?: string;
  /** Environment variables for sessions */
  env?: Record<string, string>;
  /** Script path for authentication values */
  apiKeyHelper?: string;
  /** Script for AWS credential export */
  awsCredentialExport?: string;
  /** Script for AWS auth refresh */
  awsAuthRefresh?: string;
  /** Chat transcript retention days */
  cleanupPeriodDays?: number;
  /** Claude attribution in commits */
  includeCoAuthoredBy?: boolean;
  /** Extended thinking toggle */
  alwaysThinkingEnabled?: boolean;
  /** Show tips in spinner */
  spinnerTipsEnabled?: boolean;
  /** Plans storage directory */
  plansDirectory?: string;
  /** Show turn duration */
  showTurnDuration?: boolean;
  /** Terminal progress bar */
  terminalProgressBarEnabled?: boolean;
  /** Auto-updates channel */
  autoUpdatesChannel?: 'stable' | 'beta' | 'nightly';
}

// ============================================================================
// Attribution Settings
// ============================================================================

export interface AttributionConfig {
  /** Commit message attribution */
  commit?: string;
  /** PR description attribution */
  pr?: string;
}

// ============================================================================
// Status Line Configuration
// ============================================================================

export interface StatusLineConfig {
  /** Status line type */
  type: 'command';
  /** Command to generate status */
  command: string;
  /** Refresh interval in ms */
  refreshMs?: number;
  /** Enable/disable status line */
  enabled?: boolean;
}

// ============================================================================
// Complete Settings Schema
// ============================================================================

export interface ClaudeCodeSettings {
  /** JSON Schema reference */
  $schema?: string;

  // Core settings
  model?: string;
  language?: string;
  outputStyle?: string;
  forceLoginMethod?: 'claudeai' | 'console';
  forceLoginOrgUUID?: string;
  env?: Record<string, string>;

  // Authentication helpers
  apiKeyHelper?: string;
  awsCredentialExport?: string;
  awsAuthRefresh?: string;
  otelHeadersHelper?: string;

  // Hooks configuration
  hooks?: Record<HookEvent, HookConfig[]>;
  disableAllHooks?: boolean;
  allowManagedHooksOnly?: boolean;

  // Permissions
  permissions?: PermissionConfig;

  // MCP Servers
  enableAllProjectMcpServers?: boolean;
  enabledMcpjsonServers?: string[];
  disabledMcpjsonServers?: string[];
  allowedMcpServers?: Array<{ serverName: string }>;
  deniedMcpServers?: Array<{ serverName: string }>;

  // Plugins
  enabledPlugins?: Record<string, boolean | unknown>;
  extraKnownMarketplaces?: Record<string, { source: MarketplaceSource }>;
  strictKnownMarketplaces?: MarketplaceSource[];
  skippedMarketplaces?: string[];
  skippedPlugins?: string[];
  pluginConfigs?: Record<string, unknown>;

  // Sandbox
  sandbox?: SandboxConfig;

  // Status line
  statusLine?: StatusLineConfig;

  // Attribution
  attribution?: AttributionConfig;

  // Miscellaneous
  cleanupPeriodDays?: number;
  includeCoAuthoredBy?: boolean;
  alwaysThinkingEnabled?: boolean;
  spinnerTipsEnabled?: boolean;
  plansDirectory?: string;
  showTurnDuration?: boolean;
  terminalProgressBarEnabled?: boolean;
  autoUpdatesChannel?: 'stable' | 'beta' | 'nightly';
  respectGitignore?: boolean;
  companyAnnouncements?: string[];
}

// ============================================================================
// Entity Summary (for Quick Stats)
// ============================================================================

/**
 * All scannable entities from Claude Code configuration
 */
export const SCANNABLE_ENTITIES = [
  'agents',       // From CLAUDE.md - agent definitions
  'skills',       // From CLAUDE.md - skill definitions
  'hooks',        // From settings.json - hook configurations
  'commands',     // From CLAUDE.md - slash commands
  'mcpServers',   // From settings.json / .mcp.json
  'plugins',      // From settings.json - enabled plugins
  'permissions',  // From settings.json - permission rules
] as const;

export type ScannableEntity = typeof SCANNABLE_ENTITIES[number];

/**
 * Entity icons for documentation
 */
export const ENTITY_ICONS: Record<ScannableEntity, string> = {
  agents: '🤖',
  skills: '⚡',
  hooks: '🪝',
  commands: '⌘',
  mcpServers: '🔌',
  plugins: '🧩',
  permissions: '🔐',
};

/**
 * Entity descriptions
 */
export const ENTITY_DESCRIPTIONS: Record<ScannableEntity, string> = {
  agents: 'AI agents defined in CLAUDE.md',
  skills: 'Custom skills invokable with /skill-name',
  hooks: 'Lifecycle hooks (PreToolUse, PostToolUse, etc.)',
  commands: 'Slash commands like /commit, /review',
  mcpServers: 'Model Context Protocol servers',
  plugins: 'Installed plugins from marketplaces',
  permissions: 'Tool and file access rules',
};
