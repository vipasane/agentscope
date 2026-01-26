# @claude-flow/cli-framework

Zero-dependency CLI framework for building consistent command-line applications with TypeScript.

## Features

✨ **Zero Dependencies** - Uses only Node.js built-ins
⚡ **Fast Startup** - <300ms CLI startup time
🎨 **Rich Output** - Tables, JSON, YAML formatting with colors
🔄 **Interactive** - Prompts, spinners, progress bars
📝 **Type-Safe** - Full TypeScript support with strict mode
🧪 **Well-Tested** - >90% test coverage
🎯 **Easy to Use** - Intuitive API for rapid development

## Installation

```bash
npm install @claude-flow/cli-framework
```

## Quick Start

```typescript
import { CommandRegistry, c, setupGlobalErrorHandlers } from '@claude-flow/cli-framework';

// Setup error handlers
setupGlobalErrorHandlers();

// Create CLI
const cli = new CommandRegistry();

// Register a command
cli.register({
  name: 'greet',
  description: 'Greet a user',
  arguments: [
    {
      name: 'name',
      description: 'Name to greet',
      required: true,
    },
  ],
  options: [
    {
      name: 'loud',
      short: 'l',
      long: 'loud',
      type: 'boolean',
      description: 'Greet loudly',
    },
  ],
  action: async (args) => {
    const message = `Hello, ${args.name}!`;
    console.log(args.loud ? message.toUpperCase() : message);
  },
});

// Execute
cli.execute(process.argv.slice(2));
```

## Core Components

### CommandRegistry

Manage commands and subcommands:

```typescript
import { CommandRegistry } from '@claude-flow/cli-framework';

const cli = new CommandRegistry();

// Register command
cli.register({
  name: 'user',
  description: 'User management',
  subcommands: [
    {
      name: 'list',
      description: 'List users',
      action: async (args) => {
        // Implementation
      },
    },
    {
      name: 'create',
      description: 'Create user',
      action: async (args) => {
        // Implementation
      },
    },
  ],
});

// Execute
await cli.execute(['user', 'list']);
```

### ArgumentParser

Parse command-line arguments with validation:

```typescript
import { ArgumentParser } from '@claude-flow/cli-framework';

const parser = new ArgumentParser();

// Add options
parser.addOption({
  name: 'verbose',
  short: 'v',
  long: 'verbose',
  type: 'boolean',
  description: 'Enable verbose output',
});

parser.addOption({
  name: 'port',
  short: 'p',
  long: 'port',
  type: 'number',
  description: 'Port number',
  default: 3000,
  validate: (value) => {
    const port = value as number;
    return (port > 0 && port < 65536) || 'Port must be between 1 and 65535';
  },
});

// Parse arguments
const args = parser.parse(['--verbose', '--port', '8080']);
// { verbose: true, port: 8080, _: [] }
```

### OutputFormatter

Format output in multiple formats:

```typescript
import { OutputFormatter } from '@claude-flow/cli-framework';

const formatter = new OutputFormatter({ format: 'table' });

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

// Table output
console.log(formatter.table(users, [
  { header: 'ID', field: 'id', width: 5 },
  { header: 'Name', field: 'name', width: 15 },
  { header: 'Email', field: 'email', width: 25 },
]));

// JSON output
console.log(formatter.json(users, true));

// YAML output
console.log(formatter.yaml(users));

// Box
console.log(formatter.box('Important message', 'Notice'));

// Tree
console.log(formatter.tree([
  {
    label: 'src',
    children: [
      { label: 'index.ts' },
      { label: 'utils.ts' },
    ],
  },
]));
```

### InteractivePrompt

Interactive user input:

```typescript
import { InteractivePrompt } from '@claude-flow/cli-framework';

const prompt = new InteractivePrompt();

// Text input
const name = await prompt.ask({
  message: 'What is your name?',
  validate: (value) => value.length > 0 || 'Name is required',
});

// Confirmation
const confirmed = await prompt.confirm({
  message: 'Are you sure?',
  default: true,
});

// Selection
const choice = await prompt.select({
  message: 'Select an option',
  choices: [
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' },
  ],
});

// Number input
const age = await prompt.number('Enter your age', { min: 0, max: 150 });

// Email input
const email = await prompt.email('Enter your email');

// Password input (masked)
const password = await prompt.password('Enter password');
```

### Progress Indicators

Progress bars and spinners:

