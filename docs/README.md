# AgentScope Documentation

> Agent Architecture Documentation & Visualization Tool

## Quick Links

| Document | Purpose | Status |
|----------|---------|--------|
| [**AgentScope-PRD-v2.md**](./AgentScope-PRD-v2.md) | Product Requirements (authoritative) | ✅ Current |
| [**SIMPLE-ARCHITECTURE.md**](./architecture/SIMPLE-ARCHITECTURE.md) | MVP Implementation Guide | ✅ **START HERE** |
| [**architecture/**](./architecture/) | ADRs, critical reviews | ✅ Active |
| [**research/**](./research/) | Research findings and frameworks | ✅ Active |
| [**archive/**](./archive/) | Superseded documents | 🗄️ Historical |

---

## Document Map

### MVP Documents (Use These)

```
docs/
├── AgentScope-PRD-v2.md              # THE PRD - scope and requirements
├── architecture/
│   ├── SIMPLE-ARCHITECTURE.md        # MVP implementation guide (~200 lines)
│   ├── PLAN-CRITICAL-REVIEW.md       # Why we simplified
│   ├── DDD-CRITICAL-REVIEW.md        # DDD analysis
│   ├── ENTITY-CATALOG.md             # Entity definitions
│   ├── ANTHROPIC-BEST-PRACTICES.md   # Claude Code patterns
│   ├── DOC-AUDIT-REPORT.md           # Documentation audit
│   ├── decisions/                    # Architecture Decision Records
│   │   ├── README.md
│   │   ├── ADR-001 through ADR-010
│   │   └── ...
│   └── v2-roadmap/                   # DEFERRED - Not for MVP
│       ├── README.md                 # Why these are deferred
│       ├── DDD-IMPLEMENTATION.md     # Enterprise DDD (future)
│       ├── SECURITY-ARCHITECTURE.md  # Full security model (future)
│       ├── MEMORY-ARCHITECTURE.md    # ML/learning features (future)
│       └── VISUALIZATION-ARCHITECTURE.md  # Advanced diagrams (future)
└── research/
    ├── 01-critical-analysis.md       # Risk analysis
    ├── 06-claude-code-tuning-best-practices.md
    ├── 07-tdd-quality-framework.md
    └── 08-future-roadmap.md
```

### Reference Documents

```
docs/research/
├── 01-critical-analysis.md           # Risk analysis of original PRD
├── 02-alternatives-comparison.md     # Competitive landscape
├── 04-component-solutions.md         # npm stack recommendations
└── 05-questions-and-decisions.md     # Decision rationale
```

### Archived (Historical Only)

```
docs/archive/
├── README.md                         # Why these were archived
├── AgentScope-PRD-v1-ARCHIVED.md     # Original 20-week PRD
└── 03-simplification-proposal-SUPERSEDED.md
```

---

## For Developers

### Start Here (MVP Path)

1. Read [SIMPLE-ARCHITECTURE.md](./architecture/SIMPLE-ARCHITECTURE.md) - **6 files, 12 hours**
2. Review [AgentScope-PRD-v2.md](./AgentScope-PRD-v2.md) - scope and requirements
3. Check [07-tdd-quality-framework.md](./research/07-tdd-quality-framework.md) - testing requirements

### Why We Simplified

The [PLAN-CRITICAL-REVIEW.md](./architecture/PLAN-CRITICAL-REVIEW.md) explains:

- Original architecture was 8000+ lines for a 500-line CLI tool
- DDD is overkill for stateless file scanning
- Memory/learning features not needed for MVP
- **Verdict**: Ship fast, iterate based on feedback

### V2+ Roadmap (Deferred)

The [v2-roadmap/](./architecture/v2-roadmap/) folder contains enterprise-grade architecture for:
- DDD with bounded contexts (if multiple teams)
- Full security model with STRIDE/DREAD (if networked)
- Memory/learning with HNSW (if ML features needed)

**Do not implement these for v1.0.**

### Architecture Reference

- [ADR Index](./architecture/decisions/README.md) - All architecture decisions
- [Entity Catalog](./architecture/ENTITY-CATALOG.md) - Entity definitions
- [Anthropic Best Practices](./architecture/ANTHROPIC-BEST-PRACTICES.md) - Claude Code patterns

### Tech Stack Reference

- [04-component-solutions.md](./research/04-component-solutions.md) - npm packages to use

---

## Document Versioning

| Version | Date | Changes |
|---------|------|---------|
| v2.2 | Jan 2026 | Simplified architecture, moved DDD/Security/Memory to v2-roadmap |
| v2.1 | Jan 2026 | Added architecture/ folder with DDD, ADRs, Security, Memory docs |
| v2.0 | Jan 2026 | PRD revised for 1-2 day MVP, quality gates added |
| v1.0 | Jan 2026 | Initial PRD (archived) |

---

*Documentation managed by AgentScope team*
