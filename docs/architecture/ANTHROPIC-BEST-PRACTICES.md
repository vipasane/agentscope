# Anthropic Claude Code Best Practices Reference

> **Research Date**: January 20, 2026
> **Purpose**: Inform entity scaffolding for AgentScope project
> **Status**: Complete

---

## 1. Executive Summary

This document consolidates Anthropic's official best practices for configuring and extending Claude Code. It covers the complete entity taxonomy (agents, skills, hooks, commands, plugins, MCP servers), their configuration patterns, and metadata fields. This research directly informs the AgentScope entity scaffolding design.

### Key Findings

1. **Skills are the primary extension mechanism** - Anthropic has unified slash commands and skills; the `/` command system now routes to skills
2. **Progressive disclosure** is the core design principle - entities load information only as needed
3. **Hierarchical configuration** - Settings cascade from managed to user to project to local scope
4. **Hooks enable lifecycle automation** - Pre/post tool execution, session events, and permission control
5. **Plugins bundle multiple extension types** - Commands, agents, skills, hooks, and MCP servers in one distributable unit

---

## 2. Entity Taxonomy

Anthropic defines these core entities for Claude Code extension:

| Entity | Description | Configuration Location | Primary File |
|--------|-------------|----------------------|--------------|
| **Skills** | Knowledge/instructions loaded on-demand | `.claude/skills/<name>/` | `SKILL.md` |
| **Agents (Subagents)** | Specialized AI with isolated context | `.claude/agents/` | `<name>.md` |
| **Commands** | Slash commands (legacy, merged into skills) | `.claude/commands/` | `<name>.md` |
| **Hooks** | Lifecycle event handlers | `.claude/settings.json` | (inline) |
| **Plugins** | Bundled extension packages | `<plugin>/.claude-plugin/` | `plugin.json` |
| **MCP Servers** | External tool integrations | `.mcp.json` | (inline) |
| **Settings** | Configuration and permissions | `.claude/settings.json` | (inline) |

---

## 3. Configuration Patterns

### 3.1 Skills (Primary Extension Mechanism)

