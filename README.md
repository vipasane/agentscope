# AgentScope

> From chaos to clarity - AgentScope maps your agents.

**Agent Architecture Documentation & Visualization Tool**

AgentScope is an open-source CLI tool that automatically scans Claude Code agent configurations and generates Mermaid diagrams plus shareable documentation. It answers the fundamental question every developer has: *"What agents, skills, hooks, and MCPs do I have?"*

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
- **Component Map Diagram** - Shows all agents, skills, hooks, commands, MCPs
- **Workflow Sequence Diagram** - Shows request flow from user to agent to tools
- **Auto-generated Documentation** - README.md overview + detailed AGENTS.md

## Usage

```bash
# Scan and generate docs (smart defaults)
agentscope scan

# Scan with custom output directory
agentscope scan --output ./docs/agents/

# Generate specific diagram only
agentscope scan --diagram hierarchy

# Output raw JSON (for tooling)
agentscope scan --format json

# Validate only (no doc generation)
agentscope validate
```

## Example Output

```
$ agentscope scan

AgentScope v1.0.0
Scanning: /Users/dev/my-project

Found:
  - 3 agents (2 project, 1 user)
  - 5 skills
  - 2 hooks
  - 4 MCP servers

Generated:
  ✓ docs/agent-architecture/README.md
  ✓ docs/agent-architecture/AGENTS.md
  ✓ docs/agent-architecture/raw/agentscope.json
```

## Documentation

- [Product Requirements (PRD)](docs/AgentScope-PRD-v2.md) - Full specification
- [Research & Decisions](docs/research/) - Background research and rationale
- [Changelog](docs/CHANGELOG.md) - Version history
- [Contributing](CONTRIBUTING.md) - How to contribute
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community guidelines

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
