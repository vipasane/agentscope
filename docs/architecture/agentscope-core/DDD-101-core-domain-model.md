# DDD-101: AgentScope Core Domain Model

## Status
**Accepted** - 2026-01-26

## Context

AgentScope Core requires a well-defined domain model that:

1. **Captures Business Logic**: Represents agent configurations, relationships, security
2. **Enforces Invariants**: Ensures data consistency and validity
3. **Supports Multiple Platforms**: Abstracts platform differences
4. **Enables Analysis**: Provides rich domain services for analysis
5. **Facilitates Testing**: Clear boundaries and dependencies

This ADR defines the domain model using Domain-Driven Design (DDD) principles.

## Bounded Contexts

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTSCOPE SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Scanner    │  │  Validator   │  │   Analyzer   │     │
│  │   Context    │  │   Context    │  │   Context    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                  │             │
│         └─────────────────┼──────────────────┘             │
│                           ▼                                │
│                  ┌──────────────┐                          │
│                  │     Core     │                          │
│                  │   Context    │                          │
│                  └──────────────┘                          │
│                           │                                │
│         ┌─────────────────┼──────────────────┐             │
│         ▼                 ▼                  ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Generator   │  │   Reporter   │  │  Converter   │     │
│  │   Context    │  │   Context    │  │   Context    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Context Responsibilities

| Context | Responsibility | Key Entities |
|---------|---------------|--------------|
| **Core** | Shared domain model | Agent, Skill, Hook, MCP, Settings |
| **Scanner** | Platform-specific parsing | ClaudeCodeScanner, CursorScanner |
| **Validator** | Security validation | SecretFinding, InjectionFinding |
| **Analyzer** | Relationship analysis | DelegationGraph, ToolMatrix |
| **Generator** | Documentation generation | Readme, Diagram, Template |
| **Reporter** | Reporting and metrics | SecurityReport, Metrics |
| **Converter** | Platform conversion | ConversionResult |

## Core Context

### Aggregates

#### 1. Agent Aggregate

