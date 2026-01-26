/**
 * @claude-flow/cli-framework
 * Zero-dependency CLI framework for consistent command patterns
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