```typescript
import { ProgressBar, Spinner } from '@claude-flow/cli-framework';

// Progress bar
const progress = new ProgressBar({
  total: 100,
  label: 'Downloading',
  showPercentage: true,
  showEta: true,
});

for (let i = 0; i <= 100; i++) {
  progress.update(i);
  await sleep(50);
}
progress.complete();

// Spinner
const spinner = new Spinner({ text: 'Processing...' });
spinner.start();

await doWork();

spinner.success('Done!');
// or spinner.error('Failed!');
// or spinner.warning('Warning!');
```

### Colors

Terminal colors with automatic fallback:

```typescript
import { c } from '@claude-flow/cli-framework';

console.log(c.red('Error message'));
console.log(c.green('Success message'));
console.log(c.yellow('Warning message'));
console.log(c.blue('Info message'));
console.log(c.cyan('Highlight'));
console.log(c.dim('Subtle text'));
console.log(c.bold('Bold text'));

// Semantic helpers
console.log(c.error('Error'));
console.log(c.success('Success'));
console.log(c.warning('Warning'));
console.log(c.info('Info'));
```

### Validators

Built-in validation utilities:

```typescript
import {
  validateRequired,
  validateNumber,
  validateBoolean,
  validateChoice,
  validateRange,
  validateEmail,
  validateUrl,
} from '@claude-flow/cli-framework';

// Validate required
const name = validateRequired(value, 'name');

// Validate number
const port = validateNumber(value, 'port');

// Validate boolean
const enabled = validateBoolean(value, 'enabled');

// Validate choice
const format = validateChoice(value, ['json', 'yaml', 'table'], 'format');

// Validate range
const percentage = validateRange(value, 0, 100, 'percentage');

// Validate email
const email = validateEmail(value, 'email');

// Validate URL
const url = validateUrl(value, 'url');
```

### Error Handling

Graceful error handling:

```typescript
import { ErrorHandler, setupGlobalErrorHandlers } from '@claude-flow/cli-framework';

// Setup global handlers
setupGlobalErrorHandlers(verbose);

// Handle specific errors
const handler = new ErrorHandler({ verbose: true });

try {
  // ... code
} catch (error) {
  handler.handle(error, {
    command: 'mycommand',
    args: parsedArgs,
  });
}

// Wrap async functions
const safeFunction = ErrorHandler.wrap(async () => {
  // ... code
}, { command: 'mycommand' });
```

## Advanced Usage

### Nested Commands

```typescript
cli.register({
  name: 'git',
  description: 'Git operations',
  subcommands: [
    {
      name: 'commit',
      description: 'Commit changes',
      options: [
        {
          name: 'message',
          short: 'm',
          long: 'message',
          type: 'string',
          required: true,
          description: 'Commit message',
        },
      ],
      action: async (args) => {
        console.log(`Committing: ${args.message}`);
      },
    },
  ],
});
```

### Custom Validation

```typescript
parser.addOption({
  name: 'version',
  long: 'version',
  type: 'string',
  description: 'Semantic version',
  validate: (value) => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    return semverRegex.test(value as string) || 'Must be valid semver (e.g., 1.2.3)';
  },
});
```

### Tab Completion

```bash
# Generate bash completion script
const completion = cli.generateBashCompletion('mycli');
console.log(completion);

# Add to ~/.bashrc
eval "$(mycli completion bash)"
```

## Performance

- **Startup time**: <300ms
- **Zero dependencies**: No external packages
- **Memory efficient**: Minimal allocations
- **Type-safe**: Full TypeScript support

## Examples

See the [`examples/`](./examples) directory for complete examples:

- `basic-cli.ts` - Basic command registration and argument parsing
- `interactive-cli.ts` - Interactive prompts, spinners, and progress bars

## API Reference

### Types

```typescript
interface CommandConfig {
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

interface OptionConfig {
  name: string;
  description: string;
  short?: string;
  long: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: string | number | boolean;
  choices?: (string | number)[];
  validate?: (value: unknown) => boolean | string;
}

interface ArgumentConfig {
  name: string;
  description: string;
  required?: boolean;
  multiple?: boolean;
  default?: string | number;
  validate?: (value: unknown) => boolean | string;
}
```

## Testing

```bash
npm test
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Related Projects

- [@claude-flow/cli](https://github.com/ruvnet/claude-flow) - Main CLI tool
- [agentic-flow](https://github.com/ruvnet/agentic-flow) - Agent orchestration framework
