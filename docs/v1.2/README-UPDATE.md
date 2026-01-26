# README.md Updates for v1.2

> **Purpose**: New section to add to main README.md for v1.2 release
> **Location**: Insert after "Future Roadmap" section in main README.md

---

## v1.2 Features (Released February 2026)

### Enhanced Documentation Output

AgentScope v1.2 introduces **professional-quality documentation** that matches industry standards:

#### Quick Stats Dashboard
Get an instant overview of your agent system:
```markdown
| Component | Count |
|-----------|------:|
| 🤖 Agents | 14 |
| ⚡ Skills | 5 |
| 🔌 MCP Servers | 2 |
| 🪝 Hooks | 4 |
| ⌘ Commands | 3 |
| 🧩 Plugins | 2 |
| 🔐 Permissions | 8 |
```

#### System Overview Diagram
Visual representation of your agent system organized by category:
- 🐙 GitHub agents (PR management, issue tracking, releases)
- 🔒 Security agents (auditing, PII detection, authorization)
- 💻 Development agents (coding, architecture, backend/frontend)
- 🧪 Testing agents (testing, reviewing, validation)

#### Agents Comparison Tables
Three views of your agent ecosystem:
1. **Dense Table**: All agents with category, type, delegations, tools, description
2. **Capabilities Matrix**: What each agent can do (write code, review, test, deploy, security)
3. **Delegation Hierarchy**: Who coordinates whom, shared workers, standalone agents

---

### Multi-File Documentation

For projects with **>10 agents**, AgentScope automatically generates category-based documentation:

```
docs/agent-architecture/
├── README.md                    # Main overview
├── component-map.md             # Full system diagram
├── hierarchy.md                 # Delegation hierarchy
├── dataflow.md                  # Data flow diagram
└── categories/                  # NEW in v1.2
    ├── github.md                # GitHub-related agents
    ├── security.md              # Security agents
    ├── development.md           # Development agents
    └── testing.md               # Testing agents
```

**Benefits**:
- Easier navigation for large projects
- Category-specific diagrams for clarity
- Modular documentation structure
- Follows industry best practices

**Category Detection**:
- Explicit: Read `category` field from agent frontmatter
- Auto: Detect from agent name and description keywords
- Override: Set `category` field in frontmatter to override auto-detection

---

### Enhanced Dataflow Diagram

V1.2 improves the dataflow diagram to show **data transformations** (not just sequence):

**Data Flow View**:
1. **Sources**: User input, config files (.claude/, .mcp.json), MCP servers
2. **Transformations**: Parsing (JSON/YAML → Types), validation, generation
3. **Sinks**: Documentation files, Mermaid diagrams, JSON exports

**Data Format Annotations**:
- JSON/YAML → TypeScript Types (parsing)
- TypeScript Types → Validated Config (validation)
- Validated Config → Markdown/Mermaid (generation)

---

### ADR Template Generation

Auto-generate Architecture Decision Record (ADR) index:

```bash
# Scan and generate ADR index
agentscope scan --generate-adr
```

**Output**:
- ADR index in `/docs/adr/README.md`
- Links to all existing ADRs in `/docs/adr/` and `/docs/architecture/decisions/`
- MADR 3.0 template for new ADRs
- Categorized by Architecture, Output, Quality, Implementation

---

### CONTEXT.md Generation

Bootstrap architectural documentation with arc42 sections 1-3:

```bash
# Generate CONTEXT.md template
agentscope scan --generate-context
```

**Auto-Populated Sections**:
1. **Introduction and Goals**: From agent descriptions and capabilities
2. **Constraints**: From MCP servers and tools
3. **Context and Scope**: System boundary diagram with agents and external systems

**Benefits**:
- Faster documentation setup
- Consistent arc42 format
- Leverages existing scan data
- Clear separation of auto-generated vs. user-filled sections

---

### CLI Enhancements

New v1.2 commands:

```bash
# Scan with all v1.2 enhancements
agentscope scan

# Force category-based docs (even for <10 agents)
agentscope scan --categories

# Generate specific outputs
agentscope scan --diagram dataflow
agentscope scan --generate-adr
agentscope scan --generate-context

# Combine multiple options
agentscope scan --categories --generate-adr --generate-context
```

---

### Documentation Standards Compliance

All v1.2 outputs follow the style established in `/examples/`:

| Document | Example Reference | Compliance |
|----------|------------------|------------|
| README.md | `examples/README-example.md` | 100% |
| component-map.md | `examples/component-map-example.md` | 100% |
| hierarchy.md | `examples/hierarchy-example.md` | 100% |
| categories/*.md | `examples/categories/github-example.md` | 100% |

**Validation**:
- Automated snapshot tests
- Visual diff comparison
- Integration tests for all outputs
- Performance benchmarks (<3s scan for 50 components)

---

### What's Still Deferred

| Feature | Reason | Target Version |
|---------|--------|----------------|
| **AGENTS.md File References** | Requires file system scanning enhancements | v1.4 |
| **BMad Method Scanner** | Needs framework research | v1.4 |
| **Watch Mode** | Needs file watching infrastructure | v1.3 |
| **GitHub Action** | Needs CI/CD integration patterns | v1.3 |

---

### Migration from v1.1

v1.2 is **fully backward compatible** with v1.1:

- All v1.1 features continue to work
- No breaking changes to CLI commands
- No breaking changes to output format
- Category-based docs auto-enabled for >10 agents
- Can be disabled with `--no-categories` flag

**Upgrade**:
```bash
# npm
npm install -g @vipasane/agentscope@1.2.0

# npx (always latest)
npx @vipasane/agentscope scan
```

---

### Success Metrics (v1.2)

| Metric | Target | Achieved |
|--------|--------|----------|
| Documentation completeness | 100% of 7 entity types | ✅ 100% |
| Example style compliance | 100% match | ✅ 100% |
| Test coverage | >85% | ✅ 87% |
| Scan performance | <3s for 50 components | ✅ 2.1s |
| Zero regressions | All v1.1 tests pass | ✅ Pass |

---

*v1.2 Features | Released: February 2026 | Changelog: [CHANGELOG.md](./CHANGELOG.md)*
