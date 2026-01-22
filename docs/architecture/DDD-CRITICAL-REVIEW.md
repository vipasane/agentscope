# DDD Implementation Critical Review

> **Review Date**: January 2026
> **Reviewer**: DDD Domain Expert Agent
> **Status**: Critical Issues Identified

---

## Executive Summary

The DDD-IMPLEMENTATION.md document provides a comprehensive DDD architecture for AgentScope but contains several critical issues that should be addressed before implementation. This review identifies problems with bounded context isolation, aggregate design, entity/value object distinctions, domain events, anti-corruption layers, external integrations, and significant information replication concerns.

**Overall Assessment**: The implementation plan is overly complex for the stated problem domain (a CLI documentation tool) and replicates information better suited to references. Significant simplification is recommended.

---

## 1. Bounded Context Issues

### 1.1 CRITICAL: Contexts Not Properly Isolated

**Issue**: The four bounded contexts (Scanner, Generator, Model, CLI) share too many concepts across boundaries.

| Problem | Location | Impact |
|---------|----------|--------|
| `ConfigFragment` leaked from Scanner to Model | `TransformService.ts` line 1096 | Violates context isolation |
| `AgentScopeConfig` used directly in Generator | `GenerationSession.ts` line 1206 | No ACL protection |
| Scanner types imported directly in Model ACL | `ScannerACL.ts` line 2189 | Tight coupling |

**Evidence from DDD-IMPLEMENTATION.md**:
```typescript
// src/model/domain/services/TransformService.ts
import { ConfigFragment } from '../../scanner/domain/value-objects/ConfigFragment';
// ^^^ This import VIOLATES bounded context isolation
```

The Model context directly imports Scanner domain types. This creates coupling and makes contexts non-independently deployable.

**Recommendation**:
1. Define translation interfaces at context boundaries
2. Use Published Language (DTOs) between Scanner and Model
3. Model context should NEVER import Scanner domain types

### 1.2 CRITICAL: Shared Kernel Misuse

**Issue**: The "Model" context is labeled as "Shared Kernel" but contains domain logic that should be context-specific.

Per DDD, a Shared Kernel should contain:
- Shared types/DTOs that multiple contexts agree on
- Minimal, stable abstractions

The current Model context contains:
- Business logic (ValidationService)
- Transformation logic (TransformService)
- Full aggregate with invariants (AgentScopeConfig)

This is NOT a Shared Kernel - it's a Core Domain context being incorrectly classified.

**Recommendation**: Rename "Model Domain (Shared Kernel)" to "Config Domain (Core)" and treat it as a first-class bounded context with proper ACL boundaries.

### 1.3 Missing Bounded Contexts

**Issue**: The document fails to identify these implicit bounded contexts:

| Missing Context | Evidence | Why It Matters |
|----------------|----------|----------------|
| **FileSystem** | Direct fs calls in parsers | Should be infrastructure abstraction |
| **Template** | Handlebars templates in Generator | Different concerns than generation |
| **Reporting** | Error aggregation logic scattered | Cross-cutting concern |

---

## 2. Aggregate Design Issues

### 2.1 CRITICAL: AgentScopeConfig Aggregate Too Large

**Issue**: The `AgentScopeConfig` aggregate root manages 5 different entity collections:
- `_agents: Map<AgentId, Agent>`
- `_skills: Map<SkillId, Skill>`
- `_hooks: Map<HookId, Hook>`
- `_commands: Map<CommandId, Command>`
- `_mcpServers: Map<MCPServerId, MCPServer>`

This violates the DDD principle of small aggregates with tight invariants.

**Problems**:
1. No transactional boundary justification - why must all these be consistent together?
2. Memory bloat - loading config loads EVERYTHING
3. No clear invariants enforced across the collection
4. Methods like `getAgentSkills()` suggest relationships that span aggregate boundaries

**Recommendation**: Split into separate aggregates:
```
AgentCatalog (agents collection)
SkillCatalog (skills collection)
HookRegistry (hooks collection)
MCPRegistry (MCP servers)
```

Each should have its own aggregate root with specific invariants.

### 2.2 ScanSession Has Unclear Transaction Boundary

**Issue**: The `ScanSession` aggregate collects fragments but has no clear consistency requirement.

```typescript
addFragment(fragment: ConfigFragment): void {
  this.fragments.push(fragment);  // No invariant check
  this.raise(new SourceScanned({...}));
}
```

Why is this an aggregate? What invariants does it protect? The document doesn't explain what business rule requires all fragments to be added atomically.

**Recommendation**: Either document the invariant or demote to a simple service.

### 2.3 GenerationSession Has No Invariants

