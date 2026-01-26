# AgentScope PRD v2.1

> **Agent Architecture Documentation & Visualization Tool**
> **Version**: 2.1 (Updated with v1.1 Implementation Status)
> **Date**: January 2026

---

## 1. Executive Summary

AgentScope is an open-source CLI tool that automatically scans Claude Code agent configurations and generates Mermaid diagrams plus shareable documentation. It answers the fundamental question every developer has: "What agents, skills, hooks, and MCPs do I have?"

### What Changed from v1.0

| Aspect | v1.0 PRD | v2.0 PRD | Rationale |
|--------|----------|----------|-----------|
| **Timeline** | 20 weeks, 5 phases | 1-2 days MVP with agentic coding | Swarms build features rapidly |
| **Framework Support** | 5 frameworks (Claude Code, BMad, Gemini, Claude-flow, Spec-kit) | Claude Code + MCP only | Covers 90% of users |
| **Diagrams** | 6 diagram types | 2 smart defaults (Component Map, Workflow Sequence) | 80/20 rule |
| **Documentation** | 7 output files | README.md + AGENTS.md | Minimal viable docs |
| **Features** | Compare, Export, Optimize, Watch | Scan, Diagram only | Cut feature creep |
| **Bottleneck** | Development time | Human review time | Agentic coding shifts constraints |

### Core Value Proposition

> "Understand your agent setup in 30 seconds with auto-generated diagrams and shareable documentation."

---

## 2. Problem Statement

### Primary Problems

| Problem | Impact |
|---------|--------|
| **Configuration Sprawl** | Teams can't see all active agents, skills, hooks, MCPs. Steep onboarding. |
| **No Visualization** | Understanding requires reading scattered markdown files |
| **Stale Documentation** | Manual docs become outdated as agents evolve |

### Target User

**Primary**: Individual Developer using Claude Code
- Wants to understand their own agent setup
- Needs to share configuration with teammates
- Values quick, automated documentation

**Secondary** (Post-MVP): Team Lead / Tech Lead
- Wants overview of team's agent configurations
- Needs to compare against company workflows

### User Story (MVP)

> "As a developer using Claude Code, I want to run a single command and get a visual map of my entire agent setup so I can understand and share my configuration."

---

## 3. Solution Overview

### v1.0 Scope (MVP) - COMPLETED

AgentScope v1.0 delivers:

1. **Claude Code Scanner** - Scans `.claude/`, `CLAUDE.md`, and user-level configs
2. **MCP Scanner** - Parses `.mcp.json` for server definitions
3. **Component Map Diagram** - Shows all agents, skills, hooks, commands, MCPs
4. **Workflow Sequence Diagram** - Shows request flow from user to agent to tools
5. **README.md** - Overview with embedded diagrams
6. **AGENTS.md** - Detailed agent documentation with code examples

### v1.1 Features - IMPLEMENTED

| Feature | Status | Description |
|---------|--------|-------------|
| **Settings Scanner** | ✅ Implemented | Unified scanner for `.claude/settings.json` |
| **Hook Parser** | ✅ Implemented | Parse all 9 hook event types |
| **Plugin Parser** | ✅ Implemented | Parse `plugin-id@marketplace-id` format |
| **Permission Parser** | ✅ Implemented | Parse `Tool(argument)` DSL patterns |
| **Export/Import System** | ✅ Implemented | Cross-platform configuration portability |
| **Path Transformer** | ✅ Implemented | Windows ↔ POSIX normalization |
| **Secrets Sanitizer** | ✅ Implemented | Safe placeholder replacement |
| **DREAD Validators** | ✅ Implemented | Security risk scoring |
| **Entity Sanitizers** | ✅ Implemented | Safe output generation |
| **6 Built-in Themes** | ✅ Implemented | Light, dark, high-contrast, colorblind |

### What's NOT Yet Implemented

| Feature | Status | Target Version |
|---------|--------|----------------|
| BMad Method scanner | Deferred | v1.2 |
| Gemini CLI scanner | Deferred | v2.0+ |
| Claude-flow scanner | Deferred | v2.0+ |
| Workflow Comparator | Deferred | v1.3 |
| Plugin system | Deferred | v2.0+ |
| VS Code extension | Deferred | v2.0+ |
| Watch mode | Deferred | v1.2 |
| GitHub Action | Deferred | v1.2 |
| Interactive web viewer | Deferred | v2.0+ |

