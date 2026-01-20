# AgentScope DDD Implementation Plan

> **Domain-Driven Design Architecture for Agent Configuration Documentation**
> **Version**: 1.0
> **Date**: January 2026
> **Status**: Ready for Implementation

---

## Executive Summary

This document defines a Domain-Driven Design (DDD) implementation architecture for AgentScope, applying strategic and tactical DDD patterns to create a maintainable, extensible codebase. The design identifies four bounded contexts, defines aggregates and entities, establishes value objects, and creates an event-driven architecture using CloudEvents for cross-context communication.

---

## 1. Strategic Design: Bounded Contexts

### 1.1 Context Map

```
+------------------------------------------------------------------+
|                    AGENTSCOPE CONTEXT MAP                         |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------+         +-------------------+              |
|  |  SCANNER DOMAIN   |         | GENERATOR DOMAIN  |              |
|  |    (CORE)         |         |   (CORE)          |              |
|  |                   |         |                   |              |
|  | +-------------+   |  ACL    | +-------------+   |              |
|  | | ClaudeCode  |<--+-------->| |   Mermaid   |   |              |
|  | |   Scanner   |   | Events  | |  Generator  |   |              |
|  | +-------------+   |         | +-------------+   |              |
|  |                   |         |                   |              |
|  | +-------------+   |         | +-------------+   |              |
|  | |    MCP      |   |         | |  Markdown   |   |              |
|  | |   Scanner   |   |         | |   Writer    |   |              |
|  | +-------------+   |         | +-------------+   |              |
|  +-------------------+         +-------------------+              |
|           |                             |                         |
|           |     Domain Events           |                         |
|           +-------------+---------------+                         |
|                         |                                         |
|                         v                                         |
|            +-------------------+                                  |
|            |   MODEL DOMAIN    |                                  |
|            |   (SHARED KERNEL) |                                  |
|            |                   |                                  |
|            | +-------------+   |                                  |
|            | |  Unified    |   |                                  |
|            | |   Config    |   |                                  |
|            | +-------------+   |                                  |
|            |                   |                                  |
|            | +-------------+   |                                  |
|            | | Validation  |   |                                  |
|            | |  Service    |   |                                  |
|            | +-------------+   |                                  |
|            +-------------------+                                  |
|                         ^                                         |
|                         |                                         |
|            +-------------------+                                  |
|            |    CLI DOMAIN     |                                  |
|            |    (GENERIC)      |                                  |
|            |                   |                                  |
|            | +-------------+   |                                  |
|            | |  Commands   |   |                                  |
|            | +-------------+   |                                  |
|            |                   |                                  |
|            | +-------------+   |                                  |
|            | |   Output    |   |                                  |
|            | |  Formatter  |   |                                  |
|            | +-------------+   |                                  |
|            +-------------------+                                  |
|                                                                   |
+------------------------------------------------------------------+
```

### 1.2 Bounded Context Definitions

| Context | Type | Responsibility | Key Concepts |
|---------|------|----------------|--------------|
| **Scanner** | Core | Parse and extract configuration from Claude Code and MCP sources | Parser, Source, ConfigFragment, ScanResult |
| **Generator** | Core | Create Mermaid diagrams and Markdown documentation | Diagram, Document, Template, Output |
| **Model** | Shared Kernel | Unified configuration model and validation | AgentScopeConfig, Agent, Skill, Hook, MCPServer |
| **CLI** | Generic | User interface, command parsing, output formatting | Command, Options, OutputFormat |

### 1.3 Context Relationships

| Upstream | Downstream | Relationship | Integration Pattern |
|----------|------------|--------------|---------------------|
| Scanner | Model | Customer-Supplier | Domain Events (ScanCompleted) |
| Model | Generator | Published Language | Shared Config Schema |
| Generator | CLI | Conformist | Generator conforms to CLI output needs |
| Scanner | Generator | Partnership | Coordinated via Model context |

---

## 2. Tactical Design: Scanner Domain

### 2.1 Scanner Aggregate Root

```typescript
// src/scanner/domain/aggregates/ScanSession.ts

import { AggregateRoot } from '@shared/ddd';
import { ScanSessionId } from '../value-objects/ScanSessionId';
import { ScanSource } from '../entities/ScanSource';
import { ConfigFragment } from '../value-objects/ConfigFragment';
import { ScanCompleted, ScanFailed, SourceScanned } from '../events';

export class ScanSession extends AggregateRoot<ScanSessionId> {
  private readonly sources: ScanSource[];
  private fragments: ConfigFragment[];
  private status: ScanStatus;
  private readonly startedAt: Date;
  private completedAt?: Date;

  private constructor(
    id: ScanSessionId,
    sources: ScanSource[],
    startedAt: Date
  ) {
    super(id);
    this.sources = sources;
    this.fragments = [];
    this.status = ScanStatus.InProgress;
    this.startedAt = startedAt;
  }

  static create(sources: ScanSource[]): ScanSession {
    const session = new ScanSession(
      ScanSessionId.generate(),
      sources,
      new Date()
    );
    return session;
  }

  addFragment(fragment: ConfigFragment): void {
    this.fragments.push(fragment);
    this.raise(new SourceScanned({
      sessionId: this.id.value,
      sourceType: fragment.sourceType,
      fragmentCount: this.fragments.length
    }));
  }

  complete(): ScanResult {
    this.status = ScanStatus.Completed;
    this.completedAt = new Date();

    const result = ScanResult.fromFragments(this.fragments);

    this.raise(new ScanCompleted({
      sessionId: this.id.value,
      agentCount: result.agents.length,
      skillCount: result.skills.length,
      hookCount: result.hooks.length,
      mcpServerCount: result.mcpServers.length,
      duration: this.getDuration()
    }));

    return result;
  }

  fail(error: ScanError): void {
    this.status = ScanStatus.Failed;
    this.completedAt = new Date();

    this.raise(new ScanFailed({
      sessionId: this.id.value,
      error: error.message,
      source: error.source
    }));
  }

  private getDuration(): number {
    return (this.completedAt?.getTime() ?? Date.now()) - this.startedAt.getTime();
  }
}

enum ScanStatus {
  InProgress = 'in-progress',
  Completed = 'completed',
  Failed = 'failed'
}
```

### 2.2 Scanner Entities

```typescript
// src/scanner/domain/entities/ScanSource.ts

import { Entity } from '@shared/ddd';
import { SourceId } from '../value-objects/SourceId';
import { SourceType } from '../value-objects/SourceType';
import { SourcePath } from '../value-objects/SourcePath';

export class ScanSource extends Entity<SourceId> {
  readonly type: SourceType;
  readonly path: SourcePath;
  readonly priority: number;

  private constructor(
    id: SourceId,
    type: SourceType,
    path: SourcePath,
    priority: number
  ) {
    super(id);
    this.type = type;
    this.path = path;
    this.priority = priority;
  }

  static claudeProject(path: string): ScanSource {
    return new ScanSource(
      SourceId.generate(),
      SourceType.ClaudeProject,
      SourcePath.create(path),
      1 // Highest priority
    );
  }

  static claudeUser(path: string): ScanSource {
    return new ScanSource(
      SourceId.generate(),
      SourceType.ClaudeUser,
      SourcePath.create(path),
      2
    );
  }

  static mcpConfig(path: string): ScanSource {
    return new ScanSource(
      SourceId.generate(),
      SourceType.MCP,
      SourcePath.create(path),
      3
    );
  }
}
```

### 2.3 Scanner Value Objects

```typescript
// src/scanner/domain/value-objects/ScanSessionId.ts

import { ValueObject } from '@shared/ddd';
import { v4 as uuidv4 } from 'uuid';

interface ScanSessionIdProps {
  value: string;
}

export class ScanSessionId extends ValueObject<ScanSessionIdProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: ScanSessionIdProps) {
    super(props);
  }

  static generate(): ScanSessionId {
    return new ScanSessionId({ value: `scan-${uuidv4()}` });
  }

  static fromString(value: string): ScanSessionId {
    if (!value.startsWith('scan-')) {
      throw new InvalidScanSessionIdError(value);
    }
    return new ScanSessionId({ value });
  }
}

// src/scanner/domain/value-objects/ConfigFragment.ts

import { ValueObject } from '@shared/ddd';

interface ConfigFragmentProps {
  sourceType: SourceType;
  sourcePath: string;
  contentType: 'agent' | 'skill' | 'hook' | 'command' | 'mcp' | 'settings';
  rawContent: string;
  parsedData: unknown;
  lineNumber?: number;
}

export class ConfigFragment extends ValueObject<ConfigFragmentProps> {
  get sourceType(): SourceType {
    return this.props.sourceType;
  }

  get sourcePath(): string {
    return this.props.sourcePath;
  }

  get contentType(): string {
    return this.props.contentType;
  }

  get rawContent(): string {
    return this.props.rawContent;
  }

  get parsedData(): unknown {
    return this.props.parsedData;
  }

  static create(props: ConfigFragmentProps): ConfigFragment {
    return new ConfigFragment(props);
  }
}

// src/scanner/domain/value-objects/SourceType.ts

export enum SourceType {
  ClaudeProject = 'claude-project',
  ClaudeUser = 'claude-user',
  ClaudeMd = 'claude-md',
  MCP = 'mcp'
}
```

### 2.4 Scanner Domain Services

