# AgentScope v1.2 Architecture Decision Records - Summary

**Date**: 2026-01-25
**Author**: ADR Architect Agent
**Status**: Proposed

---

## Executive Summary

This document summarizes the 7 Architecture Decision Records (ADRs) created for AgentScope v1.2. These ADRs define the architectural foundation for:

1. **DevContainer Integration** - Scanning container-based development environments
2. **Domain-Driven Design** - Extended bounded contexts and aggregates
3. **Security Model** - Layered security for new attack surfaces
4. **Claude-flow Integration** - Event-driven hooks system
5. **Self-Learning** - Pattern-based diagram suggestions
6. **Neural Storage** - Persistent memory with vector search
7. **Documentation** - Example-compliant multi-file output

---

## ADR Overview

| ADR | Title | Impact | Complexity | Dependencies |
|-----|-------|--------|------------|--------------|
| **ADR-008** | DevContainer Scanner | Medium | Low | None |
| **ADR-009** | DDD Bounded Contexts v1.2 | High | High | ADR-008 |
| **ADR-010** | Security Model Integration | High | Medium | ADR-008, ADR-009 |
| **ADR-011** | Claude-flow Hooks Integration | Medium | Medium | ADR-009 |
| **ADR-012** | Self-Learning System | High | High | ADR-009, ADR-011 |
| **ADR-013** | Memory & Neural Pattern Storage | High | High | ADR-012 |
| **ADR-014** | Documentation Format Compliance | Medium | Low | None |

---

## ADR-008: DevContainer Configuration Scanner

**Problem**: AgentScope doesn't scan DevContainer configurations in `.devcontainer/devcontainer.json`.

**Solution**: Implement DevContainer scanner that:
- Parses DevContainer JSON
- Extracts Claude Code customizations
- Validates schema and security
- Merges with project config

**Key Decisions**:
- DevContainer configs have **higher precedence** than project configs
- Strict validation prevents path traversal
- Commands parsed but **never executed**
- Maximum file size: 1MB

**Integration**:
```typescript
interface DevContainerMetadata {
  detected: boolean;
  configPath: string;
  containerName?: string;
  features: string[];
}
```

**Testing**: 90%+ coverage required, fixtures for various DevContainer configs.

---

## ADR-009: DDD Bounded Contexts and Aggregates for v1.2

**Problem**: v1.2 features don't fit cleanly into existing 4 bounded contexts.

**Solution**: Add 3 new bounded contexts:
1. **DevContainerContext** (Supporting) - DevContainer parsing
2. **LearningContext** (Core) - Pattern storage and learning
3. **IntegrationContext** (Supporting) - External system hooks

**Updated Context Map**:
```
ConfigParsing ──► DiagramGeneration ──► OutputFormatting
DevContainerContext ──► DiagramGeneration
IntegrationContext ──► LearningContext ──► DiagramGeneration
```

**Key Aggregates**:
- `DevContainerConfiguration` - Root for container configs
- `PatternLibrary` - Root for learned patterns
- `HookEventStream` - Root for external events

**Invariants**:
- Patterns must have unique IDs
- Events must be ordered by timestamp
- Navigation links must reference existing sections

**Testing**: Architecture tests validate no circular dependencies.

---

## ADR-010: Security Model Integration for v1.2

**Problem**: New features introduce attack surfaces (DevContainer JSON, hooks, pattern storage).

**Solution**: Implement 5-layer security model:

| Layer | Purpose | Key Features |
|-------|---------|--------------|
| **Input Validation** | Prevent injection | Zod schemas, size limits, path validation |
| **Execution Isolation** | Sandbox hooks | Timeout guards, rate limiting |
| **Data Protection** | Encrypt patterns | AES-256-GCM encryption, access control |
| **Output Sanitization** | Safe links | Link sanitizer, HTML escaping |
| **Monitoring** | Security events | Structured logging, alerting |

**Key Security Features**:
- **Encrypted Pattern Storage**: AES-256-GCM with key derivation
- **Rate Limiting**: Max 100 hook events/minute
- **Sandbox Execution**: 5s timeout, 50MB memory limit
- **Link Sanitization**: Block `javascript:` and `data:` URLs

**DREAD Scores**: All new threats assessed, mitigated to Low-Medium severity.

---

## ADR-011: Claude-flow Hooks Integration

**Problem**: Need to integrate with claude-flow's 27 hooks + 12 background workers.

**Solution**: Implement loosely-coupled integration with:
- **Hook Adapter Pattern** - Anti-corruption layer
- **Optional Integration** - Works with/without claude-flow
- **Event-Driven Updates** - Real-time doc regeneration
- **Graceful Degradation** - Fallback to file watching