**Issue**: The `GenerationSession` aggregate is essentially a builder pattern disguised as an aggregate.

```typescript
generateDiagram(type: DiagramType, generator: IDiagramGenerator): GenerationOutput {
  const diagram = generator.generate(this.config, type);
  // ... no validation, no invariant, just collection
}
```

There's no business rule being protected. This should be a domain service, not an aggregate.

---

## 3. Entity vs Value Object Confusion

### 3.1 Entities That Should Be Value Objects

| Current Entity | Problem | Should Be |
|---------------|---------|-----------|
| `Agent` | Identity derived from name (`AgentId.fromName`) | **Value Object** - if name changes, identity changes, so it's not really identity |
| `Skill` | Same issue - identity = name | **Value Object** |
| `Hook` | Identity = name, no lifecycle | **Value Object** |
| `ScanSource` | No meaningful lifecycle | **Value Object** |
| `GenerationOutput` | Immutable after creation | **Value Object** |

**DDD Principle**: Entities have identity that persists through attribute changes. If the ID is derived from attributes, it's likely a Value Object.

**Example Problem**:
```typescript
// If we rename an agent, does it become a different agent?
// Current design says YES (new AgentId from new name)
// This means Agent has no independent identity = Value Object
static fromName(name: string): AgentId {
  const sanitized = name.toLowerCase()...
  return new AgentId({ value: `agent:${sanitized}` });
}
```

### 3.2 Missing Value Objects

The following concepts should be explicit Value Objects but aren't defined:

| Missing VO | Where Used | Why Needed |
|------------|------------|------------|
| `ToolName` | `Agent.allowedTools: string[]` | Should validate tool name format |
| `FilePath` | Multiple locations as `string` | Path validation, normalization |
| `MermaidDiagram` | Generator returns `string` | Should encapsulate valid Mermaid |
| `MarkdownDocument` | Writer returns `string` | Should encapsulate valid Markdown |

---

## 4. Domain Event Gaps

### 4.1 Missing Events for Important State Changes

| State Change | Missing Event | Impact |
|--------------|---------------|--------|
| Agent added to config | `AgentDiscovered` | No audit trail of discovery |
| Skill referenced but missing | `MissingSkillDetected` | Silent validation |
| MCP server tools extracted | `MCPToolsDiscovered` | No visibility into MCP scanning |
| Validation error recorded | `ValidationIssueFound` | Errors added silently |
| Output file written | `FileWritten` | No confirmation of I/O |

### 4.2 Event Naming Issues

| Current Event | Problem | Better Name |
|--------------|---------|-------------|
| `ScanCompleted` | Doesn't indicate success/failure | `ScanSucceeded` / `ScanFailed` |
| `SourceScanned` | Past tense inconsistent with above | `SourceScanCompleted` |
| `DiagramGenerated` | Passive voice | `DiagramGenerationCompleted` |

### 4.3 Missing Event-Driven Workflows

The document describes using events but doesn't show:
1. How validation triggers on `ScanCompleted`
2. How generation triggers on validation success
3. How learning hooks consume events

These should be explicit event handlers, not procedural code.

---

## 5. Anti-Corruption Layer Concerns

### 5.1 ACL Placement Incorrect

**Issue**: ACLs are placed in the DOWNSTREAM context instead of the UPSTREAM.

```
Current:
  Scanner → (publishes fragments) → Model.ScannerACL → Model Entities
                                   ^^^ ACL in Model

Correct DDD Pattern:
  Scanner.ModelACL → (publishes DTOs) → Model
  ^^^ ACL in Scanner (upstream publishes clean interface)
```

The Scanner should publish a clean interface that Model consumes, not the other way around.

### 5.2 Missing Translations

The `ScannerACL.translateFragment()` doesn't handle:

| Missing Translation | Impact |
|---------------------|--------|
| CLAUDE.md format variations | Parsing failures |
| User config differences | Incomplete scans |
| MCP tool schema variations | Missing capabilities |
| Error recovery scenarios | Silent failures |

### 5.3 No External System ACLs

The document mentions integration with:
- File system (fs-extra)
- YAML parser (js-yaml)
- Template engine (Handlebars)
- Markdown parser (remark)

None have ACLs. External dependencies should NEVER be called directly from domain code.

---

## 6. External Integration Gaps

### 6.1 Hooks System Integration Unclear

The document references claude-flow hooks but doesn't explain:

| Missing Detail | Question |
|----------------|----------|
| When are hooks invoked? | Pre/post scan? Pre/post generation? |
| Who invokes hooks? | CLI? Application service? |
| What data flows to hooks? | Events? Aggregates? |
| How do hooks affect flow? | Can they cancel operations? |