---

## 4. Core Features

### 4.1 Scanner Module (v1.1 Enhanced)

Discovers configurations from Claude Code sources:

| Source | Paths | Components Extracted |
|--------|-------|---------------------|
| Claude Code Project | `.claude/`, `CLAUDE.md` | Agents, skills, commands |
| Claude Code Settings | `.claude/settings.json` | Hooks, plugins, permissions |
| Claude Code User | `~/.claude/` | Global agents, skills, settings |
| MCP Servers | `.mcp.json` | Server definitions, tool capabilities |

### 4.2 Entity Types (7 Types in v1.1)

| Entity | Description | Parser |
|--------|-------------|--------|
| **Agents** | Agent definitions with tools and delegation | `claude-code.ts` |
| **Skills** | Skill configurations | `claude-code.ts` |
| **MCP Servers** | Server definitions | `mcp.ts` |
| **Hooks** | 9 event types (PreToolUse, PostToolUse, etc.) | `hook-parser.ts` |
| **Commands** | Custom command definitions | `claude-code.ts` |
| **Plugins** | Plugin references with marketplace IDs | `plugin-parser.ts` |
| **Permissions** | Permission rules with Tool(argument) DSL | `permission-parser.ts` |

### 4.3 Hook Event Types (v1.1)

| Hook Event | Description |
|------------|-------------|
| `PreToolUse` | Before tool execution |
| `PostToolUse` | After tool execution |
| `Notification` | System notifications |
| `Stop` | Agent stop events |
| `SubagentStop` | Subagent termination |
| `SessionStart` | Session initialization |
| `SessionEnd` | Session cleanup |
| `PreCompact` | Before context compaction |
| `UserPromptSubmit` | User input submission |

### 4.4 Permission DSL (v1.1)

Supports parsing of Claude Code permission patterns:

```
Tool(argument)         → Bash(npm run:*)
Tool("literal")        → Read("./.env")
Tool                   → Write (all arguments)
```

Permission types: `allow`, `deny`, `ask`

### 4.5 Diagram Generator

**Smart Defaults** (generated automatically):

| Diagram | Purpose | When Useful |
|---------|---------|-------------|
| **Component Map** | Shows all 7 entity types | Always - answers "what do I have?" |
| **Workflow Sequence** | Shows request flow | Always - answers "how does it work?" |

**On-Demand** (via `--diagram` flag):

| Diagram | Purpose | Command |
|---------|---------|---------|
| Agent Hierarchy | Parent/subagent relationships | `--diagram hierarchy` |
| Data Flow | Data movement through system | `--diagram dataflow` |
| Permission Matrix | Agent-to-tool permissions | `--diagram permissions` |
| Hook Lifecycle | Event trigger sequences | `--diagram hooks` |

### 4.6 Export/Import System (v1.1)

**Export Features:**
- Path transformation (Windows ↔ POSIX)
- Secrets sanitization with placeholders
- Metadata preservation
- Format version tracking

**Import Features:**
- Path restoration to target platform
- Secrets prompting for placeholders
- Validation with compatibility checks
- Merge vs overwrite modes

### 4.7 Documentation Generator

Outputs to `docs/agent-architecture/`:

```
docs/agent-architecture/
├── README.md          # Overview with diagrams + TOC
├── AGENTS.md          # Detailed agent docs with code examples
└── raw/
    └── agentscope.json  # Raw unified config (for tooling)
```

---

## 5. Quality Requirements

> **Critical**: Agentic coding produces changes rapidly. Quality gates ensure correctness.

### 5.1 Test Coverage (v1.1 Status)

| Module | Tests | Coverage |
|--------|-------|----------|
| Security Validators | 203 | 95%+ |
| Scanner Modules | 144 | 90%+ |
| Export/Import | 109 | 85%+ |
| Formatters | 25 | 80%+ |
| Integration | 15 | E2E coverage |
| **Total** | **496+** | **85%+ average** |

### 5.2 Automated Quality Checks

| Check | Tool | Threshold | Blocks Merge |
|-------|------|-----------|--------------|
| Type checking | TypeScript strict | 0 errors | Yes |
| Linting | ESLint | 0 errors, 0 warnings | Yes |
| Code coverage | Vitest | 80% lines | Yes |
| Tests passing | Vitest | 100% pass | Yes |
| Mermaid validity | mermaid-cli | 100% valid | Yes |

### 5.3 Review Gates