**Subscribed Hooks**:
| Hook | Purpose | Action |
|------|---------|--------|
| `post-edit` | File changes | Auto-regenerate docs |
| `post-task` | Task completion | Learn diagram patterns |
| `session-start` | Session init | Auto-scan config |

**Anti-Corruption Layer**:
```typescript
class ClaudeFlowAdapter {
  subscribe(hookType, handler)
  transformEvent(claudeFlowEvent): AgentScopeEvent
  storeInMemory(key, value)
}
```

**Configuration**:
```json
{
  "claudeFlow": {
    "enabled": true,
    "hooks": ["post-edit", "post-task"],
    "autoRegenerate": true
  }
}
```

---

## ADR-012: Self-Learning System Design

**Problem**: Static diagram generation doesn't adapt to user preferences.

**Solution**: Implement local learning system with:
- **Pattern Matching** - Store config→diagram mappings
- **Similarity Search** - 64-dimensional embeddings
- **Confidence Scoring** - Track success rates
- **Feedback Loop** - Explicit and implicit feedback

**Learning Pipeline**:
```
Config → Signature → Embedding → Similarity Search → Suggestions
                                         ↑
                                    Feedback
```

**Key Components**:
| Component | Purpose | Output |
|-----------|---------|--------|
| SignatureExtractor | Feature extraction | ConfigSignature (12 features) |
| EmbeddingGenerator | Vector encoding | 64-dim embedding |
| PatternMatcher | Similarity search | Top-k similar patterns |
| ConfidenceUpdater | Learning | Updated confidence scores |
| PatternPruner | Maintenance | Remove stale patterns |

**Performance Targets**:
- Inference: <100ms
- Storage: <10MB
- Accuracy: 80% acceptance rate

---

## ADR-013: Memory and Neural Pattern Storage

**Problem**: Learning system needs fast, persistent storage for patterns and embeddings.

**Solution**: Hybrid storage strategy:
- **Primary**: SQLite for structured data
- **Vector Search**: In-memory HNSW index (O(log n) vs O(n))
- **Integration**: Optional AgentDB for advanced features
- **Fallback**: JSON files if SQLite unavailable

**Database Schema**:
```sql
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  config_hash TEXT,
  embedding BLOB,  -- 64 * 8 bytes = 512 bytes
  confidence REAL,
  usage_count INTEGER,
  success_rate REAL,
  ...
);
```

**HNSW Index**:
- Dimensions: 64
- M (connections): 16
- efConstruction: 200
- efSearch: 50

**Performance Benchmarks**:
| Operation | SQLite | SQLite+HNSW | Target |
|-----------|--------|-------------|--------|
| Find Similar (k=5) | 200ms | 15ms | <100ms |
| Store Pattern | 5ms | 8ms | <10ms |
| Startup Load | 20ms | 120ms | <200ms |
| Storage (1000 patterns) | 8MB | 10MB | <10MB |

**Winner**: SQLite+HNSW provides best balance.

---

## ADR-014: Example Documentation Format Compliance

**Problem**: Generated docs don't match polished examples in `/examples/`.

**Solution**: Generate multi-file documentation with:
- **Dense Tables** - 1 row per agent (not 8 lines)
- **Bidirectional Links** - Parent↔Child navigation
- **Category Files** - One file per category
- **Comparison Tables** - Cross-cutting views
- **Visual Hierarchy** - Emojis and symbols

**Output Structure**:
```
docs/agent-architecture/
├── README.md                    # Main index
├── categories/
│   ├── github.md               # 14 GitHub agents
│   ├── security.md             # 10 Security agents
│   └── ...
├── comparisons/
│   ├── agents-by-type.md
│   ├── capabilities-matrix.md
│   └── ...
└── raw/agentscope.json
```

**Format Example**:
```markdown
| Agent | Type | Description | Tools | Path |
|-------|------|-------------|-------|------|
| pr-manager | 👑 coordinator | PR lifecycle | git, github | [→](path) |
```

**Key Features**:
- Emoji categories (🐙 GitHub, 🔒 Security, etc.)
- Type emojis (👑 Coordinator, 👷 Worker, etc.)
- Comparison matrices with ✓ checkmarks
- Navigation breadcrumbs

---

## Decision Chains

The ADRs form dependency chains:

```
ADR-008 (DevContainer)
   ↓
ADR-009 (DDD Contexts)
   ↓
ADR-010 (Security) ──┐
   ↓                  ↓
ADR-011 (Hooks) ──→ ADR-012 (Learning)
                      ↓
                   ADR-013 (Storage)

ADR-014 (Documentation) ← Independent
```

**Critical Path**: ADR-008 → ADR-009 → ADR-012 → ADR-013

---

## Implementation Complexity

### Low Complexity (1-3 days)
- **ADR-008**: DevContainer Scanner (~300 lines)
- **ADR-014**: Documentation Format (~500 lines)

### Medium Complexity (4-7 days)
- **ADR-010**: Security Model (~800 lines)
- **ADR-011**: Claude-flow Integration (~600 lines)

### High Complexity (8-14 days)
- **ADR-009**: DDD Bounded Contexts (architecture refactor)
- **ADR-012**: Self-Learning System (~1200 lines)
- **ADR-013**: Memory & Storage (~1000 lines)

**Total Estimated Effort**: 30-45 days (1.5-2 months)

---

## Testing Requirements

| ADR | Unit Tests | Integration Tests | Coverage Target |
|-----|-----------|-------------------|-----------------|
| ADR-008 | 20+ | 5+ | 90%+ |
| ADR-009 | Architecture tests | Context integration | N/A |
| ADR-010 | 30+ (security) | Penetration tests | 95%+ |
| ADR-011 | 15+ | Mock claude-flow | 85%+ |
| ADR-012 | 25+ | Learning pipeline | 85%+ |
| ADR-013 | 20+ | Storage backends | 90%+ |
| ADR-014 | 15+ | Link validation | 80%+ |

**Total**: 125+ unit tests, 15+ integration tests

---

## Migration Path

### Phase 1: Foundation (Weeks 1-2)
1. Implement ADR-008 (DevContainer Scanner)
2. Implement ADR-009 (DDD refactor)
3. Validate architecture tests pass

### Phase 2: Security & Integration (Weeks 3-4)
1. Implement ADR-010 (Security layers)
2. Implement ADR-011 (Hooks integration)
3. Security audit

### Phase 3: Learning System (Weeks 5-7)
1. Implement ADR-012 (Learning algorithm)
2. Implement ADR-013 (Storage layer)
3. Performance benchmarks

### Phase 4: Documentation (Week 8)
1. Implement ADR-014 (Format compliance)
2. Generate example outputs
3. User acceptance testing

### Phase 5: Integration Testing (Week 9)
1. End-to-end testing
2. Performance tuning
3. Documentation

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **DevContainer Coverage** | 95%+ of configs | Scan success rate |
| **Security Posture** | Zero critical vulnerabilities | Penetration testing |
| **Learning Accuracy** | 80%+ suggestion acceptance | User feedback |
| **Storage Performance** | <100ms pattern search | Benchmarks |
| **Documentation Quality** | Matches examples | User survey |
| **Test Coverage** | 85%+ average | Code coverage tools |

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **DDD Refactor Complexity** | High | Medium | Incremental migration, architecture tests |
| **Security Vulnerabilities** | Critical | Low | Layered security, audits |
| **Learning Cold Start** | Medium | High | Heuristic fallbacks |
| **Storage Corruption** | High | Low | Regular backups, WAL mode |
| **Integration Breaking Changes** | Medium | Medium | Version detection, ACL pattern |

---

## Open Questions

1. **AgentDB Integration**: Should we make AgentDB a hard dependency or keep it optional?
   - **Recommendation**: Keep optional, use SQLite+HNSW as default

2. **Pattern Sharing**: Should users be able to share learned patterns?
   - **Recommendation**: Defer to v1.3, focus on local learning first

3. **Multi-Model Support**: Should learning system support multiple embedding models?
   - **Recommendation**: Single model (64-dim) for v1.2, extensible for v2.0

4. **Real-time Updates**: Should docs auto-regenerate on every file change?
   - **Recommendation**: Make configurable, default to debounced (5s delay)

---

## References

- [AgentScope PRD v2.1](../AgentScope-PRD-v2.md)
- [DDD-001: Generator Domains](./DDD-001-generator-domains.md)
- [Examples Directory](../../examples/)
- [Claude-flow Documentation](https://github.com/ruvnet/claude-flow)
- [AgentDB Documentation](https://github.com/ruvnet/agentdb)

---

## Appendix: ADR Quick Reference

| Need | Relevant ADR | Key Section |
|------|--------------|-------------|
| Parse DevContainers | ADR-008 | DevContainer Schema |
| Define new context | ADR-009 | Bounded Context Definitions |
| Add security check | ADR-010 | Input Validation Layer |
| Subscribe to hooks | ADR-011 | Hook Subscriptions |
| Learn from feedback | ADR-012 | Confidence Updater |
| Store patterns | ADR-013 | SQLitePatternStore |
| Format documentation | ADR-014 | DocumentAssembler |

---

*Generated by AgentScope ADR Architect*
*Last Updated: 2026-01-25*
*Status: Proposed for v1.2 Implementation*