```typescript
// src/core/entities/Agent.ts

export class Agent {
  private constructor(
    public readonly id: AgentId,
    private _name: AgentName,
    private _type: AgentType,
    private _tools: Tool[],
    private _capabilities: Capability[],
    private _delegations: Delegation[],
    private _skills: SkillReference[],
    private _source: SourceFile,
    private _description?: string
  ) {}

  static create(props: CreateAgentProps): Agent {
    // Validate and create agent
    this.validateName(props.name);
    this.validateTools(props.tools);

    const id = AgentId.generate();
    const name = AgentName.create(props.name);
    const type = props.type || AgentType.Custom;

    return new Agent(
      id,
      name,
      type,
      props.tools || [],
      props.capabilities || [],
      props.delegations || [],
      props.skills || [],
      props.source
    );
  }

  // Getters
  get name(): string {
    return this._name.value;
  }

  get type(): AgentType {
    return this._type;
  }

  get tools(): readonly Tool[] {
    return this._tools;
  }

  get capabilities(): readonly Capability[] {
    return this._capabilities;
  }

  get delegations(): readonly Delegation[] {
    return this._delegations;
  }

  get skills(): readonly SkillReference[] {
    return this._skills;
  }

  get source(): SourceFile {
    return this._source;
  }

  get description(): string | undefined {
    return this._description;
  }

  // Business Logic
  hasTool(tool: Tool): boolean {
    return this._tools.some(t => t.equals(tool));
  }

  hasCapability(capability: Capability): boolean {
    return this._capabilities.some(c => c.equals(capability));
  }

  delegatesTo(agentId: AgentId): boolean {
    return this._delegations.some(d => d.targetId.equals(agentId));
  }

  addDelegation(delegation: Delegation): void {
    // Validate: No self-delegation
    if (delegation.targetId.equals(this.id)) {
      throw new DomainError('Agent cannot delegate to itself');
    }

    // Validate: No duplicate delegations
    if (this.delegatesTo(delegation.targetId)) {
      throw new DomainError('Delegation already exists');
    }

    this._delegations.push(delegation);
  }

  removeDelegation(targetId: AgentId): void {
    this._delegations = this._delegations.filter(
      d => !d.targetId.equals(targetId)
    );
  }

  addTool(tool: Tool): void {
    if (this.hasTool(tool)) {
      throw new DomainError('Tool already granted');
    }
    this._tools.push(tool);
  }

  removeTool(tool: Tool): void {
    this._tools = this._tools.filter(t => !t.equals(tool));
  }

  // Validation
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainError('Agent name cannot be empty');
    }
    if (name.length > 50) {
      throw new DomainError('Agent name too long (max 50 chars)');
    }
  }

  private static validateTools(tools: Tool[]): void {
    // Tools must not be empty
    if (tools.length === 0) {
      throw new DomainError('Agent must have at least one tool');
    }
  }

  // Serialization
  toJSON(): AgentDTO {
    return {
      id: this.id.value,
      name: this.name,
      type: this.type,
      description: this.description,
      tools: this.tools.map(t => t.toJSON()),
      capabilities: this.capabilities.map(c => c.toJSON()),
      delegations: this.delegations.map(d => d.toJSON()),
      skills: this.skills.map(s => s.toJSON()),
      source: this.source
    };
  }
}

// Value Objects
export class AgentId {
  private constructor(public readonly value: string) {}

  static generate(): AgentId {
    return new AgentId(randomUUID());
  }

  static from(value: string): AgentId {
    return new AgentId(value);
  }

  equals(other: AgentId): boolean {
    return this.value === other.value;
  }
}

export class AgentName {
  private constructor(public readonly value: string) {}

  static create(value: string): AgentName {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new DomainError('Agent name cannot be empty');
    }
    return new AgentName(trimmed);
  }
}

export enum AgentType {
  Coder = 'coder',
  Reviewer = 'reviewer',
  Tester = 'tester',
  Researcher = 'researcher',
  Custom = 'custom'
}

export interface CreateAgentProps {
  name: string;
  type?: AgentType;
  description?: string;
  tools?: Tool[];
  capabilities?: Capability[];
  delegations?: Delegation[];
  skills?: SkillReference[];
  source: SourceFile;
}

export interface AgentDTO {
  id: string;
  name: string;
  type: AgentType;
  description?: string;
  tools: ToolDTO[];
  capabilities: CapabilityDTO[];
  delegations: DelegationDTO[];
  skills: SkillReferenceDTO[];
  source: SourceFile;
}
```

#### 2. Skill Aggregate

```typescript
// src/core/entities/Skill.ts

export class Skill {
  private constructor(
    public readonly id: SkillId,
    private _name: SkillName,
    private _parameters: SkillParameters,
    private _source: SourceFile,
    private _description?: string
  ) {}

  static create(props: CreateSkillProps): Skill {
    const id = SkillId.generate();
    const name = SkillName.create(props.name);
    const parameters = SkillParameters.create(props.parameters);

    return new Skill(
      id,
      name,
      parameters,
      props.source,
      props.description
    );
  }

  get name(): string {
    return this._name.value;
  }

  get parameters(): ReadonlyMap<string, unknown> {
    return this._parameters.values;
  }

  get source(): SourceFile {
    return this._source;
  }

  get description(): string | undefined {
    return this._description;
  }

  hasParameter(key: string): boolean {
    return this._parameters.has(key);
  }

  getParameter(key: string): unknown {
    return this._parameters.get(key);
  }

  toJSON(): SkillDTO {
    return {
      id: this.id.value,
      name: this.name,
      parameters: Object.fromEntries(this.parameters),
      description: this.description,
      source: this.source
    };
  }
}

export class SkillId {
  private constructor(public readonly value: string) {}

  static generate(): SkillId {
    return new SkillId(randomUUID());
  }

  static from(value: string): SkillId {
    return new SkillId(value);
  }

  equals(other: SkillId): boolean {
    return this.value === other.value;
  }
}

export class SkillName {
  private constructor(public readonly value: string) {}

  static create(value: string): SkillName {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new DomainError('Skill name cannot be empty');
    }
    return new SkillName(trimmed);
  }
}

export class SkillParameters {
  private constructor(private readonly _values: Map<string, unknown>) {}

  static create(params: Record<string, unknown>): SkillParameters {
    return new SkillParameters(new Map(Object.entries(params)));
  }

  get values(): ReadonlyMap<string, unknown> {
    return this._values;
  }

  has(key: string): boolean {
    return this._values.has(key);
  }

  get(key: string): unknown {
    return this._values.get(key);
  }
}

export interface CreateSkillProps {
  name: string;
  parameters: Record<string, unknown>;
  description?: string;
  source: SourceFile;
}

export interface SkillDTO {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  description?: string;
  source: SourceFile;
}
```