```typescript
// src/scanner/domain/services/ClaudeCodeParser.ts

import { DomainService } from '@shared/ddd';
import { ConfigFragment } from '../value-objects/ConfigFragment';
import { SourcePath } from '../value-objects/SourcePath';
import { SourceType } from '../value-objects/SourceType';

export interface IClaudeCodeParser extends DomainService {
  parseProjectDirectory(path: SourcePath): Promise<ConfigFragment[]>;
  parseUserDirectory(path: SourcePath): Promise<ConfigFragment[]>;
  parseClaudeMd(path: SourcePath): Promise<ConfigFragment[]>;
}

export class ClaudeCodeParser implements IClaudeCodeParser {
  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly yamlParser: IYamlParser,
    private readonly markdownParser: IMarkdownParser
  ) {}

  async parseProjectDirectory(path: SourcePath): Promise<ConfigFragment[]> {
    const fragments: ConfigFragment[] = [];

    // Parse .claude/agents/
    const agentsPath = path.join('.claude', 'agents');
    if (await this.fileSystem.exists(agentsPath)) {
      const agentFiles = await this.fileSystem.glob(agentsPath, '**/*.md');
      for (const file of agentFiles) {
        const content = await this.fileSystem.read(file);
        const parsed = this.parseAgentFile(content);
        fragments.push(ConfigFragment.create({
          sourceType: SourceType.ClaudeProject,
          sourcePath: file,
          contentType: 'agent',
          rawContent: content,
          parsedData: parsed
        }));
      }
    }

    // Parse .claude/skills/
    const skillsPath = path.join('.claude', 'skills');
    if (await this.fileSystem.exists(skillsPath)) {
      const skillFiles = await this.fileSystem.glob(skillsPath, '**/*.md');
      for (const file of skillFiles) {
        const content = await this.fileSystem.read(file);
        const parsed = this.parseSkillFile(content);
        fragments.push(ConfigFragment.create({
          sourceType: SourceType.ClaudeProject,
          sourcePath: file,
          contentType: 'skill',
          rawContent: content,
          parsedData: parsed
        }));
      }
    }

    // Parse .claude/settings.json
    const settingsPath = path.join('.claude', 'settings.json');
    if (await this.fileSystem.exists(settingsPath)) {
      const content = await this.fileSystem.read(settingsPath);
      fragments.push(ConfigFragment.create({
        sourceType: SourceType.ClaudeProject,
        sourcePath: settingsPath,
        contentType: 'settings',
        rawContent: content,
        parsedData: JSON.parse(content)
      }));
    }

    return fragments;
  }

  private parseAgentFile(content: string): AgentData {
    const { data: frontmatter, content: body } = this.markdownParser.parseFrontmatter(content);
    return {
      name: frontmatter.name,
      description: frontmatter.description,
      type: frontmatter.type,
      allowedTools: frontmatter.capabilities?.allowed_tools ?? [],
      skills: frontmatter.skills ?? [],
      body
    };
  }

  private parseSkillFile(content: string): SkillData {
    const { data: frontmatter, content: body } = this.markdownParser.parseFrontmatter(content);
    return {
      name: frontmatter.name,
      description: frontmatter.description,
      triggers: frontmatter.triggers ?? {},
      body
    };
  }
}

// src/scanner/domain/services/MCPParser.ts

export interface IMCPParser extends DomainService {
  parseMcpJson(path: SourcePath): Promise<ConfigFragment[]>;
}

export class MCPParser implements IMCPParser {
  constructor(private readonly fileSystem: IFileSystem) {}

  async parseMcpJson(path: SourcePath): Promise<ConfigFragment[]> {
    const mcpJsonPath = path.join('.mcp.json');

    if (!await this.fileSystem.exists(mcpJsonPath)) {
      return [];
    }

    const content = await this.fileSystem.read(mcpJsonPath);
    const mcpConfig = JSON.parse(content);

    const fragments: ConfigFragment[] = [];

    for (const [serverName, serverConfig] of Object.entries(mcpConfig.mcpServers ?? {})) {
      fragments.push(ConfigFragment.create({
        sourceType: SourceType.MCP,
        sourcePath: mcpJsonPath,
        contentType: 'mcp',
        rawContent: JSON.stringify({ [serverName]: serverConfig }, null, 2),
        parsedData: {
          name: serverName,
          ...serverConfig as object
        }
      }));
    }

    return fragments;
  }
}
```

### 2.5 Scanner Repository Interface

```typescript
// src/scanner/domain/repositories/IScanResultRepository.ts

import { ScanResult } from '../aggregates/ScanResult';
import { ScanSessionId } from '../value-objects/ScanSessionId';

export interface IScanResultRepository {
  save(result: ScanResult): Promise<void>;
  findById(id: ScanSessionId): Promise<ScanResult | null>;
  findLatest(): Promise<ScanResult | null>;
}
```

---

## 3. Tactical Design: Model Domain (Shared Kernel)

### 3.1 Unified Config Aggregate

```typescript
// src/model/domain/aggregates/AgentScopeConfig.ts

import { AggregateRoot } from '@shared/ddd';
import { ConfigId } from '../value-objects/ConfigId';
import { Agent } from '../entities/Agent';
import { Skill } from '../entities/Skill';
import { Hook } from '../entities/Hook';
import { Command } from '../entities/Command';
import { MCPServer } from '../entities/MCPServer';
import { Settings } from '../value-objects/Settings';
import { ConfigMeta } from '../value-objects/ConfigMeta';
import { ScanError } from '../value-objects/ScanError';

export class AgentScopeConfig extends AggregateRoot<ConfigId> {
  readonly meta: ConfigMeta;
  private _agents: Map<AgentId, Agent>;
  private _skills: Map<SkillId, Skill>;
  private _hooks: Map<HookId, Hook>;
  private _commands: Map<CommandId, Command>;
  private _mcpServers: Map<MCPServerId, MCPServer>;
  readonly settings: Settings;
  private _errors: ScanError[];

  private constructor(
    id: ConfigId,
    meta: ConfigMeta,
    settings: Settings
  ) {
    super(id);
    this.meta = meta;
    this._agents = new Map();
    this._skills = new Map();
    this._hooks = new Map();
    this._commands = new Map();
    this._mcpServers = new Map();
    this.settings = settings;
    this._errors = [];
  }

  static create(meta: ConfigMeta, settings: Settings): AgentScopeConfig {
    return new AgentScopeConfig(
      ConfigId.generate(),
      meta,
      settings
    );
  }

  // Agents
  get agents(): Agent[] {
    return Array.from(this._agents.values());
  }

  addAgent(agent: Agent): void {
    if (this._agents.has(agent.id)) {
      throw new DuplicateAgentError(agent.id);
    }
    this._agents.set(agent.id, agent);
  }

  findAgentByName(name: string): Agent | undefined {
    return this.agents.find(a => a.name.equals(name));
  }

  // Skills
  get skills(): Skill[] {
    return Array.from(this._skills.values());
  }

  addSkill(skill: Skill): void {
    if (this._skills.has(skill.id)) {
      throw new DuplicateSkillError(skill.id);
    }
    this._skills.set(skill.id, skill);
  }

  // Hooks
  get hooks(): Hook[] {
    return Array.from(this._hooks.values());
  }

  addHook(hook: Hook): void {
    this._hooks.set(hook.id, hook);
  }

  // Commands
  get commands(): Command[] {
    return Array.from(this._commands.values());
  }

  addCommand(command: Command): void {
    this._commands.set(command.id, command);
  }

  // MCP Servers
  get mcpServers(): MCPServer[] {
    return Array.from(this._mcpServers.values());
  }

  addMCPServer(server: MCPServer): void {
    this._mcpServers.set(server.id, server);
  }

  // Errors
  get errors(): ScanError[] {
    return [...this._errors];
  }

  addError(error: ScanError): void {
    this._errors.push(error);
  }

  // Statistics
  getStatistics(): ConfigStatistics {
    return {
      agentCount: this._agents.size,
      skillCount: this._skills.size,
      hookCount: this._hooks.size,
      commandCount: this._commands.size,
      mcpServerCount: this._mcpServers.size,
      errorCount: this._errors.length,
      warningCount: this._errors.filter(e => e.level === 'warning').length
    };
  }

  // Relationships
  getAgentSkills(agentId: AgentId): Skill[] {
    const agent = this._agents.get(agentId);
    if (!agent) return [];

    return agent.skillIds
      .map(skillId => this._skills.get(skillId))
      .filter((s): s is Skill => s !== undefined);
  }

  getAgentMCPServers(agentId: AgentId): MCPServer[] {
    const agent = this._agents.get(agentId);
    if (!agent) return [];

    // Find MCP servers based on allowed tools
    return this.mcpServers.filter(server =>
      agent.allowedTools.some(tool =>
        server.tools.some(t => t.name === tool)
      )
    );
  }

  // Serialization
  toJSON(): AgentScopeConfigDTO {
    return {
      meta: this.meta.toJSON(),
      agents: this.agents.map(a => a.toJSON()),
      skills: this.skills.map(s => s.toJSON()),
      hooks: this.hooks.map(h => h.toJSON()),
      commands: this.commands.map(c => c.toJSON()),
      mcpServers: this.mcpServers.map(m => m.toJSON()),
      settings: this.settings.toJSON(),
      errors: this.errors.map(e => e.toJSON())
    };
  }
}
```

### 3.2 Model Entities

