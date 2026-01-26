# Claude Flow Ecosystem - Product Requirements

This directory contains comprehensive Product Requirements Documents (PRDs) for all products in the claude-flow ecosystem.

## Quick Navigation

### Strategic Overview
- **[PRD-EXECUTIVE-SUMMARY.md](./PRD-EXECUTIVE-SUMMARY.md)** - Executive summary of all products
- **[PRODUCT-ECOSYSTEM.md](./PRODUCT-ECOSYSTEM.md)** - How products integrate and relate
- **[COMMON-CORE.md](./COMMON-CORE.md)** - Shared component specifications

### Individual Product PRDs
- **[claude-flow-PRD.md](./claude-flow-PRD.md)** - Multi-agent orchestration framework
- **[agentdb-PRD.md](./agentdb-PRD.md)** - High-performance vector database
- **[reasoningbank-PRD.md](./reasoningbank-PRD.md)** - Adaptive learning system
- **[agentic-jujutsu-PRD.md](./agentic-jujutsu-PRD.md)** - AI-native version control
- **[flow-nexus-PRD.md](./flow-nexus-PRD.md)** - Unified orchestration engine

## Document Status

| Document | Status | Last Updated | Agent |
|----------|--------|--------------|-------|
| PRD-EXECUTIVE-SUMMARY.md | ⏳ Preliminary | 2026-01-26 | coordinator |
| PRODUCT-ECOSYSTEM.md | ✅ Complete | 2026-01-26 | coordinator |
| COMMON-CORE.md | ✅ Complete | 2026-01-26 | coordinator |
| claude-flow-PRD.md | 🔄 In Progress | - | prd-claude-flow |
| agentdb-PRD.md | 🔄 In Progress | - | prd-agentdb |
| reasoningbank-PRD.md | 🔄 In Progress | - | prd-reasoningbank |
| agentic-jujutsu-PRD.md | 🔄 In Progress | - | prd-agentic-jujutsu |
| flow-nexus-PRD.md | 🔄 In Progress | - | prd-flow-nexus |

## Reading Guide

### For Executives
1. Start with **PRD-EXECUTIVE-SUMMARY.md** (15 min)
2. Review **PRODUCT-ECOSYSTEM.md** for integration strategy (20 min)
3. Skim individual PRDs for product-specific details (5 min each)

### For Product Managers
1. Read **PRD-EXECUTIVE-SUMMARY.md** for context (15 min)
2. Deep dive into relevant product PRDs (30 min each)
3. Review **COMMON-CORE.md** for shared components (20 min)
4. Check **PRODUCT-ECOSYSTEM.md** for integration points (20 min)

### For Engineers
1. Start with **COMMON-CORE.md** for technical specs (30 min)
2. Review **PRODUCT-ECOSYSTEM.md** for architecture (25 min)
3. Read relevant product PRDs for implementation details (30 min each)
4. Reference **PRD-EXECUTIVE-SUMMARY.md** for roadmap (10 min)

### For Contributors
1. Read **PRODUCT-ECOSYSTEM.md** to understand relationships (25 min)
2. Review **COMMON-CORE.md** for shared components (30 min)
3. Deep dive into product PRD you want to contribute to (30 min)
4. Check **PRD-EXECUTIVE-SUMMARY.md** for timeline (10 min)

## Key Insights

### Product Lineup
```
claude-flow      → Multi-agent orchestration (60+ agents, 27 hooks)
agentdb          → Vector database (150x-12,500x faster search)
reasoningbank    → Adaptive learning (4-step learning pipeline)
agentic-jujutsu  → AI-native version control (semantic commits)
flow-nexus       → Workflow orchestration (MCP integration)
```

### Common Components
- **Vector Database**: AgentDB with HNSW indexing
- **Learning System**: ReasoningBank with 4-step pipeline
- **Security Framework**: Input validation, path safety, secrets sanitization
- **Performance**: Flash Attention (2.49x-7.47x), SONA (<0.05ms)
- **CLI Framework**: Consistent command structure across products
- **Testing**: Shared Vitest-based testing utilities

### Integration Points
```
claude-flow ↔ agentdb         (Memory storage)
claude-flow ↔ reasoningbank   (Learning from outcomes)
claude-flow ↔ flow-nexus      (Workflow orchestration)
reasoningbank ↔ agentdb       (Fast pattern retrieval)
agentic-jujutsu ↔ agentdb     (Semantic commits)
agentic-jujutsu ↔ reasoningbank (Merge learning)
```

### Performance Targets
- **Search latency**: <1ms (p95) with HNSW
- **Agent spawn**: <500ms (p95)
- **Learning cycle**: <100ms per pattern
- **Flash Attention**: 2.49x-7.47x speedup
- **Memory reduction**: 50-75% with quantization

### Release Timeline
- **Q1 2026**: claude-flow v3.0.0, agentdb v3.0.0, flow-nexus v2.0.0
- **Q2 2026**: reasoningbank v3.0.0, agentic-jujutsu v1.0.0
- **Q3 2026**: Enterprise features, multi-cloud deployment
- **Q4 2026**: 1.0 stable releases, ecosystem maturity

## Document Updates

This directory is actively maintained. Individual PRDs will be finalized as researcher agents complete their work.

### Update Schedule
- **Strategic documents** (EXECUTIVE-SUMMARY, ECOSYSTEM, COMMON-CORE): Updated as needed
- **Individual PRDs**: Updated upon agent completion
- **README**: Updated weekly with status changes

### Change Log
- **2026-01-26**: Initial creation, coordinator documents completed
- **Pending**: Individual PRD completion by researcher agents

## Related Documentation

### Architecture
- [/docs/architecture/](../architecture/) - System architecture documents
- [/docs/adr/](../adr/) - Architecture Decision Records
- [/docs/v1.2/ARCHITECTURE.md](../v1.2/ARCHITECTURE.md) - Current implementation

### Technical
- [/docs/performance/](../performance/) - Performance optimization guides
- [/docs/security/](../security/) - Security architecture and patterns
- [CLAUDE.md](/CLAUDE.md) - Claude Flow V3 configuration

### Product
- [README.md](/README.md) - Main repository README
- [/docs/v1.2/](../v1.2/) - Version 1.2 documentation

## Questions?

For questions about these PRDs:
- **General questions**: Open a GitHub Discussion
- **Product-specific**: Comment on relevant PRD
- **Technical details**: See COMMON-CORE.md
- **Integration**: See PRODUCT-ECOSYSTEM.md

## Contributing

To contribute to PRD development:
1. Read the relevant PRD thoroughly
2. Check PRODUCT-ECOSYSTEM.md for integration concerns
3. Review COMMON-CORE.md for shared components
4. Open a GitHub issue or PR with suggestions
5. Tag with `prd-feedback` label

---

**Last Updated**: 2026-01-26
**Coordinator**: Strategic Planning Agent
**Status**: 🔄 Active development
