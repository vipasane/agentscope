/**
 * Argument parser for CLI commands
 * Zero dependencies, fast parsing with validation
 */

import type { OptionConfig, ArgumentConfig, ParsedArgs } from '../types.js';
import { ValidationError } from '../utils/validators.js';

export class ArgumentParser {
  private options: Map<string, OptionConfig> = new Map();
  private shortToLong: Map<string, string> = new Map();
  private positionalArgs: ArgumentConfig[] = [];

  /**
   * Register an option
   */
  addOption(option: OptionConfig): this {
    this.options.set(option.long, option);
    if (option.short) {
      this.shortToLong.set(option.short, option.long);
    }
    return this;
  }

  /**
   * Register a positional argument
   */
  addArgument(arg: ArgumentConfig): this {
    this.positionalArgs.push(arg);
    return this;
  }

  /**
   * Parse command-line arguments
   */
  parse(args: string[]): ParsedArgs {
    const result: ParsedArgs = { _: [] };
    let i = 0;
    let positionalIndex = 0;

    while (i < args.length) {
      const arg = args[i];

      // Handle long option (--option or --option=value)
      if (arg.startsWith('--')) {
        const [key, ...valueParts] = arg.slice(2).split('=');
        const value = valueParts.join('=');
        const option = this.options.get(key);

        if (!option) {
          throw new ValidationError(`Unknown option: --${key}`, key);
        }

        if (option.type === 'boolean') {
          result[option.name] = value ? this.parseBoolean(value) : true;
        } else if (value) {
          result[option.name] = this.parseValue(value, option);
        } else {
          i++;
          if (i >= args.length) {
            throw new ValidationError(
              `Option --${key} requires a value`,
              key
            );
          }
          result[option.name] = this.parseValue(args[i], option);
        }
      }
      // Handle short option (-o or -o value)
      else if (arg.startsWith('-') && arg !== '-') {
        const short = arg.slice(1);
        const long = this.shortToLong.get(short);

        if (!long) {
          // Could be multiple boolean flags like -abc
          if (short.length > 1) {
            for (const char of short) {
              const charLong = this.shortToLong.get(char);
              if (!charLong) {
                throw new ValidationError(`Unknown option: -${char}`, char);
              }
              const option = this.options.get(charLong)!;
              if (option.type !== 'boolean') {
                throw new ValidationError(
                  `Option -${char} requires a value`,
                  char
                );
              }
              result[option.name] = true;
            }
            i++;
            continue;
          }
          throw new ValidationError(`Unknown option: -${short}`, short);
        }

        const option = this.options.get(long)!;

        if (option.type === 'boolean') {
          result[option.name] = true;
        } else {
          i++;
          if (i >= args.length) {
            throw new ValidationError(
              `Option -${short} requires a value`,
              short
            );
          }
          result[option.name] = this.parseValue(args[i], option);
        }
      }
      // Handle positional argument
      else {
        const argConfig = this.positionalArgs[positionalIndex];
        if (argConfig) {
          if (argConfig.multiple) {
            const values = result[argConfig.name] as unknown[] || [];
            values.push(this.parsePositional(arg, argConfig));
            result[argConfig.name] = values;
          } else {
            result[argConfig.name] = this.parsePositional(arg, argConfig);
            positionalIndex++;
          }
        } else {
          result._.push(arg);
        }
      }

      i++;
    }

    // Apply defaults and validate
    this.applyDefaults(result);
    this.validate(result);

    return result;
  }

  /**
   * Parse a value based on option type
   */
  private parseValue(value: string, option: OptionConfig): unknown {
    if (option.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        throw new ValidationError(
          `Option --${option.long} must be a number`,
          option.name,
          value
        );
      }
      return num;
    }

    if (option.type === 'boolean') {
      return this.parseBoolean(value);
    }

    // Validate choices
    if (option.choices && !option.choices.includes(value)) {
      throw new ValidationError(
        `Option --${option.long} must be one of: ${option.choices.join(', ')}`,
        option.name,
        value
      );
    }

    return value;
  }

  /**
   * Parse a boolean value
   */
  private parseBoolean(value: string): boolean {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
    throw new ValidationError(`Invalid boolean value: ${value}`, 'boolean', value);
  }

  /**
   * Parse a positional argument
   */
  private parsePositional(value: string, arg: ArgumentConfig): unknown {
    if (arg.validate) {
      const result = arg.validate(value);
      if (result === false) {
        throw new ValidationError(
          `Invalid value for ${arg.name}`,
          arg.name,
          value
        );
      }
      if (typeof result === 'string') {
        throw new ValidationError(result, arg.name, value);
      }
    }
    return value;
  }

  /**
   * Apply default values
   */
  private applyDefaults(result: ParsedArgs): void {
    for (const [_, option] of this.options) {
      if (result[option.name] === undefined && option.default !== undefined) {
        result[option.name] = option.default;
      }
    }

    for (const arg of this.positionalArgs) {
      if (result[arg.name] === undefined && arg.default !== undefined) {
        result[arg.name] = arg.default;
      }
    }
  }

  /**
   * Validate parsed arguments
   */
  private validate(result: ParsedArgs): void {
    // Validate required options
    for (const [_, option] of this.options) {
      if (option.required && result[option.name] === undefined) {
        throw new ValidationError(
          `Required option --${option.long} is missing`,
          option.name
        );
      }

      // Run custom validation
      if (option.validate && result[option.name] !== undefined) {
        const validationResult = option.validate(result[option.name]);
        if (validationResult === false) {
          throw new ValidationError(
            `Invalid value for --${option.long}`,
            option.name,
            result[option.name]
          );
        }
        if (typeof validationResult === 'string') {
          throw new ValidationError(
            validationResult,
            option.name,
            result[option.name]
          );
        }
      }
    }

    // Validate required positional arguments
    for (const arg of this.positionalArgs) {
      if (arg.required && result[arg.name] === undefined) {
        throw new ValidationError(
          `Required argument <${arg.name}> is missing`,
          arg.name
        );
      }
    }
  }

  /**
   * Generate help text for options
   */
  getOptionsHelp(): string {
    const lines: string[] = [];

    for (const [_, option] of this.options) {
      const parts: string[] = [];

      if (option.short) {
        parts.push(`-${option.short},`);
      }

      parts.push(`--${option.long}`);

      if (option.type !== 'boolean') {
        parts.push(`<${option.type}>`);
      }

      const flags = parts.join(' ');
      const description = option.description;
      const required = option.required ? '(required)' : '';
      const defaultValue = option.default !== undefined ? `(default: ${option.default})` : '';
      const choices = option.choices ? `(choices: ${option.choices.join(', ')})` : '';

      lines.push(
        `  ${flags.padEnd(30)} ${description} ${required} ${defaultValue} ${choices}`.trim()
      );
    }

    return lines.join('\n');
  }

  /**
   * Generate help text for arguments
   */
  getArgumentsHelp(): string {
    const lines: string[] = [];

    for (const arg of this.positionalArgs) {
      const name = arg.multiple ? `<${arg.name}...>` : `<${arg.name}>`;
      const required = arg.required ? '(required)' : '(optional)';
      const defaultValue = arg.default !== undefined ? `(default: ${arg.default})` : '';

      lines.push(
        `  ${name.padEnd(20)} ${arg.description} ${required} ${defaultValue}`.trim()
      );
    }

    return lines.join('\n');
  }
}
