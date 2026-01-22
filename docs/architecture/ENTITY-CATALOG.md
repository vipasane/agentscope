# AgentScope Entity Catalog

> **Complete Entity Scaffolding for DDD Implementation**
> **Version**: 1.0
> **Date**: January 2026
> **Based On**: Claude Code/Anthropic Configuration Patterns

---

## Overview

This catalog defines all entity types discovered by AgentScope when scanning Claude Code configurations. Each entity includes identity patterns, metadata schemas, properties, relationships, source locations, and emitted events following the DDD architecture defined in [DDD-IMPLEMENTATION.md](./DDD-IMPLEMENTATION.md).

### Entity Summary

| Entity | ID Format | Uniqueness Scope | Primary Source |
|--------|-----------|------------------|----------------|
| Agent | `agent:{name}` | project + user | `.claude/agents/**/*.md` |
| Skill | `skill:{name}` | project + user | `.claude/skills/**/SKILL.md` |
| Hook | `hook:{event}:{index}` | project | `.claude/settings.json` |
| Command | `cmd:{name}` | project | `CLAUDE.md` |
| MCPServer | `mcp:{name}` | project | `.mcp.json` |
| Settings | `settings:{scope}` | project | `.claude/settings.json` |
| ExternalEvent | `event:{source}:{type}` | project | `.github/workflows/*.yml`, `pre-commit` |

---

## Entity: Agent

### Identity

- **ID Format**: `agent:{sanitized-name}` (e.g., `agent:coder`, `agent:security-architect`)
- **ID Generation**: Name lowercase, non-alphanumeric replaced with `-`, leading/trailing dashes removed
- **Uniqueness Scope**: Combined project + user (project agents override user agents with same name)

### Metadata

| Field | Type | Required | Description | Source File |
|-------|------|----------|-------------|-------------|
| `name` | `string` | Yes | Agent display name from frontmatter | `.claude/agents/**/*.md` (frontmatter) |
| `type` | `string` | No | Agent category (e.g., `developer`, `reviewer`) | `.claude/agents/**/*.md` (frontmatter) |
| `color` | `string` | No | Display color in hex format | `.claude/agents/**/*.md` (frontmatter) |
| `description` | `string` | Yes | Agent purpose description | `.claude/agents/**/*.md` (frontmatter) |
| `priority` | `string` | No | Execution priority (`high`, `normal`, `low`) | `.claude/agents/**/*.md` (frontmatter) |

### Properties

| Property | Type | Default | Validation | Example |
|----------|------|---------|------------|---------|
| `id` | `AgentId` | Generated | Must start with `agent:` | `agent:coder` |
| `name` | `AgentName` | Required | Non-empty, max 64 chars | `coder` |
| `description` | `string` | `""` | Max 1024 chars | `Implementation specialist...` |
| `source` | `'project' \| 'user'` | Required | Enum value | `project` |
| `sourcePath` | `string` | Required | Valid file path | `.claude/agents/core/coder.md` |
| `allowedTools` | `string[]` | `[]` | Array of tool names | `["Read", "Write", "Bash"]` |
| `skillIds` | `SkillId[]` | `[]` | References to skills | `["skill:code-review"]` |
| `configSnippet` | `string` | `""` | Raw YAML/MD content | Full frontmatter content |
| `capabilities` | `string[]` | `[]` | Agent capabilities list | `["code_generation", "refactoring"]` |
| `hooks` | `AgentHooks` | `{}` | Pre/post hooks for agent | `{pre: "echo Start", post: "echo Done"}` |

### Relationships

| Related Entity | Cardinality | Description |
|----------------|-------------|-------------|
| `Skill` | Many-to-Many | Agent uses multiple skills; skills used by multiple agents |
| `MCPServer` | Many-to-Many | Agent accesses MCP tools; MCP serves multiple agents |
| `Hook` | One-to-Many | Agent can define inline pre/post hooks |
| `Command` | Many-to-Many | Agent responds to commands; commands may invoke agents |

### Source Locations