#### 3. Hook Aggregate

```typescript
// src/core/entities/Hook.ts

export class Hook {
  private constructor(
    public readonly id: HookId,
    private _type: HookType,
    private _handler: HookHandler,
    private _config: HookConfig,
    private _source: SourceFile
  ) {}

  static create(props: CreateHookProps): Hook {
    const id = HookId.generate();
    const handler = HookHandler.create(props.handler);
    const config = HookConfig.create(props.config || {});

    return new Hook(
      id,
      props.type,
      handler,
      config,
      props.source
    );
  }

  get type(): HookType {
    return this._type;
  }

  get handler(): string {
    return this._handler.value;
  }

  get config(): ReadonlyMap<string, unknown> {
    return this._config.values;
  }

  get source(): SourceFile {
    return this._source;
  }

  toJSON(): HookDTO {
    return {
      id: this.id.value,
      type: this.type,
      handler: this.handler,
      config: Object.fromEntries(this.config),
      source: this.source
    };
  }
}

export class HookId {
  private constructor(public readonly value: string) {}

  static generate(): HookId {
    return new HookId(randomUUID());
  }

  static from(value: string): HookId {
    return new HookId(value);
  }

  equals(other: HookId): boolean {
    return this.value === other.value;
  }
}

export enum HookType {
  PreToolUse = 'PreToolUse',
  PostToolUse = 'PostToolUse',
  SessionStart = 'SessionStart',
  SessionEnd = 'SessionEnd',
  Stop = 'Stop',
  Error = 'Error',
  PrePrompt = 'PrePrompt',
  PostPrompt = 'PostPrompt',
  Custom = 'Custom'
}

export class HookHandler {
  private constructor(public readonly value: string) {}

  static create(value: string): HookHandler {
    if (!value || value.trim().length === 0) {
      throw new DomainError('Hook handler cannot be empty');
    }
    return new HookHandler(value.trim());
  }
}

export class HookConfig {
  private constructor(private readonly _values: Map<string, unknown>) {}

  static create(config: Record<string, unknown>): HookConfig {
    return new HookConfig(new Map(Object.entries(config)));
  }

  get values(): ReadonlyMap<string, unknown> {
    return this._values;
  }
}

export interface CreateHookProps {
  type: HookType;
  handler: string;
  config?: Record<string, unknown>;
  source: SourceFile;
}

export interface HookDTO {
  id: string;
  type: HookType;
  handler: string;
  config: Record<string, unknown>;
  source: SourceFile;
}
```

#### 4. MCP Server Aggregate