**Source**: [Agent Skills Documentation](https://code.claude.com/docs/en/skills)

Skills are the recommended way to extend Claude Code. They follow the [Agent Skills](https://agentskills.io) open standard.

#### Directory Structure

```
.claude/skills/<skill-name>/
├── SKILL.md                    # Required: main instructions with YAML frontmatter
├── template.md                 # Optional: template for Claude to fill in
├── examples/
│   └── sample.md              # Optional: example output showing expected format
├── scripts/
│   └── validate.sh            # Optional: script Claude can execute
└── reference.md               # Optional: detailed reference material
```

#### Storage Locations (Priority Order)

| Location | Path | Scope | Priority |
|----------|------|-------|----------|
| Enterprise | Managed settings | All users in organization | 1 (highest) |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All projects | 2 |
| Project | `.claude/skills/<skill-name>/SKILL.md` | This project only | 3 |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Where plugin is enabled | 4 (lowest) |

#### SKILL.md Frontmatter Schema

```yaml
---
# Identity
name: my-skill                    # Optional: Display name (default: directory name)
                                  # Constraints: lowercase, hyphens, max 64 chars
description: What this does       # Recommended: Used by Claude for auto-loading

# Invocation Control
argument-hint: "[issue-number]"   # Optional: Hint for autocomplete
disable-model-invocation: false   # Optional: true = user-only invocation
user-invocable: true              # Optional: false = Claude-only (background knowledge)

# Execution Context
allowed-tools: Read, Grep, Glob   # Optional: Comma-separated tool whitelist
model: claude-opus                # Optional: Specific model to use
context: fork                     # Optional: "fork" = run in isolated subagent
agent: Explore                    # Optional: Subagent type (Explore, Plan, general-purpose)

# Lifecycle
hooks:                            # Optional: Lifecycle hooks (see Hooks section)
  on-skill-invoke: ./scripts/pre-invoke.sh
  on-skill-complete: ./scripts/post-invoke.sh
---

# Skill content (Markdown)
Instructions for Claude when this skill is active...
```

#### String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `!`command`` | Shell command output (executed before send) |

#### Invocation Control Matrix

| Configuration | User Can Invoke | Claude Can Invoke | Use Case |
|--------------|-----------------|-------------------|----------|
| (default) | Yes | Yes | General knowledge |
| `disable-model-invocation: true` | Yes | No | Deployments, commits |
| `user-invocable: false` | No | Yes | Background context |

---

### 3.2 Subagents (Specialized AI Instances)

**Source**: [Custom Subagents Documentation](https://code.claude.com/docs/en/sub-agents)

Subagents are specialized AI assistants with isolated context windows and custom configurations.

#### File Format

Markdown files with YAML frontmatter in `.claude/agents/`:

```yaml
---
name: code-reviewer               # Required: Unique identifier (lowercase, hyphens)
description: Reviews code         # Required: When to delegate to this agent

# Tool Access
tools: Read, Grep, Glob, Bash     # Optional: Allowed tools (inherits all if omitted)
disallowedTools: Write, Edit      # Optional: Denied tools

# Model Selection
model: sonnet                     # Optional: sonnet|opus|haiku|inherit (default: sonnet)

# Permissions
permissionMode: default           # Optional: default|acceptEdits|dontAsk|bypassPermissions|plan

# Dependencies
skills:                           # Optional: Skills to preload into context
  - api-conventions
  - error-handling-patterns

# Lifecycle
hooks:                            # Optional: Subagent-level hooks
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
---

You are a code reviewer...
```

#### Frontmatter Schema

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Unique identifier (lowercase, hyphens) |
| `description` | Yes | string | When Claude should delegate |
| `tools` | No | string | Comma-separated allowed tools |
| `disallowedTools` | No | string | Comma-separated denied tools |
| `model` | No | enum | `sonnet` / `opus` / `haiku` / `inherit` |
| `permissionMode` | No | enum | `default` / `acceptEdits` / `dontAsk` / `bypassPermissions` / `plan` |
| `skills` | No | array | Skills to preload |
| `hooks` | No | object | Lifecycle hooks |

#### Storage Locations

| Location | Scope | Priority |
|----------|-------|----------|
| `--agents` CLI flag | Current session | 1 (highest) |
| `.claude/agents/` | Current project | 2 |
| `~/.claude/agents/` | All projects | 3 |
| Plugin's `agents/` directory | Where plugin enabled | 4 (lowest) |

#### Built-in Subagents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| `Explore` | Haiku | Read-only | Fast codebase searching |
| `Plan` | Inherited | Read-only | Research during plan mode |
| `general-purpose` | Inherited | All | Complex multi-step tasks |
| `Bash` | Inherited | Bash | Running terminal commands |

---

### 3.3 Hooks (Lifecycle Event Handlers)

**Source**: [Hooks Documentation](https://code.claude.com/docs/en/hooks)

Hooks are automated scripts that execute at specific points in the workflow.

#### Configuration Location

Hooks are configured in settings files (`.claude/settings.json`):

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

#### Hook Event Types

| Event | Trigger | Use Case |
|-------|---------|----------|
| `PreToolUse` | Before tool execution | Approval/denial, validation |
| `PostToolUse` | After successful tool completion | Logging, cleanup |
| `PermissionRequest` | When permission dialogs appear | Custom permission handling |
| `Notification` | When Claude sends notifications | Custom notification routing |
| `UserPromptSubmit` | When user submits prompt | Preprocessing |
| `Stop` | When main agent finishes | Final validation |
| `SubagentStop` | When subagent finishes | Subagent result handling |
| `SessionStart` | At session startup | Environment setup |
| `SessionEnd` | When session ends | Cleanup |
| `PreCompact` | Before compact operation | State preservation |

#### Hook Input Schema

```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "string",
  "tool_name": "string",
  "tool_input": { }
}
```

#### Exit Code Behavior

| Exit Code | Behavior |
|-----------|----------|
| `0` | Success; stdout shown in verbose mode |
| `2` | Blocking error; stderr shown as error |
| Other | Non-blocking error; stderr in verbose mode |

#### JSON Output Schema (Exit Code 0)

```json
{
  "continue": true,
  "stopReason": "string",
  "suppressOutput": true,
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "string",
    "updatedInput": {},
    "additionalContext": "string"
  }
}
```

#### Hook Types

| Type | Description |
|------|-------------|
| `command` | Shell command execution |
| `prompt` | LLM-based evaluation (for Stop/SubagentStop) |

---

### 3.4 Settings Configuration

**Source**: [Settings Documentation](https://code.claude.com/docs/en/settings)

#### Configuration Hierarchy (Highest to Lowest Priority)

1. **Managed** - `/Library/Application Support/ClaudeCode/managed-settings.json` (macOS)
2. **CLI arguments** - Session overrides
3. **Local** - `.claude/settings.local.json` (personal, not committed)
4. **Project** - `.claude/settings.json` (team-shared, committed)
5. **User** - `~/.claude/settings.json` (personal global)

#### Settings Schema

```json
{
  // Permissions
  "permissions": {
    "allow": ["Bash(npm run:*)", "Read(./src/**)"],
    "deny": ["Read(./.env)", "Bash(rm -rf:*)"],
    "ask": ["Bash(git push:*)"],
    "additionalDirectories": ["../shared-lib/"]
  },

  // Environment
  "env": {
    "NODE_ENV": "development",
    "DEBUG": "true"
  },

  // Attribution
  "attribution": {
    "commit": "Generated with AI\n\nCo-Authored-By: Claude <claude@example.com>",
    "pr": ""
  },

  // Sandbox
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker", "git"],
    "allowUnsandboxedCommands": false,
    "network": {
      "allowUnixSockets": ["~/.ssh/agent-socket"],
      "allowLocalBinding": true,
      "httpProxyPort": 8080,
      "socksProxyPort": 8081
    }
  },

  // Hooks
  "hooks": {
    "PreToolUse": { },
    "PostToolUse": { }
  },

  // Plugins
  "enabledPlugins": {
    "formatter@acme-tools": true,
    "deployer@acme-tools": false
  },

  // Model & Behavior
  "model": "claude-sonnet-4-5-20250929",
  "respectGitignore": true,
  "outputStyle": "Explanatory",
  "language": "english",
  "cleanupPeriodDays": 30,
  "alwaysThinkingEnabled": true,
  "spinnerTipsEnabled": true,
  "terminalProgressBarEnabled": true
}
```

#### Permission Rule Syntax

| Pattern | Matches |
|---------|---------|
| `Bash` | All bash commands |
| `Bash(npm run build)` | Exact command |
| `Bash(npm run:*)` | Prefix match (word boundary) |
| `Bash(ls*)` | Glob match (no word boundary) |
| `Read(./.env)` | Specific file |
| `WebFetch(domain:example.com)` | Domain-specific |

---

### 3.5 Plugins (Bundled Extensions)

**Source**: [Plugins Documentation](https://github.com/anthropics/claude-code/blob/main/plugins/README.md)

Plugins bundle multiple extension types into distributable packages.

#### Directory Structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json           # Plugin metadata (required)
├── commands/                 # Slash commands
├── agents/                   # Specialized agents
├── skills/                   # Agent skills
├── hooks/                    # Event handlers
├── .mcp.json                 # MCP server configuration
└── README.md                 # Documentation
```

#### plugin.json Schema

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Author Name",
  "repository": "https://github.com/user/repo",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "dependencies": {
    "other-plugin": "^1.0.0"
  },
  "configuration": {
    "apiKey": {
      "type": "string",
      "description": "API key for service",
      "required": true
    }
  }
}
```

---

### 3.6 MCP Server Configuration

**Source**: [MCP Documentation](https://code.claude.com/docs/en/mcp)

MCP (Model Context Protocol) connects Claude to external tools and data sources.

#### .mcp.json Schema

```json
{
  "mcpServers": {
    "server-name": {
      "type": "http|stdio|sse",
      "url": "https://...",           // For HTTP servers
      "command": "/path/to/bin",       // For stdio servers
      "args": ["arg1", "arg2"],
      "env": {
        "KEY": "value",
        "API_KEY": "${API_KEY:-default}"
      },
      "headers": {
        "Authorization": "Bearer ${TOKEN}"
      }
    }
  }
}
```

#### Transport Types

| Type | Use Case | Example |
|------|----------|---------|
| `http` | Remote servers (recommended) | `claude mcp add --transport http notion https://mcp.notion.com/mcp` |
| `stdio` | Local processes | `claude mcp add --transport stdio airtable -- npx -y airtable-mcp-server` |
| `sse` | Server-Sent Events (deprecated) | `claude mcp add --transport sse asana https://mcp.asana.com/sse` |

#### Scope Options

| Scope | Storage | Use Case |
|-------|---------|----------|
| `local` | `~/.claude.json` | Personal, sensitive credentials |
| `project` | `.mcp.json` | Team-shared, version controlled |
| `user` | `~/.claude.json` | Personal utilities across projects |

#### Environment Variable Expansion

```json
{
  "mcpServers": {
    "api": {
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "env": {
        "DB_URL": "${DATABASE_URL}",
        "KEY": "${API_KEY:-default-key}"
      }
    }
  }
}
```

---

### 3.7 Commands (Legacy, Merged into Skills)

**Source**: [Slash Commands Documentation](https://platform.claude.com/docs/en/agent-sdk/slash-commands)

Commands are now merged into skills. Legacy `.claude/commands/` files continue to work.

#### Directory Structure

```
.claude/commands/
├── refactor.md        # Creates /refactor
├── security-check.md  # Creates /security-check
└── frontend/
    └── component.md   # Creates /component (project:frontend namespace)
```

#### Command File Format

```yaml
---
allowed-tools: Bash(git add:*), Bash(git status:*)
argument-hint: [message]
description: Create a git commit
model: claude-3-5-haiku-20241022
---

Create a commit with message: $ARGUMENTS

## Context
- Current status: !`git status`
- Current diff: !`git diff HEAD`
```

#### Frontmatter Fields

| Field | Description |
|-------|-------------|
| `allowed-tools` | Tools the command can use |
| `argument-hint` | Autocomplete hint |
| `description` | What the command does |
| `model` | Specific model to use |

---

## 4. Extension Patterns

### 4.1 Progressive Disclosure

The core design principle: load information only as needed.

- **Descriptions** are always loaded (for auto-invocation decisions)
- **Full skill content** loads only on invocation
- **Supporting files** load on-demand via references
- **Keep SKILL.md under 500 lines**; move details to separate files

### 4.2 Isolation Patterns

| Pattern | Implementation | Use Case |
|---------|----------------|----------|
| Context Fork | `context: fork` in skill | Deep research, exploration |
| Tool Restriction | `allowed-tools: Read, Grep` | Read-only operations |
| Permission Mode | `permissionMode: dontAsk` | Non-interactive execution |
| Model Selection | `model: haiku` | Cost optimization |

### 4.3 Validation Patterns

```yaml
# Pre-execution validation hook
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
```

### 4.4 Dynamic Context Injection

```markdown
## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
```

---

## 5. Entity Discovery Summary

### Complete Entity Catalog

| Entity Type | Config File | Frontmatter | Directory Pattern |
|------------|-------------|-------------|-------------------|
| Skill | `SKILL.md` | Yes | `.claude/skills/<name>/` |
| Subagent | `<name>.md` | Yes | `.claude/agents/` |
| Command | `<name>.md` | Yes | `.claude/commands/` |
| Hook | settings.json | N/A | `.claude/settings.json` |
| Plugin | `plugin.json` | N/A | `<plugin>/.claude-plugin/` |
| MCP Server | `.mcp.json` | N/A | Project root |
| Settings | `settings.json` | N/A | `.claude/settings.json` |

### Metadata Fields by Entity

#### Skills
- `name`, `description`, `argument-hint`
- `disable-model-invocation`, `user-invocable`
- `allowed-tools`, `model`, `context`, `agent`, `hooks`

#### Subagents
- `name`, `description`
- `tools`, `disallowedTools`, `model`, `permissionMode`
- `skills`, `hooks`

#### Commands (Legacy)
- `allowed-tools`, `argument-hint`, `description`, `model`

#### Hooks
- `matcher`, `type`, `command`, `timeout`, `prompt`

#### Plugins
- `name`, `version`, `description`, `author`
- `repository`, `license`, `keywords`
- `dependencies`, `configuration`

#### MCP Servers
- `type`, `url`, `command`, `args`, `env`, `headers`

---

## 6. References

### Official Documentation
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices) - Anthropic Engineering
- [Agent Skills Documentation](https://code.claude.com/docs/en/skills) - Claude Code Docs
- [Custom Subagents](https://code.claude.com/docs/en/sub-agents) - Claude Code Docs
- [Hooks Reference](https://code.claude.com/docs/en/hooks) - Claude Code Docs
- [Settings Configuration](https://code.claude.com/docs/en/settings) - Claude Code Docs
- [MCP Configuration](https://code.claude.com/docs/en/mcp) - Claude Code Docs
- [Slash Commands in SDK](https://platform.claude.com/docs/en/agent-sdk/slash-commands) - Claude Agent SDK

### Repositories
- [Anthropic Skills Repository](https://github.com/anthropics/skills) - Official skill examples
- [Claude Code Plugins](https://github.com/anthropics/claude-code/blob/main/plugins/README.md) - Plugin documentation

### Standards
- [Agent Skills Standard](https://agentskills.io) - Open standard for agent skills
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification

### Community Resources
- [HumanLayer: Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [ClaudeLog Configuration Guide](https://claudelog.com/configuration/)

---

## 7. Recommendations for AgentScope

Based on this research, AgentScope entity scaffolding should:

1. **Adopt the Skills/Subagent paradigm** - These are Anthropic's recommended extension mechanisms
2. **Use YAML frontmatter** - Consistent with Anthropic's pattern for metadata
3. **Implement progressive disclosure** - Load descriptions for discovery, full content on use
4. **Support hooks integration** - Pre/post execution validation and customization
5. **Follow directory conventions** - `.claude/skills/`, `.claude/agents/`, etc.
6. **Include plugin bundling** - Allow packaging skills, agents, hooks together
7. **Support environment variable expansion** - For secrets and environment-specific config
8. **Implement scope hierarchy** - User, project, local precedence

### Entity Schema Priorities

1. **High Priority** (core extension model):
   - Skills (SKILL.md with frontmatter)
   - Subagents (agent .md files)
   - Hooks (settings.json integration)

2. **Medium Priority** (distribution & integration):
   - Plugins (bundling mechanism)
   - MCP Servers (tool integration)
   - Settings (permissions, environment)

3. **Lower Priority** (legacy support):
   - Commands (merged into skills)
