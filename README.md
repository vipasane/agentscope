# AgentScope

> From chaos to clarity - AgentScope maps your agents.

**Agent Architecture Documentation & Visualization Tool**

> **ALPHA RELEASE** - This is an early alpha version. APIs and features may change. Feedback welcome!

AgentScope is an open-source CLI tool that automatically scans Claude Code agent configurations and generates Mermaid diagrams plus shareable documentation. It answers the fundamental question every developer has: *"What agents, skills, hooks, and MCPs do I have?"*

[![npm version](https://img.shields.io/npm/v/agentscope.svg)](https://www.npmjs.com/package/@vipasane/agentscope)
[![License](https://img.shields.io/badge/license-SEE%20LICENSE-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Alpha](https://img.shields.io/badge/status-alpha-orange.svg)](https://github.com/vipasane/agentscope)

## Quick Start

```bash
# Install globally
npm install -g @vipasane/agentscope

# Or run directly with npx
npx @vipasane/agentscope scan
```

---

## Feature Matrix

### Scanning & Discovery

| Feature | Version | Implemented |
|---------|---------|-------------|
| Read Claude Code setup (`.claude/` directory) | v1.0 | ✅ |
| Read `CLAUDE.md` configuration | v1.0 | ✅ |
| Read `.claude/settings.json` | v1.1 | ✅ |
| Read `.mcp.json` MCP server definitions | v1.0 | ✅ |
| Read user-level configs (`~/.claude/`) | v1.0 | ✅ |
| Recursive discovery of `CLAUDE.md` from subfolders | v1.2 | |
| Read `AGENTS.md` support | v1.2 | |
| Read other files referenced in `CLAUDE.md` | v1.2 | |
| Read directly from GitHub repository | v1.3 | |
| BMad Method scanner | v1.3 | |
| Gemini CLI scanner | v2.0 | |

### Entity Types

| Feature | Version | Implemented |
|---------|---------|-------------|
| Parse Agents (tools, skills, delegation) | v1.0 | ✅ |
| Parse Skills (configurations, parameters) | v1.0 | ✅ |
| Parse MCP Servers (definitions, capabilities) | v1.0 | ✅ |
| Parse Commands (custom definitions) | v1.0 | ✅ |
| Parse Hooks (9 event types) | v1.1 | ✅ |
| Parse Plugins (marketplace IDs) | v1.1 | ✅ |
| Parse Permissions (Tool DSL patterns) | v1.1 | ✅ |

### Export & Import

| Feature | Version | Implemented |
|---------|---------|-------------|
| Export configuration to JSON | v1.1 | ✅ |
| Import configuration from JSON | v1.1 | ✅ |
| Export to Claude Code format | v1.1 | ✅ |
| Import to Claude Code format | v1.1 | ✅ |
| Path transformation (cross-platform) | v1.1 | ✅ |
| Secrets sanitization (placeholder replacement) | v1.1 | ✅ |
| Export from GitHub | v1.3 | |
| Import from GitHub | v1.3 | |

### Migration

| Feature | Version | Implemented |
|---------|---------|-------------|
| Migration Windows → Linux | v1.1 | ✅ |
| Migration Linux → Windows | v1.1 | ✅ |
| Migration macOS → Windows | v1.1 | ✅ |
| Migration Windows → macOS | v1.1 | ✅ |
| Migration Claude Code → Claude Code (cross-project) | v1.1 | ✅ |
| Migration with secrets prompting | v1.1 | ✅ |
| Validation on import | v1.1 | ✅ |

### Diagrams

| Feature | Version | Implemented |
|---------|---------|-------------|
| Hierarchy Diagram (agent delegation) | v1.0 | ✅ |
| Component Map Diagram (all entities) | v1.0 | ✅ |
| Dataflow Diagram (request flow) | v1.0 | ✅ |
| Permission Matrix Diagram | v1.2 | |
| Hook Lifecycle Diagram | v1.2 | |
| Custom diagram templates | v2.0 | |

### Themes

| Feature | Version | Implemented |
|---------|---------|-------------|
| Light theme | v1.0 | ✅ |
| Dark theme | v1.0 | ✅ |
| High-contrast light (WCAG AAA) | v1.0 | ✅ |
| High-contrast dark (WCAG AAA) | v1.0 | ✅ |
| Colorblind-safe light (Okabe-Ito) | v1.0 | ✅ |
| Colorblind-safe dark (Okabe-Ito) | v1.0 | ✅ |
| Custom theme file support | v1.0 | ✅ |

### Documentation Output

| Feature | Version | Implemented |
|---------|---------|-------------|
| Generate README.md overview | v1.0 | ✅ |
| Generate AGENTS.md detailed docs | v1.0 | ✅ |
| Generate raw JSON config | v1.0 | ✅ |
| Embed Mermaid diagrams | v1.0 | ✅ |
| Summary statistics | v1.0 | ✅ |
| Configuration snippets | v1.0 | ✅ |
| Security summary section | v1.2 | |
| Agent capability matrix | v1.2 | |
| Cross-reference links | v1.2 | |
| Improved visual hierarchy | v1.2 | |
| Generate llms.txt (AI discovery) | v1.3 | |
| Generate CONTEXT.md (arc42) | v1.3 | |
| ADR template generation (MADR) | v1.3 | |

### Security

| Feature | Version | Implemented |
|---------|---------|-------------|
| Input validation (Zod schemas) | v1.0 | ✅ |
| DREAD risk analysis scoring | v1.1 | ✅ |
| Mermaid directive injection prevention | v1.0 | ✅ |
| Command injection prevention | v1.1 | ✅ |
| ReDoS prevention (input length) | v1.1 | ✅ |
| Path traversal prevention | v1.0 | ✅ |
| HTML entity sanitization | v1.0 | ✅ |
| Claude Code settings validation | v1.2 | |
| CLAUDE.md prompt injection detection | v1.2 | |
| Agent configuration security checks | v1.2 | |
| MCP endpoint validation | v1.2 | |
| Secret detection in agent configs | v1.2 | |

### Agent Analysis

| Feature | Version | Implemented |
|---------|---------|-------------|
| Delegation chain analysis | v1.2 | |
| Circular delegation detection | v1.2 | |
| Tool access matrix generation | v1.2 | |
| Skill coverage analysis | v1.2 | |
| Hook security validation | v1.2 | |
| Delegation depth calculation | v1.2 | |

### Multi-Platform Support

| Feature | Version | Implemented |
|---------|---------|-------------|
| Claude Code scanner | v1.0 | ✅ |
| Cursor agent configurations | v1.2 | |
| Gemini CLI configurations | v1.2 | |
| Platform auto-detection | v1.2 | |
| Unified agent model | v1.2 | |
| GitHub Copilot configs | v2.0 | |
| Windsurf configurations | v2.0 | |

### Template Generation

| Feature | Version | Implemented |
|---------|---------|-------------|
| ADR templates (MADR) | v1.1 | ✅ |
| CONTEXT.md template | v1.1 | ✅ |
| Agent definition templates | v1.2 | |
| Skill templates | v1.2 | |
| Hook templates | v1.2 | |
| MCP server templates | v1.2 | |
| Permission templates | v1.2 | |

### CLI & Integration

| Feature | Version | Implemented |
|---------|---------|-------------|
| CLI `scan` command | v1.0 | ✅ |
| CLI `validate` command | v1.0 | ✅ |
| CLI `export` command | v1.1 | ✅ |
| CLI `import` command | v1.1 | ✅ |
| CLI `template` command | v1.2 | |
| JSON output format | v1.0 | ✅ |
| Custom output directory | v1.0 | ✅ |
| Programmatic API | v1.0 | ✅ |
| Watch mode (real-time updates) | v1.3 | |
| GitHub Action | v1.3 | |
| VS Code extension | v2.0 | |
| Interactive web viewer | v2.0 | |
| Plugin system | v2.0 | |

### Test Coverage

| Feature | Version | Implemented |
|---------|---------|-------------|
| Security validators (203 tests) | v1.1 | ✅ |
| Scanner modules (144 tests) | v1.1 | ✅ |
| Export/Import (109 tests) | v1.1 | ✅ |
| Formatters (25 tests) | v1.1 | ✅ |
| Integration tests (15 tests) | v1.1 | ✅ |
| **Total: 496+ tests** | v1.1 | ✅ |

---

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

# Export configuration (cross-platform)
agentscope export --output ./exported-config.json

# Import configuration
agentscope import ./exported-config.json --target ./new-project/

# Output raw JSON (for tooling)
agentscope scan --format json

# Validate only (no doc generation)
agentscope validate

# Generate templates (v1.2)
agentscope template agent    # Agent definition with secure defaults
agentscope template skill    # Skill template
agentscope template hook     # Hook template
agentscope template mcp      # MCP server template
```

## Example Output

```
$ agentscope scan

AgentScope v1.2.0-alpha
Scanning: /Users/dev/my-project
Platform detected: Claude Code

Found:
  - 3 agents (2 project, 1 user)
  - 5 skills
  - 4 hooks (PreToolUse, PostToolUse, SessionStart, Stop)
  - 2 commands
  - 3 plugins
  - 12 permission rules (8 allow, 2 deny, 2 ask)
  - 4 MCP servers

Generated:
  ✓ docs/agent-architecture/README.md (with security summary)
  ✓ docs/agent-architecture/AGENTS.md (with capability matrix)
  ✓ docs/agent-architecture/hierarchy.md
  ✓ docs/agent-architecture/component-map.md
  ✓ docs/agent-architecture/dataflow.md
  ✓ docs/agent-architecture/delegation-chain.md (NEW)
  ✓ docs/agent-architecture/tool-access-matrix.md (NEW)
  ✓ docs/agent-architecture/config.json

Security Analysis (v1.2):
  ✓ All entities validated (DREAD score: Low risk)
  ✓ No prompt injection patterns detected
  ✓ No secrets found in agent configs
  ✓ MCP endpoints use secure protocols
  ✓ Permissions follow least-privilege principle
  ⚠ Warning: Circular delegation detected (coder → reviewer → coder)

Agent Analysis (v1.2):
  ✓ Delegation depth: 3 levels (max)
  ✓ Tool coverage: 85% (17/20 tools used)
  ✓ Skill coverage: 90% (9/10 skills assigned)
  ℹ 2 agents share identical tool permissions (consider consolidation)
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

## Programmatic API

```typescript
import { scan, generateHierarchy, generateComponentMap } from '@vipasane/agentscope';

// Scan a directory
const config = await scan('/path/to/project');

// Generate diagrams with theme
const hierarchy = generateHierarchy(config, { theme: 'dark' });
const componentMap = generateComponentMap(config, { theme: 'colorblind-light' });

// Export configuration
import { exportConfig } from '@vipasane/agentscope/export';
const exported = await exportConfig(config, {
  sanitizeSecrets: true,
  transformPaths: true
});

// Import configuration
import { importConfig } from '@vipasane/agentscope/import';
await importConfig(exported, '/path/to/target');
```

## Documentation

- [Scope Definition](docs/SCOPE.md) - What AgentScope scans and what it doesn't
- [Theme System](docs/themes.md) - Customizing diagram appearance
- [Theme Examples](docs/agent-architecture/examples/theme-examples.md) - Visual examples of all themes
- [API Documentation](docs/architecture/interfaces.md) - TypeScript interfaces
- [Architecture](docs/architecture/ARCHITECTURE.md) - System design
- [PRD](docs/AgentScope-PRD-v2.md) - Product Requirements Document
- [Changelog](CHANGELOG.md) - Version history
- [Contributing](CONTRIBUTING.md) - How to contribute

### Architecture Decision Records (ADRs)
- [ADR-001](docs/adr/ADR-001-unified-config-model.md) - Unified Config Model
- [ADR-002](docs/adr/ADR-002-mermaid-security.md) - Mermaid Security
- [ADR-003](docs/adr/ADR-003-settings-scanner.md) - Settings Scanner Architecture
- [ADR-004](docs/adr/ADR-004-permission-parser.md) - Permission Parser Design
- [ADR-005](docs/adr/ADR-005-plugin-parser.md) - Plugin Parser Design
- [ADR-006](docs/adr/ADR-006-hook-parser.md) - Hook Parser Design
- [ADR-007](docs/adr/ADR-007-export-import.md) - Export/Import System

---

## Roadmap

### v1.1 (Current Alpha)
- ✅ 7-entity type support
- ✅ Export/Import system
- ✅ Cross-platform migration
- ✅ DREAD security validation
- ✅ 496+ unit tests

### v1.2 (Next - Agent-Focused)
**Enhanced Documentation Output**
- Security summary section
- Agent capability matrix
- Cross-reference links between entities
- Improved visual hierarchy

**Agent Security Scanning**
- Claude Code settings validation
- CLAUDE.md prompt injection detection
- Agent configuration security checks
- MCP endpoint validation
- Secret detection in configs

**Advanced Agent Analysis**
- Delegation chain analysis (circular detection)
- Tool access matrix generation
- Skill coverage analysis
- Hook security validation

**Multi-Platform Support**
- Cursor agent configurations
- Gemini CLI configurations

**Template Generation**
- Agent definition templates
- Skill/hook/MCP templates with secure defaults

### v1.3 (Planned)
- Recursive `CLAUDE.md` discovery
- Referenced file parsing
- Read from GitHub directly
- Export to GitHub
- llms.txt generation
- BMad Method scanner
- Watch mode
- GitHub Action

### v2.0 (Future)
- VS Code extension
- Interactive web viewer
- Plugin system
- Advanced agent analytics

---

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

## License

See [LICENSE](LICENSE) for details.

## Development Setup

After cloning the repository, run the setup script to enable git hooks:

```bash
# Install git hooks (required once after clone)
./.githooks/install.sh

# Or manually:
git config core.hooksPath .githooks
```

### What's Included

| Directory | Contents |
|-----------|----------|
| `.claude/agents/` | 60+ agent definitions (coder, reviewer, security, etc.) |
| `.claude/skills/` | Reusable skills (commit-push-pr, pr-validator, etc.) |
| `.claude/hooks/` | Claude Code hooks for automation |
| `.githooks/` | Git hooks (secrets check, conventional commits) |
| `.secretsignore` | Exclusion list for false positive secrets |

### Git Hooks

- **pre-commit** - Secrets detection with `.secretsignore` support
- **commit-msg** - Enforces conventional commit format
- **pre-push** - Blocks direct push to main

To add false positive exclusions, edit `.secretsignore`:
```
# File paths
docs/architecture/SECURITY-ARCHITECTURE.md

# Line patterns (regex detection patterns in docs)
PATTERN:/sk-ant-

# Context patterns (placeholders)
CONTEXT:EXAMPLE_
```

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

**Quick summary:**
1. Fork the repository
2. Clone and run `./.githooks/install.sh`
3. Create a feature branch (`git checkout -b feat/amazing-feature`)
4. Write tests first (TDD required)
5. Make your changes
6. Sign your commits with DCO (`git commit -s`)
7. Submit a pull request

## Security

For security concerns, please see our [Security Policy](SECURITY.md).

## Support

- [GitHub Issues](https://github.com/vipasane/agentscope/issues) - Bug reports and feature requests
- [Discussions](https://github.com/vipasane/agentscope/discussions) - Questions and community chat

---

Made with AI-assisted development using [Claude Code](https://claude.ai)