Section 8 "Self-Learning Hooks Integration" adds code but doesn't integrate with the bounded contexts defined earlier.

### 6.2 GitHub Actions Integration Missing

The PRD mentions GitHub Action integration (v1.3), but the DDD model has no:
- CI/CD bounded context
- Webhook event handling
- Status reporting aggregates
- Pipeline coordination

### 6.3 External Event Sources Not Modeled

The system should react to:
- File system changes (watch mode)
- Git hooks (pre-commit)
- CI/CD triggers
- MCP server availability changes

None of these are in the domain model.

---

## 7. Replication vs Reference Issues

### 7.1 CRITICAL: Excessive Replication of Existing Documentation

**Issue**: DDD-IMPLEMENTATION.md replicates content that exists elsewhere.

| Replicated Content | Original Source | Lines Duplicated |
|-------------------|-----------------|------------------|
| Agent/Skill/Hook models | PRD v2.0 Section 6 | ~50 lines |
| Directory structure | Already in PRD Section 6 | ~80 lines |
| CloudEvents format | Standard specification | ~40 lines |
| Mermaid generation code | Better as implementation | ~200 lines |
| CLI command structure | PRD Section 10 | ~30 lines |
| Timeline/roadmap | PRD Section 7 | ~50 lines |
| Hook integration | CLAUDE.md | ~100 lines |

**Total replicated**: ~550+ lines that should be references

### 7.2 Should Reference Instead of Replicate

| Content | Current | Should Be |
|---------|---------|-----------|
| Agent capabilities | Full TypeScript code | Reference to CLAUDE.md agent definitions |
| Hook system | Re-implemented | Reference to claude-flow hooks documentation |
| CLI options | Full specification | Reference to PRD v2.0 |
| Mermaid diagrams | Implementation code | Reference to diagram examples in PRD |
| Learning patterns | Full implementation | Reference to claude-flow intelligence system |

### 7.3 Recommended References

Replace implementation details with:
```markdown
## Agent Model
See [PRD v2.0 Section 6](../AgentScope-PRD-v2.md#6-technical-architecture) for unified config model.

## Hooks Integration
See [CLAUDE.md](../../CLAUDE.md) for hook system configuration.

## CLI Commands
See [PRD v2.0 Section 10](../AgentScope-PRD-v2.md#10-cli-usage) for command specifications.
```

---

## 8. Revised Entity Model

Based on the issues identified, here is a corrected entity model:

### 8.1 Recommended Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REVISED CONTEXT MAP                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐         ┌─────────────────┐                   │
│  │  DISCOVERY      │  DTO    │   CONFIG        │                   │
│  │  (Core)         │ ─────►  │   (Core)        │                   │
│  │                 │         │                 │                   │
│  │  - Parser Port  │         │  - AgentCatalog │  ← Small          │
│  │  - Source VO    │         │  - SkillCatalog │    Aggregates     │
│  │  - Fragment VO  │         │  - MCPRegistry  │                   │
│  └─────────────────┘         └─────────────────┘                   │
│           │                           │                             │
│           │ ConfigDiscoveredEvent     │ ConfigValidatedEvent        │
│           └───────────┬───────────────┘                             │
│                       ▼                                             │
│            ┌─────────────────┐                                      │
│            │   OUTPUT        │                                      │
│            │   (Supporting)  │                                      │
│            │                 │                                      │
│            │  - DiagramSvc   │  ← Domain Services                   │
│            │  - DocumentSvc  │    (not aggregates)                  │
│            └─────────────────┘                                      │
│                       │                                             │
│            ┌─────────────────┐                                      │
│            │   INTERFACE     │                                      │
│            │   (Generic)     │                                      │
│            │                 │                                      │
│            │  - CLI Adapter  │  ← Thin adapters only                │
│            │  - FS Adapter   │                                      │
│            └─────────────────┘                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Corrected Value Objects (not Entities)

```typescript
// All configuration items are VALUE OBJECTS
// They have no lifecycle - identity is their content

class AgentDefinition extends ValueObject {
  readonly name: AgentName;
  readonly description: string;
  readonly source: ConfigSource;
  readonly capabilities: Capability[];
  readonly skills: SkillReference[];
}

class SkillDefinition extends ValueObject {
  readonly name: SkillName;
  readonly description: string;
  readonly triggers: Trigger[];
}

class MCPServerConfig extends ValueObject {
  readonly name: ServerName;
  readonly command: Command;
  readonly tools: ToolDefinition[];
}
```

### 8.3 Small Focused Aggregates

