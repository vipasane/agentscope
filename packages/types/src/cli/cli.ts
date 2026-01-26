/**
 * @claude-flow/types - CLI Types
 *
 * Defines command-line interface architecture including:
 * - Command definitions and routing
 * - Command options and parameters
 * - Output formatting
 * - CLI configuration
 *
 * @module types/cli/cli
 */

/**
 * Output format for CLI commands
 *
 * @example
 * - `text`: Human-readable text
 * - `json`: Machine-readable JSON
 * - `table`: Formatted table
 * - `yaml`: YAML format
 * - `csv`: CSV format
 */
export type OutputFormat = 'text' | 'json' | 'table' | 'yaml' | 'csv';

/**
 * Log level for command output
 */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * Command parameter definition
 *
 * Describes a parameter that a command accepts.
 *
 * @example
 * ```typescript
 * {
 *   name: 'file',
 *   description: 'File to process',
 *   type: 'string',
 *   required: true,
 *   position: 0
 * }
 * ```
 */
export interface CommandParameter {
  /** Parameter name */
  readonly name: string;

  /** Parameter description */
  readonly description: string;

  /** Parameter type */
  readonly type: 'string' | 'number' | 'boolean' | 'array';

  /** Whether parameter is required */
  readonly required?: boolean;

  /** Default value */
  readonly default?: unknown;

  /** Positional index (for positional parameters) */
  readonly position?: number;

  /** Allowed values */
  readonly choices?: readonly string[];

  /** Aliases for this parameter */
  readonly aliases?: readonly string[];

  /** Value constraints */
  readonly validate?: (value: unknown) => boolean;
}

/**
 * Command option definition
 *
 * Describes an option/flag that a command accepts.
 *
 * @example
 * ```typescript
 * {
 *   name: 'verbose',
 *   description: 'Enable verbose output',
 *   type: 'boolean',
 *   short: 'v'
 * }
 * ```
 */
export interface CommandOption {
  /** Option name */
  readonly name: string;

  /** Option description */
  readonly description: string;

  /** Option type */
  readonly type: 'string' | 'number' | 'boolean' | 'array';

  /** Short flag (e.g., 'v' for -v) */
  readonly short?: string;

  /** Default value */
  readonly default?: unknown;

  /** Whether option is required */
  readonly required?: boolean;

  /** Allowed values */
  readonly choices?: readonly string[];

  /** Value constraints */
  readonly validate?: (value: unknown) => boolean;
}

/**
 * Parsed command-line arguments
 *
 * Result of parsing CLI input.
 */
export interface ParsedArgs {
  /** Command name */
  readonly command?: string;

  /** Subcommand name */
  readonly subcommand?: string;

  /** Positional parameters */
  readonly parameters: Record<string, unknown>;

  /** Named options */
  readonly options: Record<string, unknown>;

  /** Unparsed remainder */
  readonly remainder?: string[];
}

/**
 * Command context during execution
 *
 * Information available to command handlers.
 */
export interface CommandContext {
  /** Command being executed */
  readonly command: string;

  /** Subcommand if applicable */
  readonly subcommand?: string;

  /** Parsed arguments */
  readonly args: ParsedArgs;

  /** Output format */
  readonly format: OutputFormat;

  /** Log level */
  readonly logLevel: LogLevel;

  /** Whether to show help */
  readonly showHelp: boolean;

  /** Process environment */
  readonly env: Record<string, string>;

  /** Current working directory */
  readonly cwd: string;

  /** Stdout/stderr for output */
  readonly stdio: {
    stdout: NodeJS.WritableStream;
    stderr: NodeJS.WritableStream;
  };
}

/**
 * Command execution result
 *
 * @template T The command's return data type
 */
export interface CommandResult<T = unknown> {
  /** Execution status */
  readonly status: 'success' | 'error';

  /** Return data */
  readonly data?: T;

  /** Error message if failed */
  readonly error?: string;

  /** Error code if failed */
  readonly code?: number;

  /** Execution time in ms */
  readonly durationMs: number;
}

/**
 * Command definition
 *
 * Describes a CLI command that can be executed.
 *
 * @example
 * ```typescript
 * {
 *   name: 'agent',
 *   description: 'Manage agents',
 *   action: async (ctx) => { ... },
 *   subcommands: [
 *     { name: 'spawn', description: 'Spawn agent', action: ... }
 *   ]
 * }
 * ```
 */
