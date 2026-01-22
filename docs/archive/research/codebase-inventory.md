# AgentScope Codebase Inventory

> Complete inventory of Claude Code configuration patterns, agents, skills, hooks, commands, and MCP servers.
> This document serves as the E2E test case for AgentScope scanner implementation.

**Generated**: 2026-01-20
**Project Path**: `/workspaces/agentscope`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Configuration Files](#configuration-files)
3. [Agents Inventory](#agents-inventory)
4. [Skills Inventory](#skills-inventory)
5. [Commands Inventory](#commands-inventory)
6. [Hooks Configuration](#hooks-configuration)
7. [MCP Servers](#mcp-servers)
8. [File Patterns & Structures](#file-patterns--structures)
9. [Scanner Detection Requirements](#scanner-detection-requirements)

---

## Executive Summary

### Component Counts

| Component Type | Count | Location |
|---------------|-------|----------|
| Agents | 97 | `.claude/agents/` |
| Skills | 32 | `.claude/skills/` |
| Commands | 90 | `.claude/commands/` |
| MCP Servers | 1 | `.mcp.json` |
| Hooks (Claude Settings) | 6 types | `.claude/settings.json` |
| Configuration Files | 4 | Various |

### Key Directories

```
/workspaces/agentscope/
├── .claude/
│   ├── agents/         # 97 agent definitions (markdown with YAML frontmatter)
│   ├── skills/         # 32 skill packages (SKILL.md files)
│   ├── commands/       # 90 command definitions (markdown files)
│   ├── settings.json   # Claude Code hooks configuration
│   └── helpers/        # Helper scripts
├── .claude-flow/
│   ├── config.yaml     # Runtime configuration
│   ├── CAPABILITIES.md # Full capabilities reference
│   ├── memory/         # Memory store (JSON)
│   └── daemon-state.json
├── .mcp.json           # MCP server definitions
├── CLAUDE.md           # Main Claude Code instructions
└── docs/               # Documentation
```

---

## Configuration Files

### 1. CLAUDE.md (Root Project Instructions)

**Path**: `/workspaces/agentscope/CLAUDE.md`
**Type**: Markdown with embedded YAML/code blocks
**Size**: ~780 lines, ~30KB

**Key Sections Detected**:
- Automatic Swarm Orchestration
- 3-Tier Model Routing (ADR-026)
- Auto-Learning Protocol
- V3 CLI Commands Reference
- Available Agents (60+ types)
- Hooks System (27 hooks + 12 workers)
- Memory Commands Reference
- Atomic Workflow Rules

**Scanner Must Extract**:
- Agent type lists
- CLI command references
- Hook definitions
- Model routing configuration
- Topology configurations

---

### 2. .claude/settings.json (Hooks Configuration)

**Path**: `/workspaces/agentscope/.claude/settings.json`
**Type**: JSON
**Size**: ~270 lines

**Structure**:
```json
{
  "hooks": {
    "PreToolUse": [...],      // File/command pre-execution hooks
    "PostToolUse": [...],     // File/command post-execution hooks
    "UserPromptSubmit": [...], // Prompt routing hooks
    "SessionStart": [...],    // Session initialization
    "Stop": [...],            // Session termination
    "Notification": [...]     // Notification handling
  },
  "statusLine": {...},        // Dynamic status line config
  "permissions": {...},       // Tool permissions
  "claudeFlow": {...}         // V3 configuration
}
```

**Hook Types Detected**:
| Hook Type | Tool Matcher | Action |
|-----------|--------------|--------|
| PreToolUse | `^(Write\|Edit\|MultiEdit)$` | `hooks pre-edit --file` |
| PreToolUse | `^Bash$` | `hooks pre-command --command` |
| PreToolUse | `^Task$` | `hooks pre-task --description` |
| PostToolUse | `^(Write\|Edit\|MultiEdit)$` | `hooks post-edit --file` |
| PostToolUse | `^Bash$` | `hooks post-command --command` |
| PostToolUse | `^Task$` | `hooks post-task --task-id` |
| UserPromptSubmit | (all) | `hooks route --task` |
| SessionStart | (all) | `daemon start`, `session-restore` |
| Stop | (all) | Echo acknowledgment |
| Notification | (all) | `memory store --namespace notifications` |

**Claude Flow Configuration**:
```json
{
  "version": "3.0.0",
  "enabled": true,
  "swarm": {
    "topology": "hierarchical-mesh",
    "maxAgents": 15
  },
  "memory": {
    "backend": "hybrid",
    "enableHNSW": true
  },
  "daemon": {
    "autoStart": true,
    "workers": ["map", "audit", "optimize", "consolidate", "testgaps", "ultralearn", "deepdive", "document", "refactor", "benchmark"]
  }
}
```

---

### 3. .mcp.json (MCP Server Configuration)

**Path**: `/workspaces/agentscope/.mcp.json`
**Type**: JSON

**Structure**:
```json
{
  "mcpServers": {
    "claude-flow": {
      "command": "npx",
      "args": ["@claude-flow/cli@latest", "mcp", "start"],
      "env": {
        "CLAUDE_FLOW_MODE": "v3",
        "CLAUDE_FLOW_HOOKS_ENABLED": "true",
        "CLAUDE_FLOW_TOPOLOGY": "hierarchical-mesh",
        "CLAUDE_FLOW_MAX_AGENTS": "15",
        "CLAUDE_FLOW_MEMORY_BACKEND": "hybrid"
      },
      "autoStart": false
    }
  }
}
```

---

### 4. .claude-flow/config.yaml (Runtime Configuration)

**Path**: `/workspaces/agentscope/.claude-flow/config.yaml`
**Type**: YAML

**Structure**:
```yaml
version: "3.0.0"

swarm:
  topology: hierarchical-mesh
  maxAgents: 15
  autoScale: true
  coordinationStrategy: consensus

memory:
  backend: hybrid
  enableHNSW: true
  persistPath: .claude-flow/data
  cacheSize: 100

neural:
  enabled: true
  modelPath: .claude-flow/neural

hooks:
  enabled: true
  autoExecute: true

mcp:
  autoStart: false
  port: 3000
```

---

## Agents Inventory

### Agent File Format

**Pattern**: `*.md` files with YAML frontmatter
**Location**: `.claude/agents/<category>/<agent-name>.md`

**YAML Frontmatter Structure**:
```yaml
---
name: agent-name              # Required: Agent identifier
type: category                # Required: Agent type/category
color: "#HEXCODE"            # Optional: UI color
description: "Description"    # Required: What the agent does
capabilities:                 # Required: List of capabilities
  - capability_1
  - capability_2
priority: high|medium|low|critical  # Optional: Priority level
hooks:                        # Optional: Pre/post execution hooks
  pre: |
    # Shell script to run before
  post: |
    # Shell script to run after
---

# Agent Title

[Markdown content with instructions]
```

### Agents by Category

#### Core Agents (5)
| Agent | Type | File |
|-------|------|------|
| coder | developer | `.claude/agents/core/coder.md` |
| planner | planner | `.claude/agents/core/planner.md` |
| researcher | analyst | `.claude/agents/core/researcher.md` |
| reviewer | reviewer | `.claude/agents/core/reviewer.md` |
| tester | tester | `.claude/agents/core/tester.md` |

#### Analysis Agents (3)
| Agent | File |
|-------|------|
| analyze-code-quality | `.claude/agents/analysis/analyze-code-quality.md` |
| code-analyzer | `.claude/agents/analysis/code-analyzer.md` |
| analyze-code-quality (duplicate) | `.claude/agents/analysis/code-review/analyze-code-quality.md` |

#### Architecture Agents (2)
| Agent | File |
|-------|------|
| arch-system-design | `.claude/agents/architecture/arch-system-design.md` |
| arch-system-design (duplicate) | `.claude/agents/architecture/system-design/arch-system-design.md` |

#### Consensus Agents (7)
| Agent | Type | File |
|-------|------|------|
| byzantine-coordinator | consensus | `.claude/agents/consensus/byzantine-coordinator.md` |
| crdt-synchronizer | consensus | `.claude/agents/consensus/crdt-synchronizer.md` |
| gossip-coordinator | consensus | `.claude/agents/consensus/gossip-coordinator.md` |
| performance-benchmarker | consensus | `.claude/agents/consensus/performance-benchmarker.md` |
| quorum-manager | consensus | `.claude/agents/consensus/quorum-manager.md` |
| raft-manager | consensus | `.claude/agents/consensus/raft-manager.md` |
| security-manager | consensus | `.claude/agents/consensus/security-manager.md` |

#### Data/ML Agents (2)
| Agent | File |
|-------|------|
| data-ml-model | `.claude/agents/data/data-ml-model.md` |
| data-ml-model (duplicate) | `.claude/agents/data/ml/data-ml-model.md` |

#### Development Agents (2)
| Agent | File |
|-------|------|
| dev-backend-api | `.claude/agents/development/dev-backend-api.md` |
| dev-backend-api (duplicate) | `.claude/agents/development/backend/dev-backend-api.md` |

#### DevOps Agents (2)
| Agent | File |
|-------|------|
| ops-cicd-github | `.claude/agents/devops/ops-cicd-github.md` |
| ops-cicd-github (duplicate) | `.claude/agents/devops/ci-cd/ops-cicd-github.md` |

#### Documentation Agents (2)
| Agent | File |
|-------|------|
| docs-api-openapi | `.claude/agents/documentation/docs-api-openapi.md` |
| docs-api-openapi (duplicate) | `.claude/agents/documentation/api-docs/docs-api-openapi.md` |

#### Flow-Nexus Agents (9)
| Agent | File |
|-------|------|
| app-store | `.claude/agents/flow-nexus/app-store.md` |
| authentication | `.claude/agents/flow-nexus/authentication.md` |
| challenges | `.claude/agents/flow-nexus/challenges.md` |
| neural-network | `.claude/agents/flow-nexus/neural-network.md` |
| payments | `.claude/agents/flow-nexus/payments.md` |
| sandbox | `.claude/agents/flow-nexus/sandbox.md` |
| swarm | `.claude/agents/flow-nexus/swarm.md` |
| user-tools | `.claude/agents/flow-nexus/user-tools.md` |
| workflow | `.claude/agents/flow-nexus/workflow.md` |

#### GitHub Agents (13)
| Agent | File |
|-------|------|
| code-review-swarm | `.claude/agents/github/code-review-swarm.md` |
| github-modes | `.claude/agents/github/github-modes.md` |
| issue-tracker | `.claude/agents/github/issue-tracker.md` |
| multi-repo-swarm | `.claude/agents/github/multi-repo-swarm.md` |
| pr-manager | `.claude/agents/github/pr-manager.md` |
| project-board-sync | `.claude/agents/github/project-board-sync.md` |
| release-manager | `.claude/agents/github/release-manager.md` |
| release-swarm | `.claude/agents/github/release-swarm.md` |
| repo-architect | `.claude/agents/github/repo-architect.md` |
| swarm-issue | `.claude/agents/github/swarm-issue.md` |
| swarm-pr | `.claude/agents/github/swarm-pr.md` |
| sync-coordinator | `.claude/agents/github/sync-coordinator.md` |
| workflow-automation | `.claude/agents/github/workflow-automation.md` |

#### Goal Agents (2)
| Agent | File |
|-------|------|
| agent | `.claude/agents/goal/agent.md` |
| goal-planner | `.claude/agents/goal/goal-planner.md` |

#### Optimization Agents (5)
| Agent | File |
|-------|------|
| benchmark-suite | `.claude/agents/optimization/benchmark-suite.md` |
| load-balancer | `.claude/agents/optimization/load-balancer.md` |
| performance-monitor | `.claude/agents/optimization/performance-monitor.md` |
| resource-allocator | `.claude/agents/optimization/resource-allocator.md` |
| topology-optimizer | `.claude/agents/optimization/topology-optimizer.md` |

#### Payments Agents (1)
| Agent | File |
|-------|------|
| agentic-payments | `.claude/agents/payments/agentic-payments.md` |

#### SONA Agents (1)
| Agent | File |
|-------|------|
| sona-learning-optimizer | `.claude/agents/sona/sona-learning-optimizer.md` |

#### SPARC Agents (4)
| Agent | File |
|-------|------|
| architecture | `.claude/agents/sparc/architecture.md` |
| pseudocode | `.claude/agents/sparc/pseudocode.md` |
| refinement | `.claude/agents/sparc/refinement.md` |
| specification | `.claude/agents/sparc/specification.md` |

#### Specialized Agents (2)
| Agent | File |
|-------|------|
| spec-mobile-react-native | `.claude/agents/specialized/spec-mobile-react-native.md` |
| spec-mobile-react-native (duplicate) | `.claude/agents/specialized/mobile/spec-mobile-react-native.md` |

#### Sublinear Agents (5)
| Agent | File |
|-------|------|
| consensus-coordinator | `.claude/agents/sublinear/consensus-coordinator.md` |
| matrix-optimizer | `.claude/agents/sublinear/matrix-optimizer.md` |
| pagerank-analyzer | `.claude/agents/sublinear/pagerank-analyzer.md` |
| performance-optimizer | `.claude/agents/sublinear/performance-optimizer.md` |
| trading-predictor | `.claude/agents/sublinear/trading-predictor.md` |

#### Swarm Agents (3)
| Agent | File |
|-------|------|
| adaptive-coordinator | `.claude/agents/swarm/adaptive-coordinator.md` |
| hierarchical-coordinator | `.claude/agents/swarm/hierarchical-coordinator.md` |
| mesh-coordinator | `.claude/agents/swarm/mesh-coordinator.md` |

#### Template Agents (9)
| Agent | File |
|-------|------|
| automation-smart-agent | `.claude/agents/templates/automation-smart-agent.md` |
| base-template-generator | `.claude/agents/templates/base-template-generator.md` |
| coordinator-swarm-init | `.claude/agents/templates/coordinator-swarm-init.md` |
| github-pr-manager | `.claude/agents/templates/github-pr-manager.md` |
| implementer-sparc-coder | `.claude/agents/templates/implementer-sparc-coder.md` |
| memory-coordinator | `.claude/agents/templates/memory-coordinator.md` |
| orchestrator-task | `.claude/agents/templates/orchestrator-task.md` |
| performance-analyzer | `.claude/agents/templates/performance-analyzer.md` |
| sparc-coordinator | `.claude/agents/templates/sparc-coordinator.md` |

#### Testing Agents (2)
| Agent | File |
|-------|------|
| production-validator | `.claude/agents/testing/production-validator.md` |
| tdd-london-swarm | `.claude/agents/testing/tdd-london-swarm.md` |

#### V3 Specialized Agents (16)
| Agent | Type | File |
|-------|------|------|
| adr-architect | v3 | `.claude/agents/v3/adr-architect.md` |
| aidefence-guardian | security | `.claude/agents/v3/aidefence-guardian.md` |
| claims-authorizer | security | `.claude/agents/v3/claims-authorizer.md` |
| collective-intelligence-coordinator | swarm | `.claude/agents/v3/collective-intelligence-coordinator.md` |
| ddd-domain-expert | architecture | `.claude/agents/v3/ddd-domain-expert.md` |
| injection-analyst | security | `.claude/agents/v3/injection-analyst.md` |
| memory-specialist | memory | `.claude/agents/v3/memory-specialist.md` |
| performance-engineer | performance | `.claude/agents/v3/performance-engineer.md` |
| pii-detector | security | `.claude/agents/v3/pii-detector.md` |
| reasoningbank-learner | learning | `.claude/agents/v3/reasoningbank-learner.md` |
| security-architect-aidefence | security | `.claude/agents/v3/security-architect-aidefence.md` |
| security-architect | security | `.claude/agents/v3/security-architect.md` |
| security-auditor | security | `.claude/agents/v3/security-auditor.md` |
| sparc-orchestrator | orchestration | `.claude/agents/v3/sparc-orchestrator.md` |
| swarm-memory-manager | memory | `.claude/agents/v3/swarm-memory-manager.md` |
| v3-integration-architect | integration | `.claude/agents/v3/v3-integration-architect.md` |

#### Custom Agents (1)
| Agent | File |
|-------|------|
| test-long-runner | `.claude/agents/custom/test-long-runner.md` |

---

## Skills Inventory

### Skill File Format

**Pattern**: `SKILL.md` files with YAML frontmatter
**Location**: `.claude/skills/<skill-name>/SKILL.md`

**YAML Frontmatter Structure**:
```yaml
---
name: "Skill Name"           # Required: Max 64 chars
description: "What it does"  # Required: Max 1024 chars
version: "1.0.0"            # Optional: Version number
category: category-name      # Optional: Category
tags:                        # Optional: Tags list
  - tag1
  - tag2
author: Author Name          # Optional: Author
---

# Skill Title

[Markdown content with instructions]
```

### Skills List (32 Skills)

| # | Skill Name | Path |
|---|------------|------|
| 1 | agentdb-advanced | `.claude/skills/agentdb-advanced/SKILL.md` |
| 2 | agentdb-learning | `.claude/skills/agentdb-learning/SKILL.md` |
| 3 | agentdb-memory-patterns | `.claude/skills/agentdb-memory-patterns/SKILL.md` |
| 4 | agentdb-optimization | `.claude/skills/agentdb-optimization/SKILL.md` |
| 5 | agentdb-vector-search | `.claude/skills/agentdb-vector-search/SKILL.md` |
| 6 | github-code-review | `.claude/skills/github-code-review/SKILL.md` |
| 7 | github-multi-repo | `.claude/skills/github-multi-repo/SKILL.md` |
| 8 | github-project-management | `.claude/skills/github-project-management/SKILL.md` |
| 9 | github-release-management | `.claude/skills/github-release-management/SKILL.md` |
| 10 | github-workflow-automation | `.claude/skills/github-workflow-automation/SKILL.md` |
| 11 | hooks-automation | `.claude/skills/hooks-automation/SKILL.md` |
| 12 | pair-programming | `.claude/skills/pair-programming/SKILL.md` |
| 13 | reasoningbank-agentdb | `.claude/skills/reasoningbank-agentdb/SKILL.md` |
| 14 | reasoningbank-intelligence | `.claude/skills/reasoningbank-intelligence/SKILL.md` |
| 15 | skill-builder | `.claude/skills/skill-builder/SKILL.md` |
| 16 | sparc-methodology | `.claude/skills/sparc-methodology/SKILL.md` |
| 17 | stream-chain | `.claude/skills/stream-chain/SKILL.md` |
| 18 | swarm-advanced | `.claude/skills/swarm-advanced/SKILL.md` |
| 19 | swarm-orchestration | `.claude/skills/swarm-orchestration/SKILL.md` |
| 20 | v3-cli-modernization | `.claude/skills/v3-cli-modernization/SKILL.md` |
| 21 | v3-core-implementation | `.claude/skills/v3-core-implementation/SKILL.md` |
| 22 | v3-ddd-architecture | `.claude/skills/v3-ddd-architecture/SKILL.md` |
| 23 | v3-integration-deep | `.claude/skills/v3-integration-deep/SKILL.md` |
| 24 | v3-mcp-optimization | `.claude/skills/v3-mcp-optimization/SKILL.md` |
| 25 | v3-memory-unification | `.claude/skills/v3-memory-unification/SKILL.md` |
| 26 | v3-performance-optimization | `.claude/skills/v3-performance-optimization/SKILL.md` |
| 27 | v3-security-overhaul | `.claude/skills/v3-security-overhaul/SKILL.md` |
| 28 | v3-swarm-coordination | `.claude/skills/v3-swarm-coordination/SKILL.md` |
| 29 | verification-quality | `.claude/skills/verification-quality/SKILL.md` |
| 30 | claude-flow-swarm | (built-in) |
| 31 | claude-flow-memory | (built-in) |
| 32 | claude-flow-help | (built-in) |

---

## Commands Inventory

### Command File Format

**Pattern**: `*.md` files with YAML frontmatter
**Location**: `.claude/commands/<category>/<command-name>.md`

**YAML Frontmatter Structure**:
```yaml
---
name: command-name
description: "Brief description"
---

# Command Title

[Markdown content]
```

### Commands by Category

#### Analysis Commands (7)
| Command | File |
|---------|------|
| COMMAND_COMPLIANCE_REPORT | `.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md` |
| README | `.claude/commands/analysis/README.md` |
| bottleneck-detect | `.claude/commands/analysis/bottleneck-detect.md` |
| performance-bottlenecks | `.claude/commands/analysis/performance-bottlenecks.md` |
| performance-report | `.claude/commands/analysis/performance-report.md` |
| token-efficiency | `.claude/commands/analysis/token-efficiency.md` |
| token-usage | `.claude/commands/analysis/token-usage.md` |

#### Automation Commands (7)
| Command | File |
|---------|------|
| README | `.claude/commands/automation/README.md` |
| auto-agent | `.claude/commands/automation/auto-agent.md` |
| self-healing | `.claude/commands/automation/self-healing.md` |
| session-memory | `.claude/commands/automation/session-memory.md` |
| smart-agents | `.claude/commands/automation/smart-agents.md` |
| smart-spawn | `.claude/commands/automation/smart-spawn.md` |
| workflow-select | `.claude/commands/automation/workflow-select.md` |

#### GitHub Commands (17)
| Command | File |
|---------|------|
| README | `.claude/commands/github/README.md` |
| code-review-swarm | `.claude/commands/github/code-review-swarm.md` |
| code-review | `.claude/commands/github/code-review.md` |
| github-modes | `.claude/commands/github/github-modes.md` |
| github-swarm | `.claude/commands/github/github-swarm.md` |
| issue-tracker | `.claude/commands/github/issue-tracker.md` |
| issue-triage | `.claude/commands/github/issue-triage.md` |
| multi-repo-swarm | `.claude/commands/github/multi-repo-swarm.md` |
| pr-enhance | `.claude/commands/github/pr-enhance.md` |
| pr-manager | `.claude/commands/github/pr-manager.md` |
| project-board-sync | `.claude/commands/github/project-board-sync.md` |
| release-manager | `.claude/commands/github/release-manager.md` |
| release-swarm | `.claude/commands/github/release-swarm.md` |
| repo-analyze | `.claude/commands/github/repo-analyze.md` |
| repo-architect | `.claude/commands/github/repo-architect.md` |
| swarm-issue | `.claude/commands/github/swarm-issue.md` |
| swarm-pr | `.claude/commands/github/swarm-pr.md` |
| sync-coordinator | `.claude/commands/github/sync-coordinator.md` |
| workflow-automation | `.claude/commands/github/workflow-automation.md` |

#### Hooks Commands (8)
| Command | File |
|---------|------|
| README | `.claude/commands/hooks/README.md` |
| overview | `.claude/commands/hooks/overview.md` |
| post-edit | `.claude/commands/hooks/post-edit.md` |
| post-task | `.claude/commands/hooks/post-task.md` |
| pre-edit | `.claude/commands/hooks/pre-edit.md` |
| pre-task | `.claude/commands/hooks/pre-task.md` |
| session-end | `.claude/commands/hooks/session-end.md` |
| setup | `.claude/commands/hooks/setup.md` |

#### Monitoring Commands (6)
| Command | File |
|---------|------|
| README | `.claude/commands/monitoring/README.md` |
| agent-metrics | `.claude/commands/monitoring/agent-metrics.md` |
| agents | `.claude/commands/monitoring/agents.md` |
| real-time-view | `.claude/commands/monitoring/real-time-view.md` |
| status | `.claude/commands/monitoring/status.md` |
| swarm-monitor | `.claude/commands/monitoring/swarm-monitor.md` |

#### Optimization Commands (6)
| Command | File |
|---------|------|
| README | `.claude/commands/optimization/README.md` |
| auto-topology | `.claude/commands/optimization/auto-topology.md` |
| cache-manage | `.claude/commands/optimization/cache-manage.md` |
| parallel-execute | `.claude/commands/optimization/parallel-execute.md` |
| parallel-execution | `.claude/commands/optimization/parallel-execution.md` |
| topology-optimize | `.claude/commands/optimization/topology-optimize.md` |

#### SPARC Commands (27)
| Command | File |
|---------|------|
| analyzer | `.claude/commands/sparc/analyzer.md` |
| architect | `.claude/commands/sparc/architect.md` |
| ask | `.claude/commands/sparc/ask.md` |
| batch-executor | `.claude/commands/sparc/batch-executor.md` |
| code | `.claude/commands/sparc/code.md` |
| coder | `.claude/commands/sparc/coder.md` |
| debug | `.claude/commands/sparc/debug.md` |
| debugger | `.claude/commands/sparc/debugger.md` |
| designer | `.claude/commands/sparc/designer.md` |
| devops | `.claude/commands/sparc/devops.md` |
| docs-writer | `.claude/commands/sparc/docs-writer.md` |
| documenter | `.claude/commands/sparc/documenter.md` |
| innovator | `.claude/commands/sparc/innovator.md` |
| integration | `.claude/commands/sparc/integration.md` |
| mcp | `.claude/commands/sparc/mcp.md` |
| memory-manager | `.claude/commands/sparc/memory-manager.md` |
| optimizer | `.claude/commands/sparc/optimizer.md` |
| orchestrator | `.claude/commands/sparc/orchestrator.md` |
| post-deployment-monitoring-mode | `.claude/commands/sparc/post-deployment-monitoring-mode.md` |
| refinement-optimization-mode | `.claude/commands/sparc/refinement-optimization-mode.md` |
| researcher | `.claude/commands/sparc/researcher.md` |
| reviewer | `.claude/commands/sparc/reviewer.md` |
| security-review | `.claude/commands/sparc/security-review.md` |
| sparc-modes | `.claude/commands/sparc/sparc-modes.md` |
| sparc | `.claude/commands/sparc/sparc.md` |
| spec-pseudocode | `.claude/commands/sparc/spec-pseudocode.md` |
| supabase-admin | `.claude/commands/sparc/supabase-admin.md` |
| swarm-coordinator | `.claude/commands/sparc/swarm-coordinator.md` |
| tdd | `.claude/commands/sparc/tdd.md` |
| tester | `.claude/commands/sparc/tester.md` |
| tutorial | `.claude/commands/sparc/tutorial.md` |
| workflow-manager | `.claude/commands/sparc/workflow-manager.md` |

#### Root-Level Commands (3)
| Command | File |
|---------|------|
| claude-flow-help | `.claude/commands/claude-flow-help.md` |
| claude-flow-memory | `.claude/commands/claude-flow-memory.md` |
| claude-flow-swarm | `.claude/commands/claude-flow-swarm.md` |

---

## Hooks Configuration

### settings.json Hooks Structure

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [{
          "type": "command",
          "command": "npx @claude-flow/cli@latest hooks pre-edit --file \"$TOOL_INPUT_file_path\"",
          "timeout": 5000,
          "continueOnError": true
        }]
      },
      {
        "matcher": "^Bash$",
        "hooks": [{
          "type": "command",
          "command": "npx @claude-flow/cli@latest hooks pre-command --command \"$TOOL_INPUT_command\"",
          "timeout": 5000,
          "continueOnError": true
        }]
      },
      {
        "matcher": "^Task$",
        "hooks": [{
          "type": "command",
          "command": "npx @claude-flow/cli@latest hooks pre-task --task-id \"task-$(date +%s)\" --description \"$TOOL_INPUT_prompt\"",
          "timeout": 5000,
          "continueOnError": true
        }]
      }
    ],
    "PostToolUse": [...],
    "UserPromptSubmit": [...],
    "SessionStart": [...],
    "Stop": [...],
    "Notification": [...]
  }
}
```

### Available Hook Types

| Hook Type | Purpose | Environment Variables |
|-----------|---------|----------------------|
| PreToolUse | Before tool execution | `$TOOL_INPUT_*` |
| PostToolUse | After tool execution | `$TOOL_INPUT_*`, `$TOOL_SUCCESS`, `$TOOL_RESULT_*` |
| UserPromptSubmit | On user input | `$PROMPT` |
| SessionStart | On session start | `$SESSION_ID` |
| Stop | On session end | (none) |
| Notification | On notifications | `$NOTIFICATION_MESSAGE` |

---

## MCP Servers

### Configured MCP Servers

| Server Name | Command | Args | Auto-Start |
|-------------|---------|------|------------|
| claude-flow | `npx` | `@claude-flow/cli@latest mcp start` | false |

### Environment Variables for claude-flow MCP

```json
{
  "CLAUDE_FLOW_MODE": "v3",
  "CLAUDE_FLOW_HOOKS_ENABLED": "true",
  "CLAUDE_FLOW_TOPOLOGY": "hierarchical-mesh",
  "CLAUDE_FLOW_MAX_AGENTS": "15",
  "CLAUDE_FLOW_MEMORY_BACKEND": "hybrid"
}
```

---

## File Patterns & Structures

### Agent File Pattern

**Glob**: `.claude/agents/**/*.md`
**Parser**: YAML frontmatter + Markdown content

```
Required Fields:
  - name: string (identifier)
  - type: string (category)
  - description: string
  - capabilities: string[]

Optional Fields:
  - color: string (hex color)
  - priority: "critical" | "high" | "medium" | "low"
  - hooks.pre: string (shell script)
  - hooks.post: string (shell script)
```

### Skill File Pattern

**Glob**: `.claude/skills/*/SKILL.md`
**Parser**: YAML frontmatter + Markdown content

```
Required Fields:
  - name: string (max 64 chars)
  - description: string (max 1024 chars)

Optional Fields:
  - version: string
  - category: string
  - tags: string[]
  - author: string
```

### Command File Pattern

**Glob**: `.claude/commands/**/*.md`
**Parser**: YAML frontmatter + Markdown content

```
Required Fields:
  - name: string
  - description: string

Optional Fields:
  - (varies by command type)
```

### Settings JSON Pattern

**Path**: `.claude/settings.json`
**Parser**: JSON

```
Top-Level Keys:
  - hooks: object (hook configurations)
  - statusLine: object (status line config)
  - permissions: object (allow/deny lists)
  - claudeFlow: object (V3 specific config)
```

### MCP JSON Pattern

**Path**: `.mcp.json`
**Parser**: JSON

```
Top-Level Keys:
  - mcpServers: object (server definitions)
    - [serverName]: object
      - command: string
      - args: string[]
      - env: object
      - autoStart: boolean
```

---

## Scanner Detection Requirements

### Files to Detect

| File/Pattern | Purpose | Priority |
|--------------|---------|----------|
| `.claude/agents/**/*.md` | Agent definitions | High |
| `.claude/skills/*/SKILL.md` | Skill definitions | High |
| `.claude/commands/**/*.md` | Command definitions | High |
| `.claude/settings.json` | Hooks configuration | High |
| `.mcp.json` | MCP server configuration | High |
| `CLAUDE.md` | Project instructions | High |
| `.claude-flow/config.yaml` | Runtime config | Medium |
| `.claude-flow/CAPABILITIES.md` | Capabilities reference | Low |

### Parsing Requirements

1. **YAML Frontmatter Parser**
   - Extract metadata between `---` delimiters
   - Handle multi-line strings with `|`
   - Support arrays and nested objects
   - Gracefully handle missing optional fields

2. **JSON Parser**
   - Parse `.mcp.json` for MCP servers
   - Parse `.claude/settings.json` for hooks
   - Parse `.claude-flow/memory/store.json` for memory patterns

3. **Markdown Parser**
   - Extract content after frontmatter
   - Identify section headers
   - Extract code blocks

### Validation Rules

1. **Agent Validation**
   - Must have `name`, `type`, `description`, `capabilities`
   - `capabilities` must be non-empty array
   - File path must match `.claude/agents/**/*.md`

2. **Skill Validation**
   - Must have `name` (max 64 chars), `description` (max 1024 chars)
   - File must be named `SKILL.md`
   - Must be in `.claude/skills/<skill-name>/` directory

3. **Command Validation**
   - Must have `name` and `description`
   - File path must match `.claude/commands/**/*.md`

4. **Hooks Validation**
   - Valid hook types: PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, Stop, Notification
   - Hooks must have `type` and `command` fields
   - Matchers must be valid regex patterns

5. **MCP Validation**
   - Each server must have `command` and `args`
   - `env` is optional but must be object if present

### Expected Scanner Output

```json
{
  "version": "1.0.0",
  "scanDate": "2026-01-20T00:00:00.000Z",
  "projectPath": "/workspaces/agentscope",
  "summary": {
    "agents": 97,
    "skills": 32,
    "commands": 90,
    "mcpServers": 1,
    "hooks": 6
  },
  "agents": [...],
  "skills": [...],
  "commands": [...],
  "mcpServers": [...],
  "hooks": {...},
  "configuration": {
    "claudeMd": {...},
    "settings": {...},
    "claudeFlowConfig": {...}
  }
}
```

---

## Notes for Implementation

### Duplicate Detection

The scanner should detect and flag duplicates:
- Same agent in multiple subdirectories (e.g., `analysis/analyze-code-quality.md` and `analysis/code-review/analyze-code-quality.md`)
- Consider using content hashing to identify true duplicates

### Category Extraction

Categories should be derived from:
1. Directory path (primary)
2. `type` field in frontmatter (secondary)
3. Tags/keywords in description (tertiary)

### Relationship Mapping

For workflow diagrams, detect relationships via:
1. Explicit references in content (mentions other agents)
2. Hook integration (agents that share hooks)
3. Memory namespace sharing
4. Command-to-agent mappings

### Performance Considerations

- Use glob patterns with exclusions for `node_modules`
- Parse YAML frontmatter only when needed (lazy loading)
- Cache parsed results for subsequent operations
- Support incremental scanning (only changed files)

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-20
