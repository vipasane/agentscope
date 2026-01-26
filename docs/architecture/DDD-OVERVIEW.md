# Domain-Driven Design Documentation Index

This directory contains comprehensive Domain-Driven Design (DDD) specifications for AgentScope v1.2.

---

## Quick Navigation

| Document | Scope | Status |
|----------|-------|--------|
| **[DDD-003: Learning-Enhanced Domain Model](../adr/DDD-003-learning-enhanced-domain-model.md)** | 5 Core Bounded Contexts with Learning | Proposed |
| **[DDD-004: Common Core JSDoc Domain](./DDD-004-common-core-jsdoc-domain.md)** | 8 Infrastructure Packages | **NEW** |
| **[DDD v1.2 Context Map](./ddd-v12-context-map.md)** | Visual Architecture | Proposed |
| **[DDD v1.2 Quick Reference](./ddd-v12-quick-reference.md)** | Implementation Guide | Proposed |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  CLI Commands, User Interface, Workflow Orchestration            │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    DOMAIN LAYER (Core)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AgentScanning│  │  Security    │  │Documentation │          │
│  │   Context    │  │ Validation   │  │  Generation  │          │
│  │              │  │   Context    │  │   Context    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              INFRASTRUCTURE LAYER (Common Core)                  │
│  ┌────────┐ ┌─────────┐ ┌────────────┐ ┌──────────┐            │
│  │ Types  │ │Security │ │Performance │ │Formatters│            │
│  └────────┘ └─────────┘ └────────────┘ └──────────┘            │
│  ┌────────┐ ┌─────────┐ ┌────────────┐ ┌──────────┐            │
│  │ Hooks  │ │ Themes  │ │   Utils    │ │   CLI    │            │
│  └────────┘ └─────────┘ └────────────┘ └──────────┘            │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  EXTERNAL SYSTEMS (ACL)                          │
│  Claude Flow V3, AgentDB, ReasoningBank, HNSW Search             │
└──────────────────────────────────────────────────────────────────┘
```

---

## DDD-003: Learning-Enhanced Domain Model

**Focus:** 5 Core Bounded Contexts with Self-Learning Integration

### Bounded Contexts

1. **AgentScanning Context** (Core Domain)
   - Scan and parse AI agent configurations
   - Learn from successful scans and false positives
   - Aggregate Root: `AgentScopeConfiguration`

2. **SecurityValidation Context** (Core Domain)
   - Validate security posture
   - Learn threat patterns and risk scoring
   - Aggregate Root: `SecurityAssessment`

3. **DocumentationGeneration Context** (Core Domain)
   - Generate rich documentation
   - Learn user preferences and templates
   - Aggregate Root: `RichDocument`

4. **ThemeSystem Context** (Supporting Domain)
   - Visual styling with accessibility
   - Theme registry and palettes

5. **Intelligence Context** (Supporting Domain)
   - Learning coordination via Anti-Corruption Layer
   - Integrates with Claude Flow V3, AgentDB, ReasoningBank

### Key Innovation

**Learning is embedded behavior within aggregates**, not a separate domain. The Intelligence Context coordinates learning via ACL patterns.

---

## DDD-004: Common Core JSDoc Domain Model

**Focus:** 8 Infrastructure Packages with JSDoc Standards

### Bounded Contexts (Infrastructure Layer)

1. **Types Context** (Generic Domain)
   - Core type definitions and domain contracts
   - Entities: Agent, Skill, Hook, Command, McpServer, Plugin, Permission
   - Aggregate Root: `AgentScopeConfiguration`

2. **Security Context** (Supporting Domain)
   - Input validation and output sanitization
   - Anti-Corruption Layer for external input
   - Security contracts and threat models

3. **Performance Context** (Supporting Domain)
   - Metrics, benchmarking, caching
   - Performance targets and SLAs
   - LRU cache with hit rate tracking

4. **CLI Context** (Generic Domain)
   - Command-line interface framework
   - Command registration and help generation

5. **Formatters Context** (Supporting Domain)
   - Document building and output generation
   - Legend, navigation, relationship analysis
   - Section formatters for 7 entity types

6. **Hooks Context** (Supporting Domain)
   - Lifecycle events and learning integration
   - Pre/post-generate hooks
   - Pattern storage and adaptive optimization

7. **Themes Context** (Supporting Domain)
   - Visual styling system
   - 6 built-in palettes (light, dark, high-contrast, colorblind)
   - WCAG 2.1 AA/AAA compliance

8. **Utils Context** (Generic Domain)
   - Shared utilities (LRU cache, TTL cache, file cache)
   - Memoization decorators
   - Streaming utilities

### Key Innovation

**JSDoc as ubiquitous language** - Domain knowledge encoded in TypeScript types serves as executable contracts ensuring consistency across 73 modules.

---

## Ubiquitous Language

### Core DDD Terms

| Term | Definition | JSDoc Tag |
|------|------------|-----------|
| **Entity** | Object with identity and lifecycle | `@entity` |
| **Value Object** | Immutable descriptor defined by attributes | `@valueobject` |
| **Aggregate Root** | Consistency boundary controlling entity access | `@aggregateroot` |
| **Invariant** | Business rule that must always be true | `@invariant` |
| **Bounded Context** | Strategic boundary separating domains | `@boundedcontext` |
| **Anti-Corruption Layer** | Translation layer protecting domain from external APIs | `@acl` |

### Security Terms

| Term | Definition | JSDoc Tag |
|------|------------|-----------|
| **Validation** | Input checking before processing | `@validation` |
| **Sanitization** | Output cleaning before display | `@sanitization` |
| **Security Contract** | Security guarantee provided by function | `@security-contract` |
| **Threat Model** | Attack vectors to defend against | `@threat-model` |

### Performance Terms

| Term | Definition | JSDoc Tag |
|------|------------|-----------|
| **SLA** | Service Level Agreement (contractual) | `@sla` |
| **Performance Contract** | Performance guarantee | `@performance` |
| **Benchmark** | Repeatable performance test | `@benchmark` |
| **Cache Hit Rate** | Percentage of cache hits vs total requests | - |

---

## Strategic Patterns

### Context Mapping Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Partnership** | Tight collaboration, shared success | AgentScanning ↔ SecurityValidation |
| **Customer-Supplier** | One context provides for another | Types → All contexts |
| **Conformist** | Downstream conforms to upstream | DocumentationGeneration → Themes |
| **Anti-Corruption Layer** | Translation to protect domain | Hooks → External Systems |
| **Published Language** | Shared event vocabulary | Domain Events |
| **Open Host Service** | Standard API for consumers | Security validation API |

### Anti-Corruption Layer Adapters

**Hooks Context provides 3 ACL adapters:**

1. **ClaudeFlowAdapter** - Translates to CLI commands
2. **AgentDBAdapter** - Translates to memory storage
3. **ReasoningBankAdapter** - Translates to trajectory storage

---

## Domain Events

### Pre-Generate Event
```typescript
interface PreGenerateEvent {
  type: 'PreGenerate';
  requestId: string;
  config: AgentScopeConfig;
  options: ComponentMapOptions;
  timestamp: number;
}
```

### Post-Generate Event
```typescript
interface PostGenerateEvent {
  type: 'PostGenerate';
  requestId: string;
  diagram: string;
  metrics: { generationTimeMs, nodeCount, edgeCount };
  success: boolean;
  timestamp: number;
}
```

### Pattern Storage Event
```typescript
interface PatternStorageEvent {
  type: 'PatternStorage';
  patternId: string;
  pattern: GenerationPattern;
  timestamp: number;
}
```

### Security Validation Event
```typescript
interface SecurityValidationEvent {
  type: 'SecurityValidation';
  target: { type: string; id: string };
  result: ValidationResult;
  timestamp: number;
}
```

---

## JSDoc Standard Template

```typescript
/**
 * [Brief one-line description]
 *
 * [Detailed multi-line explanation]
 *
 * @module [package/module-path]
 * @domain [Domain name]
 * @boundedcontext [Core/Supporting/Generic]
 *
 * @entity | @valueobject | @aggregateroot | @service
 * @invariant [Business rule]
 *
 * @security-contract [Security guarantee]
 * @performance [Performance characteristic]
 * @sla [Service level agreement]
 *
 * @template T - [Generic type description]
 * @param name - [Parameter description]
 * @returns [Return value description]
 * @throws [Exception type] [When thrown]
 *
 * @example
 * ```typescript
 * // Clear, executable code example
 * const result = doSomething({ option: true });
 * ```
 *
 * @see [Related types/functions]
 */
