# AgentScope

> From chaos to clarity - AgentScope maps your agents.

**Agent Architecture Documentation & Visualization Tool**

AgentScope is an open-source CLI tool that automatically scans Claude Code agent configurations and generates Mermaid diagrams plus shareable documentation. It answers the fundamental question every developer has: *"What agents, skills, hooks, and MCPs do I have?"*

[![npm version](https://img.shields.io/npm/v/agentscope.svg)](https://www.npmjs.com/package/agentscope)
[![License](https://img.shields.io/badge/license-SEE%20LICENSE-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## Quick Start

```bash
# Install globally
npm install -g agentscope

# Or run directly with npx
npx agentscope scan
```

## Features

- **Claude Code Scanner** - Scans `.claude/`, `CLAUDE.md`, and user-level configs
- **MCP Scanner** - Parses `.mcp.json` for server definitions
- **Hierarchy Diagram** - Shows agent delegation relationships
- **Component Map Diagram** - Shows all agents, skills, hooks, commands, MCPs
- **Dataflow Diagram** - Shows request flow from user to agent to tools
- **Auto-generated Documentation** - README.md overview + detailed architecture docs
- **6 Built-in Themes** - Light, dark, high-contrast, and colorblind-safe options

## Usage

```bash
# Scan and generate docs (smart defaults)
agentscope scan

# Scan with custom output directory
agentscope scan --output ./docs/agents/

# Generate specific diagram only
agentscope scan --diagram hierarchy

# Use a specific theme
agentscope scan --theme dark
agentscope scan --theme colorblind-light
agentscope scan --theme high-contrast-dark

# Use custom theme file
agentscope scan --theme-path ./my-theme.json

# Output raw JSON (for tooling)
agentscope scan --format json

# Validate only (no doc generation)
agentscope validate
```

## Example Output

```
$ agentscope scan

AgentScope v0.1.0
Scanning: /Users/dev/my-project

Found:
  - 3 agents (2 project, 1 user)
  - 5 skills
  - 2 hooks
  - 4 MCP servers

Generated:
  ✓ docs/agent-architecture/README.md
  ✓ docs/agent-architecture/hierarchy.md
  ✓ docs/agent-architecture/component-map.md
  ✓ docs/agent-architecture/dataflow.md
  ✓ docs/agent-architecture/config.json
```

## Theme System

AgentScope includes 6 built-in themes for customizing diagram appearance:

| Theme | Description | Use Case |
|-------|-------------|----------|
| `light` | Default light theme with blue accents | Light mode, printing |
| `dark` | Dark theme with vibrant colors | Dark mode, terminals |
| `high-contrast-light` | WCAG AAA on light background | Accessibility |
| `high-contrast-dark` | WCAG AAA on dark background | Accessibility |
| `colorblind-light` | Okabe-Ito palette on light | Color vision deficiencies |
| `colorblind-dark` | Okabe-Ito palette on dark | Color vision deficiencies |

### Quick Theme Usage

```bash
# CLI flag
agentscope scan --theme dark

# Environment variable
export AGENTSCOPE_THEME=colorblind-light
agentscope scan

# Config file (agentscope.config.json)
{
  "theme": "high-contrast-dark"
}
```

See [Theme Documentation](docs/themes.md) for full details and custom theme creation.

### Theme Examples

View all themes rendered: [Theme Examples](docs/agent-architecture/examples/theme-examples.md)

## Programmatic API

```typescript
import { scan, generateHierarchy, generateComponentMap } from 'agentscope';

// Scan a directory
const config = await scan('/path/to/project');

// Generate diagrams with theme
const hierarchy = generateHierarchy(config, { theme: 'dark' });
const componentMap = generateComponentMap(config, { theme: 'colorblind-light' });
```

## Documentation

- [Theme System](docs/themes.md) - Customizing diagram appearance
- [Theme Examples](docs/agent-architecture/examples/theme-examples.md) - Visual examples of all themes
- [API Documentation](docs/architecture/interfaces.md) - TypeScript interfaces
- [Architecture](docs/architecture/ARCHITECTURE.md) - System design
- [Changelog](CHANGELOG.md) - Version history
- [Contributing](CONTRIBUTING.md) - How to contribute
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community guidelines

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

## License

See [LICENSE](LICENSE) for details.

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

**Quick summary:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Write tests first (TDD required)
4. Make your changes
5. Sign your commits with DCO (`git commit -s`)
6. Submit a pull request

## Security

For security concerns, please see our [Security Policy](SECURITY.md).

## Support

- [GitHub Issues](https://github.com/vipasane/agentscope/issues) - Bug reports and feature requests
- [Discussions](https://github.com/vipasane/agentscope/discussions) - Questions and community chat

---

Made with AI-assisted development using [Claude Code](https://claude.ai)
