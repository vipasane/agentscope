/**
 * @claude-flow/cli-framework
 *
 * Zero-dependency CLI framework for building consistent, production-ready command-line applications
 *
 * ## Features
 *
 * - **Zero Dependencies** - No external runtime dependencies
 * - **Command Registry** - Structured command and subcommand management
 * - **Argument Parsing** - Type-safe parsing with validation
 * - **Interactive Prompts** - User input with confirmation, selection, masking
 * - **Progress Indicators** - Progress bars and spinners with ETA
 * - **Output Formatting** - Text, JSON, YAML, and table formats
 * - **Color Support** - ANSI colors with auto-detection
 * - **Validation Utilities** - Built-in validators for common patterns
 * - **Exit Codes** - Standard exit code conventions (0 = success, 1 = error, 2 = usage error)
 *
 * ## Installation
 *
 * ```bash
 * npm install @claude-flow/cli-framework
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { CommandRegistry, ArgumentParser, c } from '@claude-flow/cli-framework';
 *
 * const registry = new CommandRegistry();
 *
 * registry.register({
 *   name: 'greet',
 *   description: 'Greet a user',
 *   arguments: [
 *     { name: 'name', description: 'User name', required: true }
 *   ],
 *   options: [
 *     { name: 'loud', long: 'loud', short: 'l', type: 'boolean', description: 'Use uppercase' }
 *   ],
 *   action: async (args) => {
 *     const greeting = `Hello, ${args.name}!`;
 *     console.log(args.loud ? greeting.toUpperCase() : greeting);
 *   },
 *   examples: [
 *     'greet Alice',
 *     'greet Bob --loud'
 *   ]
 * });
 *
 * await registry.execute(process.argv.slice(2));
 * ```
 *
 * ## Terminal Usage Examples
 *
 * ```bash
 * $ mycli greet Alice
 * Hello, Alice!
 *
 * $ mycli greet Bob --loud
 * HELLO, BOB!
 *
 * $ mycli --help
 * Available Commands:
 *   greet  Greet a user
 *
 * $ mycli greet --help
 * Usage: greet [options] <name>
 * ```
 *
 * ## Architecture
 *
 * - **CommandRegistry** - Central command registration and execution
 * - **ArgumentParser** - Zero-dependency argument parsing
 * - **OutputFormatter** - Multi-format output (text, JSON, YAML, table)
 * - **InteractivePrompt** - User input prompts (confirm, select, password)
 * - **ProgressBar/Spinner** - Visual progress indicators
 * - **Color Utilities** - Terminal color management
 * - **Validators** - Input validation helpers
 *
 * ## Exit Codes
 *
 * - **0** - Success
 * - **1** - General error (validation, runtime error)
 * - **2** - Usage error (invalid arguments, unknown command)
 *
 * @example
 * ```typescript
 * // Complete CLI application
 * import { CommandRegistry, c } from '@claude-flow/cli-framework';
 *
 * const cli = new CommandRegistry();
 *
 * cli.register({
 *   name: 'deploy',
 *   description: 'Deploy application',
 *   options: [
 *     { name: 'env', long: 'env', type: 'string', required: true, choices: ['dev', 'prod'] }
 *   ],
 *   action: async (args) => {
 *     console.log(c.success(`Deploying to ${args.env}...`));
 *     // Deployment logic
 *   }
 * });
 *
 * cli.execute(process.argv.slice(2)).catch((error) => {
 *   console.error(c.error(`Error: ${error.message}`));
 *   process.exit(1);
 * });
 * ```
 *
 * @see {@link CommandRegistry} for command management
 * @see {@link ArgumentParser} for argument parsing
 * @see {@link OutputFormatter} for output formatting
 * @see {@link InteractivePrompt} for user prompts
 *
 * @packageDocumentation
 */

// Command management
export { CommandRegistry } from './command/CommandRegistry.js';
export { ErrorHandler, setupGlobalErrorHandlers } from './command/ErrorHandler.js';

// Argument parsing
export { ArgumentParser } from './parser/ArgumentParser.js';

// Output formatting
export { OutputFormatter } from './output/OutputFormatter.js';

// Interactive components
export { ProgressBar, Spinner, MultiProgress } from './interactive/ProgressIndicator.js';
export { InteractivePrompt } from './interactive/InteractivePrompt.js';

// Security
export { CommandSecurityMiddleware } from './security/SecurityMiddleware.js';
export { SecurityError } from './security/types.js';
export { DEFAULT_SECURITY_CONFIG } from './security/SecurityConfig.js';

// Utilities
export { c, color, stripColors, displayWidth } from './utils/colors.js';
export {
  ValidationError,
  validateRequired,
  validateNumber,
  validateBoolean,
  validateChoice,
  validateRange,
  validatePattern,
  validateEmail,
  validateUrl,
  validateFileExists,
  createValidator,
} from './utils/validators.js';

// Types
export type {
  CommandConfig,
  OptionConfig,
  ArgumentConfig,
  CommandAction,
  ParsedArgs,
  CommandContext,
  ValidationError as ValidationErrorType,
  OutputOptions,
  TableColumn,
  ProgressOptions,
  SpinnerOptions,
  PromptOptions,
  ConfirmOptions,
  SelectOptions,
  ErrorContext,
  ColorMap,
} from './types.js';

export type { SecurityConfig } from './security/SecurityConfig.js';
export type {
  SecurityMiddleware,
  ValidationResult,
  ValidationError as SecurityValidationError,
  ValidationWarning,
  ThreatDetection,
} from './security/types.js';
