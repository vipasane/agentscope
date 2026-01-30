# Documentation Index - @claude-flow/learning

Complete guide to navigating the ReasoningBank adaptive learning documentation.

## 📚 Quick Navigation

| Document | Description | Audience |
|----------|-------------|----------|
| [README](./README.md) | Package overview, 4-step pipeline, quick start | Everyone |
| [QUICK-REFERENCE](./QUICK-REFERENCE.md) | 30-second start, common patterns, API summary | Developers |
| [CHANGELOG](./CHANGELOG.md) | Version history and release notes | Everyone |
| [ARCHITECTURE](./docs/ARCHITECTURE.md) | System design, component architecture | Architects |
| [PERFORMANCE](./docs/PERFORMANCE.md) | Optimization guide, benchmarks, best practices | Engineers |
| [PACKAGE-STATS](./PACKAGE-STATS.md) | Package metrics and statistics | Contributors |

---

## 🚀 Getting Started

### New Users
1. Start with [README](./README.md) for overview and installation
2. Review [QUICK-REFERENCE](./QUICK-REFERENCE.md) for 30-second start
3. Run [basic-learning.ts](./examples/basic-learning.ts) example

### Experienced Users
- Jump to [ARCHITECTURE](./docs/ARCHITECTURE.md) for system design
- Check [PERFORMANCE](./docs/PERFORMANCE.md) for optimization
- Review [CHANGELOG](./CHANGELOG.md) for latest changes

---

## 📖 Documentation Structure

```
packages/learning/
├── README.md                           # Package overview + 4-step pipeline
├── QUICK-REFERENCE.md                  # 30-second start + common patterns
├── CHANGELOG.md                        # Version history
├── IMPLEMENTATION-SUMMARY.md           # Implementation details
├── JSDOC-IMPLEMENTATION-SUMMARY.md     # JSDoc coverage report
├── JSDOC-PROGRESS.md                   # Documentation progress
├── PACKAGE-STATS.md                    # Package metrics
├── DOCUMENTATION-INDEX.md              # This file
│
├── docs/
│   ├── ARCHITECTURE.md                 # System architecture
│   └── PERFORMANCE.md                  # Performance optimization
│
├── examples/
│   ├── basic-learning.ts               # 4-step pipeline demo
│   └── continuous-improvement.ts       # Multi-iteration learning
│
└── src/
    ├── reasoning-bank.ts               # Main interface
    ├── trajectory/                     # Trajectory tracking
    ├── verdict/                        # Verdict judgment
    ├── distill/                        # Memory distillation
    ├── consolidate/                    # EWC++ consolidation
    ├── matching/                       # Pattern matching
    └── types/                          # TypeScript types
```

---

## 🎯 Core Concepts

### 4-Step Learning Pipeline