```typescript
// src/model/domain/entities/Agent.ts

import { Entity } from '@shared/ddd';
import { AgentId } from '../value-objects/AgentId';
import { AgentName } from '../value-objects/AgentName';
import { SkillId } from '../value-objects/SkillId';

export class Agent extends Entity<AgentId> {
  readonly name: AgentName;
  readonly description: string;
  readonly source: 'project' | 'user';
  readonly sourcePath: string;
  readonly allowedTools: string[];
  readonly skillIds: SkillId[];
  readonly configSnippet: string;

  private constructor(
    id: AgentId,
    props: AgentProps
  ) {
    super(id);
    this.name = props.name;
    this.description = props.description;
    this.source = props.source;
    this.sourcePath = props.sourcePath;
    this.allowedTools = props.allowedTools;
    this.skillIds = props.skillIds;
    this.configSnippet = props.configSnippet;
  }

  static create(props: CreateAgentProps): Agent {
    return new Agent(
      AgentId.fromName(props.name),
      {
        name: AgentName.create(props.name),
        description: props.description,
        source: props.source,
        sourcePath: props.sourcePath,
        allowedTools: props.allowedTools ?? [],
        skillIds: (props.skills ?? []).map(s => SkillId.fromName(s)),
        configSnippet: props.configSnippet ?? ''
      }
    );
  }

  toJSON(): AgentDTO {
    return {
      id: this.id.value,
      name: this.name.value,
      description: this.description,
      source: this.source,
      sourcePath: this.sourcePath,
      allowedTools: this.allowedTools,
      skills: this.skillIds.map(s => s.value),
      configSnippet: this.configSnippet
    };
  }
}

// src/model/domain/entities/Skill.ts

import { Entity } from '@shared/ddd';
import { SkillId } from '../value-objects/SkillId';
import { SkillName } from '../value-objects/SkillName';
import { Trigger } from '../value-objects/Trigger';

export class Skill extends Entity<SkillId> {
  readonly name: SkillName;
  readonly description: string;
  readonly sourcePath: string;
  readonly triggers: Trigger[];
  readonly configSnippet: string;

  private constructor(
    id: SkillId,
    props: SkillProps
  ) {
    super(id);
    this.name = props.name;
    this.description = props.description;
    this.sourcePath = props.sourcePath;
    this.triggers = props.triggers;
    this.configSnippet = props.configSnippet;
  }

  static create(props: CreateSkillProps): Skill {
    return new Skill(
      SkillId.fromName(props.name),
      {
        name: SkillName.create(props.name),
        description: props.description,
        sourcePath: props.sourcePath,
        triggers: (props.triggers ?? []).map(t => Trigger.create(t)),
        configSnippet: props.configSnippet ?? ''
      }
    );
  }

  toJSON(): SkillDTO {
    return {
      id: this.id.value,
      name: this.name.value,
      description: this.description,
      sourcePath: this.sourcePath,
      triggers: this.triggers.map(t => t.toJSON()),
      configSnippet: this.configSnippet
    };
  }
}

// src/model/domain/entities/Hook.ts

import { Entity } from '@shared/ddd';
import { HookId } from '../value-objects/HookId';
import { HookName } from '../value-objects/HookName';
import { HookEvent } from '../value-objects/HookEvent';

export class Hook extends Entity<HookId> {
  readonly name: HookName;
  readonly event: HookEvent;
  readonly command: string;
  readonly sourcePath: string;

  static create(props: CreateHookProps): Hook {
    return new Hook(
      HookId.fromName(props.name),
      {
        name: HookName.create(props.name),
        event: HookEvent.create(props.event),
        command: props.command,
        sourcePath: props.sourcePath
      }
    );
  }
}

// src/model/domain/entities/MCPServer.ts

import { Entity } from '@shared/ddd';
import { MCPServerId } from '../value-objects/MCPServerId';
import { MCPServerName } from '../value-objects/MCPServerName';
import { MCPTool } from '../value-objects/MCPTool';

export class MCPServer extends Entity<MCPServerId> {
  readonly name: MCPServerName;
  readonly command: string;
  readonly args: string[];
  readonly env: Record<string, string>;
  readonly tools: MCPTool[];
  readonly sourcePath: string;

  static create(props: CreateMCPServerProps): MCPServer {
    return new MCPServer(
      MCPServerId.fromName(props.name),
      {
        name: MCPServerName.create(props.name),
        command: props.command,
        args: props.args ?? [],
        env: props.env ?? {},
        tools: (props.tools ?? []).map(t => MCPTool.create(t)),
        sourcePath: props.sourcePath
      }
    );
  }
}
```

### 3.3 Model Value Objects

```typescript
// src/model/domain/value-objects/AgentId.ts

import { ValueObject } from '@shared/ddd';

interface AgentIdProps {
  value: string;
}

export class AgentId extends ValueObject<AgentIdProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: AgentIdProps) {
    super(props);
  }

  static fromName(name: string): AgentId {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return new AgentId({ value: `agent:${sanitized}` });
  }

  static fromString(value: string): AgentId {
    if (!value.startsWith('agent:')) {
      throw new InvalidAgentIdError(value);
    }
    return new AgentId({ value });
  }
}

// src/model/domain/value-objects/SkillId.ts

export class SkillId extends ValueObject<{ value: string }> {
  get value(): string {
    return this.props.value;
  }

  static fromName(name: string): SkillId {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return new SkillId({ value: `skill:${sanitized}` });
  }
}

// src/model/domain/value-objects/ConfigMeta.ts

import { ValueObject } from '@shared/ddd';

interface ConfigMetaProps {
  name: string;
  version: string;
  scanDate: Date;
  projectPath: string;
}

export class ConfigMeta extends ValueObject<ConfigMetaProps> {
  get name(): string {
    return this.props.name;
  }

  get version(): string {
    return this.props.version;
  }

  get scanDate(): Date {
    return this.props.scanDate;
  }

  get projectPath(): string {
    return this.props.projectPath;
  }

  static create(props: Partial<ConfigMetaProps> & { projectPath: string }): ConfigMeta {
    return new ConfigMeta({
      name: props.name ?? path.basename(props.projectPath),
      version: props.version ?? '1.0.0',
      scanDate: props.scanDate ?? new Date(),
      projectPath: props.projectPath
    });
  }

  toJSON(): ConfigMetaDTO {
    return {
      name: this.name,
      version: this.version,
      scanDate: this.scanDate.toISOString(),
      projectPath: this.projectPath
    };
  }
}

// src/model/domain/value-objects/ScanError.ts

import { ValueObject } from '@shared/ddd';

interface ScanErrorProps {
  level: 'fatal' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
}

export class ScanError extends ValueObject<ScanErrorProps> {
  get level(): 'fatal' | 'warning' | 'info' {
    return this.props.level;
  }

  get message(): string {
    return this.props.message;
  }

  get file(): string {
    return this.props.file;
  }

  get suggestion(): string | undefined {
    return this.props.suggestion;
  }

  static fatal(message: string, file: string, suggestion?: string): ScanError {
    return new ScanError({ level: 'fatal', message, file, suggestion });
  }

  static warning(message: string, file: string, suggestion?: string): ScanError {
    return new ScanError({ level: 'warning', message, file, suggestion });
  }

  static info(message: string, file: string, suggestion?: string): ScanError {
    return new ScanError({ level: 'info', message, file, suggestion });
  }

  toJSON(): ScanErrorDTO {
    return {
      level: this.level,
      message: this.message,
      file: this.file,
      line: this.props.line,
      suggestion: this.suggestion
    };
  }
}
```

### 3.4 Model Domain Services

```typescript
// src/model/domain/services/ValidationService.ts

import { DomainService } from '@shared/ddd';
import { AgentScopeConfig } from '../aggregates/AgentScopeConfig';
import { ScanError } from '../value-objects/ScanError';
import { ValidationResult } from '../value-objects/ValidationResult';

export interface IValidationService extends DomainService {
  validate(config: AgentScopeConfig): ValidationResult;
  validateAgent(agent: Agent): ValidationResult;
  validateSkill(skill: Skill): ValidationResult;
  validateMCPServer(server: MCPServer): ValidationResult;
}

export class ValidationService implements IValidationService {
  validate(config: AgentScopeConfig): ValidationResult {
    const errors: ScanError[] = [];

    // Validate agent-skill references
    for (const agent of config.agents) {
      for (const skillId of agent.skillIds) {
        const skill = config.skills.find(s => s.id.equals(skillId));
        if (!skill) {
          errors.push(ScanError.warning(
            `Agent '${agent.name.value}' references skill '${skillId.value}' which was not found`,
            agent.sourcePath,
            `Add the skill to .claude/skills/ or remove the reference`
          ));
        }
      }
    }

    // Validate MCP tool references
    const allMcpTools = config.mcpServers.flatMap(s => s.tools.map(t => t.name));
    for (const agent of config.agents) {
      for (const tool of agent.allowedTools) {
        // Check if it's an MCP tool reference
        if (tool.includes('mcp__') && !allMcpTools.includes(tool)) {
          errors.push(ScanError.warning(
            `Agent '${agent.name.value}' references MCP tool '${tool}' which was not found`,
            agent.sourcePath,
            `Verify the MCP server is configured in .mcp.json`
          ));
        }
      }
    }

    // Validate duplicate names
    const agentNames = config.agents.map(a => a.name.value);
    const duplicateAgents = agentNames.filter((n, i) => agentNames.indexOf(n) !== i);
    for (const dup of new Set(duplicateAgents)) {
      errors.push(ScanError.warning(
        `Duplicate agent name: '${dup}'`,
        'Multiple files',
        `Rename one of the agents to avoid conflicts`
      ));
    }

    return ValidationResult.create(errors);
  }

  validateAgent(agent: Agent): ValidationResult {
    const errors: ScanError[] = [];

    if (!agent.name.value) {
      errors.push(ScanError.fatal(
        'Agent name is required',
        agent.sourcePath
      ));
    }

    if (!agent.description) {
      errors.push(ScanError.info(
        `Agent '${agent.name.value}' has no description`,
        agent.sourcePath,
        'Add a description for better documentation'
      ));
    }

    return ValidationResult.create(errors);
  }

  validateSkill(skill: Skill): ValidationResult {
    const errors: ScanError[] = [];

    if (!skill.name.value) {
      errors.push(ScanError.fatal(
        'Skill name is required',
        skill.sourcePath
      ));
    }

    return ValidationResult.create(errors);
  }

  validateMCPServer(server: MCPServer): ValidationResult {
    const errors: ScanError[] = [];

    if (!server.command) {
      errors.push(ScanError.fatal(
        `MCP server '${server.name.value}' has no command defined`,
        server.sourcePath
      ));
    }

    if (server.tools.length === 0) {
      errors.push(ScanError.info(
        `MCP server '${server.name.value}' has no tools defined`,
        server.sourcePath,
        'Tools will be discovered at runtime'
      ));
    }

    return ValidationResult.create(errors);
  }
}

// src/model/domain/services/TransformService.ts

import { DomainService } from '@shared/ddd';
import { AgentScopeConfig } from '../aggregates/AgentScopeConfig';
import { ConfigFragment } from '../../scanner/domain/value-objects/ConfigFragment';

export interface ITransformService extends DomainService {
  transform(fragments: ConfigFragment[]): AgentScopeConfig;
}

export class TransformService implements ITransformService {
  constructor(
    private readonly validationService: IValidationService
  ) {}

  transform(fragments: ConfigFragment[]): AgentScopeConfig {
    const projectPath = this.extractProjectPath(fragments);
    const meta = ConfigMeta.create({ projectPath });
    const settings = this.extractSettings(fragments);

    const config = AgentScopeConfig.create(meta, settings);

    // Process fragments by type
    for (const fragment of fragments) {
      try {
        switch (fragment.contentType) {
          case 'agent':
            const agent = this.transformAgent(fragment);
            config.addAgent(agent);
            break;
          case 'skill':
            const skill = this.transformSkill(fragment);
            config.addSkill(skill);
            break;
          case 'hook':
            const hook = this.transformHook(fragment);
            config.addHook(hook);
            break;
          case 'mcp':
            const server = this.transformMCPServer(fragment);
            config.addMCPServer(server);
            break;
        }
      } catch (error) {
        config.addError(ScanError.warning(
          `Failed to parse ${fragment.contentType}: ${error.message}`,
          fragment.sourcePath
        ));
      }
    }

    // Run validation
    const validationResult = this.validationService.validate(config);
    for (const error of validationResult.errors) {
      config.addError(error);
    }

    return config;
  }

  private transformAgent(fragment: ConfigFragment): Agent {
    const data = fragment.parsedData as AgentData;
    return Agent.create({
      name: data.name,
      description: data.description,
      source: fragment.sourceType === SourceType.ClaudeProject ? 'project' : 'user',
      sourcePath: fragment.sourcePath,
      allowedTools: data.allowedTools,
      skills: data.skills,
      configSnippet: fragment.rawContent
    });
  }

  private transformSkill(fragment: ConfigFragment): Skill {
    const data = fragment.parsedData as SkillData;
    return Skill.create({
      name: data.name,
      description: data.description,
      sourcePath: fragment.sourcePath,
      triggers: this.extractTriggers(data.triggers),
      configSnippet: fragment.rawContent
    });
  }

  private transformMCPServer(fragment: ConfigFragment): MCPServer {
    const data = fragment.parsedData as MCPServerData;
    return MCPServer.create({
      name: data.name,
      command: data.command,
      args: data.args,
      env: data.env,
      tools: data.tools,
      sourcePath: fragment.sourcePath
    });
  }
}
```