```typescript
// src/core/entities/McpServer.ts

export class McpServer {
  private constructor(
    public readonly id: McpServerId,
    private _name: McpServerName,
    private _endpoint: McpEndpoint,
    private _capabilities: Capability[],
    private _transport: McpTransport,
    private _source: SourceFile
  ) {}

  static create(props: CreateMcpServerProps): McpServer {
    const id = McpServerId.generate();
    const name = McpServerName.create(props.name);
    const endpoint = McpEndpoint.create(props.url);
    const transport = props.transport || McpTransport.Stdio;

    return new McpServer(
      id,
      name,
      endpoint,
      props.capabilities || [],
      transport,
      props.source
    );
  }

  get name(): string {
    return this._name.value;
  }

  get url(): string {
    return this._endpoint.url;
  }

  get capabilities(): readonly Capability[] {
    return this._capabilities;
  }

  get transport(): McpTransport {
    return this._transport;
  }

  get source(): SourceFile {
    return this._source;
  }

  isSecure(): boolean {
    return this._endpoint.isSecure();
  }

  hasCapability(capability: Capability): boolean {
    return this._capabilities.some(c => c.equals(capability));
  }

  toJSON(): McpServerDTO {
    return {
      id: this.id.value,
      name: this.name,
      url: this.url,
      capabilities: this.capabilities.map(c => c.toJSON()),
      transport: this.transport,
      source: this.source
    };
  }
}

export class McpServerId {
  private constructor(public readonly value: string) {}

  static generate(): McpServerId {
    return new McpServerId(randomUUID());
  }

  static from(value: string): McpServerId {
    return new McpServerId(value);
  }

  equals(other: McpServerId): boolean {
    return this.value === other.value;
  }
}

export class McpServerName {
  private constructor(public readonly value: string) {}

  static create(value: string): McpServerName {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new DomainError('MCP server name cannot be empty');
    }
    return new McpServerName(trimmed);
  }
}

export class McpEndpoint {
  private constructor(public readonly url: string) {}

  static create(url: string): McpEndpoint {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new DomainError(`Invalid URL: ${url}`);
    }
    return new McpEndpoint(url);
  }

  isSecure(): boolean {
    return this.url.startsWith('https://');
  }

  isLocalhost(): boolean {
    const parsed = new URL(this.url);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  }
}

export enum McpTransport {
  Stdio = 'stdio',
  Http = 'http'
}

export interface CreateMcpServerProps {
  name: string;
  url: string;
  capabilities?: Capability[];
  transport?: McpTransport;
  source: SourceFile;
}

export interface McpServerDTO {
  id: string;
  name: string;
  url: string;
  capabilities: CapabilityDTO[];
  transport: McpTransport;
  source: SourceFile;
}
```

### Value Objects

```typescript
// src/core/value-objects/Tool.ts

export class Tool {
  private constructor(
    public readonly name: string,
    public readonly category: ToolCategory
  ) {}

  static create(name: string, category: ToolCategory): Tool {
    return new Tool(name, category);
  }

  equals(other: Tool): boolean {
    return this.name === other.name && this.category === other.category;
  }

  toJSON(): ToolDTO {
    return {
      name: this.name,
      category: this.category
    };
  }
}

export enum ToolCategory {
  Read = 'read',
  Write = 'write',
  Execute = 'execute',
  Network = 'network'
}

export interface ToolDTO {
  name: string;
  category: ToolCategory;
}
```

```typescript
// src/core/value-objects/Capability.ts

export class Capability {
  private constructor(
    public readonly name: string,
    public readonly description: string
  ) {}

  static create(name: string, description: string): Capability {
    return new Capability(name, description);
  }

  equals(other: Capability): boolean {
    return this.name === other.name;
  }

  toJSON(): CapabilityDTO {
    return {
      name: this.name,
      description: this.description
    };
  }
}

export interface CapabilityDTO {
  name: string;
  description: string;
}
```

```typescript
// src/core/value-objects/Delegation.ts

export class Delegation {
  private constructor(
    public readonly targetId: AgentId,
    public readonly reason?: string
  ) {}

  static create(targetId: AgentId, reason?: string): Delegation {
    return new Delegation(targetId, reason);
  }

  toJSON(): DelegationDTO {
    return {
      targetId: this.targetId.value,
      reason: this.reason
    };
  }
}

export interface DelegationDTO {
  targetId: string;
  reason?: string;
}
```

```typescript
// src/core/value-objects/SkillReference.ts

export class SkillReference {
  private constructor(
    public readonly skillId: SkillId,
    public readonly config?: Record<string, unknown>
  ) {}

  static create(skillId: SkillId, config?: Record<string, unknown>): SkillReference {
    return new SkillReference(skillId, config);
  }

  toJSON(): SkillReferenceDTO {
    return {
      skillId: this.skillId.value,
      config: this.config
    };
  }
}

export interface SkillReferenceDTO {
  skillId: string;
  config?: Record<string, unknown>;
}
```

