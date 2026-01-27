/**
 * @packageDocumentation
 * Plugin system type definitions
 *
 * @remarks
 * Provides type-safe interfaces for CLI plugin system:
 * - PluginManifest: Plugin metadata and configuration
 * - PluginContext: Execution context for plugins
 * - Permission types: Fine-grained security controls
 *
 * @example Plugin manifest
 * ```json
 * {
 *   "name": "my-plugin",
 *   "version": "1.0.0",
 *   "description": "Custom CLI commands",
 *   "author": "Your Name",
 *   "permissions": {
 *     "filesystem": {
 *       "read": ["/path/to/data"],
 *       "write": ["/path/to/output"]
 *     },
 *     "network": {
 *       "hosts": ["api.example.com"]
 *     }
 *   }
 * }
 * ```
 */

import type { CommandRegistry } from '../command/CommandRegistry';

/**
 * Plugin manifest metadata
 *
 * @remarks
 * Describes plugin capabilities, dependencies, and permissions.
 * Must be provided in package.json or exported from plugin module.
 */
export interface PluginManifest {
  /** Plugin name (unique identifier) */
  name: string;

  /** Plugin version (semver) */
  version: string;

  /** Short description */
  description: string;

  /** Plugin author */
  author?: string;

  /** Required CLI version (semver range) */
  cliVersion?: string;

  /** Plugin dependencies (other plugins) */
  dependencies?: Record<string, string>;

  /** Plugin homepage URL */
  homepage?: string;

  /** Plugin license (SPDX) */
  license?: string;

  /** Required permissions */
  permissions: PluginPermissions;

  /** Plugin entry point (default: index.js) */
  main?: string;

  /** Plugin keywords for discovery */
  keywords?: string[];

  /** Minimum Node.js version */
  engines?: {
    node?: string;
  };
}

/**
 * Plugin permission model
 *
 * @remarks
 * Fine-grained permissions for sandboxed execution.
 * Plugins must declare all required permissions.
 *
 * @security
 * Enforced by PluginSandbox at runtime.
 * Violations throw SecurityError.
 */
export interface PluginPermissions {
  /** File system permissions */
  filesystem?: {
    /** Readable paths (glob patterns) */
    read?: string[];
    /** Writable paths (glob patterns) */
    write?: string[];
    /** Executable paths (for scripts) */
    execute?: string[];
  };

  /** Network permissions */
  network?: {
    /** Allowed hosts/IPs */
    hosts?: string[];
    /** Allowed ports */
    ports?: number[];
  };

  /** Process permissions */
  process?: {
    /** Allow spawning child processes */
    spawn?: boolean;
    /** Allowed commands */
    commands?: string[];
  };

  /** CLI permissions */
  cli?: {
    /** Allow registering commands */
    registerCommands?: boolean;
    /** Allow modifying registry */
    modifyRegistry?: boolean;
  };

  /** Maximum execution time (ms) */
  maxExecutionTime?: number;

  /** Maximum memory usage (MB) */
  maxMemory?: number;
}

/**
 * Plugin execution context
 *
 * @remarks
 * Provided to plugins during registration and execution.
 * Contains sandboxed access to CLI functionality.
 */
export interface PluginContext {
  /** Command registry (limited API) */
  registry: CommandRegistry;

  /** Plugin manifest */
  manifest: PluginManifest;

  /** Plugin directory path */
  pluginDir: string;

  /** Configuration for this plugin */
  config: Record<string, any>;

  /** Sandboxed console (filtered output) */
  console: Console;

  /** Check if permission granted */
  hasPermission(permission: string): boolean;

  /** Request additional permission (interactive) */
  requestPermission(permission: string, reason: string): Promise<boolean>;
}

/**
 * Plugin module interface
 *
 * @remarks
 * All plugins must export a `register` function.
 * Optionally export `metadata` for manifest.
 */
export interface PluginModule {
  /**
   * Plugin registration function
   *
   * @param context - Plugin execution context
   *
   * @remarks
   * Called when plugin is loaded.
   * Should register commands via context.registry.
   *
   * @example
   * ```typescript
   * export async function register(context: PluginContext) {
   *   context.registry.register({
   *     name: 'my-command',
   *     description: 'Custom command',
   *     action: async () => {
   *       console.log('Plugin command executed!');
   *     }
   *   });
   * }
   * ```
   */
  register: (context: PluginContext) => void | Promise<void>;

  /**
   * Plugin metadata (optional)
   *
   * @remarks
   * If not provided, loaded from package.json
   */
  metadata?: PluginManifest;

  /**
   * Plugin activation hook (optional)
   *
   * @remarks
   * Called when plugin is enabled
   */
  activate?: (context: PluginContext) => void | Promise<void>;

  /**
   * Plugin deactivation hook (optional)
   *
   * @remarks
   * Called when plugin is disabled
   */
  deactivate?: (context: PluginContext) => void | Promise<void>;
}

/**
 * Plugin descriptor
 *
 * @remarks
 * Internal representation of discovered plugins.
 */
