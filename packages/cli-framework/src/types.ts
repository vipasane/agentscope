/**
 * Core type definitions for CLI framework
 */

export interface CommandConfig {
  name: string;
  description: string;
  aliases?: string[];
  options?: OptionConfig[];
  arguments?: ArgumentConfig[];
  action?: CommandAction;
  subcommands?: CommandConfig[];
  examples?: string[];
  hidden?: boolean;
}

export interface OptionConfig {
  name: string;
  description: string;
  short?: string;
  long: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: string | number | boolean;
  choices?: (string | number)[];
  multiple?: boolean;
  validate?: (value: unknown) => boolean | string;
}

export interface ArgumentConfig {
  name: string;
  description: string;
  required?: boolean;
  multiple?: boolean;
  default?: string | number;
  validate?: (value: unknown) => boolean | string;
}

export type CommandAction = (args: ParsedArgs, context: CommandContext) => Promise<void> | void;

export interface ParsedArgs {
  _: string[];
  [key: string]: unknown;
}

export interface CommandContext {
  command: string;
  subcommand?: string;
  rawArgs: string[];
  env: Record<string, string | undefined>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface OutputOptions {
  format?: 'text' | 'json' | 'yaml' | 'table';
  color?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

export interface TableColumn {
  header: string;
  field: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown) => string;
}

export interface ProgressOptions {
  total: number;
  current?: number;
  label?: string;
  barLength?: number;
  showPercentage?: boolean;
  showEta?: boolean;
}

export interface SpinnerOptions {
  text?: string;
  frames?: string[];
  interval?: number;
}

export interface PromptOptions {
  message: string;
  default?: string;
  validate?: (value: string) => boolean | string;
  transform?: (value: string) => string;
  mask?: boolean;
}

export interface ConfirmOptions {
  message: string;
  default?: boolean;
}

export interface SelectOptions<T = string> {
  message: string;
  choices: Array<{ label: string; value: T }>;
  default?: T;
}

export interface ErrorContext {
  command?: string;
  args?: ParsedArgs;
  stack?: string;
  exitCode?: number;
}

export interface ColorMap {
  reset: string;
  bold: string;
  dim: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  gray: string;
}