---

## 4. Tactical Design: Generator Domain

### 4.1 Generator Aggregate Root

```typescript
// src/generator/domain/aggregates/GenerationSession.ts

import { AggregateRoot } from '@shared/ddd';
import { GenerationSessionId } from '../value-objects/GenerationSessionId';
import { GenerationOutput } from '../entities/GenerationOutput';
import { DiagramType } from '../value-objects/DiagramType';
import { GenerationCompleted, DiagramGenerated, DocumentGenerated } from '../events';

export class GenerationSession extends AggregateRoot<GenerationSessionId> {
  private readonly config: AgentScopeConfig;
  private outputs: Map<string, GenerationOutput>;
  private status: GenerationStatus;

  private constructor(
    id: GenerationSessionId,
    config: AgentScopeConfig
  ) {
    super(id);
    this.config = config;
    this.outputs = new Map();
    this.status = GenerationStatus.Pending;
  }

  static create(config: AgentScopeConfig): GenerationSession {
    return new GenerationSession(
      GenerationSessionId.generate(),
      config
    );
  }

  generateDiagram(type: DiagramType, generator: IDiagramGenerator): GenerationOutput {
    const diagram = generator.generate(this.config, type);
    const output = GenerationOutput.diagram(type, diagram);

    this.outputs.set(output.id.value, output);

    this.raise(new DiagramGenerated({
      sessionId: this.id.value,
      diagramType: type.value,
      outputPath: output.suggestedPath
    }));

    return output;
  }

  generateDocument(type: DocumentType, generator: IDocumentGenerator): GenerationOutput {
    const document = generator.generate(this.config, type);
    const output = GenerationOutput.document(type, document);

    this.outputs.set(output.id.value, output);

    this.raise(new DocumentGenerated({
      sessionId: this.id.value,
      documentType: type.value,
      outputPath: output.suggestedPath
    }));

    return output;
  }

  complete(): GenerationResult {
    this.status = GenerationStatus.Completed;

    const result = GenerationResult.create(
      Array.from(this.outputs.values())
    );

    this.raise(new GenerationCompleted({
      sessionId: this.id.value,
      outputCount: this.outputs.size,
      diagramCount: result.diagrams.length,
      documentCount: result.documents.length
    }));

    return result;
  }

  get allOutputs(): GenerationOutput[] {
    return Array.from(this.outputs.values());
  }
}
```

### 4.2 Generator Entities

```typescript
// src/generator/domain/entities/GenerationOutput.ts

import { Entity } from '@shared/ddd';
import { OutputId } from '../value-objects/OutputId';
import { DiagramType } from '../value-objects/DiagramType';
import { DocumentType } from '../value-objects/DocumentType';

export class GenerationOutput extends Entity<OutputId> {
  readonly outputType: 'diagram' | 'document' | 'json';
  readonly subType: DiagramType | DocumentType;
  readonly content: string;
  readonly suggestedPath: string;
  readonly mimeType: string;

  private constructor(
    id: OutputId,
    props: GenerationOutputProps
  ) {
    super(id);
    this.outputType = props.outputType;
    this.subType = props.subType;
    this.content = props.content;
    this.suggestedPath = props.suggestedPath;
    this.mimeType = props.mimeType;
  }

  static diagram(type: DiagramType, content: string): GenerationOutput {
    return new GenerationOutput(OutputId.generate(), {
      outputType: 'diagram',
      subType: type,
      content,
      suggestedPath: `docs/agent-architecture/${type.filename}`,
      mimeType: 'text/markdown'
    });
  }

  static document(type: DocumentType, content: string): GenerationOutput {
    return new GenerationOutput(OutputId.generate(), {
      outputType: 'document',
      subType: type,
      content,
      suggestedPath: `docs/agent-architecture/${type.filename}`,
      mimeType: 'text/markdown'
    });
  }

  static json(content: object): GenerationOutput {
    return new GenerationOutput(OutputId.generate(), {
      outputType: 'json',
      subType: DocumentType.Raw,
      content: JSON.stringify(content, null, 2),
      suggestedPath: 'docs/agent-architecture/raw/agentscope.json',
      mimeType: 'application/json'
    });
  }
}
```

### 4.3 Generator Value Objects

```typescript
// src/generator/domain/value-objects/DiagramType.ts

import { ValueObject } from '@shared/ddd';

type DiagramTypeValue = 'component-map' | 'workflow-sequence' | 'hierarchy' | 'dataflow' | 'permissions' | 'hooks';

interface DiagramTypeProps {
  value: DiagramTypeValue;
}

export class DiagramType extends ValueObject<DiagramTypeProps> {
  static readonly ComponentMap = new DiagramType({ value: 'component-map' });
  static readonly WorkflowSequence = new DiagramType({ value: 'workflow-sequence' });
  static readonly Hierarchy = new DiagramType({ value: 'hierarchy' });
  static readonly DataFlow = new DiagramType({ value: 'dataflow' });
  static readonly Permissions = new DiagramType({ value: 'permissions' });
  static readonly Hooks = new DiagramType({ value: 'hooks' });

  get value(): DiagramTypeValue {
    return this.props.value;
  }

  get filename(): string {
    return `${this.value}.md`;
  }

  get title(): string {
    const titles: Record<DiagramTypeValue, string> = {
      'component-map': 'Component Map',
      'workflow-sequence': 'Workflow Sequence',
      'hierarchy': 'Agent Hierarchy',
      'dataflow': 'Data Flow',
      'permissions': 'Permission Matrix',
      'hooks': 'Hook Lifecycle'
    };
    return titles[this.value];
  }

  static defaults(): DiagramType[] {
    return [DiagramType.ComponentMap, DiagramType.WorkflowSequence];
  }

  static all(): DiagramType[] {
    return [
      DiagramType.ComponentMap,
      DiagramType.WorkflowSequence,
      DiagramType.Hierarchy,
      DiagramType.DataFlow,
      DiagramType.Permissions,
      DiagramType.Hooks
    ];
  }

  static fromString(value: string): DiagramType {
    const type = DiagramType.all().find(t => t.value === value);
    if (!type) {
      throw new InvalidDiagramTypeError(value);
    }
    return type;
  }
}

// src/generator/domain/value-objects/DocumentType.ts

type DocumentTypeValue = 'readme' | 'agents' | 'skills' | 'raw';

export class DocumentType extends ValueObject<{ value: DocumentTypeValue }> {
  static readonly Readme = new DocumentType({ value: 'readme' });
  static readonly Agents = new DocumentType({ value: 'agents' });
  static readonly Skills = new DocumentType({ value: 'skills' });
  static readonly Raw = new DocumentType({ value: 'raw' });

  get value(): DocumentTypeValue {
    return this.props.value;
  }

  get filename(): string {
    const filenames: Record<DocumentTypeValue, string> = {
      'readme': 'README.md',
      'agents': 'AGENTS.md',
      'skills': 'SKILLS.md',
      'raw': 'raw/agentscope.json'
    };
    return filenames[this.value];
  }

  static defaults(): DocumentType[] {
    return [DocumentType.Readme, DocumentType.Agents, DocumentType.Raw];
  }
}
```

### 4.4 Generator Domain Services