export interface Command {
  /** Command name */
  readonly name: string;

  /** Command description */
  readonly description: string;

  /** Long description/usage */
  readonly usage?: string;

  /** Examples */
  readonly examples?: readonly CommandExample[];

  /** Positional parameters */
  readonly parameters?: readonly CommandParameter[];

  /** Named options */
  readonly options?: readonly CommandOption[];

  /** Subcommands */
  readonly subcommands?: readonly Command[];

  /** Command handler function */
  readonly action: (context: CommandContext) => Promise<CommandResult>;

  /** Whether command is hidden from help */
  readonly hidden?: boolean;

  /** Aliases for this command */
  readonly aliases?: readonly string[];
}

/**
 * Command example for documentation
 */
export interface CommandExample {
  /** Example description */
  readonly description: string;

  /** Example command */
  readonly command: string;
}

/**
 * CLI configuration
 *
 * Global configuration for CLI behavior.
 */
export interface CLIConfig {
  /** Application name */
  readonly appName: string;

  /** Application version */
  readonly version: string;

  /** Default output format */
  readonly defaultFormat: OutputFormat;

  /** Default log level */
  readonly defaultLogLevel: LogLevel;

  /** Enable color output */
  readonly colorOutput: boolean;

  /** Enable interactive prompts */
  readonly interactive: boolean;

  /** Config file path */
  readonly configFile?: string;

  /** Home directory */
  readonly homeDir: string;

  /** Data directory */
  readonly dataDir: string;

  /** Cache directory */
  readonly cacheDir: string;
}

/**
 * CLI output message
 *
 * Structured message for formatted output.
 */
export interface CLIOutput {
  /** Message type */
  readonly type: 'info' | 'success' | 'warning' | 'error';

  /** Message text */
  readonly message: string;

  /** Additional data for JSON output */
  readonly data?: unknown;

  /** Timestamp */
  readonly timestamp: Date;
}

/**
 * CLI progress indicator
 *
 * Shows progress of long-running operations.
 */
export interface ProgressIndicator {
  /** Start progress tracking */
  start(total?: number): void;

  /** Update progress */
  update(current: number, message?: string): void;

  /** Increment progress */
  increment(amount?: number, message?: string): void;

  /** Complete progress */
  complete(message?: string): void;

  /** Stop progress without completing */
  stop(): void;

  /** Get current progress percent */
  percent(): number;
}

/**
 * Interactive prompt options
 *
 * For interactive CLI mode.
 */
export interface PromptOptions {
  /** Prompt type */
  readonly type: 'text' | 'select' | 'multiselect' | 'confirm' | 'password';

  /** Prompt message */
  readonly message: string;

  /** Default value */
  readonly default?: unknown;

  /** Choices for select prompts */
  readonly choices?: readonly string[];

  /** Validation function */
  readonly validate?: (value: unknown) => boolean | string;
}

/**
 * Hook trigger point for CLI operations
 *
 * Integration points where hooks can be triggered.
 */
export type CLIHookTrigger =
  | 'pre-command'
  | 'post-command'
  | 'on-error'
  | 'on-complete'
  | 'pre-output'
  | 'post-output';

/**
 * CLI hook handler
 *
 * Function called at trigger point.
 */
export interface CLIHookHandler {
  /** Hook trigger */
  readonly trigger: CLIHookTrigger;

  /** Handler function */
  readonly handler: (context: CommandContext) => Promise<void>;

  /** Priority (lower = earlier) */
  readonly priority?: number;
}

/**
 * Table output configuration
 *
 * For formatted table output.
 */
export interface TableConfig {
  /** Column definitions */
  readonly columns: TableColumn[];

  /** Rows to display */
  readonly rows: Record<string, unknown>[];

  /** Show headers */
  readonly showHeaders?: boolean;

  /** Show borders */
  readonly showBorders?: boolean;

  /** Maximum column width */
  readonly maxColumnWidth?: number;
}

/**
 * Table column definition
 */
export interface TableColumn {
  /** Column header */
  readonly header: string;

  /** Data field key */
  readonly field: string;

  /** Column width */
  readonly width?: number;

  /** Value formatter */
  readonly format?: (value: unknown) => string;

  /** Alignment */
  readonly align?: 'left' | 'center' | 'right';
}