```

---

## Implementation Checklist

### Phase 1: Add JSDoc (Week 1-2)
- [ ] Add module-level `@module`, `@domain`, `@boundedcontext` to all 8 packages
- [ ] Add type-level `@entity`, `@valueobject`, `@aggregateroot` tags
- [ ] Document all `@invariant` business rules
- [ ] Add `@example` to all public APIs

### Phase 2: Enforce Contracts (Week 3-4)
- [ ] Add `@security-contract` to all security functions
- [ ] Add `@performance` to performance-critical functions
- [ ] Add `@sla` to PERFORMANCE_TARGETS
- [ ] Write security contract tests
- [ ] Write performance contract tests

### Phase 3: ACL Implementation (Week 5-6)
- [ ] Implement ClaudeFlowAdapter
- [ ] Implement AgentDBAdapter
- [ ] Implement ReasoningBankAdapter
- [ ] Write integration tests for ACL boundaries
- [ ] Document ACL translation mappings

### Phase 4: Documentation (Week 7-8)
- [ ] Set up TypeDoc tooling
- [ ] Generate HTML documentation
- [ ] Integrate into CI/CD pipeline
- [ ] Establish JSDoc review process
- [ ] Create developer onboarding guide

---

## Performance Targets

From PERFORMANCE_TARGETS constant:

| Metric | Target | Status |
|--------|--------|--------|
| **Scan Time** | <5s for <50 components | Specified |
| **Memory Usage** | <100MB for typical projects | Specified |
| **Diagram Generation** | <1s per diagram | Specified |
| **Cache Hit Rate** | >80% | Aspirational |
| **HNSW Search** | 150x-12,500x speedup | Aspirational |

---

## Security Contracts

### Input Validation Contracts

1. **Theme Name Validation**
   - Must reject themes not in THEME_ALLOWLIST
   - Must reject themes containing Mermaid directives

2. **Hook Validation**
   - Must detect command injection patterns (;, &&, |, $())
   - Must detect path traversal patterns (../, ..\)
   - Must flag dangerous tools (rm, curl, wget, eval)
   - Must enforce timeout bounds (1000ms - 300000ms)

3. **Agent Count Validation**
   - Must reject negative counts
   - Must reject counts exceeding MAX_AGENTS

### Output Sanitization Contracts

1. **Node Label Sanitization**
   - Must remove control characters (\n, \r, \t)
   - Must escape Mermaid special chars (", %, [, ])
   - Must truncate to maxLength
   - Must prevent directive injection

2. **Path Sanitization**
   - Must neutralize path traversal (../)
   - Must normalize separators
   - Must validate against root path

---

## Tools and Commands

### Generate JSDoc Documentation
```bash
npm run docs:generate
# Output: docs/api/
```

### Validate JSDoc Coverage
```bash
npm run docs:validate
# Checks all public APIs have JSDoc
```

### Run Security Contract Tests
```bash
npm test -- --grep "Security Contract"
```

### Run Performance Contract Tests
```bash
npm test -- --grep "Performance Contract"
```

---

## Related Resources

- [CLAUDE.md](../../CLAUDE.md) - Project instructions
- [Agent Security Architecture](./agent-security-architecture.md)
- [Learning Enhanced Security](./learning-enhanced-security-architecture.md)
- [Neural Performance Architecture](./neural-performance-architecture.md)
- [C4 Diagrams](./c4-diagrams.md)

---

**Last Updated:** 2026-01-26
**Version:** 1.2.0-alpha
**Status:** Documentation Complete, Implementation Pending
