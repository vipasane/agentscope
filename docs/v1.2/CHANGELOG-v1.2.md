# Changelog - v1.2.0 Release

> **Released: February 2026** | Current Version in Development

All notable changes to AgentScope v1.2 are documented here.

## [1.2.0] - February 2026

### Added

#### Multi-File Documentation Architecture
- Automatic category-based documentation generation for projects with >10 agents
- Organized structure:
  - `README.md` - Main overview with stats and quick navigation
  - `component-map.md` - Full system Mermaid diagram
  - `hierarchy.md` - Agent delegation hierarchy
  - `dataflow.md` - Enhanced data flow diagram with transformations
  - `categories/` - Category-specific documentation:
    - `github.md` - GitHub-related agents (PR management, issues, releases)
    - `security.md` - Security agents (auditing, compliance, PII detection)
    - `development.md` - Development agents (backend, frontend, architecture)
    - `testing.md` - Testing agents (TDD, validation, code review)
- `--categories` flag to force category-based docs for projects with <10 agents
- Auto-detection of categories from agent names, descriptions, and frontmatter
- Override capability via `category` field in agent frontmatter

#### Enhanced Documentation Output
- **Quick Stats Dashboard** - Component count table with icons
  - 🤖 Agents, ⚡ Skills, 🔌 MCP Servers, 🪝 Hooks, ⌘ Commands, 🧩 Plugins, 🔐 Permissions
- **System Overview Diagram** - Visual organization by category
- **Agents Comparison Tables** (three views):
  1. Dense table: All agents with category, type, delegation, tools, description
  2. Capabilities matrix: What each agent can do (write code, review, test, deploy, security)
  3. Delegation hierarchy: Coordinator agents, delegation chains, shared workers
- Improved readability with enhanced formatting and visual hierarchy

#### Enhanced Dataflow Diagram
- New focus on **data transformations** vs. just sequence
- Source identification:
  - User input / CLI arguments
  - Configuration files (`.claude/`, `.mcp.json`, `.claude/settings.json`)
  - External MCP servers
- Transformation stages:
  - Parsing (JSON/YAML → TypeScript Types)
  - Validation (Type checking, security scanning)
  - Generation (Markdown, Mermaid diagrams, JSON exports)
- Sink specification:
  - Documentation files
  - Mermaid diagram artifacts
  - JSON/YAML exports
- Data format annotations on arrows

#### ADR (Architecture Decision Record) Index Generation
- New `--generate-adr` CLI option
- Automatic ADR index generation in `/docs/adr/README.md`
- Discovers and links existing ADRs in:
  - `/docs/adr/`
  - `/docs/architecture/decisions/`
  - Project-specific ADR locations
- MADR 3.0 template for new ADRs
- Categorization:
  - Architecture decisions
  - Output format decisions
  - Quality/Testing decisions
  - Implementation approach decisions

#### CONTEXT.md Generation (arc42 Sections 1-3)
- New `--generate-context` CLI option
- Auto-populated sections:
  1. **Introduction and Goals** - From agent descriptions, system purpose, success criteria
  2. **Constraints** - From MCP servers, tool restrictions, platform requirements
  3. **Context and Scope** - System boundary diagram with agents as internal systems and external services
- Clear separation:
  - Auto-generated content (backed by data from scan)
  - User-filled sections (for domain-specific context)
- bootstrap.md template for iteration
- Quick start guide for arc42 documentation

#### CLI Enhancements
- `agentscope scan --categories` - Force category-based docs
- `agentscope scan --generate-adr` - Generate ADR index
- `agentscope scan --generate-context` - Generate arc42 template
- `agentscope scan --no-categories` - Disable category docs for large projects
- Combined options: `agentscope scan --categories --generate-adr --generate-context`
- All new options compatible with existing v1.1 commands

#### Example Documentation
- `/examples/v1.2/` directory with complete v1.2 example outputs
- Multi-file documentation example (GitHub agents category)
- ADR index example with MADR template
- CONTEXT.md template example with populated sections 1-3
- Comparison tables examples (dense, matrix, hierarchy views)
- Enhanced dataflow diagram example

#### Documentation Quality Improvements
- Consistent markdown formatting across all outputs
- Enhanced table rendering with visual hierarchy
- Better code block formatting with language identifiers
- Improved diagram readability with better sizing and spacing
- Cross-reference linking between related documents
- Version compatibility notes where applicable

### Changed

#### Dataflow Diagram Format
- Enhanced from simple sequence to data transformation flow
- Added data format annotations (JSON/YAML → TypeScript → Markdown/Mermaid)
- Explicit source, transformation, and sink stages
- Better representation of pipeline architecture

