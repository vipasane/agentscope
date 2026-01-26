/**
 * Command registry for managing CLI commands and subcommands
 */

import type { CommandConfig, CommandContext } from '../types.js';
import { ArgumentParser } from '../parser/ArgumentParser.js';
import { c } from '../utils/colors.js';

export class CommandRegistry {
  private commands: Map<string, CommandConfig> = new Map();
  private aliases: Map<string, string> = new Map();

  /**
   * Register a command
   */
  register(config: CommandConfig): this {
    this.commands.set(config.name, config);

    // Register aliases
    if (config.aliases) {
      for (const alias of config.aliases) {
        this.aliases.set(alias, config.name);
      }
    }

    return this;
  }

  /**
   * Get a command by name or alias
   */
  get(name: string): CommandConfig | undefined {
    const commandName = this.aliases.get(name) || name;
    return this.commands.get(commandName);
  }

  /**
   * Get all registered commands
   */
  getAll(): CommandConfig[] {
    return Array.from(this.commands.values());
  }

  /**
   * Execute a command
   */
  async execute(args: string[]): Promise<void> {
    if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
      this.showHelp();
      return;
    }

    const commandName = args[0];
    const command = this.get(commandName);

    if (!command) {
      console.error(c.error(`Unknown command: ${commandName}`));
      console.error(`Run 'help' for available commands`);
      process.exit(1);
    }

    // Check for subcommand
    const remainingArgs = args.slice(1);
    if (remainingArgs.length > 0 && command.subcommands) {
      const subcommandName = remainingArgs[0];
      const subcommand = command.subcommands.find(
        (sc) => sc.name === subcommandName || sc.aliases?.includes(subcommandName)
      );

      if (subcommand) {
        await this.executeCommand(
          subcommand,
          remainingArgs.slice(1),
          {
            command: commandName,
            subcommand: subcommandName,
            rawArgs: args,
            env: process.env,
          }
        );
        return;
      }
    }

