# V2+ Roadmap Architecture

> **Status**: DEFERRED - Not for MVP implementation
> **Purpose**: Reference material for future versions

These documents describe enterprise-grade architecture features that are **out of scope for v1.0 MVP**.

## Why Deferred?

Per [PLAN-CRITICAL-REVIEW.md](../PLAN-CRITICAL-REVIEW.md):

- Architecture is over-engineered for a CLI documentation tool
- 8000+ lines of docs for what could be 500-1000 lines of code
- DDD is overkill for stateless file scanning
- Memory/learning features require significant infrastructure

## Documents in This Directory

| Document | Content | When to Consider |
|----------|---------|------------------|
| `DDD-IMPLEMENTATION.md` | 4 bounded contexts, aggregates, domain events | If multiple teams work on AgentScope |
| `SECURITY-ARCHITECTURE.md` | STRIDE/DREAD, AIDefence, claims-based auth | If processing untrusted input or networked |
| `MEMORY-ARCHITECTURE.md` | HNSW search, EWC++, pattern learning | If adding ML-based optimization |
| `VISUALIZATION-ARCHITECTURE.md` | Advanced diagram types, interactivity | After basic diagrams validated |

## MVP Approach

See [SIMPLE-ARCHITECTURE.md](../SIMPLE-ARCHITECTURE.md) for the minimal v1.0 implementation.

## When to Revisit

Consider these docs when:
1. v1.0 MVP is shipped and validated
2. User feedback requests advanced features
3. Multiple contributors need coordination
4. Enterprise customers require security features