1. **RETRIEVE** - [README](./README.md#1-retrieve) | [Quick Ref](./QUICK-REFERENCE.md#1-retrieve)
   - Fetch relevant patterns from past experiences
   - HNSW indexing for 150x-12,500x faster retrieval
   - Vector similarity search with embeddings

2. **JUDGE** - [README](./README.md#2-judge) | [Quick Ref](./QUICK-REFERENCE.md#2-judge)
   - Evaluate trajectory success/failure
   - Pattern-based verdict with critiques
   - Detailed feedback and improvements

3. **DISTILL** - [README](./README.md#3-distill) | [Quick Ref](./QUICK-REFERENCE.md#3-distill)
   - Extract key learnings from trajectories
   - Consolidate similar patterns
   - Identify applicability and anti-patterns

4. **CONSOLIDATE** - [README](./README.md#4-consolidate) | [Quick Ref](./QUICK-REFERENCE.md#4-consolidate)
   - Prevent catastrophic forgetting with EWC++
   - Protect important knowledge
   - Fisher information-based importance weights

---

## 📋 Component Guide

### ReasoningBank
- **Main Interface** - [README](./README.md#reasoningbank) | [Architecture](./docs/ARCHITECTURE.md#reasoningbank)
  - Orchestrates 4-step pipeline
  - Manages trajectories and patterns
  - Provides statistics and search

### TrajectoryTracker
- **Execution Tracking** - [Architecture](./docs/ARCHITECTURE.md#trajectorytracker)
  - Track agent execution paths
  - Record steps with actions, observations, thoughts
  - Session-based organization

### VerdictJudge
- **Outcome Evaluation** - [Architecture](./docs/ARCHITECTURE.md#verdictjudge)
  - Success/failure judgment
  - Pattern-based evaluation
  - Critique generation and improvements

### MemoryDistiller
- **Pattern Extraction** - [Architecture](./docs/ARCHITECTURE.md#memorydistiller)
  - Consolidate similar patterns
  - Extract high-level learnings
  - Identify applicability conditions

### EWCConsolidator
- **Forgetting Prevention** - [Architecture](./docs/ARCHITECTURE.md#ewcconsolidator)
  - Elastic Weight Consolidation++
  - Fisher information matrices
  - Importance-based protection

### PatternMatcher
- **Similarity Search** - [Architecture](./docs/ARCHITECTURE.md#patternmatcher)
  - Vector-based pattern matching
  - HNSW fast retrieval
  - MMR diverse selection

---

## 💡 Common Use Cases

### Learning from Past Experiences
→ See [Basic Learning Example](./examples/basic-learning.ts)
→ Read [RETRIEVE Section](./QUICK-REFERENCE.md#1-retrieve)

### Tracking Agent Execution
→ See [Trajectory Tracking](./README.md#trajectory-tracking)
→ Read [Architecture Guide](./docs/ARCHITECTURE.md#trajectorytracker)

### Evaluating Outcomes
→ See [Verdict Judgment](./README.md#verdict-judgment)
→ Read [Custom Judgment](./QUICK-REFERENCE.md#custom-judgment)

### Extracting Patterns
→ See [Memory Distillation](./README.md#memory-distillation)
→ Read [Pattern Clustering](./QUICK-REFERENCE.md#pattern-clustering)

### Preventing Forgetting
→ See [EWC++ Consolidation](./README.md#ewc-consolidation)
→ Read [Consolidation Guide](./QUICK-REFERENCE.md#4-consolidate)

### Continuous Improvement
→ See [Continuous Improvement Example](./examples/continuous-improvement.ts)
→ Read [Multi-Iteration Learning](./docs/ARCHITECTURE.md#continuous-learning)

---

## 🔍 Finding Information

### "How do I...?"

| Task | Documentation |
|------|---------------|
| Get started quickly | [QUICK-REFERENCE](./QUICK-REFERENCE.md) |
| Understand the architecture | [ARCHITECTURE](./docs/ARCHITECTURE.md) |
| Optimize performance | [PERFORMANCE](./docs/PERFORMANCE.md) |
| Learn from examples | [examples/](./examples/) |
| Track execution paths | [Trajectory Tracking](./README.md#trajectory-tracking) |
| Evaluate outcomes | [Verdict Judgment](./README.md#verdict-judgment) |
| Search for patterns | [Pattern Matching](./README.md#pattern-matching) |
| Prevent forgetting | [EWC++ Consolidation](./README.md#ewc-consolidation) |

---

## 📦 Package Information

| Property | Value |
|----------|-------|
| **Package Name** | @claude-flow/learning |
| **Version** | 3.0.0 |
| **License** | MIT |
| **Dependencies** | @claude-flow/memory ^3.0.0 |
| **Node.js** | >=18.0.0 |
| **TypeScript** | Full support with exported types |
| **Test Coverage** | >90% target |

---

## 🎓 Learning Path

### Beginner (15 minutes)
1. Read [QUICK-REFERENCE](./QUICK-REFERENCE.md)
2. Understand [4-Step Pipeline](./README.md#4-step-learning-pipeline)
3. Run [basic-learning.ts](./examples/basic-learning.ts)

### Intermediate (1 hour)
1. Study [ARCHITECTURE](./docs/ARCHITECTURE.md)
2. Review [PERFORMANCE](./docs/PERFORMANCE.md)
3. Run [continuous-improvement.ts](./examples/continuous-improvement.ts)

### Advanced (4 hours)
1. Deep dive into each component
2. Implement custom evaluators
3. Optimize for your use case
4. Integrate with your system

---

## 🛠️ Development Resources

### Example Code
- [`examples/basic-learning.ts`](./examples/basic-learning.ts) - Complete 4-step pipeline
- [`examples/continuous-improvement.ts`](./examples/continuous-improvement.ts) - Multi-iteration learning

### API Reference
- [ReasoningBank API](./QUICK-REFERENCE.md#reasoningbank)
- [Configuration](./QUICK-REFERENCE.md#configuration)
- [Core API Table](./QUICK-REFERENCE.md#core-api)

### Performance Optimization
- [Enable HNSW](./QUICK-REFERENCE.md#enable-hnsw)
- [Enable Quantization](./QUICK-REFERENCE.md#enable-quantization)
- [Batch Operations](./QUICK-REFERENCE.md#batch-operations)

### Build & Test
```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run examples
npx tsx examples/basic-learning.ts
```

---

## 📊 Performance Benchmarks

| Operation | Target | Typical | Notes |
|-----------|--------|---------|-------|
| retrieve() | <1ms | 0.1ms | With HNSW |
| judge() | <5ms | ~3ms | Pattern-based |
| distill() | <50ms | ~40ms | 100 patterns |
| consolidate() | <50ms | ~35ms | EWC++ |
| searchPatterns() | <10ms | ~5ms | Vector search |

See [PERFORMANCE](./docs/PERFORMANCE.md) for detailed benchmarks.

---

## 🧠 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ReasoningBank                        │
│  (Main Interface - Orchestrates 4-Step Pipeline)        │
└─────────────────────────────────────────────────────────┘
           │
           ├─> STEP 1: RETRIEVE
           │   ┌─────────────────────────────────────────┐
           │   │    PatternMatcher (HNSW Search)         │
           │   │    • Vector similarity                  │
           │   │    • 150x-12,500x faster               │
           │   └─────────────────────────────────────────┘
           │
           ├─> STEP 2: JUDGE
           │   ┌─────────────────────────────────────────┐
           │   │    VerdictJudge (Evaluation)            │
           │   │    • Success/failure judgment           │
           │   │    • Critique generation                │
           │   └─────────────────────────────────────────┘
           │
           ├─> STEP 3: DISTILL
           │   ┌─────────────────────────────────────────┐
           │   │    MemoryDistiller (Pattern Extraction) │
           │   │    • Consolidate patterns               │
           │   │    • Extract learnings                  │
           │   └─────────────────────────────────────────┘
           │
           └─> STEP 4: CONSOLIDATE
               ┌─────────────────────────────────────────┐
               │    EWCConsolidator (Forgetting Prevention) │
               │    • Fisher information                 │
               │    • Importance weights                 │
               └─────────────────────────────────────────┘

         Data Storage: VectorDatabase (@claude-flow/memory)
         • HNSW indexing for fast retrieval
         • 8-bit quantization for memory efficiency
         • Persistent storage
```

See [ARCHITECTURE](./docs/ARCHITECTURE.md) for detailed diagrams.

---

## 🔗 External Resources

### GitHub
- [Repository](https://github.com/ruvnet/claude-flow)
- [Issues](https://github.com/ruvnet/claude-flow/issues)
- [Discussions](https://github.com/ruvnet/claude-flow/discussions)

### NPM
- [Package](https://www.npmjs.com/package/@claude-flow/learning)
- [Download Stats](https://www.npmjs.com/package/@claude-flow/learning)

### Related Packages
- [@claude-flow/memory](https://www.npmjs.com/package/@claude-flow/memory) - Vector database
- [@claude-flow/cli-framework](https://www.npmjs.com/package/@claude-flow/cli-framework) - CLI framework

---

## 📝 Contributing

Interested in contributing? See the main repository's [CONTRIBUTING.md](../../CONTRIBUTING.md).

---

## 🆘 Getting Help

1. **Check documentation** - Start with [QUICK-REFERENCE](./QUICK-REFERENCE.md)
2. **Review examples** - See [examples/](./examples/)
3. **Read architecture** - Study [ARCHITECTURE](./docs/ARCHITECTURE.md)
4. **Search issues** - [GitHub Issues](https://github.com/ruvnet/claude-flow/issues)
5. **Ask questions** - [GitHub Discussions](https://github.com/ruvnet/claude-flow/discussions)

---

## 🎯 Key Features

### Performance
- **150x-12,500x faster** pattern retrieval with HNSW
- **50-75% memory reduction** with 8-bit quantization
- **<1ms** retrieve, **<5ms** judge, **<50ms** distill

### Learning
- **4-step pipeline** for continuous improvement
- **Pattern consolidation** reduces storage by ~70%
- **EWC++** prevents catastrophic forgetting

### Flexibility
- **Custom evaluators** for domain-specific quality
- **Time-based filtering** for recent patterns
- **MMR selection** for diverse pattern sets

### Integration
- **Vector database** integration via @claude-flow/memory
- **TypeScript** first-class support
- **Well-tested** >90% coverage target

---

## 📅 Version Information

- **Current Version**: 3.0.0
- **Release Date**: 2026-01-26
- **Status**: ✅ Stable - Production Ready
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

## 🏆 Best Practices

1. **Enable HNSW** for >100 patterns
2. **Use quantization** (8-bit recommended)
3. **Batch operations** when possible
4. **Set minReward** to filter low-quality patterns
5. **Monitor stats** for continuous improvement
6. **Implement caching** for frequent queries
7. **Use time-based filtering** for recent patterns
8. **Custom evaluators** for domain-specific quality

See [PERFORMANCE](./docs/PERFORMANCE.md) for detailed optimization guide.

---

## 🔄 Comparison with Alternatives

| Feature | ReasoningBank | Traditional RL | Simple Memory |
|---------|---------------|----------------|---------------|
| Pattern Learning | ✅ Automatic | ⚠️ Manual reward shaping | ❌ None |
| Fast Retrieval | ✅ HNSW (0.1ms) | ❌ N/A | ⚠️ Linear (15ms) |
| Forgetting Prevention | ✅ EWC++ | ❌ None | ❌ None |
| Pattern Consolidation | ✅ Automatic | ❌ None | ❌ None |
| Critique Generation | ✅ Detailed | ⚠️ Scalar reward | ❌ None |
| Memory Efficiency | ✅ 50-75% reduction | ❌ High memory | ⚠️ Medium |

---

**Last Updated**: 2026-01-30
**Maintained by**: [@ruvnet](https://github.com/ruvnet)
