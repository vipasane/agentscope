# AgentScope Documentation

> Agent Architecture Documentation & Visualization Tool

## Quick Links

| Document | Purpose | Status |
|----------|---------|--------|
| [**themes.md**](./themes.md) | Theme system documentation | ✅ Current |
| [**agent-architecture/**](./agent-architecture/) | Generated documentation examples | ✅ Current |
| [**architecture/**](./architecture/) | System architecture & interfaces | ✅ Current |
| [**adr/**](./adr/) | Architecture Decision Records | ✅ Current |
| [**AgentScope-PRD-v2.md**](./AgentScope-PRD-v2.md) | Product Requirements | ✅ Reference |
| [**archive/**](./archive/) | Historical & internal docs | 🗄️ Archived |

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
├── architecture/
│   ├── ARCHITECTURE.md          # System design overview
│   ├── component-diagram.md     # Module structure
│   └── interfaces.md            # TypeScript interfaces
├── adr/
│   ├── README.md                # ADR index
│   ├── ADR-001-mermaid-theme-system.md  # Theme system decisions
│   ├── ARCHITECTURE-theme-system.md     # Theme architecture
│   ├── DDD-theme-system.md              # Domain design
│   └── SECURITY-theme-system.md         # Security considerations
├── DEFINITION_OF_DONE.md        # Quality gates
└── CHANGELOG.md                 # Version history (also at repo root)
```

### Archived Documentation

```
docs/archive/
├── README.md                    # Archive index
├── AgentScope-PRD-v1-ARCHIVED.md
├── research/                    # Development research docs
├── review/                      # Code review docs
└── performance/                 # Performance analysis docs
```

---

## For Users

### Getting Started
1. Install: `npm install -g agentscope`
2. Run: `agentscope scan`
3. Configure theme: `agentscope scan --theme dark`

### Customize Themes
- See [themes.md](./themes.md) for theme documentation
- See [theme-examples.md](./agent-architecture/examples/theme-examples.md) for visual examples

---

## For Contributors

### Start Here
1. Read [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) - system design
2. Review [interfaces.md](./architecture/interfaces.md) - TypeScript interfaces
3. Check [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) - quality requirements

### Adding Features
1. Create ADR in `adr/` folder
2. Follow existing patterns in codebase
3. Add tests (80% coverage required)
4. Update documentation

---

## Document Versioning

| Version | Date | Changes |
|---------|------|---------|
| v0.1.0 | Jan 2025 | Initial release with theme system |

---

*Documentation managed by AgentScope team*
