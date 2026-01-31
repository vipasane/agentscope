# API Reference - @claude-flow/cli-framework

Complete TypeScript API reference for the CLI Framework.

## Table of Contents

- [CommandRegistry](#commandregistry)
- [ArgumentParser](#argumentparser)
- [ErrorHandler](#errorhandler)
- [OutputFormatter](#outputformatter)
- [InteractivePrompt](#interactiveprompt)
- [ProgressBar](#progressbar)
- [Spinner](#spinner)
- [Colors](#colors)
- [Validators](#validators)
- [Types](#types)

---

## CommandRegistry

Manages command registration, lookup, and execution.

### Constructor

```typescript
class CommandRegistry {
  constructor()
}
```

### Methods

#### `register(config: CommandConfig): this`

Register a command with the registry.

**Parameters:**
- `config: CommandConfig` - Command configuration

**Returns:** `this` (for chaining)

**Example:**
```typescript
cli.register({
  name: 'build',
  description: 'Build the project',
  options: [
    { name: 'watch', short: 'w', long: 'watch', type: 'boolean' }
  ],
  action: async (args) => {
    console.log('Building...');
  }
});
```

---

#### `get(name: string): CommandConfig | undefined`

Retrieve a registered command by name.

**Parameters:**
- `name: string` - Command name

**Returns:** `CommandConfig | undefined`

**Example:**
```typescript
const buildCmd = cli.get('build');
if (buildCmd) {
  console.log(buildCmd.description);
}
```

---

#### `execute(args: string[]): Promise<void>`

Execute a command with the given arguments.

**Parameters:**
- `args: string[]` - Command-line arguments (typically `process.argv.slice(2)`)

**Returns:** `Promise<void>`

**Throws:** Error if command not found or execution fails

**Example:**
```typescript
await cli.execute(['build', '--watch']);
```

---

#### `generateBashCompletion(programName: string): string`

Generate bash completion script.

**Parameters:**
- `programName: string` - Name of the CLI program

**Returns:** `string` - Bash completion script

**Example:**
```typescript
const completion = cli.generateBashCompletion('mycli');
fs.writeFileSync('completion.bash', completion);
```

---

## ArgumentParser

Parses and validates command-line arguments.

### Constructor

```typescript
class ArgumentParser {
  constructor()
}
```

### Methods

#### `addOption(option: OptionConfig): this`

Add an option definition.

**Parameters:**
- `option: OptionConfig` - Option configuration

**Returns:** `this` (for chaining)

**Example:**
```typescript
parser.addOption({
  name: 'verbose',
  short: 'v',
  long: 'verbose',
  type: 'boolean',
  description: 'Enable verbose output'
});
```

---

#### `addArgument(arg: ArgumentConfig): this`

Add a positional argument definition.

**Parameters:**
- `arg: ArgumentConfig` - Argument configuration

**Returns:** `this` (for chaining)

**Example:**
```typescript
parser.addArgument({
  name: 'file',
  description: 'File to process',
  required: true
});
```

---

#### `parse(args: string[]): ParsedArgs`

Parse command-line arguments.

**Parameters:**
- `args: string[]` - Arguments to parse

**Returns:** `ParsedArgs` - Parsed argument object

**Throws:** Error on validation failure

**Example:**
```typescript
const parsed = parser.parse(['--verbose', 'input.txt']);
// { verbose: true, _: ['input.txt'] }
```

---

## ErrorHandler

Handles and formats errors gracefully.

### Constructor

```typescript
class ErrorHandler {
  constructor(options?: ErrorHandlerOptions)
}

interface ErrorHandlerOptions {
  verbose?: boolean;      // Show stack traces
  exitOnError?: boolean;  // Exit process on error
}
```

### Methods

#### `handle(error: unknown, context?: ErrorContext): never`

Handle an error and exit.

**Parameters:**
- `error: unknown` - Error to handle
- `context?: ErrorContext` - Additional context

**Returns:** `never` (exits process)

**Example:**
```typescript
const handler = new ErrorHandler({ verbose: true });

try {
  // ... code
} catch (error) {
  handler.handle(error, {
    command: 'build',
    args: { watch: true }
  });
}
```

---

#### `static wrap(fn: Function, context?: ErrorContext): Function`

Wrap a function with error handling.

**Parameters:**
- `fn: Function` - Function to wrap
- `context?: ErrorContext` - Error context

**Returns:** `Function` - Wrapped function

**Example:**
```typescript
const safeFunction = ErrorHandler.wrap(async () => {
  // ... code that might throw
}, { command: 'deploy' });

await safeFunction();
```

---

#### `static createError(message: string, suggestions?: string[]): Error`

Create a formatted error with suggestions.

**Parameters:**
- `message: string` - Error message
- `suggestions?: string[]` - Helpful suggestions

**Returns:** `Error`

**Example:**
```typescript
throw ErrorHandler.createError(
  'Configuration file not found',
  [
    'Run "init" to create a config file',
    'Check the file path is correct'
  ]
);
```

---

### Functions

#### `setupGlobalErrorHandlers(verbose?: boolean): void`

Setup global error handlers for unhandled rejections and exceptions.

**Parameters:**
- `verbose?: boolean` - Enable verbose error output

**Example:**
```typescript
import { setupGlobalErrorHandlers } from '@claude-flow/cli-framework';

setupGlobalErrorHandlers(process.env.DEBUG === 'true');
```

---

## OutputFormatter

Formats output in various styles.

### Constructor

```typescript
class OutputFormatter {
  constructor(options?: OutputOptions)
}

interface OutputOptions {
  format?: 'table' | 'json' | 'yaml' | 'text';
  colors?: boolean;
}
```

### Methods

#### `table(data: any[], columns: TableColumn[]): string`

Format data as a table.

**Parameters:**
- `data: any[]` - Array of objects to display
- `columns: TableColumn[]` - Column definitions

**Returns:** `string` - Formatted table

**Example:**
```typescript
const formatter = new OutputFormatter();

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];

console.log(formatter.table(users, [
  { header: 'ID', field: 'id', width: 5, align: 'right' },
  { header: 'Name', field: 'name', width: 15 },
  { header: 'Email', field: 'email', width: 25 }
]));
```

---

#### `json(data: any, pretty?: boolean): string`

Format data as JSON.

**Parameters:**
- `data: any` - Data to format
- `pretty?: boolean` - Pretty-print (default: true)

**Returns:** `string` - JSON string

**Example:**
```typescript
console.log(formatter.json({ status: 'ok', count: 42 }));
// {
//   "status": "ok",
//   "count": 42
// }
```

---

#### `yaml(data: any, indent?: number): string`

Format data as YAML.

**Parameters:**
- `data: any` - Data to format
- `indent?: number` - Indentation spaces (default: 2)

**Returns:** `string` - YAML string

**Example:**
```typescript
console.log(formatter.yaml({ users: ['Alice', 'Bob'] }));
// users:
//   - Alice
//   - Bob
```

---

#### `box(text: string, title?: string): string`

Draw a box around text.

**Parameters:**
- `text: string` - Text to box
- `title?: string` - Optional title

**Returns:** `string` - Boxed text

**Example:**
```typescript
console.log(formatter.box('Important message', 'Notice'));
// ┌─ Notice ───────┐
// │ Important msg  │
// └────────────────┘
```

---

#### `list(items: string[], bullet?: string): string`

Format items as a list.

**Parameters:**
- `items: string[]` - List items
- `bullet?: string` - Bullet character (default: '•')

**Returns:** `string` - Formatted list

**Example:**
```typescript
console.log(formatter.list(['Item 1', 'Item 2', 'Item 3']));
// • Item 1
// • Item 2
// • Item 3
```

---

#### `tree(data: TreeNode[], prefix?: string): string`

Format hierarchical data as a tree.

**Parameters:**
- `data: TreeNode[]` - Tree structure
- `prefix?: string` - Internal prefix for recursion

**Returns:** `string` - Tree visualization

**Example:**
```typescript
const fileTree = [
  {
    label: 'src',
    children: [
      { label: 'index.ts' },
      { label: 'utils.ts' }
    ]
  },
  { label: 'package.json' }
];

console.log(formatter.tree(fileTree));
// src
// ├── index.ts
// └── utils.ts
// package.json
```

---

## InteractivePrompt

Collect user input interactively.

### Constructor

```typescript
class InteractivePrompt {
  constructor()
}
```

### Methods

#### `ask(options: PromptOptions): Promise<string>`

Ask a text question.

**Parameters:**
- `options: PromptOptions` - Prompt configuration

**Returns:** `Promise<string>` - User's answer

**Example:**
```typescript
const prompt = new InteractivePrompt();

const name = await prompt.ask({
  message: 'What is your name?',
  default: 'Anonymous',
  validate: (value) => value.length > 0 || 'Name is required'
});
```

---

#### `confirm(options: ConfirmOptions): Promise<boolean>`

Ask a yes/no question.

**Parameters:**
- `options: ConfirmOptions` - Confirmation options

**Returns:** `Promise<boolean>` - User's choice

**Example:**
```typescript
const confirmed = await prompt.confirm({
  message: 'Delete all files?',
  default: false
});

if (confirmed) {
  // ... delete files
}
```

---

#### `select<T>(options: SelectOptions<T>): Promise<T>`

Select from a list of choices.

**Parameters:**
- `options: SelectOptions<T>` - Selection options

**Returns:** `Promise<T>` - Selected value

**Example:**
```typescript
const environment = await prompt.select({
  message: 'Select environment',
  choices: [
    { label: 'Development', value: 'dev' },
    { label: 'Staging', value: 'staging' },
    { label: 'Production', value: 'prod' }
  ]
});
```

---

#### `multiSelect<T>(options: MultiSelectOptions<T>): Promise<T[]>`

Select multiple items from a list.

**Parameters:**
- `options: MultiSelectOptions<T>` - Multi-select options

**Returns:** `Promise<T[]>` - Selected values

**Example:**
```typescript
const features = await prompt.multiSelect({
  message: 'Select features to enable',
  choices: [
    { label: 'Authentication', value: 'auth' },
    { label: 'Logging', value: 'logging' },
    { label: 'Caching', value: 'caching' }
  ]
});
```

---

#### `password(message: string, validate?: ValidateFn): Promise<string>`

Prompt for password (masked input).

**Parameters:**
- `message: string` - Prompt message
- `validate?: ValidateFn` - Optional validation

**Returns:** `Promise<string>` - Password

**Example:**
```typescript
const password = await prompt.password(
  'Enter password',
  (value) => value.length >= 8 || 'Password must be at least 8 characters'
);
```

---

#### `number(message: string, options?: NumberOptions): Promise<number>`

Prompt for a number.

**Parameters:**
- `message: string` - Prompt message
- `options?: NumberOptions` - Min/max constraints

**Returns:** `Promise<number>` - Number value

**Example:**
```typescript
const age = await prompt.number('Enter your age', {
  min: 0,
  max: 150
});
```

---

#### `email(message: string): Promise<string>`

Prompt for an email address.

**Parameters:**
- `message: string` - Prompt message

**Returns:** `Promise<string>` - Valid email

**Example:**
```typescript
const email = await prompt.email('Enter your email');
```

---

#### `url(message: string): Promise<string>`

Prompt for a URL.

**Parameters:**
- `message: string` - Prompt message

**Returns:** `Promise<string>` - Valid URL

**Example:**
```typescript
const homepage = await prompt.url('Enter project URL');
```

---

## ProgressBar

Display progress bars.

### Constructor

```typescript
class ProgressBar {
  constructor(options: ProgressOptions)
}

interface ProgressOptions {
  total: number;
  label?: string;
  width?: number;
  showPercentage?: boolean;
  showEta?: boolean;
}
```

### Methods

#### `update(current: number): void`

Update progress to a specific value.

**Parameters:**
- `current: number` - Current progress value

**Example:**
```typescript
const progress = new ProgressBar({
  total: 100,
  label: 'Processing',
  showPercentage: true,
  showEta: true
});

for (let i = 0; i <= 100; i++) {
  progress.update(i);
  await sleep(50);
}
```

---

#### `increment(amount?: number): void`

Increment progress.

**Parameters:**
- `amount?: number` - Amount to increment (default: 1)

**Example:**
```typescript
for (const file of files) {
  await processFile(file);
  progress.increment();
}
```

---

#### `complete(): void`

Mark progress as complete.

**Example:**
```typescript
progress.complete();
```

---

## Spinner

Display loading spinners.

### Constructor

```typescript
class Spinner {
  constructor(options?: SpinnerOptions)
}

interface SpinnerOptions {
  text?: string;
  style?: 'dots' | 'line' | 'arc' | 'arrow';
}
```

### Methods

#### `start(text?: string): this`

Start the spinner.

**Parameters:**
- `text?: string` - Optional status text

**Returns:** `this` (for chaining)

**Example:**
```typescript
const spinner = new Spinner({ text: 'Loading...' });
spinner.start();
```

---

#### `update(text: string): this`

Update spinner text.

**Parameters:**
- `text: string` - New status text

**Returns:** `this` (for chaining)

**Example:**
```typescript
spinner.update('Processing files...');
```

---

#### `success(text?: string): void`

Stop with success state.

**Parameters:**
- `text?: string` - Optional completion text

**Example:**
```typescript
spinner.success('Done!');
```

---

#### `error(text?: string): void`

Stop with error state.

**Parameters:**
- `text?: string` - Optional error text

**Example:**
```typescript
spinner.error('Failed!');
```

---

#### `warning(text?: string): void`

Stop with warning state.

**Parameters:**
- `text?: string` - Optional warning text

**Example:**
```typescript
spinner.warning('Completed with warnings');
```

---

#### `stop(): void`

Stop the spinner without status.

**Example:**
```typescript
spinner.stop();
```

---

## Colors

Terminal color utilities.

### Functions

All color functions take a string and return a colored string.

```typescript
interface Colors {
  // Basic colors
  red(text: string): string;
  green(text: string): string;
  yellow(text: string): string;
  blue(text: string): string;
  cyan(text: string): string;
  magenta(text: string): string;
  white(text: string): string;
  gray(text: string): string;

  // Styles
  bold(text: string): string;
  dim(text: string): string;
  underline(text: string): string;
  italic(text: string): string;
  strikethrough(text: string): string;

  // Semantic
  error(text: string): string;    // Red + bold
  success(text: string): string;  // Green + bold
  warning(text: string): string;  // Yellow + bold
  info(text: string): string;     // Blue

  // Utility
  stripAnsi(text: string): string;
}

export const c: Colors;
```

**Example:**
```typescript
import { c } from '@claude-flow/cli-framework';

console.log(c.green('Success!'));
console.log(c.red('Error!'));
console.log(c.bold(c.blue('Important')));
console.log(c.error('Critical failure'));

const plain = c.stripAnsi(c.red('Colored text'));
```

---

## Validators

Input validation utilities.

### Functions

#### `validateRequired(value: unknown, field: string): string`

Validate required field.

**Throws:** Error if value is empty

**Example:**
```typescript
const name = validateRequired(userInput, 'name');
```

---

#### `validateNumber(value: unknown, field: string): number`

Validate and coerce to number.

**Throws:** Error if not a valid number

**Example:**
```typescript
const port = validateNumber(input, 'port');
```

---

#### `validateBoolean(value: unknown, field: string): boolean`

Validate and coerce to boolean.

**Accepts:** `true`, `false`, `'true'`, `'false'`, `1`, `0`, `'1'`, `'0'`, `'yes'`, `'no'`

**Throws:** Error if not a valid boolean

**Example:**
```typescript
const enabled = validateBoolean(input, 'enabled');
```

---

#### `validateChoice<T>(value: unknown, choices: T[], field: string): T`

Validate value is in allowed choices.

**Throws:** Error if value not in choices

**Example:**
```typescript
const format = validateChoice(input, ['json', 'yaml', 'table'], 'format');
```

---

#### `validateRange(value: unknown, min: number, max: number, field: string): number`

Validate number is within range.

**Throws:** Error if out of range

**Example:**
```typescript
const percentage = validateRange(input, 0, 100, 'percentage');
```

---

#### `validatePattern(value: unknown, pattern: RegExp, field: string, message?: string): string`

Validate against regex pattern.

**Throws:** Error if doesn't match pattern

**Example:**
```typescript
const semver = validatePattern(
  input,
  /^\d+\.\d+\.\d+$/,
  'version',
  'Must be valid semver (e.g., 1.2.3)'
);
```

---

#### `validateEmail(value: unknown, field: string): string`

Validate email address.

**Throws:** Error if invalid email

**Example:**
```typescript
const email = validateEmail(input, 'email');
```

---

#### `validateUrl(value: unknown, field: string): string`

Validate URL.

**Throws:** Error if invalid URL

**Example:**
```typescript
const homepage = validateUrl(input, 'url');
```

---

#### `validateFileExists(value: unknown, field: string): Promise<string>`

Validate file exists (async).

**Throws:** Error if file doesn't exist

**Example:**
```typescript
const configPath = await validateFileExists(input, 'config');
```

---

## Types

### CommandConfig

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

type CommandAction = (args: ParsedArgs, context: CommandContext) => Promise<void> | void;
```

### OptionConfig

```typescript
interface OptionConfig {
  name: string;
  description: string;
  short?: string;        // e.g., 'v'
  long: string;          // e.g., 'verbose'
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: string | number | boolean;
  choices?: (string | number)[];
  validate?: (value: unknown) => boolean | string;
}
```

### ArgumentConfig

```typescript
interface ArgumentConfig {
  name: string;
  description: string;
  required?: boolean;
  multiple?: boolean;    // Accept multiple values
  default?: string | number;
  validate?: (value: unknown) => boolean | string;
}
```

### ParsedArgs

```typescript
interface ParsedArgs {
  [key: string]: unknown;
  _: string[];  // Positional arguments
}
```

### TableColumn

```typescript
interface TableColumn {
  header: string;
  field: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => string;
}
```

### TreeNode

```typescript
interface TreeNode {
  label: string;
  children?: TreeNode[];
}
```

### ErrorContext

```typescript
interface ErrorContext {
  command?: string;
  args?: ParsedArgs;
  exitCode?: number;
}
```

---

## Best Practices

### Error Handling

Always setup global error handlers:

```typescript
import { setupGlobalErrorHandlers } from '@claude-flow/cli-framework';

setupGlobalErrorHandlers(process.env.DEBUG === 'true');
```

### Validation

Use built-in validators for consistency:

```typescript
import { validateChoice, validateRange } from '@claude-flow/cli-framework';

// Instead of manual validation
const format = validateChoice(args.format, ['json', 'yaml'], 'format');
const port = validateRange(args.port, 1, 65535, 'port');
```

### Output Formatting

Respect user's format preference:

```typescript
const formatter = new OutputFormatter({ format: args.format || 'table' });

switch (args.format) {
  case 'json':
    console.log(formatter.json(data));
    break;
  case 'yaml':
    console.log(formatter.yaml(data));
    break;
  default:
    console.log(formatter.table(data, columns));
}
```

### Colors

Check terminal capability:

```typescript
import { c } from '@claude-flow/cli-framework';

// Colors automatically fallback if terminal doesn't support them
console.log(c.green('Success'));  // Works in all terminals
```

---

## Performance Tips

1. **Lazy load heavy operations** - Only import what you need
2. **Batch operations** - Use progress bars for long-running tasks
3. **Stream large output** - Don't buffer entire datasets in memory
4. **Cache parsed arguments** - Parse once, use many times
5. **Use appropriate formatters** - JSON is faster than YAML

---

## TypeScript Integration

Import types for strict typing:

```typescript
import type {
  CommandConfig,
  OptionConfig,
  ArgumentConfig,
  ParsedArgs,
  CommandContext,
} from '@claude-flow/cli-framework';

const config: CommandConfig = {
  name: 'test',
  description: 'Test command',
  action: async (args: ParsedArgs) => {
    // Fully typed
  }
};
```

---

## Links

- [README](../README.md)
- [Examples](./EXAMPLES.md)
- [Changelog](../CHANGELOG.md)
- [GitHub](https://github.com/ruvnet/claude-flow)