```typescript
// src/generator/domain/services/MermaidGenerator.ts

import { DomainService } from '@shared/ddd';
import { AgentScopeConfig } from '@model/domain/aggregates/AgentScopeConfig';
import { DiagramType } from '../value-objects/DiagramType';

export interface IDiagramGenerator extends DomainService {
  generate(config: AgentScopeConfig, type: DiagramType): string;
}

export class MermaidGenerator implements IDiagramGenerator {
  generate(config: AgentScopeConfig, type: DiagramType): string {
    switch (type.value) {
      case 'component-map':
        return this.generateComponentMap(config);
      case 'workflow-sequence':
        return this.generateWorkflowSequence(config);
      case 'hierarchy':
        return this.generateHierarchy(config);
      case 'dataflow':
        return this.generateDataFlow(config);
      case 'permissions':
        return this.generatePermissions(config);
      case 'hooks':
        return this.generateHooks(config);
      default:
        throw new UnsupportedDiagramTypeError(type);
    }
  }

  private generateComponentMap(config: AgentScopeConfig): string {
    const lines: string[] = [
      '```mermaid',
      'flowchart TB'
    ];

    // Agents subgraph
    if (config.agents.length > 0) {
      lines.push('    subgraph Agents');
      for (const agent of config.agents) {
        lines.push(`        ${this.sanitizeId(agent.name.value)}["${agent.name.value}"]`);
      }
      lines.push('    end');
    }

    // Skills subgraph
    if (config.skills.length > 0) {
      lines.push('    subgraph Skills');
      for (const skill of config.skills) {
        lines.push(`        ${this.sanitizeId(skill.name.value)}["${skill.name.value}"]`);
      }
      lines.push('    end');
    }

    // Hooks subgraph
    if (config.hooks.length > 0) {
      lines.push('    subgraph Hooks');
      for (const hook of config.hooks) {
        lines.push(`        ${this.sanitizeId(hook.name.value)}["${hook.name.value}"]`);
      }
      lines.push('    end');
    }

    // MCP Servers subgraph
    if (config.mcpServers.length > 0) {
      lines.push('    subgraph MCPs');
      for (const server of config.mcpServers) {
        lines.push(`        ${this.sanitizeId(server.name.value)}["${server.name.value}"]`);
      }
      lines.push('    end');
    }

    // Relationships: Agent -> Skills
    for (const agent of config.agents) {
      const skills = config.getAgentSkills(agent.id);
      if (skills.length > 0) {
        const skillRefs = skills.map(s => this.sanitizeId(s.name.value)).join(' & ');
        lines.push(`    ${this.sanitizeId(agent.name.value)} --> ${skillRefs}`);
      }
    }

    // Relationships: Agent -> MCPs
    for (const agent of config.agents) {
      const mcps = config.getAgentMCPServers(agent.id);
      if (mcps.length > 0) {
        const mcpRefs = mcps.map(m => this.sanitizeId(m.name.value)).join(' & ');
        lines.push(`    ${this.sanitizeId(agent.name.value)} --> ${mcpRefs}`);
      }
    }

    lines.push('```');
    return lines.join('\n');
  }

  private generateWorkflowSequence(config: AgentScopeConfig): string {
    const lines: string[] = [
      '```mermaid',
      'sequenceDiagram',
      '    participant U as User',
      '    participant CC as Claude Code'
    ];

    // Add agent participants
    for (const agent of config.agents.slice(0, 3)) { // Limit to first 3 agents
      lines.push(`    participant ${this.sanitizeId(agent.name.value)} as ${agent.name.value}`);
    }

    // Add first skill as participant
    if (config.skills.length > 0) {
      const skill = config.skills[0];
      lines.push(`    participant ${this.sanitizeId(skill.name.value)} as ${skill.name.value}`);
    }

    // Add first MCP as participant
    if (config.mcpServers.length > 0) {
      const mcp = config.mcpServers[0];
      lines.push(`    participant ${this.sanitizeId(mcp.name.value)} as ${mcp.name.value}`);
    }

    lines.push('');

    // Generate sample workflow
    lines.push('    U->>CC: Request');

    if (config.agents.length > 0) {
      const agent = config.agents[0];
      lines.push(`    CC->>+${this.sanitizeId(agent.name.value)}: Delegate task`);

      if (config.skills.length > 0) {
        const skill = config.skills[0];
        lines.push(`    ${this.sanitizeId(agent.name.value)}->>+${this.sanitizeId(skill.name.value)}: Invoke skill`);

        if (config.mcpServers.length > 0) {
          const mcp = config.mcpServers[0];
          lines.push(`    ${this.sanitizeId(skill.name.value)}->>+${this.sanitizeId(mcp.name.value)}: Call tool`);
          lines.push(`    ${this.sanitizeId(mcp.name.value)}-->>-${this.sanitizeId(skill.name.value)}: Result`);
        }

        lines.push(`    ${this.sanitizeId(skill.name.value)}-->>-${this.sanitizeId(agent.name.value)}: Complete`);
      }

      lines.push(`    ${this.sanitizeId(agent.name.value)}-->>-CC: Response`);
    }

    lines.push('    CC-->>U: Response');

    lines.push('```');
    return lines.join('\n');
  }

  private generateHierarchy(config: AgentScopeConfig): string {
    const lines: string[] = [
      '```mermaid',
      'flowchart TD'
    ];

    // Project root
    lines.push('    ROOT["Project"]');

    // Group by source
    const projectAgents = config.agents.filter(a => a.source === 'project');
    const userAgents = config.agents.filter(a => a.source === 'user');

    if (projectAgents.length > 0) {
      lines.push('    subgraph Project["Project Agents"]');
      for (const agent of projectAgents) {
        lines.push(`        ${this.sanitizeId(agent.name.value)}["${agent.name.value}"]`);
      }
      lines.push('    end');
      lines.push('    ROOT --> Project');
    }

    if (userAgents.length > 0) {
      lines.push('    subgraph User["User Agents"]');
      for (const agent of userAgents) {
        lines.push(`        ${this.sanitizeId(agent.name.value)}["${agent.name.value}"]`);
      }
      lines.push('    end');
      lines.push('    ROOT --> User');
    }

    lines.push('```');
    return lines.join('\n');
  }

  private generateDataFlow(config: AgentScopeConfig): string {
    // Simplified data flow diagram
    const lines: string[] = [
      '```mermaid',
      'flowchart LR',
      '    subgraph Input',
      '        User[User Request]',
      '    end',
      '    subgraph Processing'
    ];

    for (const agent of config.agents.slice(0, 3)) {
      lines.push(`        ${this.sanitizeId(agent.name.value)}["${agent.name.value}"]`);
    }

    lines.push('    end');
    lines.push('    subgraph External');

    for (const mcp of config.mcpServers) {
      lines.push(`        ${this.sanitizeId(mcp.name.value)}["${mcp.name.value}"]`);
    }

    lines.push('    end');
    lines.push('    User --> Processing');
    lines.push('    Processing --> External');
    lines.push('    External --> Processing');
    lines.push('    Processing --> User');
    lines.push('```');

    return lines.join('\n');
  }

  private generatePermissions(config: AgentScopeConfig): string {
    const lines: string[] = [
      '```mermaid',
      'flowchart TB'
    ];

    // Create permission grid
    for (const agent of config.agents) {
      lines.push(`    subgraph ${this.sanitizeId(agent.name.value)}_perms["${agent.name.value} Permissions"]`);
      for (const tool of agent.allowedTools.slice(0, 5)) { // Limit to 5 tools
        lines.push(`        ${this.sanitizeId(agent.name.value)}_${this.sanitizeId(tool)}["${tool}"]`);
      }
      lines.push('    end');
    }

    lines.push('```');
    return lines.join('\n');
  }

  private generateHooks(config: AgentScopeConfig): string {
    const lines: string[] = [
      '```mermaid',
      'flowchart LR'
    ];

    // Hook lifecycle events
    const events = ['pre-commit', 'post-commit', 'pre-task', 'post-task'];

    lines.push('    subgraph Lifecycle');
    for (let i = 0; i < events.length; i++) {
      lines.push(`        E${i}["${events[i]}"]`);
      if (i > 0) {
        lines.push(`        E${i-1} --> E${i}`);
      }
    }
    lines.push('    end');

    // Connect hooks to events
    for (const hook of config.hooks) {
      const eventIndex = events.findIndex(e => hook.event.value.includes(e));
      if (eventIndex >= 0) {
        lines.push(`    E${eventIndex} --> ${this.sanitizeId(hook.name.value)}["${hook.name.value}"]`);
      }
    }

    lines.push('```');
    return lines.join('\n');
  }

  private sanitizeId(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}

// src/generator/domain/services/MarkdownWriter.ts

export interface IDocumentGenerator extends DomainService {
  generate(config: AgentScopeConfig, type: DocumentType): string;
}

export class MarkdownWriter implements IDocumentGenerator {
  constructor(
    private readonly templateEngine: ITemplateEngine,
    private readonly diagramGenerator: IDiagramGenerator
  ) {}

  generate(config: AgentScopeConfig, type: DocumentType): string {
    switch (type.value) {
      case 'readme':
        return this.generateReadme(config);
      case 'agents':
        return this.generateAgentsDoc(config);
      case 'skills':
        return this.generateSkillsDoc(config);
      default:
        throw new UnsupportedDocumentTypeError(type);
    }
  }

  private generateReadme(config: AgentScopeConfig): string {
    const stats = config.getStatistics();
    const componentMap = this.diagramGenerator.generate(config, DiagramType.ComponentMap);
    const workflowSeq = this.diagramGenerator.generate(config, DiagramType.WorkflowSequence);

    return this.templateEngine.render('readme', {
      projectName: config.meta.name,
      scanDate: config.meta.scanDate.toLocaleDateString(),
      stats,
      componentMap,
      workflowSequence: workflowSeq,
      agents: config.agents.map(a => ({
        name: a.name.value,
        description: a.description,
        source: a.source
      })),
      skills: config.skills.map(s => ({
        name: s.name.value,
        description: s.description
      })),
      mcpServers: config.mcpServers.map(m => ({
        name: m.name.value,
        tools: m.tools.map(t => t.name)
      })),
      errors: config.errors
    });
  }

  private generateAgentsDoc(config: AgentScopeConfig): string {
    return this.templateEngine.render('agents', {
      agents: config.agents.map(agent => ({
        name: agent.name.value,
        description: agent.description,
        source: agent.source,
        sourcePath: agent.sourcePath,
        allowedTools: agent.allowedTools,
        skills: config.getAgentSkills(agent.id).map(s => s.name.value),
        configSnippet: agent.configSnippet
      }))
    });
  }

  private generateSkillsDoc(config: AgentScopeConfig): string {
    return this.templateEngine.render('skills', {
      skills: config.skills.map(skill => ({
        name: skill.name.value,
        description: skill.description,
        sourcePath: skill.sourcePath,
        triggers: skill.triggers,
        configSnippet: skill.configSnippet
      }))
    });
  }
}
```

### 4.5 Generator Repository Interface

```typescript
// src/generator/domain/repositories/IOutputRepository.ts