| Gate | Trigger | Reviewer | Action |
|------|---------|----------|--------|
| Pre-commit | `git commit` | Automated (lint, types) | Block if fails |
| PR created | `git push` | CI (tests, coverage) | Block merge if fails |
| PR review | CI passes | Human | Required approval |
| Pre-merge | Approval received | Automated (final check) | Block if tests fail |

---

## 6. Technical Architecture

### System Components (v1.1)

```
┌─────────────────────────────────────────────────────────────┐
│                      AgentScope CLI                          │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Scanner    │  Visualizer  │  Documenter  │   Security    │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ Claude Code  │   Mermaid    │   Markdown   │  Validators   │
│ Settings     │  Generator   │    Writer    │  Sanitizers   │
│ MCP Parser   │              │              │  DREAD        │
│ Hook Parser  │              │              │               │
│ Plugin Parser│              │              │               │
│ Perm Parser  │              │              │               │
├──────────────┴──────────────┴──────────────┴───────────────┤
│                   Export/Import System                       │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Exporter     │  Importer    │   Path       │   Secrets     │
│              │              │ Transformer  │  Sanitizer    │
├──────────────┴──────────────┴──────────────┴───────────────┤
│                  Unified Config Model                        │
└─────────────────────────────────────────────────────────────┘
```

### Unified Config Model (v1.1)

```typescript
interface AgentScopeConfig {
  meta: {
    name: string;
    version: string;
    scanDate: string;
    projectPath: string;
  };
  agents: Agent[];
  skills: Skill[];
  hooks: Hook[];           // 9 event types
  commands: Command[];
  plugins: Plugin[];       // NEW in v1.1
  permissions: Permissions; // NEW in v1.1
  mcpServers: MCPServer[];
  settings: Settings;
  errors: ScanError[];
}

interface Hook {
  event: HookEvent;        // 9 types
  command: string;
  timeout?: number;
  workingDirectory?: string;
}

interface Plugin {
  id: string;              // plugin-id
  marketplaceId?: string;  // @marketplace-id
  enabled: boolean;
}

interface Permissions {
  allowCount: number;
  denyCount: number;
  askCount: number;
  rules: PermissionRule[];
}

interface PermissionRule {
  type: 'allow' | 'deny' | 'ask';
  tool: string;
  argument?: string;
  isWildcard: boolean;
}
```

---

## 7. Security Considerations (v1.1 Enhanced)

### Security Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Input Validation** | Zod schemas | ✅ Implemented |
| **DREAD Risk Analysis** | Security scoring | ✅ Implemented |
| **Injection Prevention** | Mermaid directive blocking | ✅ Implemented |
| **Command Injection** | execFileSync with argument arrays | ✅ Fixed |
| **ReDoS Prevention** | Input length validation | ✅ Fixed |
| **Path Traversal** | Path validation | ✅ Implemented |
| **Secrets Handling** | Placeholder replacement | ✅ Implemented |

### DREAD Risk Scoring

| Factor | Weight | Description |
|--------|--------|-------------|
| Damage | 0.25 | Potential impact |
| Reproducibility | 0.20 | Ease of exploitation |
| Exploitability | 0.20 | Technical difficulty |
| Affected Users | 0.15 | Scope of impact |
| Discoverability | 0.20 | Visibility of vulnerability |

### Security Principles

- **No code execution**: AgentScope only reads and parses files
- **No network access**: All operations are local
- **Secrets sanitization**: Sensitive values replaced with placeholders
- **Path validation**: Prevents directory traversal attacks
- **Input sanitization**: All parsed content sanitized before output

---

## 8. Future Roadmap

### v1.1 - COMPLETED

- ✅ Full 7-entity documentation
- ✅ Settings scanner for `.claude/settings.json`
- ✅ Hook parser (9 event types)
- ✅ Permission DSL parser
- ✅ Plugin parser with marketplace IDs
- ✅ Export/Import system
- ✅ DREAD security validators
- ✅ 6 built-in themes
- ✅ 496+ unit tests

### v1.2 (Planned)

- [ ] BMad Method scanner
- [ ] Watch mode for real-time updates
- [ ] GitHub Action for CI/CD
- [ ] ADR template generation (MADR format)
- [ ] CONTEXT.md generation (arc42 sections 1-3)

### v1.3 (Planned)

- [ ] Workflow comparator
- [ ] Claude Code skill package
- [ ] llms.txt generation