    // Execute main command
    await this.executeCommand(
      command,
      remainingArgs,
      {
        command: commandName,
        rawArgs: args,
        env: process.env,
      }
    );
  }

  /**
   * Execute a specific command with parsed arguments
   */
  private async executeCommand(
    command: CommandConfig,
    args: string[],
    context: CommandContext
  ): Promise<void> {
    // Check for help flag
    if (args.includes('--help') || args.includes('-h')) {
      this.showCommandHelp(command, context);
      return;
    }

    // Parse arguments
    const parser = new ArgumentParser();

    // Add options
    if (command.options) {
      for (const option of command.options) {
        parser.addOption(option);
      }
    }

    // Add positional arguments
    if (command.arguments) {
      for (const arg of command.arguments) {
        parser.addArgument(arg);
      }
    }

    try {
      const parsedArgs = parser.parse(args);

      // Execute action
      if (command.action) {
        await command.action(parsedArgs, context);
      } else {
        // If no action, show help
        this.showCommandHelp(command, context);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(c.error(`Error: ${error.message}`));
        console.error(`\nRun '${context.command} --help' for usage information`);
      }
      process.exit(1);
    }
  }

  /**
   * Show general help
   */
  private showHelp(): void {
    const commands = this.getAll().filter((cmd) => !cmd.hidden);

    console.log(c.bold('\nAvailable Commands:\n'));

    const maxLength = Math.max(...commands.map((cmd) => cmd.name.length));

    for (const command of commands.sort((a, b) => a.name.localeCompare(b.name))) {
      const aliases = command.aliases ? c.dim(`(${command.aliases.join(', ')})`) : '';
      console.log(
        `  ${c.cyan(command.name.padEnd(maxLength + 2))} ${command.description} ${aliases}`
      );

      // Show subcommands if any
      if (command.subcommands && command.subcommands.length > 0) {
        for (const sub of command.subcommands.filter((s) => !s.hidden)) {
          console.log(
            `    ${c.dim('└─')} ${c.cyan(sub.name.padEnd(maxLength))} ${c.dim(sub.description)}`
          );
        }
      }
    }

    console.log(c.dim('\nRun \'<command> --help\' for more information on a command.\n'));
  }

  /**
   * Show help for a specific command
   */
  private showCommandHelp(command: CommandConfig, context: CommandContext): void {
    const fullCommand = context.subcommand
      ? `${context.command} ${context.subcommand}`
      : context.command;

    console.log(c.bold(`\n${command.name}`));
    console.log(command.description);

    // Usage
    console.log(c.bold('\nUsage:'));
    let usage = `  ${fullCommand}`;

    if (command.options && command.options.length > 0) {
      usage += ' [options]';
    }

    if (command.arguments && command.arguments.length > 0) {
      for (const arg of command.arguments) {
        if (arg.required) {
          usage += ` <${arg.name}>`;
        } else {
          usage += ` [${arg.name}]`;
        }
        if (arg.multiple) {
          usage += '...';
        }
      }
    }

    if (command.subcommands && command.subcommands.length > 0) {
      usage += ' <subcommand>';
    }

    console.log(usage);

    // Arguments
    if (command.arguments && command.arguments.length > 0) {
      console.log(c.bold('\nArguments:'));
      for (const arg of command.arguments) {
        const name = arg.multiple ? `<${arg.name}...>` : `<${arg.name}>`;
        const required = arg.required ? c.yellow('(required)') : c.dim('(optional)');
        const defaultValue = arg.default !== undefined ? c.dim(`(default: ${arg.default})`) : '';
        console.log(
          `  ${c.cyan(name.padEnd(20))} ${arg.description} ${required} ${defaultValue}`.trim()
        );
      }
    }

    // Options
    if (command.options && command.options.length > 0) {
      console.log(c.bold('\nOptions:'));
      for (const option of command.options) {
        const parts: string[] = [];

        if (option.short) {
          parts.push(c.cyan(`-${option.short}`));
        }

        parts.push(c.cyan(`--${option.long}`));

        if (option.type !== 'boolean') {
          parts.push(`<${option.type}>`);
        }

        const flags = parts.join(', ');
        const required = option.required ? c.yellow('(required)') : '';
        const defaultValue = option.default !== undefined ? c.dim(`(default: ${option.default})`) : '';
        const choices = option.choices ? c.dim(`(choices: ${option.choices.join(', ')})`) : '';

        console.log(
          `  ${flags.padEnd(30)} ${option.description} ${required} ${defaultValue} ${choices}`.trim()
        );
      }
    }

    // Subcommands
    if (command.subcommands && command.subcommands.length > 0) {
      console.log(c.bold('\nSubcommands:'));
      const maxLength = Math.max(...command.subcommands.map((sc) => sc.name.length));
      for (const subcommand of command.subcommands.filter((sc) => !sc.hidden)) {
        const aliases = subcommand.aliases ? c.dim(`(${subcommand.aliases.join(', ')})`) : '';
        console.log(
          `  ${c.cyan(subcommand.name.padEnd(maxLength + 2))} ${subcommand.description} ${aliases}`
        );
      }
    }

    // Examples
    if (command.examples && command.examples.length > 0) {
      console.log(c.bold('\nExamples:'));
      for (const example of command.examples) {
        console.log(`  ${c.dim('$')} ${example}`);
      }
    }

    console.log();
  }

  /**
   * Generate completion script for bash
   */
  generateBashCompletion(programName: string): string {
    const commands = this.getAll().map((cmd) => cmd.name).join(' ');

    return `
_${programName}_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="${commands}"

  if [[ \${COMP_CWORD} -eq 1 ]] ; then
    COMPREPLY=( $(compgen -W "\${commands}" -- \${cur}) )
    return 0
  fi
}

complete -F _${programName}_completions ${programName}
`.trim();
  }
}