import { GenerationOutput } from '../entities/GenerationOutput';

export interface IOutputRepository {
  save(output: GenerationOutput, basePath: string): Promise<void>;
  saveAll(outputs: GenerationOutput[], basePath: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
```

---

## 5. Tactical Design: CLI Domain

### 5.1 CLI Value Objects

```typescript
// src/cli/domain/value-objects/ScanOptions.ts

import { ValueObject } from '@shared/ddd';

interface ScanOptionsProps {
  projectPath: string;
  outputPath: string;
  diagrams: DiagramType[];
  strict: boolean;
  format: OutputFormat;
}

export class ScanOptions extends ValueObject<ScanOptionsProps> {
  get projectPath(): string {
    return this.props.projectPath;
  }

  get outputPath(): string {
    return this.props.outputPath;
  }

  get diagrams(): DiagramType[] {
    return this.props.diagrams;
  }

  get strict(): boolean {
    return this.props.strict;
  }

  get format(): OutputFormat {
    return this.props.format;
  }

  static create(options: Partial<ScanOptionsProps>): ScanOptions {
    return new ScanOptions({
      projectPath: options.projectPath ?? process.cwd(),
      outputPath: options.outputPath ?? 'docs/agent-architecture',
      diagrams: options.diagrams ?? DiagramType.defaults(),
      strict: options.strict ?? false,
      format: options.format ?? OutputFormat.Markdown
    });
  }

  withDiagrams(diagrams: DiagramType[]): ScanOptions {
    return ScanOptions.create({
      ...this.props,
      diagrams
    });
  }

  withAllDiagrams(): ScanOptions {
    return this.withDiagrams(DiagramType.all());
  }
}

// src/cli/domain/value-objects/OutputFormat.ts

export enum OutputFormat {
  Markdown = 'markdown',
  Json = 'json',
  Both = 'both'
}
```

### 5.2 CLI Application Service

```typescript
// src/cli/application/ScanCommand.ts

import { ApplicationService } from '@shared/ddd';
import { ScanOptions } from '../domain/value-objects/ScanOptions';
import { ScanSession } from '@scanner/domain/aggregates/ScanSession';
import { GenerationSession } from '@generator/domain/aggregates/GenerationSession';

export class ScanCommand implements ApplicationService {
  constructor(
    private readonly claudeCodeParser: IClaudeCodeParser,
    private readonly mcpParser: IMCPParser,
    private readonly transformService: ITransformService,
    private readonly diagramGenerator: IDiagramGenerator,
    private readonly documentGenerator: IDocumentGenerator,
    private readonly outputRepository: IOutputRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async execute(options: ScanOptions): Promise<ScanCommandResult> {
    this.logger.info(`Scanning: ${options.projectPath}`);

    // 1. Create scan sources
    const sources = [
      ScanSource.claudeProject(options.projectPath),
      ScanSource.claudeUser(homedir()),
      ScanSource.mcpConfig(options.projectPath)
    ];

    // 2. Create scan session
    const scanSession = ScanSession.create(sources);

    // 3. Execute parsers
    try {
      const projectFragments = await this.claudeCodeParser.parseProjectDirectory(
        SourcePath.create(options.projectPath)
      );
      for (const fragment of projectFragments) {
        scanSession.addFragment(fragment);
      }

      const userFragments = await this.claudeCodeParser.parseUserDirectory(
        SourcePath.create(homedir())
      );
      for (const fragment of userFragments) {
        scanSession.addFragment(fragment);
      }

      const mcpFragments = await this.mcpParser.parseMcpJson(
        SourcePath.create(options.projectPath)
      );
      for (const fragment of mcpFragments) {
        scanSession.addFragment(fragment);
      }
    } catch (error) {
      scanSession.fail(ScanError.fatal(error.message, options.projectPath));
      throw error;
    }

    // 4. Complete scan and transform
    const scanResult = scanSession.complete();
    const config = this.transformService.transform(scanResult.fragments);

    // 5. Publish scan completed event
    await this.eventBus.publish(scanSession.domainEvents);

    // 6. Check for fatal errors in strict mode
    if (options.strict && config.errors.some(e => e.level === 'fatal')) {
      throw new StrictModeError(config.errors);
    }

    // 7. Generate outputs
    const generationSession = GenerationSession.create(config);

    // Generate diagrams
    for (const diagramType of options.diagrams) {
      generationSession.generateDiagram(diagramType, this.diagramGenerator);
    }

    // Generate documents
    for (const docType of DocumentType.defaults()) {
      generationSession.generateDocument(docType, this.documentGenerator);
    }

    // Generate JSON output
    const jsonOutput = GenerationOutput.json(config.toJSON());
    generationSession.addOutput(jsonOutput);

    const generationResult = generationSession.complete();

    // 8. Save outputs
    await this.outputRepository.saveAll(
      generationResult.outputs,
      options.outputPath
    );

    // 9. Publish generation events
    await this.eventBus.publish(generationSession.domainEvents);

    // 10. Log summary
    const stats = config.getStatistics();
    this.logger.info(`Found:`);
    this.logger.info(`  - ${stats.agentCount} agents`);
    this.logger.info(`  - ${stats.skillCount} skills`);
    this.logger.info(`  - ${stats.hookCount} hooks`);
    this.logger.info(`  - ${stats.mcpServerCount} MCP servers`);

    return ScanCommandResult.create({
      config,
      outputs: generationResult.outputs,
      stats,
      warnings: config.errors.filter(e => e.level === 'warning')
    });
  }
}
```

---

## 6. Domain Events (CloudEvents Format)

### 6.1 Event Definitions

```typescript
// src/shared/domain/events/DomainEvent.ts

import { v4 as uuidv4 } from 'uuid';

export interface CloudEventEnvelope<T> {
  specversion: '1.0';
  type: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: 'application/json';
  data: T;
}

export abstract class DomainEvent<T = unknown> {
  readonly id: string;
  readonly occurredAt: Date;

  constructor(public readonly data: T) {
    this.id = uuidv4();
    this.occurredAt = new Date();
  }

  abstract get type(): string;
  abstract get source(): string;

  toCloudEvent(): CloudEventEnvelope<T> {
    return {
      specversion: '1.0',
      type: this.type,
      source: this.source,
      id: this.id,
      time: this.occurredAt.toISOString(),
      datacontenttype: 'application/json',
      data: this.data
    };
  }
}

// src/scanner/domain/events/ScanCompleted.ts

interface ScanCompletedData {
  sessionId: string;
  agentCount: number;
  skillCount: number;
  hookCount: number;
  mcpServerCount: number;
  duration: number;
}

export class ScanCompleted extends DomainEvent<ScanCompletedData> {
  get type(): string {
    return 'com.agentscope.scanner.scan-completed';
  }

  get source(): string {
    return '/scanner';
  }
}

// src/scanner/domain/events/ScanFailed.ts

interface ScanFailedData {
  sessionId: string;
  error: string;
  source: string;
}

export class ScanFailed extends DomainEvent<ScanFailedData> {
  get type(): string {
    return 'com.agentscope.scanner.scan-failed';
  }

  get source(): string {
    return '/scanner';
  }
}

// src/scanner/domain/events/SourceScanned.ts

interface SourceScannedData {
  sessionId: string;
  sourceType: string;
  fragmentCount: number;
}

export class SourceScanned extends DomainEvent<SourceScannedData> {
  get type(): string {
    return 'com.agentscope.scanner.source-scanned';
  }

  get source(): string {
    return '/scanner';
  }
}

// src/generator/domain/events/GenerationCompleted.ts

interface GenerationCompletedData {
  sessionId: string;
  outputCount: number;
  diagramCount: number;
  documentCount: number;
}

export class GenerationCompleted extends DomainEvent<GenerationCompletedData> {
  get type(): string {
    return 'com.agentscope.generator.generation-completed';
  }

  get source(): string {
    return '/generator';
  }
}

// src/generator/domain/events/DiagramGenerated.ts

interface DiagramGeneratedData {
  sessionId: string;
  diagramType: string;
  outputPath: string;
}

export class DiagramGenerated extends DomainEvent<DiagramGeneratedData> {
  get type(): string {
    return 'com.agentscope.generator.diagram-generated';
  }

  get source(): string {
    return '/generator';
  }
}
```

### 6.2 Event Bus Interface

```typescript
// src/shared/infrastructure/events/IEventBus.ts

import { DomainEvent } from '@shared/domain/events/DomainEvent';

export interface IEventBus {
  publish(events: DomainEvent[]): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): void;
}

// src/shared/infrastructure/events/InMemoryEventBus.ts

export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>();

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.type) ?? [];
      for (const handler of handlers) {
        await handler(event);
      }
    }
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): void {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler as (event: DomainEvent) => Promise<void>);
    this.handlers.set(eventType, handlers);
  }
}
```

---

## 7. Anti-Corruption Layers

### 7.1 Scanner-to-Model ACL

```typescript
// src/model/infrastructure/acl/ScannerACL.ts

import { ConfigFragment } from '@scanner/domain/value-objects/ConfigFragment';
import { Agent } from '@model/domain/entities/Agent';
import { Skill } from '@model/domain/entities/Skill';
import { MCPServer } from '@model/domain/entities/MCPServer';

/**
 * Anti-Corruption Layer between Scanner and Model domains.
 * Translates Scanner concepts into Model domain language.
 */
export class ScannerACL {
  /**
   * Translates raw scanner fragments into validated Model entities.
   * Protects Model domain from Scanner implementation details.
   */
  translateFragment(fragment: ConfigFragment): TranslatedEntity {
    switch (fragment.contentType) {
      case 'agent':
        return this.translateAgent(fragment);
      case 'skill':
        return this.translateSkill(fragment);
      case 'mcp':
        return this.translateMCPServer(fragment);
      default:
        return { type: 'unknown', entity: null };
    }
  }