export interface PluginDescriptor {
  /** Plugin path (entry point) */
  path: string;

  /** Plugin directory */
  directory: string;

  /** Plugin manifest */
  manifest: PluginManifest;

  /** Enabled status */
  enabled: boolean;

  /** Loaded status */
  loaded: boolean;

  /** Load timestamp */
  loadedAt?: number;

  /** Load errors (if any) */
  errors?: string[];
}

/**
 * Plugin configuration
 *
 * @remarks
 * Global plugin system configuration.
 */
export interface PluginConfig {
  /** Directories to search for plugins */
  directories: string[];

  /** Enabled plugins (default: all) */
  enabled?: string[];

  /** Disabled plugins */
  disabled?: string[];

  /** Plugin-specific configuration */
  config?: Record<string, any>;

  /** Auto-load plugins on startup */
  autoLoad?: boolean;

  /** Strict mode (reject plugins with errors) */
  strict?: boolean;
}

/**
 * Resource limits for plugin execution
 * Based on ADR-025: 128MB memory, 5000ms timeout defaults
 */
export interface ResourceLimits {
  /** Maximum memory in MB (default: 128MB) */
  memoryMB: number;
  /** Execution timeout in ms (default: 5000ms) */
  timeoutMs: number;
  /** Maximum CPU time in ms (default: same as timeout) */
  cpuTimeMs: number;
  /** Maximum file handles */
  maxFileHandles: number;
}

/**
 * Sandbox configuration for isolated-vm
 * Target: <50ms sandbox creation, <10ms execution overhead
 */
export interface SandboxConfig {
  /** Memory limit in MB (default: 128) */
  memory: number;
  /** Execution timeout in ms (default: 5000) */
  timeout: number;
  /** Plugin permissions */
  permissions: PluginPermissions;
  /** Resource limits */
  resourceLimits: ResourceLimits;
  /** Enable telemetry collection */
  telemetry: boolean;
  /** Enable snapshot precompilation for faster startup */
  useSnapshot: boolean;
}

/**
 * Resource usage tracking for telemetry
 */
export interface ResourceUsage {
  /** Memory used in MB */
  memoryMB: number;
  /** CPU time used in ms */
  cpuTimeMs: number;
  /** Number of executions */
  executions: number;
  /** Network requests made */
  networkRequests: number;
  /** Files accessed */
  filesAccessed: number;
}

/**
 * Sandbox telemetry data
 * Essential for debugging and threat detection
 */
export interface SandboxTelemetry {
  /** Plugin ID */
  pluginId: string;
  /** Execution start time */
  startTime: number;
  /** Execution end time */
  endTime: number;
  /** Resource usage */
  resourceUsage: ResourceUsage;
  /** Errors encountered */
  errors: string[];
  /** Permission violations */
  permissionViolations: PermissionViolation[];
}

/**
 * Permission violation event for security logging
 */
export interface PermissionViolation {
  /** Violation timestamp */
  timestamp: number;
  /** Permission type violated */
  permissionType: 'filesystem' | 'network' | 'process' | 'cli';
  /** Operation attempted */
  operation: string;
  /** Resource attempted to access */
  resource: string;
  /** Violation details */
  details: string;
}

/**
 * Default sandbox configuration (secure-by-default)
 * Following ADR-025 Q16-Q30 decisions
 */
export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  memory: 128, // ADR-025 Q18: 128MB default
  timeout: 5000, // ADR-025 Q19: 5000ms default
  permissions: {
    filesystem: {
      read: [], // ADR-025 Q24: No access by default
      write: [],
      execute: [],
    },
    network: {
      hosts: [], // Blocked by default
      ports: [],
    },
    process: {
      spawn: false, // ADR-025 Q19: Block by default
      commands: [],
    },
    cli: {
      registerCommands: true, // ADR-025 Q23: Allow with validation
      modifyRegistry: false,
    },
    maxExecutionTime: 5000,
    maxMemory: 128,
  },
  resourceLimits: {
    memoryMB: 128,
    timeoutMs: 5000,
    cpuTimeMs: 5000,
    maxFileHandles: 20,
  },
  telemetry: true, // ADR-025 Q25: Always collect
  useSnapshot: true, // ADR-025 Q22: <50ms target
};

/**
 * Sandbox error types for clear error messaging (ADR-025 Q23)
 */
export class SandboxError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'SandboxError';
  }
}

export class PluginPermissionError extends SandboxError {
  constructor(message: string, public permissionType: string, details?: unknown) {
    super(message, 'PERMISSION_DENIED', details);
    this.name = 'PluginPermissionError';
  }
}

export class ResourceLimitError extends SandboxError {
  constructor(message: string, public limitType: string, details?: unknown) {
    super(message, 'RESOURCE_LIMIT_EXCEEDED', details);
    this.name = 'ResourceLimitError';
  }
}

export class PluginTimeoutError extends SandboxError {
  constructor(message: string, public timeoutMs: number) {
    super(message, 'TIMEOUT', { timeoutMs });
    this.name = 'PluginTimeoutError';
  }
}
