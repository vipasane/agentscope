# Documentation Index - @claude-flow/cli-framework

Complete guide to navigating the CLI Framework documentation.

## 📚 Quick Navigation

| Document | Description | Audience |
|----------|-------------|----------|
| [README](./README.md) | Package overview, quick start, basic API | Everyone |
| [GUIDE](./GUIDE.md) | Comprehensive usage guide | Developers |
| [CHANGELOG](./CHANGELOG.md) | Version history and release notes | Everyone |
| [PACKAGE-INFO](./PACKAGE-INFO.md) | Quick reference card | Developers |
| [API Reference](./docs/API.md) | Complete TypeScript API documentation | Developers |
| [Examples](./docs/EXAMPLES.md) | Real-world usage examples | Developers |

---

## 🚀 Getting Started

### New Users
1. Start with [README](./README.md) for overview and installation
2. Review [Quick Start](#quick-start) section below
3. Explore [Examples](./docs/EXAMPLES.md) for common patterns

### Experienced Users
- Jump to [API Reference](./docs/API.md) for detailed signatures
- Check [CHANGELOG](./CHANGELOG.md) for latest changes
- Review [PACKAGE-INFO](./PACKAGE-INFO.md) for quick reference

---

## 📖 Documentation Structure

```
packages/cli-framework/
├── README.md                    # Package overview + API basics
├── GUIDE.md                     # Comprehensive tutorial
├── CHANGELOG.md                 # Version history
├── PACKAGE-INFO.md              # Quick reference
├── IMPLEMENTATION-SUMMARY.md    # Implementation details
├── DOCUMENTATION-INDEX.md       # This file
│
├── docs/
│   ├── API.md                   # Complete API reference
│   └── EXAMPLES.md              # Real-world examples
│
└── examples/
    ├── basic-cli.ts             # Simple CLI example
    ├── interactive-cli.ts       # Interactive features
    ├── advanced-cli.ts          # Full-featured CLI
    └── verify-build.js          # Build verification
```

---

## 🎯 Quick Start

```bash
# Install
npm install @claude-flow/cli-framework

# Create a simple CLI
cat > cli.ts << 'EOF'
#!/usr/bin/env node
import { CommandRegistry, c, setupGlobalErrorHandlers } from '@claude-flow/cli-framework';

setupGlobalErrorHandlers();

const cli = new CommandRegistry();

cli.register({
  name: 'hello',
  description: 'Say hello',
  arguments: [{ name: 'name', required: true }],
  action: async (args) => {
    console.log(c.green(`Hello, ${args._[0]}!`));
  }
});

cli.execute(process.argv.slice(2));
EOF

# Build and run
npx tsx cli.ts hello World
# Output: Hello, World!
```

---

## 📋 Core Components Guide

### Command Management
- **CommandRegistry** - [API](./docs/API.md#commandregistry) | [Examples](./docs/EXAMPLES.md#multi-command-cli)
  - Register commands and subcommands
  - Execute commands with validation
  - Generate help text and completions

### Argument Parsing
- **ArgumentParser** - [API](./docs/API.md#argumentparser) | [README](./README.md#argumentparser)
  - Parse CLI arguments with validation
  - Handle options (flags) and positional arguments
  - Type coercion and custom validation

### Error Handling
- **ErrorHandler** - [API](./docs/API.md#errorhandler) | [README](./README.md#error-handling)
  - Graceful error reporting
  - Global error handlers
  - Custom error types with suggestions

### Output Formatting
- **OutputFormatter** - [API](./docs/API.md#outputformatter) | [Examples](./docs/EXAMPLES.md#data-processing-cli)
  - Tables, JSON, YAML formatting
  - Box drawing and lists
  - Tree structure visualization

### Interactive Components
- **InteractivePrompt** - [API](./docs/API.md#interactiveprompt) | [Examples](./docs/EXAMPLES.md#interactive-cli)
  - Text, number, email, URL prompts
  - Single/multi-select
  - Password input (masked)
  - Confirmation dialogs

- **ProgressBar** - [API](./docs/API.md#progressbar) | [Examples](./docs/EXAMPLES.md#package-manager)
  - Visual progress tracking
  - Percentage and ETA display
  - Customizable appearance

- **Spinner** - [API](./docs/API.md#spinner) | [Examples](./docs/EXAMPLES.md#deployment-tool)
  - Loading animations
  - Success/error/warning states
  - Multiple spinner styles

### Utilities
- **Colors (c)** - [API](./docs/API.md#colors) | [README](./README.md#colors)
  - Terminal colors and styles
  - Semantic helpers
  - Auto-fallback for limited terminals

- **Validators** - [API](./docs/API.md#validators) | [README](./README.md#validators)
  - Input validation helpers
  - Type coercion utilities
  - Pattern matching

---

## 💡 Common Use Cases

### Building a Simple CLI
→ See [Basic CLI Example](./docs/EXAMPLES.md#basic-cli)

### Multi-Command Tool (like git, docker)
→ See [Multi-Command CLI Example](./docs/EXAMPLES.md#multi-command-cli)

### Interactive Setup Wizard
→ See [Interactive CLI Example](./docs/EXAMPLES.md#interactive-cli)

### Data Processing Tool
→ See [Data Processing CLI Example](./docs/EXAMPLES.md#data-processing-cli)

### Configuration Manager
→ See [Configuration Management Example](./docs/EXAMPLES.md#configuration-management)

### Package/Deployment Tool
→ See [Package Manager Example](./docs/EXAMPLES.md#package-manager)
→ See [Deployment Tool Example](./docs/EXAMPLES.md#deployment-tool)

---

## 🔍 Finding Information

### "How do I...?"

| Task | Documentation |
|------|---------------|
| Parse command-line arguments | [ArgumentParser API](./docs/API.md#argumentparser) |
| Create nested commands | [Examples - Multi-Command](./docs/EXAMPLES.md#multi-command-cli) |
| Show a progress bar | [ProgressBar API](./docs/API.md#progressbar) |
| Prompt user for input | [InteractivePrompt API](./docs/API.md#interactiveprompt) |
| Format output as table | [OutputFormatter API](./docs/API.md#outputformatter) |
| Handle errors gracefully | [ErrorHandler API](./docs/API.md#errorhandler) |
| Use colors in output | [Colors API](./docs/API.md#colors) |
| Validate user input | [Validators API](./docs/API.md#validators) |

---

## 📦 Package Information

| Property | Value |
|----------|-------|
| **Package Name** | @claude-flow/cli-framework |
| **Version** | 1.0.0 |
| **License** | MIT |
| **Dependencies** | 0 (zero dependencies!) |
| **Node.js** | >=18.0.0 |
| **TypeScript** | Full support with exported types |
| **Test Coverage** | >90% target |

---

## 🎓 Learning Path

### Beginner
1. Read [README - Quick Start](./README.md#quick-start)
2. Try [Basic CLI Example](./docs/EXAMPLES.md#basic-cli)
3. Explore [Core Components](./README.md#core-components)

### Intermediate
1. Study [Multi-Command CLI](./docs/EXAMPLES.md#multi-command-cli)
2. Learn [Interactive Components](./docs/EXAMPLES.md#interactive-cli)
3. Review [API Reference](./docs/API.md)

### Advanced
1. Build [Data Processing Tool](./docs/EXAMPLES.md#data-processing-cli)
2. Create [Configuration Manager](./docs/EXAMPLES.md#configuration-management)
3. Study [Advanced CLI Example](./examples/advanced-cli.ts)

---

## 🛠️ Development Resources

### Code Examples
- [`examples/basic-cli.ts`](./examples/basic-cli.ts) - Simple command registration
- [`examples/interactive-cli.ts`](./examples/interactive-cli.ts) - Interactive features
- [`examples/advanced-cli.ts`](./examples/advanced-cli.ts) - Complete CLI app

### Build & Test
```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Verify build
node examples/verify-build.js
```

### Type Checking
```bash
# Type check
npm run lint

# Generate .d.ts files
npm run build
```

---

## 📊 API Surface

### Classes
- [CommandRegistry](./docs/API.md#commandregistry)
- [ArgumentParser](./docs/API.md#argumentparser)
- [ErrorHandler](./docs/API.md#errorhandler)
- [OutputFormatter](./docs/API.md#outputformatter)
- [InteractivePrompt](./docs/API.md#interactiveprompt)
- [ProgressBar](./docs/API.md#progressbar)
- [Spinner](./docs/API.md#spinner)

### Functions
- [setupGlobalErrorHandlers](./docs/API.md#setupglobalerrorhandlers)
- [Colors (c)](./docs/API.md#colors)
- [Validators](./docs/API.md#validators)

### Types
- [CommandConfig](./docs/API.md#commandconfig)
- [OptionConfig](./docs/API.md#optionconfig)
- [ArgumentConfig](./docs/API.md#argumentconfig)
- [ParsedArgs](./docs/API.md#parsedargs)
- [And more...](./docs/API.md#types)

---

## 🔗 External Resources

### GitHub
- [Repository](https://github.com/ruvnet/claude-flow)
- [Issues](https://github.com/ruvnet/claude-flow/issues)
- [Discussions](https://github.com/ruvnet/claude-flow/discussions)

### NPM
- [Package](https://www.npmjs.com/package/@claude-flow/cli-framework)
- [Download Stats](https://www.npmjs.com/package/@claude-flow/cli-framework)

---

## 📝 Contributing

Interested in contributing? See the main repository's [CONTRIBUTING.md](../../CONTRIBUTING.md).

---

## 🆘 Getting Help

1. **Check documentation** - Start with this index
2. **Review examples** - See [examples/](./examples/)
3. **Search issues** - [GitHub Issues](https://github.com/ruvnet/claude-flow/issues)
4. **Ask questions** - [GitHub Discussions](https://github.com/ruvnet/claude-flow/discussions)

---

## 📅 Version Information

- **Current Version**: 1.0.0
- **Release Date**: 2026-01-30
- **Status**: ✅ Stable - Production Ready
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

## ⚡ Performance

| Metric | Target | Typical |
|--------|--------|---------|
| CLI Startup | <300ms | ~250ms |
| Argument Parsing | <5ms | ~2ms |
| Table Rendering | <10ms | ~8ms |
| JSON Formatting | <5ms | ~3ms |
| Prompt Response | <50ms | ~30ms |

See [Performance Benchmarks](./CHANGELOG.md#performance-benchmarks) for details.

---

**Last Updated**: 2026-01-30
**Maintained by**: [@ruvnet](https://github.com/ruvnet)
