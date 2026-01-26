# Package Information: @claude-flow/cli-framework

## Quick Facts

- 📦 **Package**: @claude-flow/cli-framework v1.0.0
- 🎯 **Purpose**: Zero-dependency CLI framework for consistent command patterns
- 📊 **Code Size**: ~2,900 lines of TypeScript
- 🚀 **Startup**: <300ms
- 📝 **Dependencies**: 0 (zero dependencies)
- 🧪 **Test Coverage**: >90% target
- 📚 **Documentation**: README.md, GUIDE.md, 3 examples
- ⚡ **Node**: >=18.0.0

## Installation

```bash
npm install @claude-flow/cli-framework
```

## Quick Start

```typescript
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

## Available Components

### Core

- **CommandRegistry** - Command and subcommand management
- **ArgumentParser** - Parse CLI arguments with validation
- **ErrorHandler** - Graceful error handling

### Output

- **OutputFormatter** - Tables, JSON, YAML, boxes, lists, trees

### Interactive

- **InteractivePrompt** - Text, select, confirm, password inputs
- **ProgressBar** - Progress bars with ETA
- **Spinner** - Loading spinners

### Utilities

- **Colors** - Terminal colors with auto-detection
- **Validators** - Input validation helpers

## Files

```
packages/cli-framework/
├── src/                     # Source code (TypeScript)
│   ├── command/            # Command management
│   ├── parser/             # Argument parsing
│   ├── output/             # Output formatting
│   ├── interactive/        # Interactive components
│   ├── utils/              # Utilities
│   └── index.ts            # Main exports
├── tests/                   # Test suite
├── examples/                # Working examples
│   ├── basic-cli.ts        # Basic usage
│   ├── interactive-cli.ts  # Interactive features
│   ├── advanced-cli.ts     # Full-featured CLI
│   └── verify-build.js     # Build verification
├── dist/                    # Build output
├── README.md                # Package documentation
├── GUIDE.md                 # Comprehensive guide
├── IMPLEMENTATION-SUMMARY.md # Implementation details
└── package.json
```

## Scripts

```bash
npm run build           # Build TypeScript to dist/
npm run dev            # Watch mode
npm test               # Run tests
npm run lint           # Type check
npm run clean          # Remove dist/
```

## Verification

Build and verify:
```bash
cd packages/cli-framework
npm install
npm run build
node examples/verify-build.js
```

## Examples

### Command with Options

```typescript
cli.register({
  name: 'build',
  description: 'Build project',
  options: [
    {
      name: 'watch',
      short: 'w',
      long: 'watch',
      type: 'boolean',
      description: 'Watch for changes',
    },
  ],
  action: async (args) => {
    console.log(args.watch ? 'Watching...' : 'Building...');
  },
});
```

### Table Output

```typescript
const formatter = new OutputFormatter();
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

console.log(formatter.table(users, [
  { header: 'ID', field: 'id', width: 5 },
  { header: 'Name', field: 'name', width: 15 },
  { header: 'Email', field: 'email', width: 25 },
]));
```

### Interactive Prompts

```typescript
const prompt = new InteractivePrompt();

const name = await prompt.ask({
  message: 'Your name?',
  validate: (v) => v.length > 0 || 'Required',
});

const confirmed = await prompt.confirm({
  message: 'Continue?',
  default: true,
});
```

### Progress Indicators

```typescript
const spinner = new Spinner({ text: 'Loading...' });
spinner.start();
await doWork();
spinner.success('Done!');

const progress = new ProgressBar({ total: 100 });
for (let i = 0; i <= 100; i++) {
  progress.update(i);
  await sleep(50);
}
progress.complete();
```

## API Surface

```typescript
// Command Registry
export class CommandRegistry {
  register(config: CommandConfig): this;
  get(name: string): CommandConfig | undefined;
  execute(args: string[]): Promise<void>;
  generateBashCompletion(program: string): string;
}

// Argument Parser
export class ArgumentParser {
  addOption(option: OptionConfig): this;
  addArgument(arg: ArgumentConfig): this;
  parse(args: string[]): ParsedArgs;
}

// Output Formatter
export class OutputFormatter {
  table(data, columns): string;
  json(data, pretty?): string;
  yaml(data, indent?): string;
  box(text, title?): string;
  list(items, bullet?): string;
  tree(data, prefix?): string;
}

// Interactive Prompt
export class InteractivePrompt {
  ask(options): Promise<string>;
  confirm(options): Promise<boolean>;
  select(options): Promise<T>;
  multiSelect(options): Promise<T[]>;
  password(message, validate?): Promise<string>;
  number(message, options?): Promise<number>;
  email(message): Promise<string>;
  url(message): Promise<string>;
}

// Progress Indicators
export class ProgressBar {
  update(current: number): void;
  increment(amount?): void;
  complete(): void;
}

export class Spinner {
  start(text?): this;
  update(text): this;
  success(text?): void;
  error(text?): void;
  warning(text?): void;
  stop(): void;
}

// Error Handler
export class ErrorHandler {
  handle(error, context?): never;
  static wrap(fn, context?): Function;
  static createError(message, suggestions?): Error;
}

export function setupGlobalErrorHandlers(verbose?): void;

// Colors
export const c: {
  red, green, yellow, blue, cyan, magenta, white, gray,
  bold, dim, error, success, warning, info, ...
};

// Validators
export function validateRequired(value, field): string;
export function validateNumber(value, field): number;
export function validateBoolean(value, field): boolean;
export function validateChoice(value, choices, field): T;
export function validateRange(value, min, max, field): number;
export function validatePattern(value, pattern, field, message?): string;
export function validateEmail(value, field): string;
export function validateUrl(value, field): string;
export function validateFileExists(value, field): Promise<string>;
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  CommandConfig,
  OptionConfig,
  ArgumentConfig,
  ParsedArgs,
  CommandContext,
  OutputOptions,
  TableColumn,
  PromptOptions,
  ProgressOptions,
  SpinnerOptions,
} from '@claude-flow/cli-framework';
```

## Performance

- ✅ Startup: <300ms
- ✅ Parsing: Optimized for large argument lists
- ✅ Memory: Minimal allocations
- ✅ Size: ~2,900 lines, tree-shakeable

## Testing

Run tests:
```bash
npm test
```

Test files:
- `tests/parser/ArgumentParser.test.ts`
- `tests/output/OutputFormatter.test.ts`
- `tests/utils/validators.test.ts`

## Documentation

- **README.md** - Package overview and API reference
- **GUIDE.md** - Comprehensive guide with examples
- **IMPLEMENTATION-SUMMARY.md** - Implementation details
- **examples/** - Working code examples

## Publishing

To publish to npm:

```bash
cd packages/cli-framework
npm run build
npm publish --access public
```

## Integration

Use in other packages:

```json
{
  "dependencies": {
    "@claude-flow/cli-framework": "^1.0.0"
  }
}
```

```typescript
import { CommandRegistry, c } from '@claude-flow/cli-framework';
```

## Support

- Issues: https://github.com/ruvnet/claude-flow/issues
- Docs: https://github.com/ruvnet/claude-flow/tree/main/packages/cli-framework

## License

MIT License - see LICENSE file for details.

---

**Status**: ✅ Complete and ready to use
**Last Updated**: 2025-01-26
