# ADR-008: CLI Framework - Commander.js

## Status

Accepted

## Context

AgentScope is distributed as a CLI tool that users invoke via:
- `npm install -g @vipasane/agentscope` then `agentscope <command>`
- `npx @vipasane/agentscope <command>` for one-off usage

The CLI must support:

1. **Commands**: `scan`, `validate`, `--version`, `--help`
2. **Options**: `--output`, `--diagram`, `--format`, `--strict`
3. **Colored output**: Differentiate errors, warnings, success
4. **Exit codes**: 0 for success, 1 for errors
5. **Progress indication**: Show scanning progress
6. **Cross-platform**: Windows, macOS, Linux

We need a CLI framework that is:
- **Mature and stable**: Battle-tested in production
- **Well-documented**: Easy to learn and extend
- **Widely adopted**: Familiar to Node.js developers
- **Minimal**: Small bundle size, fast startup

## Decision

We will use **Commander.js** as the CLI framework.

### Key Characteristics

- **238M weekly downloads** - Most popular Node.js CLI framework
- **9+ years of development** - Mature and stable
- **TypeScript support** - First-class type definitions
- **Simple API** - Declarative command/option definition
- **Git-style subcommands** - Natural for `agentscope scan`, `agentscope validate`

### CLI Structure

```typescript
// src/cli/index.ts
import { Command } from 'commander';

const program = new Command();

program
  .name('agentscope')
  .description('Agent architecture documentation generator')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan agent configs and generate documentation')
  .option('-o, --output <dir>', 'output directory', 'docs/agent-architecture')
  .option('-d, --diagram <type>', 'generate specific diagram only')
  .option('-f, --format <type>', 'output format (markdown|json)', 'markdown')
  .option('-s, --strict', 'treat warnings as errors')
  .action(scanCommand);

program
  .command('validate')
  .description('Validate configs without generating docs')
  .action(validateCommand);

program.parse();
```

### Command Structure

```
src/cli/
├── index.ts           # Main entry point, program definition
├── commands/
│   ├── scan.ts        # Scan command implementation
│   └── validate.ts    # Validate command implementation
├── output/
│   ├── console.ts     # Console output formatting
│   └── colors.ts      # Color definitions
└── utils/
    └── progress.ts    # Progress spinner/bar
```

### Output Formatting (with chalk)

```typescript
// src/cli/output/colors.ts
import chalk from 'chalk';

export const output = {
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  warning: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.log(chalk.red('✗'), msg),
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  file: (path: string) => console.log(chalk.gray('+'), path),
};
```

### Example Usage

```bash
# Scan with defaults
$ agentscope scan

# Scan to custom directory
$ agentscope scan --output ./docs/agents/

# Generate specific diagram
$ agentscope scan --diagram hierarchy

# JSON output for tooling
$ agentscope scan --format json

# Strict mode for CI
$ agentscope scan --strict

# Validate only (no generation)
$ agentscope validate

# Help
$ agentscope --help
$ agentscope scan --help
```

### Complementary Packages

| Package | Purpose | Downloads/week |
|---------|---------|----------------|
| **chalk** | Terminal colors | 250M+ |
| **ora** | Spinners | 12M |
| **cli-table3** | Table formatting | 10M |

### Total CLI Dependencies

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0"
  }
}
```

~3 packages, ~50KB gzipped

## Consequences

### Positive

- **Familiarity**: Most Node.js developers know Commander.js
- **Stability**: Minimal breaking changes, long-term support
- **Documentation**: Excellent docs with many examples
- **Ecosystem**: Compatible with other popular CLI packages
- **Fast startup**: Minimal overhead for CLI invocation
- **TypeScript**: Full type safety for commands and options

### Negative

- **Verbosity**: More boilerplate than some alternatives (yargs)
- **No built-in prompts**: Need separate package for interactive mode
- **Opinionated**: Must follow Commander's patterns

### Neutral

- Learning curve is minimal for basic usage
- Advanced features (subcommand aliases, variadic args) available if needed

## Options Considered

### Option 1: Commander.js (Chosen)

Declarative CLI framework with git-style subcommands.

- **Pros**: Most popular, stable, well-documented, TypeScript support
- **Cons**: Slightly verbose for simple CLIs
- **Why chosen**: Best balance of features, stability, and familiarity

### Option 2: yargs

Feature-rich CLI framework with built-in validation.

- **Pros**: Powerful validation, auto-generated help, middleware
- **Cons**: More complex API, larger bundle, steeper learning curve
- **Why rejected**: Overkill for AgentScope's needs

### Option 3: oclif

Heroku's CLI framework for building full CLI applications.

- **Pros**: Plugin system, testing framework, many conventions
- **Cons**: Heavy, opinionated, designed for complex CLIs
- **Why rejected**: Too much overhead for a simple tool

### Option 4: cac

Lightweight CLI framework with Commander-like API.

- **Pros**: Smaller bundle, TypeScript-first
- **Cons**: Less popular, fewer examples, smaller community
- **Why rejected**: Commander's ecosystem advantage outweighs size difference

### Option 5: No Framework (process.argv)

Parse arguments manually.

- **Pros**: No dependencies, full control
- **Cons**: Reinventing the wheel, error-prone, no --help generation
- **Why rejected**: Not worth the maintenance burden

## Related Decisions

- [ADR-007](./ADR-007-error-handling.md) - Error Handling (CLI displays categorized errors)
- [ADR-005](./ADR-005-output-format.md) - Output Format (CLI writes Markdown/JSON)

## References

- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Commander.js npm](https://www.npmjs.com/package/commander)
- [AgentScope PRD v2.0](../../AgentScope-PRD-v2.md) - Section 10: CLI Usage
- [Research: Component Solutions](../../research/04-component-solutions.md) - CLI framework comparison