| Location | File Pattern | Parser |
|----------|--------------|--------|
| Project Agents | `.claude/agents/**/*.md` | `ClaudeCodeParser.parseAgentFile()` |
| User Agents | `~/.claude/agents/**/*.md` | `ClaudeCodeParser.parseAgentFile()` |
| CLAUDE.md Agents | `CLAUDE.md` (agent sections) | `ClaudeCodeParser.parseClaudeMd()` |

### Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `AgentDiscovered` | New agent file parsed | `{agentId, name, source, sourcePath}` |
| `AgentUpdated` | Existing agent file changed | `{agentId, changes[]}` |
| `AgentRemoved` | Agent file deleted | `{agentId, reason}` |
| `AgentValidationFailed` | Invalid agent definition | `{agentId, errors[]}` |

### External References

- [DDD-IMPLEMENTATION.md#Agent Entity](./DDD-IMPLEMENTATION.md) - Implementation patterns
- [CLAUDE.md#Available Agents](/workspaces/agentscope/CLAUDE.md) - 60+ agent types documented
- Sample Agent: [`.claude/agents/core/coder.md`](/workspaces/agentscope/.claude/agents/core/coder.md)

---

## Entity: Skill

### Identity

- **ID Format**: `skill:{sanitized-name}` (e.g., `skill:skill-builder`, `skill:github-code-review`)
- **ID Generation**: Derived from skill directory name or YAML `name` field
- **Uniqueness Scope**: Combined project + user (project skills take precedence)

### Metadata

| Field | Type | Required | Description | Source File |
|-------|------|----------|-------------|-------------|
| `name` | `string` | Yes | Skill display name (max 64 chars) | `SKILL.md` (frontmatter) |
| `description` | `string` | Yes | What + When description (max 1024 chars) | `SKILL.md` (frontmatter) |

### Properties

| Property | Type | Default | Validation | Example |
|----------|------|---------|------------|---------|
| `id` | `SkillId` | Generated | Must start with `skill:` | `skill:react-builder` |
| `name` | `SkillName` | Required | Non-empty, max 64 chars | `React Component Generator` |
| `description` | `string` | Required | Max 1024 chars, must include "what" and "when" | `Generate React components... Use when scaffolding...` |
| `sourcePath` | `string` | Required | Path to SKILL.md | `.claude/skills/react-builder/SKILL.md` |
| `triggers` | `Trigger[]` | `[]` | Conditions that activate skill | `["scaffolding", "creating components"]` |
| `configSnippet` | `string` | `""` | Full SKILL.md content | Raw markdown content |
| `scripts` | `string[]` | `[]` | Paths to executable scripts | `["scripts/generate.sh"]` |
| `resources` | `string[]` | `[]` | Paths to resource files | `["resources/templates/"]` |
| `level` | `1 \| 2 \| 3 \| 4` | `2` | Progressive disclosure level | `2` |

### Relationships

| Related Entity | Cardinality | Description |
|----------------|-------------|-------------|
| `Agent` | Many-to-Many | Skills used by agents; agents reference skills |
| `MCPServer` | Many-to-Many | Skills may invoke MCP tools |
| `Command` | One-to-Many | Skill may define custom commands |

### Source Locations

| Location | File Pattern | Parser |
|----------|--------------|--------|
| Project Skills | `.claude/skills/*/SKILL.md` | `ClaudeCodeParser.parseSkillFile()` |
| User Skills | `~/.claude/skills/*/SKILL.md` | `ClaudeCodeParser.parseSkillFile()` |

### Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `SkillDiscovered` | New SKILL.md parsed | `{skillId, name, source}` |
| `SkillTriggered` | Skill matched to user query | `{skillId, triggerContext}` |
| `SkillValidationFailed` | Missing required frontmatter | `{skillId, errors[]}` |

### External References

- [SKILL.md Specification](/workspaces/agentscope/.claude/skills/skill-builder/SKILL.md) - Complete skill format guide
- Project Skills Directory: `.claude/skills/`
- User Skills Directory: `~/.claude/skills/`

---

## Entity: Hook

### Identity

- **ID Format**: `hook:{event}:{index}` (e.g., `hook:PreToolUse:0`, `hook:PostToolUse:1`)
- **ID Generation**: Event type + zero-based index within event category
- **Uniqueness Scope**: Project-level only

### Metadata

| Field | Type | Required | Description | Source File |
|-------|------|----------|-------------|-------------|
| `event` | `HookEvent` | Yes | Event type that triggers hook | `.claude/settings.json` |
| `matcher` | `string` | No | Regex pattern for tool matching | `.claude/settings.json` |
| `timeout` | `number` | No | Execution timeout in ms | `.claude/settings.json` |
| `continueOnError` | `boolean` | No | Whether to continue on hook failure | `.claude/settings.json` |

### Properties

| Property | Type | Default | Validation | Example |
|----------|------|---------|------------|---------|
| `id` | `HookId` | Generated | Must start with `hook:` | `hook:PreToolUse:0` |
| `name` | `HookName` | Generated | Derived from event + matcher | `PreToolUse-Write-Edit` |
| `event` | `HookEvent` | Required | Valid Claude Code event | `PreToolUse` |
| `matcher` | `string` | `".*"` | Valid regex pattern | `^(Write\|Edit\|MultiEdit)$` |
| `command` | `string` | Required | Shell command to execute | `npx @claude-flow/cli hooks pre-edit` |
| `type` | `'command'` | Required | Hook type | `command` |
| `timeout` | `number` | `5000` | Positive integer, ms | `5000` |
| `continueOnError` | `boolean` | `true` | Boolean | `true` |
| `sourcePath` | `string` | Required | Path to settings.json | `.claude/settings.json` |

### Hook Event Types

| Event | Trigger Point | Available Variables |
|-------|--------------|---------------------|
| `PreToolUse` | Before tool execution | `$TOOL_INPUT_*`, `$TOOL_NAME` |
| `PostToolUse` | After tool execution | `$TOOL_INPUT_*`, `$TOOL_RESULT_*`, `$TOOL_SUCCESS` |
| `UserPromptSubmit` | When user submits prompt | `$PROMPT` |
| `SessionStart` | When Claude Code session starts | `$SESSION_ID` |
| `Stop` | When execution stops | None |
| `Notification` | When notification sent | `$NOTIFICATION_MESSAGE` |

### Relationships

| Related Entity | Cardinality | Description |
|----------------|-------------|-------------|
| `Settings` | Many-to-One | Hooks defined within settings |
| `Agent` | Many-to-Many | Hooks may invoke agents; agents may trigger hooks |
| `Command` | One-to-Many | Hooks execute commands |

### Source Locations

| Location | File Pattern | Parser |
|----------|--------------|--------|
| Project Hooks | `.claude/settings.json` (`hooks` section) | `ClaudeCodeParser.parseSettingsJson()` |
| Agent Hooks | `.claude/agents/**/*.md` (`hooks` in frontmatter) | `ClaudeCodeParser.parseAgentFile()` |

### Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `HookRegistered` | Hook discovered in settings | `{hookId, event, matcher}` |
| `HookExecuted` | Hook command run | `{hookId, exitCode, duration}` |
| `HookFailed` | Hook command failed | `{hookId, error, continueOnError}` |

### External References

- [Settings.json](/workspaces/agentscope/.claude/settings.json) - Hook definitions
- [CLAUDE.md#V3 Hooks System](/workspaces/agentscope/CLAUDE.md) - 27 hooks + 12 workers documented

---

## Entity: Command

### Identity

- **ID Format**: `cmd:{name}` (e.g., `cmd:scan`, `cmd:memory-search`)
- **ID Generation**: Command name with spaces converted to dashes
- **Uniqueness Scope**: Project-level (CLAUDE.md commands)

### Metadata

| Field | Type | Required | Description | Source File |
|-------|------|----------|-------------|-------------|
| `name` | `string` | Yes | Command name | `CLAUDE.md` |
| `description` | `string` | No | Command description | `CLAUDE.md` |
| `category` | `string` | No | Command category | `CLAUDE.md` |

### Properties

| Property | Type | Default | Validation | Example |
|----------|------|---------|------------|---------|
| `id` | `CommandId` | Generated | Must start with `cmd:` | `cmd:swarm-init` |
| `name` | `CommandName` | Required | Non-empty | `swarm init` |
| `description` | `string` | `""` | Max 256 chars | `Initialize swarm coordination` |
| `syntax` | `string` | `""` | Usage syntax | `npx @claude-flow/cli swarm init --topology <type>` |
| `category` | `string` | `"general"` | Command category | `swarm` |
| `subcommands` | `string[]` | `[]` | Available subcommands | `["status", "shutdown"]` |
| `options` | `CommandOption[]` | `[]` | Command options | `[{name: "--topology", type: "string"}]` |
| `examples` | `string[]` | `[]` | Usage examples | `["swarm init --v3-mode"]` |
| `sourcePath` | `string` | Required | Path to source | `CLAUDE.md` |

### Relationships

| Related Entity | Cardinality | Description |
|----------------|-------------|-------------|
| `Agent` | Many-to-Many | Commands may invoke agents |
| `Skill` | Many-to-Many | Skills may define commands |
| `Hook` | One-to-Many | Commands may be run by hooks |
| `MCPServer` | Many-to-Many | Commands may invoke MCP tools |

### Source Locations

| Location | File Pattern | Parser |
|----------|--------------|--------|
| CLAUDE.md Commands | `CLAUDE.md` (command tables/sections) | `ClaudeCodeParser.parseClaudeMd()` |
| CLI Documentation | `README.md`, `docs/cli.md` | Manual extraction |

### Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `CommandDiscovered` | Command extracted from docs | `{commandId, name, category}` |
| `CommandExecuted` | Command run by user/agent | `{commandId, args, result}` |

### External References

- [CLAUDE.md#V3 CLI Commands](/workspaces/agentscope/CLAUDE.md) - 26 commands, 140+ subcommands

---

## Entity: MCPServer

### Identity

- **ID Format**: `mcp:{server-name}` (e.g., `mcp:claude-flow`, `mcp:github`)
- **ID Generation**: Server key from `.mcp.json`
- **Uniqueness Scope**: Project-level

### Metadata

| Field | Type | Required | Description | Source File |
|-------|------|----------|-------------|-------------|
| `name` | `string` | Yes | Server identifier key | `.mcp.json` |
| `command` | `string` | Yes | Executable command | `.mcp.json` |
| `args` | `string[]` | No | Command arguments | `.mcp.json` |
| `env` | `object` | No | Environment variables | `.mcp.json` |

### Properties

| Property | Type | Default | Validation | Example |
|----------|------|---------|------------|---------|
| `id` | `MCPServerId` | Generated | Must start with `mcp:` | `mcp:claude-flow` |
| `name` | `MCPServerName` | Required | Non-empty, valid identifier | `claude-flow` |
| `command` | `string` | Required | Valid executable | `npx` |
| `args` | `string[]` | `[]` | Array of strings | `["@claude-flow/cli", "mcp", "start"]` |
| `env` | `Record<string, string>` | `{}` | Key-value pairs | `{CLAUDE_FLOW_MODE: "v3"}` |
| `tools` | `MCPTool[]` | `[]` | Discovered tools | `[{name: "memory_store", ...}]` |
| `autoStart` | `boolean` | `false` | Auto-start on session | `false` |
| `sourcePath` | `string` | Required | Path to .mcp.json | `.mcp.json` |

### Tool Discovery

| Property | Type | Description |
|----------|------|-------------|
| `tools[].name` | `string` | Tool identifier (e.g., `mcp__claude-flow__memory_store`) |
| `tools[].description` | `string` | Tool description |
| `tools[].inputSchema` | `object` | JSON Schema for tool parameters |

### Relationships

| Related Entity | Cardinality | Description |
|----------------|-------------|-------------|
| `Agent` | Many-to-Many | Agents use MCP tools; MCP serves agents |
| `Skill` | Many-to-Many | Skills may invoke MCP tools |
| `Hook` | One-to-Many | Hooks may call MCP tools |
| `Settings` | Many-to-One | MCP permissions in settings |

### Source Locations

| Location | File Pattern | Parser |
|----------|--------------|--------|
| Project MCP | `.mcp.json` | `MCPParser.parseMcpJson()` |
| User MCP | `~/.mcp.json` | `MCPParser.parseMcpJson()` |

### Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `MCPServerDiscovered` | Server defined in .mcp.json | `{serverId, name, command}` |
| `MCPServerStarted` | Server process started | `{serverId, pid}` |
| `MCPServerStopped` | Server process stopped | `{serverId, reason}` |
| `MCPToolDiscovered` | Tool capability discovered | `{serverId, toolName}` |
| `MCPToolInvoked` | Tool called by agent/skill | `{serverId, toolName, args}` |

### External References

- [.mcp.json](/workspaces/agentscope/.mcp.json) - Example MCP configuration
- MCP Protocol Specification: https://modelcontextprotocol.io/

---

## Entity: Settings

### Identity

- **ID Format**: `settings:{scope}` (e.g., `settings:project`, `settings:user`)
- **ID Generation**: Based on settings file location
- **Uniqueness Scope**: One per scope (project, user)

### Metadata

| Field | Type | Required | Description | Source File |
|-------|------|----------|-------------|-------------|
| `scope` | `'project' \| 'user'` | Yes | Settings scope | Location-derived |
| `version` | `string` | No | Claude Flow version | `.claude/settings.json` |

### Properties

| Property | Type | Default | Validation | Example |
|----------|------|---------|------------|---------|
| `id` | `SettingsId` | Generated | Must start with `settings:` | `settings:project` |
| `scope` | `'project' \| 'user'` | Required | Enum value | `project` |
| `hooks` | `HookConfig` | `{}` | Hooks configuration | See Hook entity |
| `statusLine` | `StatusLineConfig` | `null` | Status line config | `{type: "command", ...}` |
| `permissions` | `PermissionsConfig` | `{}` | Tool permissions | `{allow: [...], deny: [...]}` |
| `claudeFlow` | `ClaudeFlowConfig` | `{}` | Claude Flow settings | Full V3 config |
| `sourcePath` | `string` | Required | Settings file path | `.claude/settings.json` |

### Nested Configurations

#### HookConfig
```typescript
interface HookConfig {
  PreToolUse?: HookMatcher[];
  PostToolUse?: HookMatcher[];
  UserPromptSubmit?: HookMatcher[];
  SessionStart?: HookMatcher[];
  Stop?: HookMatcher[];
  Notification?: HookMatcher[];
}
```

#### StatusLineConfig
```typescript
interface StatusLineConfig {
  type: 'command';
  command: string;
  refreshMs: number;
  enabled: boolean;
}
```

#### PermissionsConfig
```typescript
interface PermissionsConfig {
  allow: string[];  // Glob patterns
  deny: string[];   // Glob patterns
}
```

#### ClaudeFlowConfig
```typescript
interface ClaudeFlowConfig {
  version: string;
  enabled: boolean;
  modelPreferences: { default: string; routing: string };
  swarm: { topology: string; maxAgents: number };
  memory: { backend: string; enableHNSW: boolean };
  neural: { enabled: boolean };
  daemon: DaemonConfig;
  learning: LearningConfig;
  adr: ADRConfig;
  ddd: DDDConfig;
  security: SecurityConfig;
  review: ReviewConfig;
}
```

### Relationships

| Related Entity | Cardinality | Description |
|----------------|-------------|-------------|
| `Hook` | One-to-Many | Settings contain hook definitions |
| `Agent` | One-to-Many | Settings affect agent behavior |
| `MCPServer` | One-to-Many | Settings may reference MCP permissions |

### Source Locations

| Location | File Pattern | Parser |
|----------|--------------|--------|
| Project Settings | `.claude/settings.json` | `ClaudeCodeParser.parseSettingsJson()` |
| User Settings | `~/.claude/settings.json` | `ClaudeCodeParser.parseSettingsJson()` |

### Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `SettingsLoaded` | Settings file parsed | `{settingsId, scope, version}` |
| `SettingsUpdated` | Settings file changed | `{settingsId, changes[]}` |
| `SettingsValidationFailed` | Invalid JSON or schema | `{settingsId, errors[]}` |

### External References

- [.claude/settings.json](/workspaces/agentscope/.claude/settings.json) - Full settings example
- [CLAUDE.md#Project Config](/workspaces/agentscope/CLAUDE.md) - Settings documentation

---

## Entity: ExternalEvent

### Identity

- **ID Format**: `event:{source}:{type}` (e.g., `event:github:push`, `event:precommit:commit`)
- **ID Generation**: Source platform + event type
- **Uniqueness Scope**: Project-level

### Metadata

| Field | Type | Required | Description | Source File |
|-------|------|----------|-------------|-------------|
| `source` | `string` | Yes | Event source system | Various |
| `type` | `string` | Yes | Event type identifier | Various |
| `workflow` | `string` | No | Workflow/hook name | Various |

### Properties

| Property | Type | Default | Validation | Example |
|----------|------|---------|------------|---------|
| `id` | `ExternalEventId` | Generated | Must start with `event:` | `event:github:pull_request` |
| `source` | `EventSource` | Required | Known source type | `github` |
| `type` | `string` | Required | Event type | `pull_request` |
| `trigger` | `string` | `""` | What triggers event | `on: pull_request` |
| `payload` | `object` | `{}` | Expected event payload | GitHub PR payload schema |
| `handlers` | `string[]` | `[]` | What handles this event | `["qa-agent", "code-review"]` |
| `sourcePath` | `string` | Required | Definition location | `.github/workflows/ci.yml` |

### Event Sources

| Source | File Patterns | Event Types |
|--------|---------------|-------------|
| `github` | `.github/workflows/*.yml` | `push`, `pull_request`, `release`, `workflow_dispatch` |
| `precommit` | `.pre-commit-config.yaml` | `commit`, `push` |
| `husky` | `.husky/*` | `pre-commit`, `pre-push`, `commit-msg` |
| `ci` | `Jenkinsfile`, `azure-pipelines.yml`, `.gitlab-ci.yml` | `pipeline`, `build`, `deploy` |

### GitHub Actions Events

| Event | Trigger | Typical Handlers |
|-------|---------|-----------------|
| `push` | Code pushed to branch | CI/CD, linting, tests |
| `pull_request` | PR opened/updated | Code review, tests |
| `pull_request_review` | Review submitted | Auto-merge logic |
| `release` | Release created | Deployment, notifications |
| `workflow_dispatch` | Manual trigger | Ad-hoc workflows |
| `schedule` | Cron schedule | Maintenance tasks |

### Relationships

| Related Entity | Cardinality | Description |
|----------------|-------------|-------------|
| `Agent` | Many-to-Many | Events may trigger agents |
| `Hook` | Many-to-Many | Events may invoke hooks |
| `Command` | One-to-Many | Events may run commands |

### Source Locations

| Location | File Pattern | Parser |
|----------|--------------|--------|
| GitHub Actions | `.github/workflows/*.yml` | `WorkflowParser.parseGitHubActions()` |
| Pre-commit | `.pre-commit-config.yaml` | `WorkflowParser.parsePreCommit()` |
| Husky | `.husky/*` | `WorkflowParser.parseHusky()` |
| Generic CI | `Jenkinsfile`, `*-pipelines.yml` | `WorkflowParser.parseGenericCI()` |

### Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `ExternalEventDiscovered` | Workflow file parsed | `{eventId, source, type}` |
| `ExternalEventTriggered` | Event received from source | `{eventId, payload}` |
| `ExternalEventHandled` | Handler completed | `{eventId, handlerId, result}` |

### External References

- GitHub Actions Documentation: https://docs.github.com/en/actions
- Pre-commit Documentation: https://pre-commit.com/

---

## Value Objects Reference

### Shared Value Objects

These value objects are used across multiple entities:

```typescript
// Source Types
enum SourceType {
  ClaudeProject = 'claude-project',  // .claude/ in project
  ClaudeUser = 'claude-user',        // ~/.claude/
  ClaudeMd = 'claude-md',            // CLAUDE.md file
  MCP = 'mcp'                        // .mcp.json
}

// Error Levels
enum ErrorLevel {
  Fatal = 'fatal',      // Stop processing
  Warning = 'warning',  // Continue with warning
  Info = 'info'         // Informational only
}

// Scan Error
interface ScanError {
  level: ErrorLevel;
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
}

// Trigger (for Skills)
interface Trigger {
  type: 'keyword' | 'pattern' | 'command';
  value: string;
  priority?: number;
}
```

### ID Value Objects

All entity IDs follow this pattern:

```typescript
// Base ID structure
interface EntityId {
  prefix: string;     // e.g., 'agent:', 'skill:'
  value: string;      // Full ID including prefix
  name: string;       // Just the name portion
}

// ID Generation
function generateId(prefix: string, name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${prefix}${sanitized}`;
}
```

---

## Event Catalog (CloudEvents Format)

All domain events follow CloudEvents 1.0 specification:

```typescript
interface CloudEvent<T> {
  specversion: '1.0';
  type: string;              // e.g., 'com.agentscope.scanner.agent-discovered'
  source: string;            // e.g., '/scanner', '/generator'
  id: string;                // UUID
  time: string;              // ISO 8601
  datacontenttype: 'application/json';
  data: T;
}
```

### Event Types by Domain

| Domain | Event Type | Description |
|--------|-----------|-------------|
| Scanner | `com.agentscope.scanner.scan-completed` | Scan session completed |
| Scanner | `com.agentscope.scanner.scan-failed` | Scan session failed |
| Scanner | `com.agentscope.scanner.source-scanned` | Individual source scanned |
| Scanner | `com.agentscope.scanner.agent-discovered` | Agent entity found |
| Scanner | `com.agentscope.scanner.skill-discovered` | Skill entity found |
| Generator | `com.agentscope.generator.generation-completed` | All outputs generated |
| Generator | `com.agentscope.generator.diagram-generated` | Diagram created |
| Generator | `com.agentscope.generator.document-generated` | Document created |
| Model | `com.agentscope.model.validation-completed` | Validation run complete |
| Model | `com.agentscope.model.validation-error` | Validation error detected |

---

## Parser Requirements

### File Detection Order

1. **Project-level** (highest priority)
   - `.claude/settings.json`
   - `.claude/agents/**/*.md`
   - `.claude/skills/**/SKILL.md`
   - `.mcp.json`
   - `CLAUDE.md`

2. **User-level** (fallback)
   - `~/.claude/settings.json`
   - `~/.claude/agents/**/*.md`
   - `~/.claude/skills/**/SKILL.md`
   - `~/.mcp.json`

3. **External sources**
   - `.github/workflows/*.yml`
   - `.pre-commit-config.yaml`
   - `.husky/*`

### Parsing Strategies

| File Type | Parser | Strategy |
|-----------|--------|----------|
| `.md` with frontmatter | `gray-matter` | Extract YAML frontmatter + body |
| `.json` | `JSON.parse()` | Standard JSON parsing |
| `.yaml` / `.yml` | `js-yaml` | YAML parsing |
| `CLAUDE.md` | Custom | Markdown AST + section extraction |

---

## Validation Rules

### Agent Validation

- `name` is required and non-empty
- `description` recommended (warning if missing)
- `skills` references must resolve to existing skills
- `allowedTools` should be valid tool names
- File must have valid YAML frontmatter

### Skill Validation

- `name` is required (max 64 chars)
- `description` is required (max 1024 chars)
- `description` should include "what" and "when"
- `SKILL.md` must be in top-level skill directory
- No nested subdirectories under skill folder

### Hook Validation

- `event` must be valid hook event type
- `command` is required
- `matcher` must be valid regex (if provided)
- `timeout` must be positive integer

### MCPServer Validation

- `command` is required
- `args` must be string array
- `env` values must be strings
- Server should be reachable (warning if not)

### Settings Validation

- Must be valid JSON
- `hooks` structure must match schema
- `permissions` patterns must be valid globs
- Version compatibility check

---

## Migration Notes

### From v2 to v3

| v2 Format | v3 Format | Notes |
|-----------|-----------|-------|
| `allowed_tools` | `allowedTools` | camelCase preferred |
| `pre-bash` hook | `PreToolUse` with Bash matcher | Unified hook system |
| Nested skill dirs | Flat skill dirs | Skills must be top-level |

---

*Document Version: 1.0 | January 2026 | Based on AgentScope PRD v2.0 and DDD-IMPLEMENTATION.md*
