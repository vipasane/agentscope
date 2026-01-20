# AgentScope Documentation

> Agent Architecture Documentation & Visualization Tool

## Quick Links

| Document | Purpose | Status |
|----------|---------|--------|
| [**AgentScope-PRD-v2.md**](./AgentScope-PRD-v2.md) | Product Requirements (authoritative) | ✅ Current |
| [**research/**](./research/) | Research findings and frameworks | ✅ Active |
| [**archive/**](./archive/) | Superseded documents | 🗄️ Historical |

---

## Document Map

### Authoritative Documents (Use These)

```
docs/
├── AgentScope-PRD-v2.md              # THE PRD - start here
└── research/
    ├── 00-EXECUTIVE-SUMMARY.md       # Research overview + status
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
2. Review [07-tdd-quality-framework.md](./research/07-tdd-quality-framework.md) - testing requirements
3. Check [06-claude-code-tuning-best-practices.md](./research/06-claude-code-tuning-best-practices.md) - agentic coding practices

### Before Adding Features
1. Check [08-future-roadmap.md](./research/08-future-roadmap.md) - is it already planned?
2. Review acceptance criteria in PRD v2

### Tech Stack Reference
- [04-component-solutions.md](./research/04-component-solutions.md) - npm packages to use

---

## Document Versioning

| Version | Date | Changes |
|---------|------|---------|
| v2.0 | Jan 2026 | PRD revised for 1-2 day MVP, quality gates added |
| v1.0 | Jan 2026 | Initial PRD (archived) |

---

*Documentation managed by AgentScope team*