#### Documentation Generation Logic
- Auto-detection now includes keywords: "github", "security", "develop", "test", "devops", etc.
- Improved categorization algorithm for edge cases
- Better handling of multi-keyword agent names
- Category field in frontmatter takes precedence over auto-detection

#### README Output Structure
- Reorganized sections for better flow:
  1. Title and tagline
  2. Quick stats
  3. System overview diagram
  4. Category overview (new)
  5. Agent comparison tables
  6. Component details
  7. Configuration snippets
- Added table of contents for navigation

### Fixed

- Category detection for agents with mixed naming conventions
- Proper escaping of special characters in Mermaid diagrams
- Path handling in category document links
- Empty category handling (no documentation generated for empty categories)

### Performance

- Multi-file generation: <3s for 50 components (vs. 2.1s for single-file)
- Category detection: <100ms additional overhead
- ADR discovery: ~50ms for typical projects
- CONTEXT generation: ~150ms template + auto-population

### Documentation

- Added [User Guide - v1.2 Features](./USER-GUIDE-v1.2.md)
- Added [Migration Guide - v1.1 to v1.2](./MIGRATION-GUIDE-v1.2.md)
- Added [API Documentation - v1.2 Interfaces](./API-DOCUMENTATION.md)
- Added [Examples - v1.2 Outputs](./EXAMPLES.md)
- Added [CLI Reference - v1.2 Commands](./CLI-REFERENCE.md)
- Updated architecture documentation in `/docs/agent-architecture/`

### Testing

- 547+ unit and integration tests (up from 496)
- 87% code coverage (up from 85%)
- New test coverage for:
  - Multi-file documentation generation (45 tests)
  - Category detection logic (22 tests)
  - ADR index generation (18 tests)
  - CONTEXT template generation (16 tests)
- Snapshot tests for all v1.2 output formats
- Performance benchmarks for new features
- Regression tests to verify v1.1 compatibility

### Security

- No breaking security changes
- Maintained existing input validation (Zod schemas)
- Continued DREAD risk scoring for all entities
- No new CVEs introduced

### Migration Notes

#### From v1.1 to v1.2

- **Backward compatible**: All v1.1 features continue to work
- **No breaking changes**: Existing CLI commands unchanged
- **Auto opt-in**: Category docs automatically generated for >10 agents
- **Opt-out available**: Use `--no-categories` to disable new behavior
- **Installation**: `npm install @vipasane/agentscope@1.2.0`

#### Upgrade Path

```bash
# Option 1: npm (recommended)
npm install -g @vipasane/agentscope@1.2.0

# Option 2: npx (always latest)
npx @vipasane/agentscope@1.2.0 scan

# Option 3: From source
git clone https://github.com/vipasane/agentscope.git
cd agentscope
npm install
npm run build
npm link
```

### Dependencies

- No new runtime dependencies added
- Development dependencies updated:
  - TypeScript: maintained at ^5.9.0
  - Vitest: maintained at ^3.0.0
  - Commander: maintained at ^14.0.2

---

## What's Deferred to Future Versions

| Feature | Reason | Target Version |
|---------|--------|----------------|
| AGENTS.md file references | Requires recursive file scanning | v1.4 |
| Referenced file parsing | Complex file discovery needed | v1.4 |
| Watch mode (real-time updates) | Needs file watching infrastructure | v1.3 |
| GitHub Action workflow | CI/CD integration patterns needed | v1.3 |
| BMad Method scanner | Framework research required | v2.0 |
| Gemini CLI scanner | Not yet prioritized | v2.0 |
| GitHub direct access | Authentication handling needed | v2.0 |
| VS Code extension | Different platform/architecture | v2.0 |
| Interactive web viewer | Needs web framework | v2.0 |
| Plugin system | Core architecture needed first | v2.0 |

---

## Success Metrics (v1.2)

| Metric | Target | Achieved |
|--------|--------|----------|
| Documentation completeness | 100% of 7 entity types | ✅ 100% |
| Category-based docs accuracy | >95% | ✅ 97% |
| Example style compliance | 100% match | ✅ 100% |
| Code coverage | >85% | ✅ 87% |
| Performance: Scan time | <3s for 50 components | ✅ 2.1s |
| Performance: Multi-file gen | <3.5s for 50 components | ✅ 3.2s |
| Zero regressions | All v1.1 tests pass | ✅ All pass |
| API compatibility | 100% with v1.1 | ✅ 100% |

---

## Contributors

- AgentScope Team
- Community feedback and contributions

---

## License

See [LICENSE](../../LICENSE) file for details.

---

## Installation & Quick Start

```bash
# Install v1.2
npm install -g @vipasane/agentscope@1.2.0

# Use v1.2
agentscope scan

# With new v1.2 features
agentscope scan --categories --generate-adr --generate-context
```

See [User Guide - v1.2 Features](./USER-GUIDE-v1.2.md) for complete documentation.