  private translateAgent(fragment: ConfigFragment): TranslatedEntity {
    const data = fragment.parsedData as unknown;

    // Validate and normalize agent data from various sources
    const normalized = this.normalizeAgentData(data, fragment.sourceType);

    return {
      type: 'agent',
      entity: Agent.create({
        name: normalized.name,
        description: normalized.description ?? '',
        source: this.mapSourceType(fragment.sourceType),
        sourcePath: fragment.sourcePath,
        allowedTools: normalized.allowedTools ?? [],
        skills: normalized.skills ?? [],
        configSnippet: fragment.rawContent
      })
    };
  }

  private normalizeAgentData(data: unknown, sourceType: SourceType): NormalizedAgentData {
    // Handle different data formats from different sources
    if (sourceType === SourceType.ClaudeProject) {
      return this.normalizeProjectAgentData(data);
    } else if (sourceType === SourceType.ClaudeUser) {
      return this.normalizeUserAgentData(data);
    }
    throw new UnknownSourceTypeError(sourceType);
  }

  private normalizeProjectAgentData(data: unknown): NormalizedAgentData {
    const agentData = data as Record<string, unknown>;
    return {
      name: String(agentData.name ?? ''),
      description: String(agentData.description ?? ''),
      allowedTools: this.extractTools(agentData.capabilities),
      skills: this.extractSkills(agentData.skills)
    };
  }

  private extractTools(capabilities: unknown): string[] {
    if (!capabilities || typeof capabilities !== 'object') return [];
    const caps = capabilities as Record<string, unknown>;
    const allowedTools = caps.allowed_tools ?? caps.allowedTools;
    if (Array.isArray(allowedTools)) {
      return allowedTools.map(String);
    }
    return [];
  }

  private mapSourceType(sourceType: SourceType): 'project' | 'user' {
    switch (sourceType) {
      case SourceType.ClaudeProject:
      case SourceType.ClaudeMd:
      case SourceType.MCP:
        return 'project';
      case SourceType.ClaudeUser:
        return 'user';
      default:
        return 'project';
    }
  }
}

interface TranslatedEntity {
  type: 'agent' | 'skill' | 'mcp' | 'unknown';
  entity: Agent | Skill | MCPServer | null;
}
```

### 7.2 Model-to-Generator ACL

```typescript
// src/generator/infrastructure/acl/ModelACL.ts

import { AgentScopeConfig } from '@model/domain/aggregates/AgentScopeConfig';

/**
 * Anti-Corruption Layer between Model and Generator domains.
 * Provides a simplified view of Model for generation purposes.
 */
export class ModelACL {
  /**
   * Creates a read-only view of the config optimized for diagram generation.
   */
  createDiagramView(config: AgentScopeConfig): DiagramDataView {
    return {
      agents: config.agents.map(a => ({
        id: a.id.value,
        name: a.name.value,
        description: a.description,
        skillIds: a.skillIds.map(s => s.value),
        toolCount: a.allowedTools.length
      })),
      skills: config.skills.map(s => ({
        id: s.id.value,
        name: s.name.value,
        triggerCount: s.triggers.length
      })),
      hooks: config.hooks.map(h => ({
        id: h.id.value,
        name: h.name.value,
        event: h.event.value
      })),
      mcpServers: config.mcpServers.map(m => ({
        id: m.id.value,
        name: m.name.value,
        toolNames: m.tools.map(t => t.name)
      })),
      relationships: this.extractRelationships(config)
    };
  }

  /**
   * Creates a view optimized for document generation.
   */
  createDocumentView(config: AgentScopeConfig): DocumentDataView {
    return {
      meta: {
        name: config.meta.name,
        scanDate: config.meta.scanDate.toISOString(),
        projectPath: config.meta.projectPath
      },
      statistics: config.getStatistics(),
      agents: config.agents.map(a => ({
        ...a.toJSON(),
        resolvedSkills: config.getAgentSkills(a.id).map(s => s.toJSON())
      })),
      skills: config.skills.map(s => s.toJSON()),
      mcpServers: config.mcpServers.map(m => m.toJSON()),
      errors: config.errors.map(e => e.toJSON())
    };
  }

  private extractRelationships(config: AgentScopeConfig): Relationship[] {
    const relationships: Relationship[] = [];

    for (const agent of config.agents) {
      // Agent -> Skill relationships
      for (const skillId of agent.skillIds) {
        relationships.push({
          from: agent.id.value,
          to: skillId.value,
          type: 'uses'
        });
      }

      // Agent -> MCP relationships
      const mcps = config.getAgentMCPServers(agent.id);
      for (const mcp of mcps) {
        relationships.push({
          from: agent.id.value,
          to: mcp.id.value,
          type: 'connects'
        });
      }
    }

    return relationships;
  }
}
```

---

## 8. Self-Learning Hooks Integration

### 8.1 Pattern Storage with HNSW

```typescript
// src/shared/infrastructure/learning/PatternStore.ts

import { IPatternStore } from './IPatternStore';

/**
 * Stores successful patterns using HNSW-indexed vector search
 * for fast pattern retrieval and learning.
 */
export class PatternStore implements IPatternStore {
  constructor(
    private readonly memoryStore: IMemoryStore,
    private readonly vectorizer: IVectorizer
  ) {}

  async storePattern(pattern: Pattern): Promise<void> {
    const vector = await this.vectorizer.vectorize(pattern.description);

    await this.memoryStore.store({
      namespace: 'patterns',
      key: pattern.id,
      value: pattern,
      vector,
      metadata: {
        type: pattern.type,
        confidence: pattern.confidence,
        createdAt: new Date().toISOString()
      }
    });
  }

  async findSimilarPatterns(query: string, limit: number = 5): Promise<Pattern[]> {
    const queryVector = await this.vectorizer.vectorize(query);

    const results = await this.memoryStore.search({
      namespace: 'patterns',
      vector: queryVector,
      limit,
      threshold: 0.7
    });

    return results.map(r => r.value as Pattern);
  }

  async recordSuccess(patternId: string): Promise<void> {
    const pattern = await this.memoryStore.retrieve('patterns', patternId);
    if (pattern) {
      pattern.successCount++;
      pattern.confidence = this.calculateConfidence(pattern);
      await this.storePattern(pattern);
    }
  }

  private calculateConfidence(pattern: Pattern): number {
    const totalUses = pattern.successCount + pattern.failureCount;
    if (totalUses === 0) return 0.5;
    return pattern.successCount / totalUses;
  }
}

interface Pattern {
  id: string;
  type: 'scan' | 'generation' | 'validation';
  description: string;
  context: Record<string, unknown>;
  successCount: number;
  failureCount: number;
  confidence: number;
}
```

### 8.2 Learning Hooks

```typescript
// src/shared/infrastructure/learning/LearningHooks.ts

import { IEventBus } from '../events/IEventBus';
import { IPatternStore } from './IPatternStore';
import { ScanCompleted } from '@scanner/domain/events/ScanCompleted';
import { GenerationCompleted } from '@generator/domain/events/GenerationCompleted';

/**
 * Hooks that learn from successful operations and store patterns
 * for future optimization.
 */
export class LearningHooks {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly patternStore: IPatternStore
  ) {
    this.registerHooks();
  }

  private registerHooks(): void {
    // Learn from successful scans
    this.eventBus.subscribe<ScanCompleted>(
      'com.agentscope.scanner.scan-completed',
      async (event) => {
        await this.learnFromScan(event);
      }
    );

    // Learn from successful generations
    this.eventBus.subscribe<GenerationCompleted>(
      'com.agentscope.generator.generation-completed',
      async (event) => {
        await this.learnFromGeneration(event);
      }
    );
  }

  private async learnFromScan(event: ScanCompleted): Promise<void> {
    const pattern: Pattern = {
      id: `scan-${event.id}`,
      type: 'scan',
      description: `Successful scan with ${event.data.agentCount} agents, ${event.data.skillCount} skills`,
      context: {
        agentCount: event.data.agentCount,
        skillCount: event.data.skillCount,
        hookCount: event.data.hookCount,
        mcpServerCount: event.data.mcpServerCount,
        duration: event.data.duration
      },
      successCount: 1,
      failureCount: 0,
      confidence: 1.0
    };

    await this.patternStore.storePattern(pattern);
  }

  private async learnFromGeneration(event: GenerationCompleted): Promise<void> {
    const pattern: Pattern = {
      id: `generation-${event.id}`,
      type: 'generation',
      description: `Successful generation with ${event.data.diagramCount} diagrams, ${event.data.documentCount} documents`,
      context: {
        diagramCount: event.data.diagramCount,
        documentCount: event.data.documentCount,
        outputCount: event.data.outputCount
      },
      successCount: 1,
      failureCount: 0,
      confidence: 1.0
    };

    await this.patternStore.storePattern(pattern);
  }
}
```

### 8.3 Claude-Flow Integration

```typescript
// src/shared/infrastructure/learning/ClaudeFlowIntegration.ts

/**
 * Integration with claude-flow hooks system for
 * cross-session learning and optimization.
 */
export class ClaudeFlowIntegration {
  constructor(
    private readonly patternStore: IPatternStore
  ) {}

  /**
   * Called before task execution to get relevant patterns.
   */
  async preTask(taskDescription: string): Promise<PreTaskResult> {
    // Search for similar successful patterns
    const patterns = await this.patternStore.findSimilarPatterns(
      taskDescription,
      5
    );

    return {
      suggestedApproach: patterns[0]?.description,
      confidence: patterns[0]?.confidence ?? 0,
      relatedPatterns: patterns.slice(1)
    };
  }

  /**
   * Called after task completion to record outcome.
   */
  async postTask(
    taskId: string,
    success: boolean,
    context: Record<string, unknown>
  ): Promise<void> {
    if (success) {
      // Store successful pattern
      const pattern: Pattern = {
        id: `task-${taskId}`,
        type: 'scan',
        description: `Task completed successfully`,
        context,
        successCount: 1,
        failureCount: 0,
        confidence: 1.0
      };
      await this.patternStore.storePattern(pattern);
    }
  }

  /**
   * Export patterns for transfer to another project.
   */
  async exportPatterns(): Promise<Pattern[]> {
    return this.patternStore.findSimilarPatterns('', 100);
  }