### v2.0 (Future)

- [ ] Gemini CLI scanner
- [ ] Plugin system for community extensions
- [ ] VS Code extension
- [ ] Interactive web viewer

---

## 9. Success Metrics

| Metric | Target | Current Status |
|--------|--------|----------------|
| **Claude Code scan coverage** | >95% of config files | ✅ Met (7 entity types) |
| **Mermaid validity** | 100% valid diagrams | ✅ Met |
| **Test coverage** | >80% line coverage | ✅ Met (85%+) |
| **Scan performance** | <3s for <50 components | Pending benchmark |
| **npm installs** | 100+ in month 1 | Pending release |
| **GitHub stars** | 50+ in month 1 | Pending release |

---

## 10. CLI Usage (v1.1)

### Installation

```bash
npm install -g @vipasane/agentscope
# or
npx @vipasane/agentscope <command>
```

### Commands

```bash
# Scan and generate docs (smart defaults)
agentscope scan

# Scan with custom output directory
agentscope scan --output ./docs/agents/

# Generate specific diagram only
agentscope scan --diagram hierarchy
agentscope scan --diagram dataflow

# Use a specific theme
agentscope scan --theme dark
agentscope scan --theme colorblind-light

# Export configuration (v1.1)
agentscope export --output ./exported-config.json

# Import configuration (v1.1)
agentscope import ./exported-config.json --target ./new-project/

# Output raw JSON (for tooling)
agentscope scan --format json

# Validate only (no doc generation)
agentscope validate

# Show version
agentscope --version

# Show help
agentscope --help
```

### Example Output (v1.1)

```bash
$ agentscope scan

AgentScope v1.1.0
Scanning: /Users/dev/my-project

Found:
  - 3 agents (2 project, 1 user)
  - 5 skills
  - 4 hooks (PreToolUse, PostToolUse, SessionStart, Stop)
  - 2 commands
  - 3 plugins
  - 12 permission rules (8 allow, 2 deny, 2 ask)
  - 4 MCP servers

Generated:
  ✓ docs/agent-architecture/README.md
  ✓ docs/agent-architecture/AGENTS.md
  ✓ docs/agent-architecture/raw/agentscope.json

Security Analysis:
  ✓ All entities validated (DREAD score: Low risk)
  ✓ No injection patterns detected
  ✓ Permissions follow least-privilege principle

Scan completed in 1.2s
```

---

## 11. Architecture Decision Records

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](adr/ADR-001-unified-config-model.md) | Unified Config Model | Accepted |
| [ADR-002](adr/ADR-002-mermaid-security.md) | Mermaid Security | Accepted |
| [ADR-003](adr/ADR-003-settings-scanner.md) | Settings Scanner Architecture | Accepted |
| [ADR-004](adr/ADR-004-permission-parser.md) | Permission Parser Design | Accepted |
| [ADR-005](adr/ADR-005-plugin-parser.md) | Plugin Parser Design | Accepted |
| [ADR-006](adr/ADR-006-hook-parser.md) | Hook Parser Design | Accepted |
| [ADR-007](adr/ADR-007-export-import.md) | Export/Import System | Accepted |

---

## Appendix: Decision Log

### Product Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target audience | Individual developer | Entry point for adoption |
| Framework priority | Claude Code only | 90% of target users |
| Output format | Mermaid markdown | GitHub-native rendering |
| Diagram philosophy | Smart defaults (2 diagrams) | 80/20 rule |
| Documentation style | README + AGENTS.md with code examples | Minimal viable docs |
| Distribution | npm + npx | Standard Node.js approach |
| Error handling | Categorized (fatal/warning/info) | Best of strict and lenient |
| Export feature | ✅ Implemented in v1.1 | Cross-platform portability |
| Plugin system | Deferred to v2.0+ | Validate core first |

### Standards Alignment Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture framework | C4 Model | De facto standard, perfect agent mapping |
| Diagram standard | Mermaid | GitHub/GitLab native rendering |
| ADR format | MADR | Lightweight, widely adopted |
| AI discovery | llms.txt (v1.3) | 844K+ sites, future-proofs for AI |
| arc42 adoption | Partial (sections 1-5, 9) | Full 12 sections too heavyweight |
| Abstraction level | Architecture layer only | Not business (BPMN) or code (UML class) |

---

*Document Version: 2.1 | January 2026 | Status: v1.1 Implemented*
