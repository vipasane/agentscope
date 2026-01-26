# ADR-019 Quick Reference

> **Quick navigation guide for ADR-019: Comprehensive Claude-Flow V3 Integration**

## 🎯 At a Glance

**What:** Complete self-learning architecture for AgentScope v1.2 using claude-flow v3
**Why:** Transform static scanning into intelligent, learning system
**When:** 9-week phased rollout starting 2026-01-27
**Impact:** CRITICAL - Enables self-learning, intelligent routing, continuous optimization

---

## 📊 Key Capabilities

| Capability | Technology | Performance |
|------------|-----------|-------------|
| **Pattern Search** | HNSW Indexing | 150x-12,500x faster |
| **Neural Training** | SONA, MoE, Flash Attention | 2.49x-7.47x speedup |
| **Memory Reduction** | Quantization | 50-75% reduction |
| **Cache Hit Rate** | LRU + HNSW | 95% |
| **Cost Reduction** | Pattern matching | 75% fewer LLM calls |

---

## 🪝 When Hooks Fire

```
agentscope scan .claude/
    ↓
session-start (restore context)
    ↓
pre-task (intelligent routing)
    ↓
pre-edit (get suggestions)
    ↓
[EXECUTE SCAN]
    ↓
post-edit (train neural)
    ↓
post-task (store patterns)
    ↓
worker-dispatch (background optimization)
    ↓
session-end (persist learning)
```

---

## 🧠 Memory Namespaces

| Namespace | TTL | Purpose | Example |
|-----------|-----|---------|---------|
| `patterns` | ∞ | Successful configs | Theme combos, layouts |
| `tasks` | 30d | Execution history | Scan results, metrics |
| `routes` | ∞ | Agent routing | Optimal agent→task mappings |
| `metrics` | 90d | Performance data | Scan duration, quality |
| `security` | ∞ | Security incidents | Threat patterns, fixes |
| `projects` | ∞ | Per-repo patterns | Project-specific optimizations |
| `agents` | ∞ | Agent history | Performance tracking |

---

## 🤖 Background Workers

### Auto-Dispatch Rules

| Event | Worker | Purpose |
|-------|--------|---------|
| **Scan complete** | `ultralearn` | Learn from patterns |
| **5+ files scanned** | `map` | Update codebase map |
| **Docs generated** | `document` | Validate quality |
| **Security check** | `audit` | Analyze security |
| **Test files changed** | `testgaps` | Find coverage gaps |
| **Performance issue** | `optimize` | Optimize performance |
| **Every 6 hours** | `consolidate` | Clean memory |

---

## 📅 Implementation Timeline

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| **1-2** | Foundation | Adapter, config, health checks |
| **3** | Hooks | Registry, pre-task, post-task, route, session |
| **4** | Memory | Client, stores, cache, HNSW |
| **5** | Neural | Trainer, SONA, MoE, Flash, EWC++ |
| **6** | Performance | WASM, quantization, batching |
| **7** | Workers | Detector, dispatcher, auto-dispatch |
| **8** | Testing | Unit, integration, performance, security |
| **9** | Documentation | API docs, guide, examples, migration |

---

## ✅ Success Criteria

All metrics must be 100%:

- ✓ Unit test coverage >95%
- ✓ Integration tests >90%
- ✓ Performance targets met (150x-12,500x)
- ✓ Zero breaking changes
- ✓ Documentation complete
- ✓ Security validated

---

## 🔧 Quick Configuration

```json
{
  "claudeFlow": {
    "enabled": true,
    "features": {
      "hooks": true,
      "memory": true,
      "neural": true,
      "workers": true
    },
    "hooks": {
      "pre-task": { "enabled": true },
      "post-task": { "enabled": true, "trainNeural": true },
      "route": { "enabled": true, "confidenceThreshold": 0.7 }
    },
    "memory": {
      "backend": "hybrid",
      "enableHNSW": true,
      "cacheSize": 1000
    },
    "neural": {
      "modelType": "moe",
      "useLoRA": true,
      "useEWC": true
    },
    "workers": {
      "enabled": ["ultralearn", "optimize", "audit", "map"],
      "autoDispatch": true
    }
  }
}
```

---

## 🚨 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Claude-flow unavailable | Graceful fallback to core features |
| Breaking API changes | Pin to specific alpha version |
| Performance degradation | Benchmarking, performance gates |
| Memory growth | TTL expiration, cleanup workers |

---

## 📚 Full Documentation

See [ADR-019 Full Document](./ADR-019-comprehensive-claude-flow-integration.md) for:

- Complete architecture diagrams
- Detailed implementation design
- Code examples
- Testing strategy
- Complete hook/worker reference
- Memory schema
- Alternatives considered
- Compliance with ADR-001 through ADR-018

---

## 🔗 Related ADRs

- **ADR-001:** Core Integration (foundation)
- **ADR-002:** Hooks Integration (27 hooks)
- **ADR-003:** Memory Integration (AgentDB/HNSW)
- **ADR-004:** Neural Patterns (SONA, MoE, Flash, EWC++)
- **ADR-005:** Performance Optimization (WASM, quantization)
- **ADR-006:** Background Workers (12 workers)
- **ADR-015:** Scope Correction (agent scanning only)
- **ADR-016:** Security Validation (AIDefence)
- **ADR-017:** Prompt Injection Detection
- **ADR-018:** MCP Server Security

---

**Status:** PROPOSED (awaiting approval)
**Review Date:** 2026-02-25 (after Week 4)
**Final Review:** 2026-03-31 (after Week 9)

---

*Quick Reference Version 1.0*
*Last Updated: 2026-01-25*
