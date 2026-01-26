# CLI Framework Guide

Complete guide to building CLI applications with @claude-flow/cli-framework.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Command Structure](#command-structure)
4. [Argument Parsing](#argument-parsing)
5. [Output Formatting](#output-formatting)
6. [Interactive Prompts](#interactive-prompts)
7. [Progress Indicators](#progress-indicators)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)
10. [Performance Tips](#performance-tips)

## Getting Started

### Installation

```bash
npm install @claude-flow/cli-framework
```

### Basic CLI

```typescript
#!/usr/bin/env node
import { CommandRegistry, setupGlobalErrorHandlers } from '@claude-flow/cli-framework';

setupGlobalErrorHandlers();
const cli = new CommandRegistry();

cli.register({
  name: 'hello',
  description: 'Say hello',
  action: async () => {
    console.log('Hello, World!');
  },
});

cli.execute(process.argv.slice(2));
```

Make it executable:
```bash
chmod +x cli.ts
./cli.ts hello
```

## Core Concepts

### Zero Dependencies

The framework uses only Node.js built-ins:
- `fs/promises` for file operations
- `readline` for interactive input
- `process` for terminal control
- No external packages required

### Type Safety

Full TypeScript support with strict mode:
```typescript
import type { CommandConfig, ParsedArgs } from '@claude-flow/cli-framework';

const config: CommandConfig = {
  name: 'build',
  description: 'Build project',
  action: async (args: ParsedArgs) => {
    // args are fully typed
  },
};
```

### Performance

- **Fast startup**: <300ms initialization
- **Lazy loading**: Components loaded on demand
- **Minimal allocations**: Efficient memory usage
- **Stream-based**: Progress without blocking

## Command Structure

### Simple Command

```typescript
cli.register({
  name: 'build',
  description: 'Build the project',
  action: async (args) => {
    console.log('Building...');
  },
});
```

### Command with Options

```typescript
cli.register({
  name: 'build',
  description: 'Build the project',
  options: [
    {
      name: 'watch',
      short: 'w',
      long: 'watch',
      type: 'boolean',
      description: 'Watch for changes',
    },
    {
      name: 'output',
      short: 'o',
      long: 'output',
      type: 'string',
      description: 'Output directory',
      default: 'dist',
    },
  ],
  action: async (args) => {
    const watch = args.watch as boolean;
    const output = args.output as string;
    console.log(`Building to ${output}${watch ? ' (watch mode)' : ''}`);
  },
});
```

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
        const message = args.message as string;
        console.log(`Committing: ${message}`);
      },
    },
    {
      name: 'push',
      description: 'Push to remote',
      action: async (args) => {
        console.log('Pushing...');
      },
    },
  ],
});
```

Usage:
```bash
mycli git commit -m "Fix bug"
mycli git push
```

### Command Aliases

```typescript
cli.register({
  name: 'list',
  aliases: ['ls', 'l'],
  description: 'List items',
  action: async () => {
    console.log('Listing...');
  },
});
```

All work the same:
```bash
mycli list
mycli ls
mycli l
```

## Argument Parsing

### Positional Arguments

```typescript
cli.register({
  name: 'copy',
  description: 'Copy file',
  arguments: [
    {
      name: 'source',
      description: 'Source file',
      required: true,
    },
    {
      name: 'dest',
      description: 'Destination file',
      required: true,
    },
  ],
  action: async (args) => {
    const source = args.source as string;
    const dest = args.dest as string;
    console.log(`Copying ${source} to ${dest}`);
  },
});
```

Usage:
```bash
mycli copy file1.txt file2.txt
```

### Multiple Arguments

```typescript
cli.register({
  name: 'concat',
  description: 'Concatenate files',
  arguments: [
    {
      name: 'files',
      description: 'Files to concatenate',
      multiple: true,
      required: true,
    },
  ],
  action: async (args) => {
    const files = args.files as string[];
    console.log(`Concatenating: ${files.join(', ')}`);
  },
});
```

Usage:
```bash
mycli concat a.txt b.txt c.txt
```

### Validation

```typescript
cli.register({
  name: 'serve',
  description: 'Start server',
  options: [
    {
      name: 'port',
      short: 'p',
      long: 'port',
      type: 'number',
      description: 'Port number',
      validate: (value) => {
        const port = value as number;
        if (port < 1 || port > 65535) {
          return 'Port must be between 1 and 65535';
        }
        return true;
      },
    },
  ],
  action: async (args) => {
    const port = args.port as number;
    console.log(`Starting server on port ${port}`);
  },
});
```

### Choices

```typescript
cli.register({
  name: 'export',
  description: 'Export data',
  options: [
    {
      name: 'format',
      short: 'f',
      long: 'format',
      type: 'string',
      description: 'Export format',
      choices: ['json', 'yaml', 'csv'],
      default: 'json',
    },
  ],
  action: async (args) => {
    const format = args.format as string;
    console.log(`Exporting as ${format}`);
  },
});
```

## Output Formatting

### Tables

```typescript
import { OutputFormatter, c } from '@claude-flow/cli-framework';

const formatter = new OutputFormatter();

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
  { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
];

console.log(formatter.table(users, [
  { header: 'ID', field: 'id', width: 5, align: 'right' },
  { header: 'Name', field: 'name', width: 15 },
  { header: 'Email', field: 'email', width: 25 },
  {
    header: 'Status',
    field: 'active',
    width: 10,
    format: (value) => value ? c.green('Active') : c.dim('Inactive'),
  },
]));
```

### JSON/YAML

```typescript
// JSON (pretty)
console.log(formatter.json(data));

// JSON (compact)
console.log(formatter.json(data, false));

// YAML
console.log(formatter.yaml(data));
```

### Boxes

```typescript
console.log(formatter.box('Important message', 'Notice'));
```

Output:
```
┌─ Notice ──────────────┐
│ Important message     │
└───────────────────────┘
```

### Lists

```typescript
console.log(formatter.list([
  'Item 1',
  'Item 2',
  'Item 3',
]));
```

### Trees

```typescript
console.log(formatter.tree([
  {
    label: 'src',
    children: [
      { label: 'index.ts' },
      { label: 'cli.ts' },
    ],
  },
  {
    label: 'tests',
    children: [
      { label: 'cli.test.ts' },
    ],
  },
]));
```

## Interactive Prompts

### Text Input

```typescript
import { InteractivePrompt } from '@claude-flow/cli-framework';

const prompt = new InteractivePrompt();

const name = await prompt.ask({
  message: 'What is your name?',
  default: 'Anonymous',
  validate: (value) => value.length > 0 || 'Name is required',
});
```

### Confirmation

```typescript
const confirmed = await prompt.confirm({
  message: 'Delete all files?',
  default: false,
});

if (confirmed) {
  console.log('Deleting...');
}
```

### Selection

```typescript
const choice = await prompt.select({
  message: 'Choose an option',
  choices: [
    { label: 'Development', value: 'dev' },
    { label: 'Production', value: 'prod' },
    { label: 'Testing', value: 'test' },
  ],
  default: 'dev',
});
```

### Multi-Select

```typescript
const selected = await prompt.multiSelect({
  message: 'Select features',
  choices: [
    { label: 'TypeScript', value: 'ts' },
    { label: 'ESLint', value: 'eslint' },
    { label: 'Prettier', value: 'prettier' },
  ],
  min: 1,
  max: 3,
});
```

### Password

```typescript
const password = await prompt.password('Enter password', (value) => {
  return value.length >= 8 || 'Password must be at least 8 characters';
});
```

### Specialized Inputs

```typescript
// Email
const email = await prompt.email('Your email');

// Number
const port = await prompt.number('Port number', { min: 1, max: 65535 });

// URL
const url = await prompt.url('Website URL');
```

## Progress Indicators

### Progress Bar

```typescript
import { ProgressBar } from '@claude-flow/cli-framework';

const progress = new ProgressBar({
  total: 100,
  label: 'Processing',
  showPercentage: true,
  showEta: true,
});

for (let i = 0; i <= 100; i++) {
  progress.update(i);
  await sleep(50);
}

progress.complete();
```

### Spinner

```typescript
import { Spinner } from '@claude-flow/cli-framework';

const spinner = new Spinner({ text: 'Loading...' });
spinner.start();

await doWork();

spinner.success('Done!');
// or spinner.error('Failed!');
// or spinner.warning('Warning!');
```

### Multi-Progress

```typescript
import { MultiProgress } from '@claude-flow/cli-framework';

const multi = new MultiProgress();

const bar1 = multi.add('file1', { total: 100, label: 'File 1' });
const bar2 = multi.add('file2', { total: 100, label: 'File 2' });

// Update independently
bar1.update(50);
bar2.update(75);
```

## Error Handling

### Global Handlers

```typescript
import { setupGlobalErrorHandlers } from '@claude-flow/cli-framework';

// Setup once at startup
setupGlobalErrorHandlers(process.env.VERBOSE === 'true');
```

Handles:
- Uncaught exceptions
- Unhandled promise rejections
- SIGINT (Ctrl+C)
- SIGTERM

### Manual Error Handling

```typescript
import { ErrorHandler } from '@claude-flow/cli-framework';

const handler = new ErrorHandler({ verbose: true });

try {
  // risky operation
} catch (error) {
  handler.handle(error, {
    command: 'build',
    args: parsedArgs,
    exitCode: 1,
  });
}
```

### Wrapped Functions

```typescript
const safeOperation = ErrorHandler.wrap(async () => {
  // code that might throw
}, { command: 'deploy' });

await safeOperation();
```

## Best Practices

### 1. Structure Your CLI

```
mycli/
├── src/
│   ├── commands/
│   │   ├── build.ts
│   │   ├── deploy.ts
│   │   └── test.ts
│   ├── utils/
│   │   ├── config.ts
│   │   └── logger.ts
│   └── cli.ts
├── package.json
└── tsconfig.json
```

### 2. Use Subcommands for Related Operations

```typescript
// Good
mycli user create
mycli user list
mycli user delete

// Avoid
mycli create-user
mycli list-users
mycli delete-user
```

### 3. Provide Defaults

```typescript
options: [
  {
    name: 'port',
    long: 'port',
    type: 'number',
    default: 3000,
    description: 'Port number (default: 3000)',
  },
]
```

### 4. Add Examples

```typescript
cli.register({
  name: 'deploy',
  description: 'Deploy application',
  examples: [
    'deploy --env production',
    'deploy --env staging --region us-east-1',
  ],
  // ...
});
```

### 5. Validate Early

```typescript
options: [
  {
    name: 'email',
    long: 'email',
    type: 'string',
    required: true,
    validate: validateEmail,
  },
]
```

### 6. Use Colors Consistently

```typescript
import { c } from '@claude-flow/cli-framework';

// Errors
console.error(c.error('Error: failed to connect'));

// Success
console.log(c.success('✓ Deployment complete'));

// Warnings
console.warn(c.warning('⚠ Deprecated API'));

// Info
console.info(c.info('ℹ Using default configuration'));
```

### 7. Show Progress for Long Operations

```typescript
const spinner = new Spinner({ text: 'Deploying...' });
spinner.start();

try {
  await deploy();
  spinner.success('Deployed successfully');
} catch (error) {
  spinner.error('Deployment failed');
  throw error;
}
```

## Performance Tips

### 1. Lazy Load Heavy Dependencies

```typescript
// Import only when needed
if (args.analyze) {
  const { analyze } = await import('./analyzer.js');
  await analyze();
}
```

### 2. Use Streams for Large Files

```typescript
import { createReadStream } from 'fs';

const stream = createReadStream('large-file.txt');
stream.pipe(process.stdout);
```

### 3. Cache Expensive Operations

```typescript
let cachedConfig: Config | null = null;

function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}
```

### 4. Avoid Blocking the Event Loop

```typescript
// Bad
for (let i = 0; i < 1000000; i++) {
  processItem(i);
}

// Good
for (let i = 0; i < 1000000; i++) {
  await processItem(i);
  if (i % 1000 === 0) {
    // Let other tasks run
    await new Promise((r) => setImmediate(r));
  }
}
```

## Examples

See the `examples/` directory for complete working examples:

- `basic-cli.ts` - Simple commands and options
- `interactive-cli.ts` - Prompts, spinners, progress
- `advanced-cli.ts` - Full-featured CLI with all components

## Troubleshooting

### Colors not showing

Set `FORCE_COLOR=1` environment variable or check terminal support.

### Startup is slow

Profile with:
```bash
NODE_OPTIONS='--prof' mycli command
node --prof-process isolate-*.log
```

### Tests failing

Ensure you're using Node.js 18+ and TypeScript 5+.

## Support

- GitHub Issues: https://github.com/ruvnet/claude-flow/issues
- Documentation: https://github.com/ruvnet/claude-flow/tree/main/packages/cli-framework