  /**
   * Import patterns from another project.
   */
  async importPatterns(patterns: Pattern[]): Promise<void> {
    for (const pattern of patterns) {
      // Reduce confidence for imported patterns
      pattern.confidence *= 0.8;
      await this.patternStore.storePattern(pattern);
    }
  }
}
```

---

## 9. Directory Structure

```
src/
├── scanner/                      # Scanner Bounded Context
│   ├── domain/
│   │   ├── aggregates/
│   │   │   └── ScanSession.ts
│   │   ├── entities/
│   │   │   └── ScanSource.ts
│   │   ├── value-objects/
│   │   │   ├── ScanSessionId.ts
│   │   │   ├── SourceId.ts
│   │   │   ├── SourceType.ts
│   │   │   ├── SourcePath.ts
│   │   │   └── ConfigFragment.ts
│   │   ├── services/
│   │   │   ├── ClaudeCodeParser.ts
│   │   │   └── MCPParser.ts
│   │   ├── events/
│   │   │   ├── ScanCompleted.ts
│   │   │   ├── ScanFailed.ts
│   │   │   └── SourceScanned.ts
│   │   └── repositories/
│   │       └── IScanResultRepository.ts
│   ├── infrastructure/
│   │   ├── parsers/
│   │   │   ├── YamlParserImpl.ts
│   │   │   └── MarkdownParserImpl.ts
│   │   └── repositories/
│   │       └── FileScanResultRepository.ts
│   └── application/
│       └── ScanUseCase.ts
│
├── model/                        # Model Bounded Context (Shared Kernel)
│   ├── domain/
│   │   ├── aggregates/
│   │   │   └── AgentScopeConfig.ts
│   │   ├── entities/
│   │   │   ├── Agent.ts
│   │   │   ├── Skill.ts
│   │   │   ├── Hook.ts
│   │   │   ├── Command.ts
│   │   │   └── MCPServer.ts
│   │   ├── value-objects/
│   │   │   ├── AgentId.ts
│   │   │   ├── SkillId.ts
│   │   │   ├── HookId.ts
│   │   │   ├── MCPServerId.ts
│   │   │   ├── ConfigMeta.ts
│   │   │   ├── Settings.ts
│   │   │   └── ScanError.ts
│   │   └── services/
│   │       ├── ValidationService.ts
│   │       └── TransformService.ts
│   └── infrastructure/
│       └── acl/
│           └── ScannerACL.ts
│
├── generator/                    # Generator Bounded Context
│   ├── domain/
│   │   ├── aggregates/
│   │   │   └── GenerationSession.ts
│   │   ├── entities/
│   │   │   └── GenerationOutput.ts
│   │   ├── value-objects/
│   │   │   ├── GenerationSessionId.ts
│   │   │   ├── OutputId.ts
│   │   │   ├── DiagramType.ts
│   │   │   └── DocumentType.ts
│   │   ├── services/
│   │   │   ├── MermaidGenerator.ts
│   │   │   └── MarkdownWriter.ts
│   │   ├── events/
│   │   │   ├── GenerationCompleted.ts
│   │   │   ├── DiagramGenerated.ts
│   │   │   └── DocumentGenerated.ts
│   │   └── repositories/
│   │       └── IOutputRepository.ts
│   ├── infrastructure/
│   │   ├── templates/
│   │   │   ├── readme.hbs
│   │   │   ├── agents.hbs
│   │   │   └── skills.hbs
│   │   ├── acl/
│   │   │   └── ModelACL.ts
│   │   └── repositories/
│   │       └── FileOutputRepository.ts
│   └── application/
│       └── GenerateUseCase.ts
│
├── cli/                          # CLI Bounded Context
│   ├── domain/
│   │   └── value-objects/
│   │       ├── ScanOptions.ts
│   │       └── OutputFormat.ts
│   ├── application/
│   │   └── ScanCommand.ts
│   └── infrastructure/
│       ├── Commander.ts
│       └── ConsoleLogger.ts
│
├── shared/                       # Shared Infrastructure
│   ├── domain/
│   │   ├── AggregateRoot.ts
│   │   ├── Entity.ts
│   │   ├── ValueObject.ts
│   │   ├── DomainService.ts
│   │   └── events/
│   │       └── DomainEvent.ts
│   └── infrastructure/
│       ├── events/
│       │   ├── IEventBus.ts
│       │   └── InMemoryEventBus.ts
│       ├── filesystem/
│       │   └── IFileSystem.ts
│       └── learning/
│           ├── IPatternStore.ts
│           ├── PatternStore.ts
│           ├── LearningHooks.ts
│           └── ClaudeFlowIntegration.ts
│
└── index.ts                      # Entry point
```

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Day 1 Morning)

| Task | Deliverable | Test Coverage |
|------|-------------|---------------|
| Set up DDD base classes | `src/shared/domain/*.ts` | 100% |
| Implement Value Objects | All ID and simple VOs | 100% |
| Create event infrastructure | EventBus, DomainEvent | 100% |

### Phase 2: Scanner Domain (Day 1 Afternoon)

| Task | Deliverable | Test Coverage |
|------|-------------|---------------|
| Implement ClaudeCodeParser | `src/scanner/domain/services/` | 80%+ |
| Implement MCPParser | `src/scanner/domain/services/` | 80%+ |
| Create ScanSession aggregate | `src/scanner/domain/aggregates/` | 80%+ |
| Scanner domain events | ScanCompleted, ScanFailed | 100% |

### Phase 3: Model Domain (Day 1 Evening)

| Task | Deliverable | Test Coverage |
|------|-------------|---------------|
| Implement Entities | Agent, Skill, Hook, MCPServer | 80%+ |
| Create AgentScopeConfig aggregate | `src/model/domain/aggregates/` | 80%+ |
| Implement ValidationService | `src/model/domain/services/` | 80%+ |
| Implement TransformService | `src/model/domain/services/` | 80%+ |
| Scanner-to-Model ACL | `src/model/infrastructure/acl/` | 80%+ |

### Phase 4: Generator Domain (Day 2 Morning)

| Task | Deliverable | Test Coverage |
|------|-------------|---------------|
| Implement MermaidGenerator | Component Map, Workflow Sequence | 80%+ |
| Implement MarkdownWriter | README.md, AGENTS.md templates | 80%+ |
| Create GenerationSession aggregate | `src/generator/domain/aggregates/` | 80%+ |
| Model-to-Generator ACL | `src/generator/infrastructure/acl/` | 80%+ |
| Generator domain events | GenerationCompleted, etc. | 100% |

### Phase 5: CLI Domain & Integration (Day 2 Afternoon)

| Task | Deliverable | Test Coverage |
|------|-------------|---------------|
| Implement ScanCommand | Full scan workflow | 80%+ |
| Implement CLI with Commander | `src/cli/infrastructure/` | 80%+ |
| Integration tests | End-to-end scan tests | 80%+ |
| Learning hooks integration | PatternStore, LearningHooks | 80%+ |

---

## 11. Quality Gates

### Unit Test Requirements

| Domain | Coverage Target | Key Test Cases |
|--------|-----------------|----------------|
| Value Objects | 100% | Equality, validation, serialization |
| Entities | 90%+ | Creation, mutation, business rules |
| Aggregates | 90%+ | Invariants, event raising |
| Domain Services | 80%+ | Happy path, error cases |
| ACLs | 80%+ | Translation correctness |

### Integration Test Requirements

| Scenario | Test Type | Coverage |
|----------|-----------|----------|
| Full scan workflow | E2E | All file types |
| Diagram generation | Snapshot | All diagram types |
| Document generation | Snapshot | README, AGENTS.md |
| Error handling | Unit + E2E | Fatal, warning, info |

### Validation Checklist

- [ ] All Value Objects are immutable
- [ ] All Entities have proper identity
- [ ] Aggregates enforce invariants
- [ ] Domain events follow CloudEvents spec
- [ ] ACLs prevent domain pollution
- [ ] No business logic in infrastructure
- [ ] Repository interfaces in domain layer

---

## 12. Ubiquitous Language Glossary

| Term | Definition | Context |
|------|------------|---------|
| **Agent** | An AI assistant configuration with specific capabilities and constraints | Model |
| **Skill** | A reusable capability that agents can invoke | Model |
| **Hook** | An event trigger that executes commands at specific points | Model |
| **MCP Server** | A Model Context Protocol server providing tools | Model |
| **Config Fragment** | A piece of configuration extracted from a source file | Scanner |
| **Scan Session** | A complete scanning operation from start to finish | Scanner |
| **Source** | A file or directory from which configuration is extracted | Scanner |
| **Generation Session** | A complete output generation operation | Generator |
| **Diagram Type** | The kind of Mermaid diagram to generate | Generator |
| **Document Type** | The kind of Markdown document to generate | Generator |
| **Scan Error** | A problem encountered during scanning (fatal/warning/info) | Model |
| **Pattern** | A learned successful approach stored for future reference | Learning |

---

## Appendix A: Type Definitions

```typescript
// src/types/index.ts

// DTOs for serialization
export interface AgentScopeConfigDTO {
  meta: ConfigMetaDTO;
  agents: AgentDTO[];
  skills: SkillDTO[];
  hooks: HookDTO[];
  commands: CommandDTO[];
  mcpServers: MCPServerDTO[];
  settings: SettingsDTO;
  errors: ScanErrorDTO[];
}

export interface AgentDTO {
  id: string;
  name: string;
  description: string;
  source: 'project' | 'user';
  sourcePath: string;
  allowedTools: string[];
  skills: string[];
  configSnippet: string;
}

export interface SkillDTO {
  id: string;
  name: string;
  description: string;
  sourcePath: string;
  triggers: TriggerDTO[];
  configSnippet: string;
}

export interface MCPServerDTO {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  tools: MCPToolDTO[];
  sourcePath: string;
}

export interface ScanErrorDTO {
  level: 'fatal' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
}

export interface ConfigStatistics {
  agentCount: number;
  skillCount: number;
  hookCount: number;
  commandCount: number;
  mcpServerCount: number;
  errorCount: number;
  warningCount: number;
}
```

---

*Document Version: 1.0 | January 2026 | Status: Ready for Implementation*
*Based on: AgentScope PRD v2.0, Research Executive Summary, Documentation Frameworks Deep Analysis*
