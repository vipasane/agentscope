/**
 * Interactive prompts for user input
 */

import { stdin, stdout } from 'process';
import { createInterface } from 'readline';
import type { PromptOptions, ConfirmOptions, SelectOptions } from '../types.js';
import { c } from '../utils/colors.js';

export class InteractivePrompt {
  /**
   * Ask a question and get user input
   */
  async ask(options: PromptOptions): Promise<string> {
    const rl = createInterface({
      input: stdin,
      output: stdout,
    });

    return new Promise((resolve, reject) => {
      const defaultText = options.default ? c.dim(` (${options.default})`) : '';
      const question = `${options.message}${defaultText}: `;
      let maskedInput = '';

      // Handle mask for passwords
      if (options.mask) {
        stdin.setRawMode(true);
        stdin.resume();

        const onData = (char: Buffer) => {
          const ch = char.toString();

          if (ch === '\n' || ch === '\r' || ch === '\u0004') {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            stdout.write('\n');

            let value = maskedInput || options.default || '';

            if (options.transform) {
              value = options.transform(value);
            }

            if (options.validate) {
              const result = options.validate(value);
              if (result === false || typeof result === 'string') {
                const error = typeof result === 'string' ? result : 'Invalid input';
                reject(new Error(error));
                return;
              }
            }

            resolve(value);
            rl.close();
            return;
          }

          if (ch === '\x7f' || ch === '\b') {
            maskedInput = maskedInput.slice(0, -1);
          } else {
            maskedInput += ch;
          }

          stdout.clearLine(0);
          stdout.cursorTo(0);
          stdout.write(question + '*'.repeat(maskedInput.length));
        };

        stdout.write(question);
        stdin.on('data', onData);
      } else {
        rl.question(question, (answer) => {
          rl.close();

          let value = answer.trim() || options.default || '';

          // Transform
          if (options.transform) {
            value = options.transform(value);
          }

          // Validate
          if (options.validate) {
            const result = options.validate(value);
            if (result === false || typeof result === 'string') {
              const error = typeof result === 'string' ? result : 'Invalid input';
              reject(new Error(error));
              return;
            }
          }

          resolve(value);
        });
      }
    });
  }

  /**
   * Ask for confirmation (yes/no)
   */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const defaultText = options.default !== undefined
      ? c.dim(` (${options.default ? 'Y/n' : 'y/N'})`)
      : c.dim(' (y/n)');

    const answer = await this.ask({
      message: options.message + defaultText,
      default: options.default !== undefined ? (options.default ? 'y' : 'n') : undefined,
      validate: (value) => {
        const v = value.toLowerCase();
        return v === 'y' || v === 'n' || v === 'yes' || v === 'no' || 'Please answer y or n';
      },
    });

    const normalized = answer.toLowerCase();
    return normalized === 'y' || normalized === 'yes';
  }

  /**
   * Select from a list of choices
   */
  async select<T = string>(options: SelectOptions<T>): Promise<T> {
    console.log(c.bold(options.message));

    options.choices.forEach((choice, index) => {
      const isDefault = choice.value === options.default;
      const marker = isDefault ? c.cyan('›') : ' ';
      console.log(`  ${marker} ${index + 1}. ${choice.label}`);
    });

    const answer = await this.ask({
      message: 'Select',
      default: options.default !== undefined
        ? String(options.choices.findIndex((c) => c.value === options.default) + 1)
        : undefined,
      validate: (value) => {
        const num = parseInt(value, 10);
        return (num >= 1 && num <= options.choices.length) || 'Invalid selection';
      },
    });

    const index = parseInt(answer, 10) - 1;
    return options.choices[index].value;
  }

  /**
   * Multi-select from a list of choices
   */
  async multiSelect<T = string>(
    options: SelectOptions<T> & { min?: number; max?: number }
  ): Promise<T[]> {
    console.log(c.bold(options.message));
    console.log(c.dim('(Enter comma-separated numbers, e.g., 1,3,5)'));

    options.choices.forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice.label}`);
    });

    const answer = await this.ask({
      message: 'Select',
      validate: (value) => {
        const nums = value.split(',').map((n) => parseInt(n.trim(), 10));
        const valid = nums.every((n) => n >= 1 && n <= options.choices.length);
        if (!valid) {
          return 'Invalid selection';
        }
        if (options.min && nums.length < options.min) {
          return `Select at least ${options.min} items`;
        }
        if (options.max && nums.length > options.max) {
          return `Select at most ${options.max} items`;
        }
        return true;
      },
    });

    const indices = answer.split(',').map((n) => parseInt(n.trim(), 10) - 1);
    return indices.map((i) => options.choices[i].value);
  }

  /**
   * Password input (masked)
   */
  async password(message: string, validate?: (value: string) => boolean | string): Promise<string> {
    return this.ask({
      message,
      mask: true,
      validate,
    });
  }

  /**
   * Number input
   */
  async number(
    message: string,
    options?: { min?: number; max?: number; default?: number }
  ): Promise<number> {
    const answer = await this.ask({
      message,
      default: options?.default?.toString(),
      validate: (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) {
          return 'Please enter a valid number';
        }
        if (options?.min !== undefined && num < options.min) {
          return `Number must be at least ${options.min}`;
        }
        if (options?.max !== undefined && num > options.max) {
          return `Number must be at most ${options.max}`;
        }
        return true;
      },
    });

    return parseFloat(answer);
  }

  /**
   * Email input
   */
  async email(message: string): Promise<string> {
    return this.ask({
      message,
      validate: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) || 'Please enter a valid email address';
      },
    });
  }

  /**
   * URL input
   */
  async url(message: string): Promise<string> {
    return this.ask({
      message,
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    });
  }
}