```typescript
// src/core/value-objects/SourceFile.ts

export interface SourceFile {
  path: string;
  platform: Platform;
  lastModified: number;
}

export enum Platform {
  ClaudeCode = 'claude-code',
  Cursor = 'cursor',
  GeminiCli = 'gemini-cli',
  Unknown = 'unknown'
}
```

### Domain Services

```typescript
// src/core/services/DelegationService.ts

export class DelegationService {
  /**
   * Build delegation graph from agents
   */
  static buildGraph(agents: Agent[]): DelegationGraph {
    const graph = new Map<AgentId, Set<AgentId>>();

    for (const agent of agents) {
      const targets = new Set<AgentId>();
      for (const delegation of agent.delegations) {
        targets.add(delegation.targetId);
      }
      graph.set(agent.id, targets);
    }

    return new DelegationGraph(graph);
  }

  /**
   * Detect circular delegations
   */
  static detectCycles(graph: DelegationGraph): AgentId[][] {
    const cycles: AgentId[][] = [];
    const visited = new Set<AgentId>();
    const recursionStack = new Set<AgentId>();

    for (const agentId of graph.nodes()) {
      if (!visited.has(agentId)) {
        this.dfs(agentId, graph, visited, recursionStack, [], cycles);
      }
    }

    return cycles;
  }

  private static dfs(
    current: AgentId,
    graph: DelegationGraph,
    visited: Set<AgentId>,
    recursionStack: Set<AgentId>,
    path: AgentId[],
    cycles: AgentId[][]
  ): void {
    visited.add(current);
    recursionStack.add(current);
    path.push(current);

    for (const neighbor of graph.targets(current)) {
      if (!visited.has(neighbor)) {
        this.dfs(neighbor, graph, visited, recursionStack, path, cycles);
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
      }
    }

    recursionStack.delete(current);
    path.pop();
  }
}

export class DelegationGraph {
  constructor(private readonly graph: Map<AgentId, Set<AgentId>>) {}

  nodes(): IterableIterator<AgentId> {
    return this.graph.keys();
  }

  targets(agentId: AgentId): Set<AgentId> {
    return this.graph.get(agentId) || new Set();
  }

  hasCycle(): boolean {
    return DelegationService.detectCycles(this).length > 0;
  }
}
```

### Domain Events

```typescript
// src/core/events/DomainEvent.ts

export abstract class DomainEvent {
  public readonly occurredAt: Date;

  constructor() {
    this.occurredAt = new Date();
  }
}

export class AgentCreatedEvent extends DomainEvent {
  constructor(public readonly agent: Agent) {
    super();
  }
}

export class DelegationAddedEvent extends DomainEvent {
  constructor(
    public readonly agentId: AgentId,
    public readonly delegation: Delegation
  ) {
    super();
  }
}

export class SecurityFindingDetectedEvent extends DomainEvent {
  constructor(public readonly finding: SecurityFinding) {
    super();
  }
}
```

### Domain Errors

```typescript
// src/core/errors/DomainError.ts

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entityType: string, id: string) {
    super(`${entityType} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}
```

## Consequences

### Positive
- **Clear Boundaries**: Well-defined aggregates and value objects
- **Business Logic Encapsulation**: Domain rules enforced in entities
- **Type Safety**: Strong typing with TypeScript
- **Testability**: Easy to unit test domain logic
- **Invariant Protection**: Validation in constructors

### Negative
- **Boilerplate**: More code than anemic domain model
- **Learning Curve**: DDD concepts require understanding

### Neutral
- **Performance**: Slightly slower due to validation (acceptable for <2s scans)

## Related Decisions
- ADR-101: Core Architecture
- ADR-102: Zero Dependency Strategy
- ADR-103: Security Scanning Engine

## References
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design by Vaughn Vernon](https://vaughnvernon.com/)
- [DDD in TypeScript](https://khalilstemmler.com/articles/domain-driven-design-intro/)

---

**Approved by**: ADR Architect Agent
**Implementation**: Week 1 of v1.2
**Review Date**: 2026-02-15
