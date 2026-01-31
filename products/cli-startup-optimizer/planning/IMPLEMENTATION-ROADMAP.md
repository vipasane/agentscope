# CLI Startup Optimizer - Implementation Roadmap

**Target:** Reduce CLI startup from 1,549ms to <500ms (3.1x improvement)
**Timeline:** 6 weeks
**Team:** V3 Performance Engineering
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase-by-Phase Implementation](#phase-by-phase-implementation)
3. [Resource Allocation](#resource-allocation)
4. [Risk Management](#risk-management)
5. [Quality Gates](#quality-gates)
6. [Rollback Procedures](#rollback-procedures)
7. [Success Metrics](#success-metrics)

---

## Executive Summary

### Objectives
- ✅ Reduce CLI startup time from **1,549ms** to **<500ms** (3.1x improvement minimum)
- ✅ Reduce initial memory footprint from **85MB** to **<50MB** (41% reduction)
- ✅ Achieve **>80% cache hit rate** for warm starts
- ✅ Maintain 100% backward compatibility
- ✅ Zero breaking changes for existing users

### Approach
Hybrid optimization strategy combining:
1. **Lazy Loading** - Load modules on-demand
2. **Module Caching** - Persistent cache with quantization
3. **Intelligent Preloading** - SONA-powered predictive loading
4. **Bundle Optimization** - Replace heavy dependencies, tree-shake aggressively
5. **Continuous Validation** - Benchmarks at every phase

### Timeline Overview

```
Week 1-2: Phase 1 - Core Lazy Loading → Target: 800ms (1.9x)
Week 2-3: Phase 2 - Module Caching → Target: 500ms (3.1x) ✅ MEETS TARGET
Week 3-4: Phase 3 - Intelligent Preloading → Target: 350ms (4.4x)
Week 4-5: Phase 4 - Bundle Optimization → Target: 280ms (5.5x)
Week 5-6: Phase 5 - Validation & Tuning → Target: <250ms (6.2x)
```

---

## Phase-by-Phase Implementation

### Phase 1: Core Lazy Loading (Weeks 1-2)

**Goal:** Reduce startup to ~800ms through dynamic module loading

#### Week 1: Foundation

**Day 1-2: Audit & Planning**
- [ ] Audit all CLI imports using dependency graph analysis
- [ ] Identify critical path modules vs. optional modules
- [ ] Map command → module dependencies
- [ ] Design LazyModuleRegistry architecture
- [ ] Create migration checklist

**Deliverable:** Module dependency map and migration plan

**Day 3-5: Core Implementation**
- [ ] Implement LazyModuleRegistry class
  ```typescript
  class LazyModuleRegistry {
    private modules = new Map<string, Promise<any>>();
    private loadTimes = new Map<string, number>();

    async load<T>(path: string): Promise<T>;
    getLoadTime(path: string): number | undefined;
    getStats(): RegistryStats;
  }
  ```
- [ ] Convert CLI entry point to lazy loading
- [ ] Implement module timing instrumentation
- [ ] Add error handling and fallbacks

**Deliverable:** Working LazyModuleRegistry with instrumentation

#### Week 2: Migration & Validation

**Day 1-3: Command Migration**
- [ ] Convert all command handlers to dynamic imports
  ```typescript
  // Before
  import { spawnCommand } from './commands/spawn';

  // After
  const { spawnCommand } = await registry.load('./commands/spawn');
  ```
- [ ] Migrate by priority:
  1. Core commands (version, help, init)
  2. Common commands (agent spawn, swarm status)
  3. Advanced commands (neural train, performance benchmark)

**Day 4-5: Testing & Benchmarking**
- [ ] Run comprehensive test suite
- [ ] Benchmark cold start (100 iterations)
- [ ] Benchmark warm start (100 iterations)
- [ ] Test all commands for regressions
- [ ] Measure memory footprint

**Quality Gate:**
- ✅ All tests passing
- ✅ Startup time ≤ 850ms (target: 800ms)
- ✅ No functional regressions
- ✅ Memory usage ≤ 65MB (target: 60MB)

**Deliverable:** Lazy loading implementation with benchmark report

---

### Phase 2: Module Caching (Weeks 2-3)

**Goal:** Reduce startup to ~500ms through persistent caching

#### Week 2 (cont.): Cache Architecture

**Day 1-2: Design & Implementation**
- [ ] Design cache schema
  ```typescript
  interface CacheEntry {
    key: string;        // module:path:hash
    value: Buffer;      // quantized module data
    version: string;    // cache schema version
    timestamp: number;
    ttl: number;
    size: number;
  }
  ```
- [ ] Implement ModuleCacheManager with AgentDB backend
- [ ] Add cache versioning for safe updates
- [ ] Implement hash-based invalidation

**Day 3: Quantization Layer**
- [ ] Implement int8 quantization for cache data
  ```typescript
  class CacheQuantizer {
    quantize(data: any): Buffer;      // 50-75% size reduction
    dequantize(buffer: Buffer): any;
  }
  ```
- [ ] Add compression for string data
- [ ] Test quantization accuracy (should be lossless for module data)

**Day 4-5: Integration**
- [ ] Integrate cache with LazyModuleRegistry
- [ ] Add cache hit/miss tracking
- [ ] Implement cache warming strategy
- [ ] Add cache management commands (clear, stats, etc.)

#### Week 3: Optimization & Testing

**Day 1-2: Cache Optimization**
- [ ] Tune cache TTL (default: 7 days)
- [ ] Implement LRU eviction policy
- [ ] Add cache size limits (max: 50MB)
- [ ] Optimize cache read/write performance

**Day 3-5: Validation**
- [ ] Benchmark with cache (cold start)
- [ ] Benchmark with cache (warm start)
- [ ] Test cache persistence across restarts
- [ ] Test cache invalidation scenarios
- [ ] Measure cache hit rate over time

**Quality Gate:**
- ✅ Startup time ≤ 550ms with cold cache
- ✅ Startup time ≤ 300ms with warm cache (target: <300ms)
- ✅ Cache hit rate ≥ 50% after 10 commands
- ✅ Memory usage ≤ 55MB
- ✅ Zero cache corruption issues

**Deliverable:** Production-ready caching system with benchmark report

---

### Phase 3: Intelligent Preloading (Weeks 3-4)

**Goal:** Reduce startup to ~350ms through predictive module loading

#### Week 3 (cont.): SONA Integration

**Day 1-2: Trajectory Collection**
- [ ] Implement usage tracking
  ```typescript
  class TrajectoryCollector {
    recordCommand(event: CommandEvent): void;
    getTrajectories(): Trajectory[];
    export(): TrainingData;
  }
  ```
- [ ] Add command sequence tracking
- [ ] Collect initial training data (100+ samples)

**Day 3-5: SONA Model Training**
- [ ] Design SONA model architecture for preloading
- [ ] Train initial model on collected data
- [ ] Implement prediction interface
  ```typescript
  class SONAPreloadOptimizer {
    async predictNextModules(context: Context): Promise<string[]>;
    async learnFromUsage(command: string, next: string): Promise<void>;
  }
  ```
- [ ] Validate prediction accuracy

#### Week 4: Preload Implementation

**Day 1-3: Preload Worker**
- [ ] Implement background preload worker
  ```typescript
  class PreloadWorker {
    async preload(modules: string[]): Promise<void>;
    getPriority(): 'low' | 'normal' | 'high';
    cancel(): void;
  }
  ```
- [ ] Add priority-based preloading
- [ ] Implement preload cancellation (if user command comes first)
- [ ] Tune preload timing (idle detection)

**Day 4-5: Integration & Tuning**
- [ ] Integrate SONA predictor with CLI
- [ ] Add prediction confidence thresholds
- [ ] Implement fallback to deterministic preloading
- [ ] Tune prediction parameters

**Quality Gate:**
- ✅ Startup time ≤ 400ms with preloading
- ✅ Cache hit rate ≥ 75%
- ✅ Prediction accuracy ≥ 60%
- ✅ No impact on foreground commands (preload doesn't block)
- ✅ Memory usage ≤ 50MB

**Deliverable:** SONA-powered preloading with accuracy metrics

---

### Phase 4: Bundle Optimization (Weeks 4-5)

**Goal:** Reduce startup to ~280ms through dependency optimization

#### Week 4 (cont.): fast-glob Replacement

**Day 1-2: Analysis & Design**
- [ ] Analyze fast-glob usage patterns in codebase
- [ ] Design lightweight alternative for simple patterns
- [ ] Implement OptimizedFileScanner
  ```typescript
  class OptimizedFileScanner {
    async findFiles(pattern: string): Promise<string[]>;
    private isSimplePattern(pattern: string): boolean;
    private nativeGlob(pattern: string): Promise<string[]>;
  }
  ```

**Day 3-5: Implementation & Migration**
- [ ] Implement native glob for simple patterns (*.ts, src/**/*.js)
- [ ] Lazy load fast-glob only for complex patterns
- [ ] Migrate all glob usage to OptimizedFileScanner
- [ ] Test all glob patterns

#### Week 5: Bundle Optimization

**Day 1-2: Tree Shaking**
- [ ] Configure advanced tree-shaking (Rollup/ESBuild)
- [ ] Analyze bundle with visualization tool
- [ ] Remove dead code and unused exports
- [ ] Split vendor bundles from application code

**Day 3: Code Splitting**
- [ ] Implement code splitting by command groups
  ```typescript
  // Core commands (always loaded)
  const core = ['version', 'help', 'init'];

  // Feature groups (lazy loaded)
  const groups = {
    agent: ['spawn', 'list', 'status', 'stop'],
    swarm: ['init', 'status', 'shutdown'],
    memory: ['store', 'search', 'retrieve', 'list']
  };
  ```
- [ ] Configure dynamic imports for feature groups
- [ ] Test code splitting

**Day 4-5: Dependency Optimization**
- [ ] Audit all dependencies for size and load time
- [ ] Replace heavy dependencies:
  - fast-glob → OptimizedFileScanner
  - moment → date-fns (if used)
  - lodash → es6 native (if used)
- [ ] Move dev dependencies out of production bundle
- [ ] Minimize and compress bundles

**Quality Gate:**
- ✅ Startup time ≤ 320ms
- ✅ Bundle size ≤ 5MB (down from ~10MB)
- ✅ fast-glob load time: 0ms startup, <100ms when needed
- ✅ Zero dependency-related regressions
- ✅ All glob patterns working correctly

**Deliverable:** Optimized bundle with size report

---

### Phase 5: Validation & Tuning (Weeks 5-6)

**Goal:** Achieve <250ms startup with production validation

#### Week 5 (cont.): Comprehensive Testing

**Day 1-2: Benchmark Suite**
- [ ] Implement comprehensive benchmark suite
  ```typescript
  class BenchmarkSuite {
    runColdStart(iterations: 100): Promise<Stats>;
    runWarmStart(iterations: 100): Promise<Stats>;
    runCommonCommands(): Promise<Map<string, Stats>>;
    runMemoryProfile(): Promise<MemoryStats>;
    runCachePerformance(): Promise<CacheStats>;
  }
  ```
- [ ] Run full benchmark suite on all platforms:
  - Linux (Ubuntu 22.04)
  - macOS (Intel & Apple Silicon)
  - Windows 11
- [ ] Generate benchmark report with visualizations

**Day 3: Regression Testing**
- [ ] Implement performance regression guard
- [ ] Add to CI/CD pipeline
- [ ] Test all edge cases and uncommon commands
- [ ] Validate cross-platform parity (variance <10%)

#### Week 6: Production Rollout

**Day 1-2: Documentation**
- [ ] Update CLI documentation
- [ ] Add performance optimization guide
- [ ] Document cache management
- [ ] Create troubleshooting guide

**Day 3-5: Gradual Rollout**
- [ ] Week 6 Day 3: Internal testing (10% traffic)
- [ ] Week 6 Day 4: Beta users (25% traffic)
- [ ] Week 6 Day 5: Gradual rollout (50% → 100%)
- [ ] Monitor metrics continuously
- [ ] Respond to issues quickly

**Quality Gate (Final):**
- ✅ CLI cold start p95 < 500ms
- ✅ CLI cold start p50 < 250ms (stretch goal)
- ✅ CLI warm start p95 < 300ms
- ✅ Cache hit rate > 80%
- ✅ Memory initial < 50MB
- ✅ Zero breaking changes
- ✅ All platforms within 10% performance variance
- ✅ Production monitoring active

**Deliverable:** Production-ready CLI with full documentation

---

## Resource Allocation

### Team Structure

| Role | Responsibility | Allocation |
|------|----------------|------------|
| **Performance Engineer** | Lead implementation, benchmarking | 100% (6 weeks) |
| **Backend Engineer** | Cache implementation, AgentDB integration | 50% (weeks 2-3) |
| **ML Engineer** | SONA integration, model training | 50% (weeks 3-4) |
| **QA Engineer** | Testing, validation, regression checks | 75% (weeks 4-6) |
| **DevOps Engineer** | CI/CD integration, monitoring | 25% (weeks 5-6) |
| **Tech Lead** | Code review, architecture decisions | 10% (ongoing) |

### Equipment & Tools

| Resource | Purpose | Cost |
|----------|---------|------|
| Benchmark Server (Linux) | Performance testing | Cloud VM |
| MacBook Pro (Intel & M1) | macOS testing | Existing |
| Windows 11 VM | Windows testing | Cloud VM |
| Monitoring Dashboard | Production metrics | DataDog/Grafana |
| CI/CD Minutes | Automated testing | GitHub Actions |

---

## Risk Management

### Risk Matrix

| Risk | Impact | Probability | Mitigation | Owner |
|------|--------|-------------|------------|-------|
| **Breaking changes in refactor** | HIGH | MEDIUM | Feature flags, comprehensive tests, gradual rollout | Performance Engineer |
| **Cache corruption bugs** | MEDIUM | MEDIUM | Versioned cache keys, safe fallback, validation | Backend Engineer |
| **SONA learning instability** | LOW | LOW | Fallback to deterministic preloading | ML Engineer |
| **Platform compatibility** | MEDIUM | LOW | Cross-platform CI, extensive testing | QA Engineer |
| **Memory leaks from caching** | MEDIUM | MEDIUM | Memory monitoring, LRU eviction, TTL | Performance Engineer |
| **Scope creep / timeline slip** | MEDIUM | MEDIUM | Strict phase gates, weekly reviews | Tech Lead |

### Contingency Plans

#### If Phase 1 misses target (>850ms)
- **Action:** Extend by 3 days for additional optimization
- **Impact:** Delay Phase 2 start
- **Decision Point:** End of Week 2

#### If cache hit rate <50% in Phase 2
- **Action:** Tune cache invalidation, extend TTL, improve warming
- **Impact:** May not meet warm start target
- **Decision Point:** Week 3 Day 3

#### If SONA predictions <40% accuracy
- **Action:** Fall back to deterministic preloading based on command frequency
- **Impact:** Slower improvement, but still functional
- **Decision Point:** Week 4 Day 3

#### If final target not met (<500ms)
- **Action:** Ship Phase 2 results (cache-optimized), continue optimization post-launch
- **Impact:** 3.1x improvement instead of 6x
- **Decision Point:** Week 6 Day 1

---

## Quality Gates

### Phase 1 Gate (End of Week 2)

**Criteria:**
- [ ] All tests passing (100% coverage maintained)
- [ ] Startup time ≤ 850ms (target: 800ms)
- [ ] Memory usage ≤ 65MB (target: 60MB)
- [ ] No functional regressions
- [ ] Code reviewed and approved
- [ ] Documentation updated

**Go/No-Go Decision:**
- **GO:** Proceed to Phase 2
- **NO-GO:** Extend Phase 1 by 3 days for debugging

### Phase 2 Gate (End of Week 3)

**Criteria:**
- [ ] Cold start ≤ 550ms
- [ ] Warm start ≤ 300ms
- [ ] Cache hit rate ≥ 50%
- [ ] Cache corruption rate = 0%
- [ ] Memory usage ≤ 55MB
- [ ] Cross-platform validation passed

**Go/No-Go Decision:**
- **GO:** Proceed to Phase 3
- **NO-GO:** Tune cache parameters, extend by 2 days

### Phase 3 Gate (End of Week 4)

**Criteria:**
- [ ] Startup time ≤ 400ms
- [ ] Cache hit rate ≥ 75%
- [ ] SONA prediction accuracy ≥ 60%
- [ ] Preload doesn't block foreground commands
- [ ] Memory usage ≤ 50MB

**Go/No-Go Decision:**
- **GO:** Proceed to Phase 4
- **NO-GO:** Fall back to deterministic preloading

### Phase 4 Gate (End of Week 5)

**Criteria:**
- [ ] Startup time ≤ 320ms
- [ ] Bundle size ≤ 5MB
- [ ] All glob patterns working
- [ ] Zero dependency regressions

**Go/No-Go Decision:**
- **GO:** Proceed to Phase 5
- **NO-GO:** Revert bundle changes, ship Phase 3 results

### Phase 5 Gate (End of Week 6) - **FINAL GATE**

**Criteria:**
- [ ] CLI cold start p95 < 500ms ✅ CRITICAL
- [ ] CLI warm start p95 < 300ms
- [ ] Cache hit rate > 80%
- [ ] Memory initial < 50MB
- [ ] Zero breaking changes
- [ ] All platforms within 10% variance
- [ ] Production monitoring active
- [ ] Documentation complete
- [ ] Rollback plan tested

**Go/No-Go Decision:**
- **GO:** Ship to production
- **NO-GO:** Delay launch, address blockers

---

## Rollback Procedures

### Emergency Rollback (Critical Issues)

**Trigger Conditions:**
- CLI crashes or hangs (>5s startup)
- Data corruption in cache
- Breaking changes affecting >10% of users
- Memory leaks causing OOM errors

**Procedure:**
```bash
# 1. Disable feature flags immediately
export CLI_LAZY_LOADING=false
export CLI_MODULE_CACHE=false
export CLI_SONA_PRELOAD=false

# 2. Revert to previous version
git revert <optimization-commit-range>
npm run build
npm publish --tag emergency-rollback

# 3. Clear user caches
npx @claude-flow/cli@latest cache clear --force

# 4. Notify users via npm deprecation warning
npm deprecate @claude-flow/cli@<bad-version> "Emergency rollback - please upgrade"

# 5. Post-mortem within 24 hours
```

**Rollback Time:** <15 minutes

### Partial Rollback (Non-Critical Issues)

**Trigger Conditions:**
- Performance regression <10%
- Cache hit rate lower than expected
- Platform-specific issues (single OS)

**Procedure:**
```bash
# Disable specific features via flags
export CLI_SONA_PRELOAD=false  # Disable SONA if predictions poor
export CLI_MODULE_CACHE=false  # Disable cache if corruption detected

# Gradual rollback
# Reduce traffic: 100% → 50% → 25% → 0%
```

**Rollback Time:** <1 hour

### Rollback Testing

- [ ] Test rollback procedure in staging (Week 5)
- [ ] Verify feature flags work correctly
- [ ] Ensure cache can be safely cleared
- [ ] Document rollback steps for on-call team

---

## Success Metrics

### Primary Metrics (Must Achieve)

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **CLI Cold Start (p95)** | 1,549ms | <500ms | 100 iterations, cleared cache |
| **CLI Warm Start (p95)** | N/A | <300ms | 100 iterations, primed cache |
| **Initial Memory** | 85MB | <50MB | process.memoryUsage().heapUsed |
| **Cache Hit Rate** | 0% | >80% | hits / (hits + misses) over 100 commands |

### Secondary Metrics (Should Achieve)

| Metric | Target | Measurement |
|--------|--------|-------------|
| CLI Cold Start (p50) | <250ms | Median of 100 iterations |
| Module Load Time | <100ms | Per-module instrumentation |
| Bundle Size | <5MB | Minified + gzipped |
| Cache Storage | <20MB | AgentDB database size |
| Cross-Platform Variance | <10% | Max difference between platforms |

### Long-Term Metrics (Monitor Post-Launch)

| Metric | Target | Monitoring Tool |
|--------|--------|-----------------|
| p99 Latency | <800ms | DataDog / Prometheus |
| Error Rate | <0.1% | Sentry |
| Cache Corruption Rate | 0% | Custom metrics |
| Memory Leak Rate | 0 MB/hour | Memory profiling |
| SONA Prediction Accuracy | >70% | Custom analytics |

### Reporting Cadence

- **Daily:** During implementation (standup)
- **Weekly:** Phase gate reviews
- **Monthly:** Post-launch performance reviews

---

## Communication Plan

### Internal Updates

| Audience | Frequency | Format | Content |
|----------|-----------|--------|---------|
| Engineering Team | Daily | Slack standup | Progress, blockers, decisions |
| Tech Leadership | Weekly | Email summary | Phase progress, risks, metrics |
| QA Team | Bi-weekly | Meeting | Testing priorities, results |
| DevOps Team | As needed | Slack | Deployment, monitoring |

### External Communication

| Audience | Timing | Channel | Message |
|----------|--------|---------|---------|
| Beta Users | Week 3 | Email | "Try new performance improvements" |
| All Users | Week 6 | Release Notes | "3x faster CLI startup" |
| Community | Week 6 | Blog Post | Technical deep-dive |
| Documentation | Week 6 | Docs Site | Updated guides |

---

## Dependencies & Assumptions

### Technical Dependencies

- ✅ AgentDB available and stable
- ✅ SONA learning system operational
- ✅ MCP integration unaffected by changes
- ✅ Node.js 20+ performance characteristics
- ✅ ES module support in target environments

### Assumptions

- Fast-glob is the primary bottleneck (validated: 5.3s)
- Users run CLI commands in sequences (enables preloading)
- Cache storage <20MB is acceptable
- Warm starts matter more than cold starts for daily use
- Cross-platform behavior is consistent (may need tuning)

---

## Appendix: Reference Implementation Snippets

### LazyModuleRegistry

```typescript
// src/core/lazy-module-registry.ts
export class LazyModuleRegistry {
  private modules = new Map<string, Promise<any>>();
  private loadTimes = new Map<string, number>();
  private stats = { loads: 0, cacheHits: 0 };

  async load<T>(modulePath: string): Promise<T> {
    const startTime = performance.now();

    if (!this.modules.has(modulePath)) {
      this.modules.set(modulePath, import(modulePath));
      this.stats.loads++;
    } else {
      this.stats.cacheHits++;
    }

    const module = await this.modules.get(modulePath)!;
    const loadTime = performance.now() - startTime;

    this.loadTimes.set(modulePath, loadTime);

    return module;
  }

  getStats(): RegistryStats {
    return {
      totalLoads: this.stats.loads,
      cacheHits: this.stats.cacheHits,
      averageLoadTime: this.getAverageLoadTime(),
      slowestModule: this.getSlowestModule()
    };
  }

  private getAverageLoadTime(): number {
    const times = Array.from(this.loadTimes.values());
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  private getSlowestModule(): { path: string; time: number } | null {
    let slowest: { path: string; time: number } | null = null;

    for (const [path, time] of this.loadTimes.entries()) {
      if (!slowest || time > slowest.time) {
        slowest = { path, time };
      }
    }

    return slowest;
  }
}
```

### ModuleCacheManager

```typescript
// src/core/module-cache-manager.ts
export class ModuleCacheManager {
  private cache: AgentDB;
  private stats = { hits: 0, misses: 0 };
  private quantizer = new CacheQuantizer();

  async getCached(path: string, hash: string): Promise<any | null> {
    const key = `module:${path}:${hash}`;

    try {
      const cached = await this.cache.get(key);

      if (cached) {
        this.stats.hits++;
        return this.quantizer.dequantize(cached);
      }
    } catch (e) {
      console.warn(`Cache miss for ${path}:`, e);
    }

    this.stats.misses++;
    return null;
  }

  async setCached(path: string, hash: string, module: any): Promise<void> {
    const key = `module:${path}:${hash}`;
    const quantized = await this.quantizer.quantize(module);

    await this.cache.set(key, quantized, {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      namespace: 'module-cache',
      version: '1.0'
    });
  }

  getCacheHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  async clear(): Promise<void> {
    await this.cache.clear({ namespace: 'module-cache' });
    this.stats = { hits: 0, misses: 0 };
  }

  async getSize(): Promise<number> {
    return await this.cache.getNamespaceSize('module-cache');
  }
}
```

### SONAPreloadOptimizer

```typescript
// src/intelligence/sona-preload-optimizer.ts
export class SONAPreloadOptimizer {
  private trajectories: Trajectory[] = [];
  private modelId = 'module-preload-optimizer';

  async predictNextModules(context: PredictionContext): Promise<string[]> {
    try {
      const prediction = await mcp__claude_flow__neural_predict({
        modelId: this.modelId,
        input: JSON.stringify({
          currentCommand: context.command,
          timestamp: Date.now(),
          recentHistory: context.history.slice(-5)
        })
      });

      return prediction.modules
        .filter((m: any) => m.confidence > 0.5)
        .sort((a: any, b: any) => b.confidence - a.confidence)
        .map((m: any) => m.path)
        .slice(0, 5); // Top 5 predictions

    } catch (e) {
      console.warn('SONA prediction failed, using fallback:', e);
      return this.deterministicFallback(context);
    }
  }

  async learnFromUsage(command: string, nextCommand: string | null): Promise<void> {
    this.trajectories.push({
      command,
      nextCommand,
      timestamp: Date.now()
    });

    if (this.trajectories.length >= 100) {
      await this.trainModel();
      this.trajectories = this.trajectories.slice(-20); // Keep recent context
    }
  }

  private async trainModel(): Promise<void> {
    await mcp__claude_flow__neural_train({
      pattern_type: 'module-preload',
      training_data: JSON.stringify({
        trajectories: this.trajectories,
        metadata: {
          version: '1.0',
          platform: process.platform
        }
      }),
      epochs: 10
    });
  }

  private deterministicFallback(context: PredictionContext): string[] {
    // Fallback: preload most common modules for this command
    const commonModules: Record<string, string[]> = {
      'agent': ['./commands/spawn', './commands/list'],
      'swarm': ['./commands/init', './commands/status'],
      'memory': ['./commands/store', './commands/search']
    };

    const commandGroup = context.command.split(' ')[0];
    return commonModules[commandGroup] || [];
  }
}
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-30
**Owner:** V3 Performance Engineering Team
**Status:** Ready for Review & Approval
