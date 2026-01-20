# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project documentation structure (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY)
- GitHub Actions AI review workflow with multi-persona reviewers
- Auto-fix workflow triggered by `@claude fix` comments
- Git hooks for conventional commits and secrets detection
- Definition of Done documentation
- **Architecture documentation** (20 files, 13K+ lines):
  - DDD Implementation with 4 bounded contexts
  - Security Architecture with STRIDE/DREAD threat model
  - Memory Architecture with HNSW patterns
  - 10 ADRs in MADR format
  - Entity Catalog with 7 entity types
  - Visualization Architecture with Mermaid diagrams
- **Self-learning skills**:
  - `commit-push-pr`: Automated commit→push→stacked PR workflow
  - `pr-validator`: PR validation with deterministic checks + learning
- **Deterministic First Principle** in CLAUDE.md
- **Learned patterns database** for secret detection, whitespace, PR summaries
- PR executive summaries in `docs/PRs/` directory

### Changed
- Updated CLAUDE.md with Deterministic First Principle
- Renamed duplicate research file (10-*.md → 12-*.md)
- Added historical warning to Executive Summary

### Deprecated
- Nothing yet

### Removed
- Nothing yet

### Fixed
- Nothing yet

### Security
- Nothing yet

---

## [0.1.0] - TBD

### Added
- Initial release
- Claude Code configuration scanner
- MCP server scanner
- Component Map diagram generation (Mermaid)
- Workflow Sequence diagram generation (Mermaid)
- README.md documentation generator
- AGENTS.md documentation generator
- CLI commands: `scan`, `validate`

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 0.1.0 | TBD | Initial release with core scanning and diagram generation |

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality (backward compatible)
- **PATCH** version for bug fixes (backward compatible)

## Contributing

When contributing, add your changes under the `[Unreleased]` section using the appropriate category:

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes
