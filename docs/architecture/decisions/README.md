# Architecture Decision Records (ADRs)

> **Project**: AgentScope - Agent Architecture Documentation & Visualization Tool
> **Format**: MADR (Markdown Any Decision Records) 3.0
> **Last Updated**: January 2026

## Overview

This directory contains Architecture Decision Records (ADRs) that document significant architectural decisions made during the design and implementation of AgentScope.

ADRs capture the context, decision, and consequences of architectural choices, providing a historical record of why the system is designed the way it is.

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./ADR-001-architecture-style.md) | Architecture Style: DDD + Clean Architecture | Accepted | 2026-01-20 |
| [ADR-002](./ADR-002-diagram-format.md) | Diagram Format: Mermaid | Accepted | 2026-01-20 |
| [ADR-003](./ADR-003-c4-model-mapping.md) | C4 Model Mapping to Agent Concepts | Accepted | 2026-01-20 |
| [ADR-004](./ADR-004-parser-plugin-architecture.md) | Parser Plugin Architecture | Accepted | 2026-01-20 |
| [ADR-005](./ADR-005-output-format.md) | Output Format: Markdown + JSON | Accepted | 2026-01-20 |
| [ADR-006](./ADR-006-test-strategy.md) | Test Strategy: TDD with Snapshot Testing | Accepted | 2026-01-20 |
| [ADR-007](./ADR-007-error-handling.md) | Error Handling: Fatal/Warning/Info Categorization | Accepted | 2026-01-20 |
| [ADR-008](./ADR-008-cli-framework.md) | CLI Framework: Commander.js | Accepted | 2026-01-20 |
| [ADR-009](./ADR-009-security-model.md) | Security Model: Read-Only, No Execution | Accepted | 2026-01-20 |
| [ADR-010](./ADR-010-self-learning-hooks.md) | Self-Learning Hooks: claude-flow Integration | Accepted | 2026-01-20 |

## Status Definitions

| Status | Description |
|--------|-------------|
| **Proposed** | Under discussion, not yet decided |
| **Accepted** | Decision made and in effect |
| **Deprecated** | No longer valid, superseded by another ADR |
| **Superseded** | Replaced by a newer ADR (linked in document) |

## ADR Template

New ADRs should follow the MADR 3.0 format:

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences

### Positive
- Benefit 1
- Benefit 2

### Negative
- Tradeoff 1
- Tradeoff 2

### Neutral
- Side effect 1

## Options Considered

### Option 1: [Name]
- **Pros**: ...
- **Cons**: ...

### Option 2: [Name]
- **Pros**: ...
- **Cons**: ...

## Related Decisions
- ADR-XXX: Related decision

## References
- [Link to relevant documentation]
```

## Categories

### Architecture & Design
- [ADR-001](./ADR-001-architecture-style.md) - Architecture Style
- [ADR-003](./ADR-003-c4-model-mapping.md) - C4 Model Mapping
- [ADR-004](./ADR-004-parser-plugin-architecture.md) - Parser Architecture

### Output & Visualization
- [ADR-002](./ADR-002-diagram-format.md) - Diagram Format
- [ADR-005](./ADR-005-output-format.md) - Output Format

### Quality & Testing
- [ADR-006](./ADR-006-test-strategy.md) - Test Strategy
- [ADR-007](./ADR-007-error-handling.md) - Error Handling

### Implementation
- [ADR-008](./ADR-008-cli-framework.md) - CLI Framework
- [ADR-009](./ADR-009-security-model.md) - Security Model
- [ADR-010](./ADR-010-self-learning-hooks.md) - Self-Learning Hooks

## Contributing

When making significant architectural decisions:

1. Create a new ADR using the template above
2. Number it sequentially (ADR-011, ADR-012, etc.)
3. Submit for review before implementation
4. Update this index when the ADR is accepted

---

*ADR format based on [MADR](https://adr.github.io/madr/) (Markdown Any Decision Records)*
