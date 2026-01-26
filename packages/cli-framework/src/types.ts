/**
 * Core type definitions for CLI framework
 *
 * Provides TypeScript interfaces and types for building type-safe CLI applications.
 * All types follow consistent patterns for commands, options, arguments, and output formatting.
 *
 * @module types
 */

/**
 * Command configuration defining a CLI command's structure and behavior
 *
 * Represents a complete command definition including metadata, arguments, options,
 * subcommands, and execution logic. Commands can be nested to create hierarchical
 * CLI structures.
 *
 * @example
 * ```typescript
 * const deployCommand: CommandConfig = {
 *   name: 'deploy',
 *   description: 'Deploy application to environment',
 *   aliases: ['d'],
 *   arguments: [
 *     { name: 'target', description: 'Deployment target', required: true }
 *   ],
 *   options: [
 *     { name: 'force', long: 'force', short: 'f', type: 'boolean', description: 'Force deployment' }
 *   ],
 *   action: async (args, context) => {
 *     console.log(`Deploying to ${args.target}...`);
 *   },
 *   examples: [
 *     'deploy production',
 *     'deploy staging --force'
 *   ]
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Command with subcommands
 * const dbCommand: CommandConfig = {
 *   name: 'db',
 *   description: 'Database operations',
 *   subcommands: [
 *     {
 *       name: 'migrate',
 *       description: 'Run migrations',
 *       action: async () => { /* ... */ }
 *     },
 *     {
 *       name: 'seed',
 *       description: 'Seed database',
 *       action: async () => { /* ... */ }
 *     }
 *   ]
 * };
 * ```
 *
 * @see {@link OptionConfig} for option definitions
 * @see {@link ArgumentConfig} for argument definitions
 * @see {@link CommandAction} for action handler type
 *
 * @public
 */
export interface CommandConfig {
  /** Command name (lowercase, use hyphens for multi-word commands) */
  name: string;

  /** Brief command description shown in help text */
  description: string;

  /** Alternative command names (e.g., ['ls'] for 'list') */
  aliases?: string[];

  /** Command-line options (flags) */
  options?: OptionConfig[];

  /** Positional arguments */
  arguments?: ArgumentConfig[];

  /** Action handler executed when command is called */
  action?: CommandAction;

  /** Subcommands nested under this command */
  subcommands?: CommandConfig[];

  /** Usage examples shown in --help output (without $ prefix) */
  examples?: string[];

  /** Hide command from help output (useful for internal/deprecated commands) */
  hidden?: boolean;
}

/**
 * Option configuration for command-line flags
 *
 * Defines a command-line option (flag) with type validation, default values,
 * and choice constraints. Options can be boolean flags or accept values.
 *
 * @example
 * ```typescript
 * // Boolean flag
 * const verboseOption: OptionConfig = {
 *   name: 'verbose',
 *   description: 'Enable verbose output',
 *   short: 'v',
 *   long: 'verbose',
 *   type: 'boolean'
 * };
 * // Usage: $ mycli --verbose  or  $ mycli -v
 * ```
 *
 * @example
 * ```typescript
 * // String option with choices
 * const envOption: OptionConfig = {
 *   name: 'environment',
 *   description: 'Deployment environment',
 *   short: 'e',
 *   long: 'env',
 *   type: 'string',
 *   required: true,
 *   choices: ['dev', 'staging', 'prod']
 * };
 * // Usage: $ mycli --env=prod  or  $ mycli -e prod
 * ```
 *
 * @example
 * ```typescript
 * // Number option with validation
 * const portOption: OptionConfig = {
 *   name: 'port',
 *   description: 'Server port',
 *   long: 'port',
 *   type: 'number',
 *   default: 3000,
 *   validate: (value) => {
 *     const port = value as number;
 *     return (port >= 1024 && port <= 65535) || 'Port must be between 1024 and 65535';
 *   }
 * };
 * // Usage: $ mycli --port=8080
 * ```
 *
 * @see {@link CommandConfig} for complete command definition
 * @see {@link ArgumentConfig} for positional arguments
 *
 * @public
 */
export interface OptionConfig {
  /** Internal name used in parsed args object */
  name: string;

  /** Description shown in help text */
  description: string;

  /** Short flag format (single character, e.g., 'v' for -v) */
  short?: string;

  /** Long flag format (e.g., 'verbose' for --verbose) */
  long: string;

  /** Value type: string for text, number for numeric, boolean for flags */
  type: 'string' | 'number' | 'boolean';

  /** Whether option must be provided */
  required?: boolean;

  /** Default value when option is not provided */
  default?: string | number | boolean;

  /** Allowed values (validates against this list) */
  choices?: (string | number)[];

  /** Allow multiple values (e.g., --tag=a --tag=b results in ['a', 'b']) */
  multiple?: boolean;

  /** Custom validation function returning true, false, or error message */
  validate?: (value: unknown) => boolean | string;
}

/**
 * Positional argument configuration
 *
 * Defines a positional command-line argument (non-flag parameter).
 * Arguments are matched by position: first positional arg goes to first ArgumentConfig, etc.
 *
 * @example
 * ```typescript
 * // Required positional argument
 * const fileArg: ArgumentConfig = {
 *   name: 'file',
 *   description: 'File to process',
 *   required: true
 * };
 * // Usage: $ mycli process myfile.txt
 * ```
 *
 * @example
 * ```typescript
 * // Optional argument with default
 * const outputArg: ArgumentConfig = {
 *   name: 'output',
 *   description: 'Output file',
 *   required: false,
 *   default: 'output.txt'
 * };
 * // Usage: $ mycli process input.txt        (output defaults to output.txt)
 * //        $ mycli process input.txt result.txt
 * ```
 *
 * @example
 * ```typescript
 * // Variadic argument (multiple values)
 * const filesArg: ArgumentConfig = {
 *   name: 'files',
 *   description: 'Files to process',
 *   required: true,
 *   multiple: true,
 *   validate: (value) => {
 *     return typeof value === 'string' && value.endsWith('.txt') || 'Must be .txt file';
 *   }
 * };
 * // Usage: $ mycli process file1.txt file2.txt file3.txt
 * ```
 *
 * @see {@link CommandConfig} for complete command definition
 * @see {@link OptionConfig} for flag-based options
 *
 * @public
 */
export interface ArgumentConfig {
  /** Argument name shown in help text and used in parsed args */
  name: string;

  /** Description shown in help text */
  description: string;

  /** Whether argument must be provided */
  required?: boolean;

  /** Accept multiple values (consumes all remaining arguments) */
  multiple?: boolean;

  /** Default value when argument is not provided */
  default?: string | number;

  /** Custom validation function returning true, false, or error message */
  validate?: (value: unknown) => boolean | string;
}

/**
 * Command action handler type
 *
 * Function executed when a command is invoked. Receives parsed arguments
 * and execution context. Can be synchronous or asynchronous.
 *
 * **Exit Codes:**
 * - Return normally or resolve promise for success (exit 0)
 * - Throw error for failure (exit 1)
 * - Process.exit(code) for custom exit codes
 *
 * @param args - Parsed command-line arguments
 * @param context - Execution context with command info and environment
 *
 * @example
 * ```typescript
 * // Synchronous action
 * const syncAction: CommandAction = (args) => {
 *   console.log(`Processing ${args.file}...`);
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Asynchronous action with error handling
 * const asyncAction: CommandAction = async (args, context) => {
 *   try {
 *     await deployToEnvironment(args.env as string);
 *     console.log('Deployment successful');
 *   } catch (error) {
 *     console.error(`Deployment failed: ${error.message}`);
 *     process.exit(1); // Exit with error code
 *   }
 * };
 * ```
 *
 * @see {@link ParsedArgs} for argument structure
 * @see {@link CommandContext} for context structure
 *
 * @public
 */
export type CommandAction = (args: ParsedArgs, context: CommandContext) => Promise<void> | void;

/**
 * Parsed command-line arguments
 *
 * Object containing parsed argument values. Named options/arguments are accessed
 * by their configured names. Unparsed arguments are collected in the `_` array.
 *
 * @example
 * ```typescript
 * // After parsing: mycli deploy production --force --replicas=3
 * const args: ParsedArgs = {
 *   _: [],                   // No unparsed args
 *   target: 'production',    // Positional argument
 *   force: true,             // Boolean flag
 *   replicas: 3              // Number option
 * };
 * ```
 *
 * @example
 * ```typescript
 * // After parsing: mycli process file1.txt file2.txt -- --extra-arg
 * const args: ParsedArgs = {
 *   _: ['--extra-arg'],      // Args after -- separator
 *   files: ['file1.txt', 'file2.txt']  // Multiple values
 * };
 * ```
 *
 * @public
 */
export interface ParsedArgs {
  /** Unparsed arguments (collected after all defined args/options) */
  _: string[];

  /** Dynamic properties for parsed options and arguments */
  [key: string]: unknown;
}

/**
 * Command execution context
 *
 * Provides contextual information about the command execution environment,
 * including the command chain, raw arguments, and environment variables.
 *
 * @example
 * ```typescript
 * // For command: mycli db migrate --env=production
 * const context: CommandContext = {
 *   command: 'db',
 *   subcommand: 'migrate',
 *   rawArgs: ['db', 'migrate', '--env=production'],
 *   env: process.env
 * };
 * ```
 *
 * @public
 */
export interface CommandContext {
  /** Top-level command name */
  command: string;

  /** Subcommand name (if applicable) */
  subcommand?: string;

  /** Original command-line arguments (unparsed) */
  rawArgs: string[];

  /** Environment variables */
  env: Record<string, string | undefined>;
}

/**
 * Validation error details
 *
 * Describes a validation failure with field name, error message, and
 * the invalid value that caused the error.
 *
 * @example
 * ```typescript
 * const validationError: ValidationError = {
 *   field: 'port',
 *   message: 'Port must be between 1024 and 65535',
 *   value: 80
 * };
 * ```
 *
 * @see {@link OptionConfig.validate} for custom validation
 * @see {@link ArgumentConfig.validate} for argument validation
 *
 * @public
 */
export interface ValidationError {
  /** Name of the field that failed validation */
  field: string;

  /** Human-readable error message */
  message: string;

  /** The invalid value (optional) */
  value?: unknown;
}

/**
 * Output formatting options
 *
 * Controls how command output is formatted and displayed. Supports multiple
 * output formats, color control, and verbosity levels.
 *
 * @example
 * ```typescript
 * // JSON output for scripting
 * const jsonOpts: OutputOptions = {
 *   format: 'json',
 *   color: false
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Table output for human consumption
 * const tableOpts: OutputOptions = {
 *   format: 'table',
 *   color: true,
 *   verbose: true
 * };
 * ```
 *
 * @see {@link OutputFormatter} for formatting implementation
 *
 * @public
 */
export interface OutputOptions {
  /** Output format (default: 'text') */
  format?: 'text' | 'json' | 'yaml' | 'table';

  /** Enable ANSI colors (default: auto-detected from terminal) */
  color?: boolean;

  /** Include detailed output */
  verbose?: boolean;

  /** Suppress non-essential output */
  quiet?: boolean;
}

/**
 * Table column configuration
 *
 * Defines how a column should be rendered in table output, including
 * header text, data field, width, alignment, and custom formatting.
 *
 * @example
 * ```typescript
 * const columns: TableColumn[] = [
 *   { header: 'Name', field: 'name', width: 20, align: 'left' },
 *   { header: 'Age', field: 'age', width: 5, align: 'right' },
 *   {
 *     header: 'Status',
 *     field: 'active',
 *     align: 'center',
 *     format: (value) => value ? '✓' : '✗'
 *   }
 * ];
 * ```
 *
 * @see {@link OutputFormatter.table} for table rendering
 *
 * @public
 */
export interface TableColumn {
  /** Column header text */
  header: string;

  /** Object property to display in this column */
  field: string;

  /** Fixed column width (default: auto-calculated) */
  width?: number;

  /** Text alignment (default: 'left') */
  align?: 'left' | 'right' | 'center';

  /** Custom formatter function for cell values */
  format?: (value: unknown) => string;
}

/**
 * Progress bar options
 *
 * Configuration for rendering a progress bar with optional label,
 * percentage display, and ETA calculation.
 *
 * @example
 * ```typescript
 * const progress: ProgressOptions = {
 *   total: 100,
 *   label: 'Processing files',
 *   showPercentage: true,
 *   showEta: true
 * };
 * ```
 *
 * @see {@link ProgressBar} for progress bar implementation
 *
 * @public
 */
export interface ProgressOptions {
  /** Total number of steps */
  total: number;

  /** Current progress (default: 0) */
  current?: number;

  /** Descriptive label */
  label?: string;

  /** Bar width in characters (default: 40) */
  barLength?: number;

  /** Display percentage (default: true) */
  showPercentage?: boolean;

  /** Display estimated time remaining (default: true) */
  showEta?: boolean;
}

/**
 * Spinner animation options
 *
 * Configuration for animated spinner with customizable frames and interval.
 *
 * @example
 * ```typescript
 * const spinner: SpinnerOptions = {
 *   text: 'Loading...',
 *   frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧'],
 *   interval: 80
 * };
 * ```
 *
 * @see {@link Spinner} for spinner implementation
 *
 * @public
 */
export interface SpinnerOptions {
  /** Text displayed next to spinner */
  text?: string;

  /** Animation frames (default: braille spinner) */
  frames?: string[];

  /** Frame transition interval in ms (default: 80) */
  interval?: number;
}

/**
 * Interactive prompt options
 *
 * Configuration for prompting user input with validation, transformation,
 * and optional masking (for passwords).
 *
 * @example
 * ```typescript
 * const prompt: PromptOptions = {
 *   message: 'Enter your name',
 *   default: 'Anonymous',
 *   validate: (value) => value.length > 0 || 'Name required',
 *   transform: (value) => value.trim()
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Password prompt
 * const passwordPrompt: PromptOptions = {
 *   message: 'Enter password',
 *   mask: true,
 *   validate: (value) => value.length >= 8 || 'Password must be at least 8 characters'
 * };
 * ```
 *
 * @see {@link InteractivePrompt.ask} for prompting implementation
 *
 * @public
 */
export interface PromptOptions {
  /** Prompt message */
  message: string;

  /** Default value if user presses enter */
  default?: string;

  /** Validation function returning true, false, or error message */
  validate?: (value: string) => boolean | string;

  /** Transform input before validation */
  transform?: (value: string) => string;

  /** Mask input with asterisks (for passwords) */
  mask?: boolean;
}

/**
 * Confirmation prompt options
 *
 * Configuration for yes/no confirmation prompts.
 *
 * @example
 * ```typescript
 * const confirm: ConfirmOptions = {
 *   message: 'Delete all files?',
 *   default: false  // Default to No for destructive actions
 * };
 * ```
 *
 * @see {@link InteractivePrompt.confirm} for confirmation implementation
 *
 * @public
 */
export interface ConfirmOptions {
  /** Prompt message */
  message: string;

  /** Default value (true = Yes, false = No) */
  default?: boolean;
}

/**
 * Selection prompt options
 *
 * Configuration for choosing from a list of options. Supports generic
 * value types for type-safe selections.
 *
 * @example
 * ```typescript
 * const select: SelectOptions<string> = {
 *   message: 'Choose deployment target',
 *   choices: [
 *     { label: 'Development', value: 'dev' },
 *     { label: 'Staging', value: 'staging' },
 *     { label: 'Production', value: 'prod' }
 *   ],
 *   default: 'staging'
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Type-safe enum selection
 * enum LogLevel { DEBUG, INFO, WARN, ERROR }
 *
 * const selectLogLevel: SelectOptions<LogLevel> = {
 *   message: 'Select log level',
 *   choices: [
 *     { label: 'Debug', value: LogLevel.DEBUG },
 *     { label: 'Info', value: LogLevel.INFO },
 *     { label: 'Warning', value: LogLevel.WARN },
 *     { label: 'Error', value: LogLevel.ERROR }
 *   ],
 *   default: LogLevel.INFO
 * };
 * ```
 *
 * @typeParam T - Value type for selections (default: string)
 *
 * @see {@link InteractivePrompt.select} for selection implementation
 *
 * @public
 */
export interface SelectOptions<T = string> {
  /** Prompt message */
  message: string;

  /** Available choices with labels and values */
  choices: Array<{ label: string; value: T }>;

  /** Default selection value */
  default?: T;
}

/**
 * Error context information
 *
 * Contextual information captured when an error occurs during
 * command execution, useful for debugging and error reporting.
 *
 * @example
 * ```typescript
 * const errorContext: ErrorContext = {
 *   command: 'deploy',
 *   args: { env: 'production', force: true },
 *   stack: error.stack,
 *   exitCode: 1
 * };
 * ```
 *
 * @see {@link ErrorHandler} for error handling implementation
 *
 * @public
 */
export interface ErrorContext {
  /** Command being executed when error occurred */
  command?: string;

  /** Parsed arguments at time of error */
  args?: ParsedArgs;

  /** Error stack trace */
  stack?: string;

  /** Exit code for process (default: 1) */
  exitCode?: number;
}

/**
 * ANSI color code mapping
 *
 * Provides ANSI escape sequences for terminal colors and formatting.
 * Used internally by color utilities.
 *
 * @example
 * ```typescript
 * const colors: ColorMap = {
 *   reset: '\x1b[0m',
 *   bold: '\x1b[1m',
 *   red: '\x1b[31m',
 *   green: '\x1b[32m',
 *   // ... more colors
 * };
 * ```
 *
 * @see {@link c} for color helper functions
 *
 * @public
 */
export interface ColorMap {
  /** Reset all formatting */
  reset: string;

  /** Bold text */
  bold: string;

  /** Dim/faint text */
  dim: string;

  /** Red text */
  red: string;

  /** Green text */
  green: string;

  /** Yellow text */
  yellow: string;

  /** Blue text */
  blue: string;

  /** Magenta text */
  magenta: string;

  /** Cyan text */
  cyan: string;

  /** White text */
  white: string;

  /** Gray text */
  gray: string;
}
