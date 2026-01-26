# AgentScope Documentation

> Agent Architecture Documentation & Visualization Tool

## Quick Links

| Document | Purpose | Status |
|----------|---------|--------|
| [**AgentScope-PRD-v2.md**](./AgentScope-PRD-v2.md) | Product Requirements (authoritative) | ✅ Current |
| [**themes.md**](./themes.md) | Theme system documentation | ✅ Current |
| [**agent-architecture/**](./agent-architecture/) | Generated documentation examples | ✅ Current |
| [**architecture/**](./architecture/) | System architecture, ADRs, reviews | ✅ Active |
| [**adr/**](./adr/) | Architecture Decision Records (v1.1) | ✅ Current |
| [**archive/**](./archive/) | Historical & superseded docs | 🗄️ Archived |

---

## Document Map

### User Documentation

```
docs/
├── themes.md                    # Theme system guide - START HERE for themes
└── agent-architecture/
    ├── README.md                # Generated output example
    ├── hierarchy.md             # Agent hierarchy diagram
    ├── component-map.md         # Component relationships
    ├── dataflow.md              # Request flow diagram
    └── examples/
        └── theme-examples.md    # All 6 themes visualized
```

### Developer Documentation

```
docs/
├── AgentScope-PRD-v2.md              # THE PRD - scope and requirements
├── architecture/
│   ├── SIMPLE-ARCHITECTURE.md        # MVP implementation guide
│   ├── ARCHITECTURE.md               # System design overview
│   ├── PLAN-CRITICAL-REVIEW.md       # Why we simplified
│   ├── DDD-CRITICAL-REVIEW.md        # DDD analysis
│   ├── ENTITY-CATALOG.md             # Entity definitions
│   ├── ANTHROPIC-BEST-PRACTICES.md   # Claude Code patterns
│   ├── DOC-AUDIT-REPORT.md           # Documentation audit
│   ├── interfaces.md                 # TypeScript interfaces
│   ├── decisions/                    # Architecture Decision Records
│   │   ├── README.md
│   │   └── ADR-001 through ADR-010
│   └── v2-roadmap/                   # Future architecture (deferred)
│       ├── README.md
│       ├── DDD-IMPLEMENTATION.md
│       ├── SECURITY-ARCHITECTURE.md
│       ├── MEMORY-ARCHITECTURE.md
│       └── VISUALIZATION-ARCHITECTURE.md
├── adr/                              # v1.1 ADRs
│   ├── README.md                     # ADR index
│   ├── ADR-001-unified-config-model.md
│   ├── ADR-002-mermaid-security.md
│   ├── ADR-003-settings-scanner.md
│   ├── ADR-004-permission-parser.md
│   ├── ADR-005-plugin-parser.md
│   ├── ADR-006-hook-parser.md
│   └── ADR-007-export-import.md
└── archive/
    └── research/                     # Development research docs
```

---

## For Users

### Getting Started
1. Install: `npm install -g @vipasane/agentscope`
2. Run: `agentscope scan`
3. Configure theme: `agentscope scan --theme dark`

### Customize Themes
- See [themes.md](./themes.md) for theme documentation
- See [theme-examples.md](./agent-architecture/examples/theme-examples.md) for visual examples

---

## For Contributors

### Start Here
1. Read [SIMPLE-ARCHITECTURE.md](./architecture/SIMPLE-ARCHITECTURE.md) - MVP guide
2. Review [AgentScope-PRD-v2.md](./AgentScope-PRD-v2.md) - scope and requirements
3. Check [interfaces.md](./architecture/interfaces.md) - TypeScript interfaces
4. Review ADRs in [adr/](./adr/) - architectural decisions

### Adding Features
1. Create ADR in `adr/` folder
2. Follow existing patterns in codebase
3. Add tests (80% coverage required)
4. Update documentation

### Architecture Reference

- [ADR Index](./adr/README.md) - All architecture decisions
- [Entity Catalog](./architecture/ENTITY-CATALOG.md) - Entity definitions
- [Anthropic Best Practices](./architecture/ANTHROPIC-BEST-PRACTICES.md) - Claude Code patterns

---

## Document Versioning

| Version | Date | Changes |
|---------|------|---------|
| v1.1.0-alpha | Jan 2026 | Enhanced entity documentation, export/import, themes |
| v2.2 | Jan 2026 | Simplified architecture, moved DDD/Security/Memory to v2-roadmap |
| v2.1 | Jan 2026 | Added architecture/ folder with DDD, ADRs, Security, Memory docs |
| v2.0 | Jan 2026 | PRD revised for 1-2 day MVP, quality gates added |

---

*Documentation managed by AgentScope team*