```typescript
// AgentCatalog - manages agent definitions
class AgentCatalog extends AggregateRoot {
  private definitions: Map<AgentName, AgentDefinition>;

  // Invariant: No duplicate names
  addDefinition(def: AgentDefinition): void {
    if (this.definitions.has(def.name)) {
      throw new DuplicateAgentError(def.name);
    }
    this.definitions.set(def.name, def);
    this.raise(new AgentDiscovered(def));
  }
}

// SkillCatalog - separate aggregate
class SkillCatalog extends AggregateRoot {
  private definitions: Map<SkillName, SkillDefinition>;

  // Invariant: Referenced skills must exist (checked via domain service)
}

// MCPRegistry - separate aggregate
class MCPRegistry extends AggregateRoot {
  private servers: Map<ServerName, MCPServerConfig>;

  // Invariant: Tool names unique across servers
}
```

### 8.4 Domain Services (Not Aggregates)

```typescript
// Diagram generation is a SERVICE not an aggregate
class DiagramGenerationService implements DomainService {
  generate(
    agents: AgentDefinition[],
    skills: SkillDefinition[],
    mcpServers: MCPServerConfig[],
    type: DiagramType
  ): MermaidDiagram;
}

// Document writing is a SERVICE
class DocumentGenerationService implements DomainService {
  generate(
    catalog: AgentCatalog,
    skills: SkillCatalog,
    servers: MCPRegistry
  ): MarkdownDocument;
}
```

---

## 9. External Events Integration Plan

### 9.1 Event Sources

| Source | Event | Handler |
|--------|-------|---------|
| CLI | `ScanRequested` | DiscoveryOrchestrator |
| File System | `FileChanged` | WatchService (future) |
| Git | `PreCommitTriggered` | HookAdapter |
| CI/CD | `PipelineStarted` | CIAdapter |
| MCP | `ServerAvailable` | MCPDiscoveryService |

### 9.2 Integration Points

```typescript
// External event adapter (in Interface context)
interface ExternalEventAdapter {
  subscribe(handler: ExternalEventHandler): void;
  translateToInternalEvent(external: ExternalEvent): DomainEvent;
}

// Git hook adapter
class GitHookAdapter implements ExternalEventAdapter {
  subscribe(handler: ExternalEventHandler): void {
    // Listen to git hook signals
  }

  translateToInternalEvent(external: GitHookEvent): DomainEvent {
    if (external.type === 'pre-commit') {
      return new ScanRequested({
        source: 'git-hook',
        strict: true  // CI mode
      });
    }
  }
}

// Claude-flow hook adapter
class ClaudeFlowAdapter implements ExternalEventAdapter {
  translateToInternalEvent(external: ClaudeFlowHookEvent): DomainEvent {
    switch (external.hook) {
      case 'pre-task':
        return new ContextEnhancementRequested(external.task);
      case 'post-task':
        return new PatternStorageRequested(external.result);
    }
  }
}
```

### 9.3 Event Flow

```
External Event (git, CI, hooks)
       │
       ▼
┌──────────────────┐
│ Interface Context│
│ (Event Adapters) │
└────────┬─────────┘
         │ DomainEvent
         ▼
┌──────────────────┐
│ Application Layer│
│ (Orchestrators)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Domain Contexts  │
│ (Aggregates)     │
└────────┬─────────┘
         │ Domain Events
         ▼
┌──────────────────┐
│ Event Handlers   │
│ (Learning, etc.) │
└──────────────────┘
```

---

## 10. Priority Summary

### Critical (Must Fix Before Implementation)

1. **Remove Scanner imports from Model context** - Violates DDD fundamentals
2. **Split AgentScopeConfig aggregate** - Too large, no clear invariants
3. **Convert config items to Value Objects** - Current entities have no real identity
4. **Reduce document size by 50%+** - Reference existing docs instead of replicating

### High (Fix During Implementation)

1. Add missing domain events for state changes
2. Place ACLs in upstream contexts (Scanner, Generator)
3. Define external system adapters
4. Document aggregate invariants explicitly

### Medium (Post-MVP)

1. Add FileSystem bounded context abstraction
2. Implement watch mode event handling
3. Add CI/CD event integration
4. Create proper hook system domain model

---

## 11. Recommended Next Steps

1. **Simplify the document** - Remove implementation code, use references
2. **Draw corrected context map** - Show proper ACL placement
3. **Document invariants** - For each aggregate, state the business rule
4. **Create ADR for aggregate split** - Justify smaller aggregates
5. **Review with team** - Ensure ubiquitous language alignment

---

*Review complete. Implement corrections before proceeding with development.*
