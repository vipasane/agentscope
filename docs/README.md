# AgentScope Documentation

> Agent Architecture Documentation & Visualization Tool

## Quick Links

| Document | Purpose | Status |
|----------|---------|--------|
| [**AgentScope-PRD-v2.md**](./AgentScope-PRD-v2.md) | Product Requirements (authoritative) | ✅ Current |
| [**architecture/**](./architecture/) | DDD, ADRs, Security, Memory architecture | ✅ **NEW** |
| [**research/**](./research/) | Research findings and frameworks | ✅ Active |
| [**archive/**](./archive/) | Superseded documents | 🗄️ Historical |

---

## Document Map

### Authoritative Documents (Use These)

```
docs/
├── AgentScope-PRD-v2.md              # THE PRD - start here
├── architecture/                      # Architecture documentation
│   ├── DDD-IMPLEMENTATION.md         # Domain-Driven Design plan
│   ├── SECURITY-ARCHITECTURE.md      # Security controls & threat model
│   ├── MEMORY-ARCHITECTURE.md        # Self-learning & memory patterns
│   ├── DOC-AUDIT-REPORT.md           # Documentation audit findings
│   └── decisions/                    # Architecture Decision Records
│       ├── README.md                 # ADR index
│       ├── ADR-001-architecture-style.md
│       ├── ADR-002-diagram-format.md
│       ├── ADR-003-c4-model-mapping.md
│       ├── ADR-004-parser-plugin-architecture.md
│       ├── ADR-005-output-format.md
│       ├── ADR-006-test-strategy.md
│       ├── ADR-007-error-handling.md
│       ├── ADR-008-cli-framework.md
│       ├── ADR-009-security-model.md
│       └── ADR-010-self-learning-hooks.md
└── research/
    ├── 00-EXECUTIVE-SUMMARY.md       # Research overview (historical)
    ├── 06-claude-code-tuning-best-practices.md  # How to tune agents
    ├── 07-tdd-quality-framework.md   # Testing & quality gates
    └── 08-future-roadmap.md          # Post-MVP feature planning
```

### Reference Documents (Context & Decisions)

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
└── 03-simplification-proposal-SUPERSEDED.md  # Incorporated into v2
```

---

## For Developers

### Start Here
1. Read [AgentScope-PRD-v2.md](./AgentScope-PRD-v2.md) - scope and requirements
2. Read [architecture/DDD-IMPLEMENTATION.md](./architecture/DDD-IMPLEMENTATION.md) - domain-driven design plan
3. Review [architecture/decisions/](./architecture/decisions/) - Architecture Decision Records (ADRs)
4. Review [07-tdd-quality-framework.md](./research/07-tdd-quality-framework.md) - testing requirements
5. Check [06-claude-code-tuning-best-practices.md](./research/06-claude-code-tuning-best-practices.md) - agentic coding practices

### Architecture Reference
- [DDD-IMPLEMENTATION.md](./architecture/DDD-IMPLEMENTATION.md) - Bounded contexts, aggregates, domain events
- [SECURITY-ARCHITECTURE.md](./architecture/SECURITY-ARCHITECTURE.md) - Threat model, security controls
- [MEMORY-ARCHITECTURE.md](./architecture/MEMORY-ARCHITECTURE.md) - Self-learning hooks, pattern storage
- [ADR Index](./architecture/decisions/README.md) - All architecture decisions

### Before Adding Features
1. Check [08-future-roadmap.md](./research/08-future-roadmap.md) - is it already planned?
2. Review acceptance criteria in PRD v2
3. Check existing ADRs for related decisions

### Tech Stack Reference
- [04-component-solutions.md](./research/04-component-solutions.md) - npm packages to use

---

## Document Versioning

| Version | Date | Changes |
|---------|------|---------|
| v2.1 | Jan 2026 | Added architecture/ folder with DDD, ADRs, Security, Memory docs |
| v2.0 | Jan 2026 | PRD revised for 1-2 day MVP, quality gates added |
| v1.0 | Jan 2026 | Initial PRD (archived) |

---

*Documentation managed by AgentScope team*
