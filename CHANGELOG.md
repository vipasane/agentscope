# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-22

### Added

#### Core Features
- Claude Code configuration scanner (`.claude/`, `CLAUDE.md`, user configs)
- MCP server scanner (`.mcp.json` parsing)
- Agent hierarchy diagram generation (Mermaid)
- Component map diagram generation (Mermaid)
- Dataflow sequence diagram generation (Mermaid)
- Auto-generated README.md documentation
- JSON export for tooling integration

#### Theme System
- 6 built-in themes: light, dark, high-contrast-light, high-contrast-dark, colorblind-light, colorblind-dark
- ThemeRegistry singleton for theme management
- ThemeLoader with resolution priority (CLI → config → env → default)
- MermaidThemeGenerator for Mermaid init directives and classDefs
- Custom theme JSON file support with validation
- Okabe-Ito colorblind-safe palette
- WCAG AAA high-contrast themes
- Environment variable support (`AGENTSCOPE_THEME`)

#### CLI
- `scan` command with smart defaults
- `--theme <name>` option for built-in themes
- `--theme-path <file>` option for custom themes
- `--output <dir>` option for custom output directory
- `--diagram <type>` option for specific diagram generation
- `--format json` option for raw JSON output
- `validate` command for configuration validation

#### Documentation
- Comprehensive theme documentation with examples
- Theme examples showing all 6 variants
- API documentation with TypeScript interfaces
- Architecture documentation

#### Testing
- 365 tests (unit + integration)
- 131 theme-specific tests
- E2E tests for real project scanning
- Performance benchmarks

### Performance
- Theme generator: ~500k ops/sec
- Registry lookup: ~13.8M ops/sec
- Full diagram generation (5 agents): ~68k ops/sec
- Full diagram generation (50 agents): ~12k ops/sec

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 0.1.0 | 2025-01-22 | Initial release with scanning, diagrams, and theme system |

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality (backward compatible)
- **PATCH** version for bug fixes (backward compatible)

## Contributing

When contributing, add your changes under a new `[Unreleased]` section using the appropriate category:

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes
