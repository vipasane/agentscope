# Domain-Driven Design Documentation for AgentScope v1.2

**Status:** ✅ Complete
**Date:** 2026-01-25
**Version:** v1.2

---

## 📚 Documentation Index

### 🎯 Start Here

If you're new to the DDD architecture, start with these documents in order:

1. **[DDD v1.2 Quick Reference](./ddd-v12-quick-reference.md)** ⭐ START HERE
   - 10-minute overview
   - 5 bounded contexts summary
   - Key design decisions
   - Implementation patterns

2. **[DDD v1.2 Context Map](./ddd-v12-context-map.md)** ⭐ VISUAL GUIDE
   - 8 Mermaid diagrams
   - Complete context relationships
   - Learning integration flow
   - Storage architecture

3. **[DDD-003: Learning-Enhanced Domain Model](../adr/DDD-003-learning-enhanced-domain-model.md)** ⭐ COMPLETE SPEC
   - Comprehensive ADR (77,000+ tokens)
   - All bounded contexts
   - All aggregate roots
   - Learning integration patterns
   - Implementation guidelines

4. **[DDD v1.2 Implementation Summary](./DDD-V12-IMPLEMENTATION-SUMMARY.md)** ⭐ ROADMAP
   - Implementation phases
   - Success metrics
   - Testing strategy
   - Checklist

---

## 🏗️ Architecture Overview

AgentScope v1.2 implements a **learning-enhanced Domain-Driven Design** with 5 bounded contexts:

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE DOMAINS                             │
│  ┌───────────────┐ ┌────────────────┐ ┌────────────────┐   │
│  │ Agent         │ │ Security       │ │ Documentation  │   │
│  │ Scanning      │ │ Validation     │ │ Generation     │   │
│  │               │ │                │ │                │   │
│  │ Learning:     │ │ Learning:      │ │ Learning:      │   │
│  │ • Scan        │ │ • Threat       │ │ • Template     │   │
│  │   patterns    │ │   patterns     │ │   preferences  │   │
│  │ • File skips  │ │ • False pos.   │ │ • Section      │   │
│  │ • Parser      │ │ • DREAD        │ │   order        │   │
│  │   order       │ │   weights      │ │ • Verbosity    │   │
│  └───────────────┘ └────────────────┘ └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    Learning Events
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              SUPPORTING DOMAINS                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Intelligence Context (ACL)                 │     │
│  │                                                    │     │
│  │  Protects core from external system complexity    │     │
│  │                                                    │     │
│  │  ┌─────────────┐ ┌──────────┐ ┌────────────────┐ │     │
│  │  │ ClaudeFlow  │ │ AgentDB  │ │ ReasoningBank  │ │     │
│  │  │  Adapter    │ │  Adapter │ │    Adapter     │ │     │
│  │  └─────────────┘ └──────────┘ └────────────────┘ │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  ┌────────────────┐                                         │
│  │ Theme System   │  (minimal learning)                     │
│  └────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
                   External Systems
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL LEARNING SYSTEMS                      │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐      │
│  │ Claude Flow │ │   AgentDB    │ │ ReasoningBank   │      │
│  │   Hooks     │ │ HNSW Search  │ │  Trajectories   │      │
│  └─────────────┘ └──────────────┘ └─────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Key Concepts

### 1. Bounded Contexts

AgentScope has 5 bounded contexts, each with clear responsibilities:

| Context | Type | Purpose | Learning |
|---------|------|---------|----------|
| **AgentScanning** | Core | Parse agent configurations | ✅ Scan patterns, file skips |
| **SecurityValidation** | Core | Validate security posture | ✅ Threat patterns, false positives |
| **DocumentationGeneration** | Core | Generate rich documentation | ✅ Template preferences |
| **ThemeSystem** | Supporting | Visual styling | ⚠️ Minimal (usage tracking) |
| **Intelligence** | Supporting | Learning coordination (ACL) | ✅ External system integration |

---

### 2. Learning Integration

Each aggregate root learns from operations:

```typescript
// 4-Step Learning Cycle
interface LearningEnabledAggregate {
  // 1. PRE-OPERATION: Get learned optimizations
  getOptimizations(context): Promise<Optimization[]>;

  // 2. OPERATION: Apply optimizations
  executeOperation(params, optimizations): Result;

  // 3. POST-OPERATION: Record pattern
  recordOperationPattern(result): Promise<void>;

  // 4. FEEDBACK: Learn from corrections
  learnFromFeedback(feedback): Promise<void>;
}
```

**Expected Improvements:**
- 25%+ faster scans after 10 operations
- 40%+ fewer false positives after 20 operations
- 80%+ template accuracy after 30 operations

---

### 3. Anti-Corruption Layer

Intelligence Context protects core domains from external system complexity:

```
Core Domain (pure business logic)
      ↓
Intelligence Context (translation layer)
      ↓
External Systems (claude-flow, AgentDB, ReasoningBank)
```

**Why this matters:**
- Core domains stay pure (no infrastructure dependencies)
- External systems can be swapped (loose coupling)
- Domain model is testable (mock ACL)

---

## 🚀 Quick Start

### For Developers

**Read in this order:**

1. [Quick Reference](./ddd-v12-quick-reference.md) - 10 min
2. [Context Map](./ddd-v12-context-map.md) - 15 min (visual)
3. [DDD-003 ADR](../adr/DDD-003-learning-enhanced-domain-model.md) - 1 hour (comprehensive)

**Then implement:**

1. Create aggregate roots with invariants
2. Add learning methods (`getOptimizations`, `recordPattern`, `learnFromFeedback`)
3. Create Intelligence Context as ACL
4. Implement adapters (ClaudeFlow, AgentDB, ReasoningBank)
5. Write tests (unit, integration, architecture)

---

### For Architects

**Review these design decisions:**

1. **Intelligence Context as ACL** (not a core domain)
   - Why: Protects core from external complexity
   - Trade-off: Extra translation layer

2. **Learning as Aggregate Behavior** (not a separate domain)
   - Why: Each aggregate owns its learning
   - Trade-off: Repeated pattern in each aggregate

3. **Event-Driven Communication** (loose coupling)
   - Why: Contexts can evolve independently
   - Trade-off: Harder to trace (async)

4. **No Direct External Dependencies** (protected domain)
   - Why: Domain stays pure and testable
   - Trade-off: Must go through ACL

---

### For Product Managers

**Learning outcomes:**

| Metric | Baseline | After 10 Uses | After 30 Uses |
|--------|----------|---------------|---------------|
| **Scan Speed** | 1000ms | 750ms (-25%) | 650ms (-35%) |
| **False Positives** | 10 findings | 6 findings (-40%) | 4 findings (-60%) |
| **User Edits** | 200 chars | 100 chars (-50%) | 50 chars (-75%) |
| **Template Accuracy** | 50% match | 70% match (+20%) | 85% match (+35%) |

**User experience:**
- Faster scans (learns to skip irrelevant files)
- Fewer false alarms (learns from corrections)
- Better templates (learns user preferences)
- Continuous improvement (gets smarter over time)

---

## 📊 Architecture Metrics

### Design Quality

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Bounded Contexts** | 5 | 5 | ✅ |
| **Aggregate Roots** | 5 | 5 | ✅ |
| **Circular Dependencies** | 0 | 0 | ✅ |
| **ACL Protection** | 100% | 100% | ✅ |
| **Event-Driven** | 100% | 100% | ✅ |

---

### Test Coverage

| Layer | Target | Status |
|-------|--------|--------|
| **Unit Tests** | 90%+ | 🚧 Pending |
| **Integration Tests** | 85%+ | 🚧 Pending |
| **Architecture Tests** | 100% | 🚧 Pending |

---

### Learning Effectiveness

| Metric | Target | Status |
|--------|--------|--------|
| **Scan Speed Improvement** | 25%+ | 🚧 Pending |
| **False Positive Reduction** | 40%+ | 🚧 Pending |
| **Template Accuracy** | 80%+ | 🚧 Pending |
| **Pattern Confidence** | 0.85+ | 🚧 Pending |

---

## 🧪 Testing Strategy

### Unit Tests (90%+ coverage)

Test each aggregate in isolation:

```typescript
describe('AgentScopeConfiguration', () => {
  it('should apply learned scan optimizations');
  it('should learn from validation errors');
  it('should record scan patterns');
  it('should enforce invariants (unique agent names)');
});
```

---

### Integration Tests (85%+ coverage)

Test cross-context flows:

```typescript
describe('Learning Cycle', () => {
  it('should complete full cycle (store → retrieve → apply)');
  it('should coordinate across AgentDB + ReasoningBank');
  it('should handle feedback loop');
});
```

---

### Architecture Tests (Critical)

Enforce rules:

```typescript
describe('DDD Architecture', () => {
  it('should not have circular dependencies');
  it('should not import external systems from core');
  it('should use Intelligence Context for all learning');
});
```

---

## 📁 File Organization

```
docs/
  adr/
    DDD-003-learning-enhanced-domain-model.md    ⭐ Complete ADR
  architecture/
    ddd-v12-context-map.md                       ⭐ Visual diagrams
    ddd-v12-quick-reference.md                   ⭐ Quick reference
    DDD-V12-IMPLEMENTATION-SUMMARY.md            ⭐ Implementation guide
    DDD-README.md                                 📖 This file

src/core/
  scanning/                                       # AgentScanning Context
    agent-scope-configuration.ts                  # Aggregate root
    scan-pattern.ts                               # Learning value object

  security/                                       # SecurityValidation Context
    security-assessment.ts                        # Aggregate root
    threat-pattern.ts                             # Learning value object

  documentation/                                  # DocumentationGeneration Context
    rich-document.ts                              # Aggregate root
    template-preference.ts                        # Learning value object

  themes/                                         # ThemeSystem Context
    theme-palette.ts                              # Aggregate root

  intelligence/                                   # Intelligence Context (ACL)
    intelligence-coordinator.ts                   # Aggregate root
    adapters/                                     # Anti-corruption layers
      claude-flow-adapter.ts
      agentdb-adapter.ts
      reasoning-bank-adapter.ts
```

---

## 🔗 Related Documentation

### Domain-Driven Design

- [DDD-001: Generator Domains](../adr/DDD-001-generator-domains.md) - v1.1 baseline
- [DDD-002: DevContainer Domain](../adr/DDD-002-devcontainer-domain.md) - Rejected (separate product)

---

### Integration

- [ADR-001: Claude Flow V3 Integration](../adr/ADR-001-claude-flow-v3-integration.md)
- [ADR-002: Self-Learning Hooks](../adr/ADR-002-hooks-integration.md)
- [ADR-003: AgentDB Memory Integration](../adr/ADR-003-memory-integration.md)
- [ADR-004: Neural Pattern Training](../adr/ADR-004-neural-patterns.md)

---

### Storage

- [ADR-013: Memory and Neural Pattern Storage](../adr/ADR-013-memory-neural-pattern-storage.md)

---

### Planning

- [MASTER-PLAN.md](../MASTER-PLAN.md) - v1.2 roadmap
- [v1.2 ADR Index](../v1.2/ADR-INDEX.md)

---

## 🎯 Success Criteria

### Architecture Success

- [x] 5 bounded contexts defined
- [x] 5 aggregate roots specified
- [x] Learning patterns documented
- [x] Anti-corruption layer designed
- [x] Visual diagrams created
- [ ] Implementation complete
- [ ] Tests passing (90%+ coverage)
- [ ] Architecture tests passing

---

### Learning Success

- [ ] 25%+ scan speed improvement
- [ ] 40%+ false positive reduction
- [ ] 80%+ template accuracy
- [ ] >0.85 pattern confidence
- [ ] <100ms HNSW search time

---

### User Success

- [ ] Minimal documentation edits (<80 chars)
- [ ] Few false positives (<5% rate)
- [ ] Fast scans (<1s typical)
- [ ] Transparent learning (users understand suggestions)
- [ ] Easy feedback (intuitive corrections)

---

## 🙏 References

### Books

- **Domain-Driven Design** - Eric Evans (2003)
- **Implementing Domain-Driven Design** - Vaughn Vernon (2013)
- **DDD Reference** - Eric Evans (2015)

---

### Patterns

- **Anti-Corruption Layer** - Microsoft Architecture Patterns
- **Bounded Context** - Martin Fowler
- **Event Storming** - Alberto Brandolini

---

### Papers

- **ReasoningBank** - Knowledge Distillation (arXiv:2406.13891)
- **HNSW** - Hierarchical Navigable Small World (Malkov & Yashunin)

---

### Tools

- **Claude Flow V3** - Hooks system, swarm coordination
- **AgentDB** - Vector database with HNSW indexing
- **ReasoningBank** - Trajectory storage for self-learning

---

## 📞 Support

**Questions about:**
- **Design decisions** → Read [DDD-003 ADR](../adr/DDD-003-learning-enhanced-domain-model.md)
- **Implementation** → Read [Implementation Summary](./DDD-V12-IMPLEMENTATION-SUMMARY.md)
- **Architecture** → Read [Context Map](./ddd-v12-context-map.md)
- **Quick reference** → Read [Quick Reference](./ddd-v12-quick-reference.md)

**Issues:**
- Open GitHub issue with `ddd` label
- Tag `@architecture-team`

---

## 📝 Changelog

### 2026-01-25 - v1.2 Complete

- ✅ Created DDD-003: Learning-Enhanced Domain Model
- ✅ Created DDD v1.2 Context Map (8 diagrams)
- ✅ Created DDD v1.2 Quick Reference
- ✅ Created DDD v1.2 Implementation Summary
- ✅ Updated ADR Index
- ✅ Created DDD README

**Status:** Ready for implementation

---

*Generated by AgentScope DDD Expert*
*Last Updated: 2026-01-25*
