# AgentScope Visualization Architecture

> **Architecture Visualization and Flow Documentation**
> **Version**: 1.0
> **Date**: January 2026
> **Status**: Reference Document

---

## Document Purpose

This document provides visual representations of the AgentScope system architecture, data flows, and integration points. It serves as a navigation hub linking to detailed documentation.

**Related Documentation:**
- [DDD Implementation Plan](./DDD-IMPLEMENTATION.md) - Domain-Driven Design details
- [PRD v2.0](../AgentScope-PRD-v2.md) - Product requirements and features
- [CLAUDE.md](../../CLAUDE.md) - Claude Code configuration and agent orchestration

---

## 1. System Context Diagram (C4 Level 1)

Shows AgentScope's position within the broader development ecosystem.

```mermaid
C4Context
    title AgentScope System Context

    Person(dev, "Developer", "Uses Claude Code for AI-assisted development")
    Person(lead, "Tech Lead", "Reviews agent configurations across team")

    System(agentscope, "AgentScope CLI", "Scans agent configs, generates Mermaid diagrams and documentation")

    System_Ext(claudecode, "Claude Code", "AI coding assistant with agents, skills, hooks")
    System_Ext(github, "GitHub", "Version control, Actions, Issues")
    System_Ext(cicd, "CI/CD Pipeline", "Automated builds, tests, deployments")
    System_Ext(ide, "IDE/Editor", "VS Code, JetBrains, etc.")
    System_Ext(mcp, "MCP Servers", "Model Context Protocol tool providers")

    Rel(dev, agentscope, "Runs", "CLI")
    Rel(dev, claudecode, "Develops with")
    Rel(agentscope, claudecode, "Scans configs from", ".claude/, CLAUDE.md")
    Rel(agentscope, mcp, "Parses", ".mcp.json")
    Rel(agentscope, github, "Outputs docs to", "docs/")
    Rel(cicd, agentscope, "Triggers on", "pre-commit, push")
    Rel(lead, agentscope, "Reviews output", "README.md, diagrams")

    UpdateRelStyle(dev, agentscope, $offsetX="-40", $offsetY="-20")
```

### External Systems Detail

| System | Integration Type | Purpose | Reference |
|--------|-----------------|---------|-----------|
| **Claude Code** | File System Scan | Source of agent, skill, hook, command configs | [PRD v2.0 Section 4.1](../AgentScope-PRD-v2.md#41-scanner-module) |
| **MCP Servers** | JSON Parsing | Tool and server definitions | [DDD - MCPParser](./DDD-IMPLEMENTATION.md#scanner-domain-services) |
| **GitHub** | Output Target | Generated documentation repository | [PRD v2.0 Section 4.3](../AgentScope-PRD-v2.md#43-documentation-generator) |
| **CI/CD** | Event Trigger | Pre-commit hooks, GitHub Actions | [External Events](#5-external-integration-points) |
| **IDE** | Future | VS Code extension (v2.0+) | [PRD v2.0 Section 8](../AgentScope-PRD-v2.md#8-future-roadmap) |

---

## 2. Data Flow Diagram

Shows how configuration data flows through the AgentScope processing pipeline.

```mermaid
flowchart LR
    subgraph Sources ["Configuration Sources"]
        CLAUDE_DIR[".claude/"]
        CLAUDE_MD["CLAUDE.md"]
        MCP_JSON[".mcp.json"]
        USER_DIR["~/.claude/"]
    end

    subgraph Scanner ["Scanner Domain"]
        direction TB
        CC_PARSER["ClaudeCode Parser"]
        MCP_PARSER["MCP Parser"]
        SCAN_SESSION["ScanSession Aggregate"]
        FRAGMENTS["ConfigFragments"]
    end

    subgraph Model ["Model Domain (Shared Kernel)"]
        direction TB
        TRANSFORM["TransformService"]
        VALIDATION["ValidationService"]
        CONFIG["AgentScopeConfig Aggregate"]
    end

    subgraph Generator ["Generator Domain"]
        direction TB
        GEN_SESSION["GenerationSession"]
        MERMAID["MermaidGenerator"]
        MARKDOWN["MarkdownWriter"]
    end

    subgraph Output ["Output Files"]
        README["README.md"]
        AGENTS_MD["AGENTS.md"]
        DIAGRAMS["*.mermaid"]
        RAW_JSON["agentscope.json"]
    end

    %% Source to Scanner flows
    CLAUDE_DIR --> CC_PARSER
    CLAUDE_MD --> CC_PARSER
    USER_DIR --> CC_PARSER
    MCP_JSON --> MCP_PARSER

    %% Scanner internal flow
    CC_PARSER --> FRAGMENTS
    MCP_PARSER --> FRAGMENTS
    FRAGMENTS --> SCAN_SESSION

    %% Scanner to Model
    SCAN_SESSION -->|"ScanCompleted Event"| TRANSFORM

    %% Model internal flow
    TRANSFORM --> CONFIG
    CONFIG --> VALIDATION
    VALIDATION -->|"Errors/Warnings"| CONFIG

    %% Model to Generator
    CONFIG -->|"Published Language"| GEN_SESSION

    %% Generator internal flow
    GEN_SESSION --> MERMAID
    GEN_SESSION --> MARKDOWN

    %% Generator to Output
    MERMAID --> DIAGRAMS
    MERMAID --> README
    MARKDOWN --> README
    MARKDOWN --> AGENTS_MD
    GEN_SESSION --> RAW_JSON

    %% Styling
    classDef source fill:#e1f5fe,stroke:#01579b
    classDef scanner fill:#fff3e0,stroke:#e65100
    classDef model fill:#f3e5f5,stroke:#7b1fa2
    classDef generator fill:#e8f5e9,stroke:#2e7d32
    classDef output fill:#fce4ec,stroke:#c2185b

    class CLAUDE_DIR,CLAUDE_MD,MCP_JSON,USER_DIR source
    class CC_PARSER,MCP_PARSER,SCAN_SESSION,FRAGMENTS scanner
    class TRANSFORM,VALIDATION,CONFIG model
    class GEN_SESSION,MERMAID,MARKDOWN generator
    class README,AGENTS_MD,DIAGRAMS,RAW_JSON output
```

### Data Flow Reference

| Stage | Component | Input | Output | Details |
|-------|-----------|-------|--------|---------|
| **Parse** | ClaudeCodeParser | `.claude/**/*.md`, `CLAUDE.md` | ConfigFragment[] | [DDD Section 2.4](./DDD-IMPLEMENTATION.md#24-scanner-domain-services) |
| **Parse** | MCPParser | `.mcp.json` | ConfigFragment[] | [DDD Section 2.4](./DDD-IMPLEMENTATION.md#24-scanner-domain-services) |
| **Transform** | TransformService | ConfigFragment[] | AgentScopeConfig | [DDD Section 3.4](./DDD-IMPLEMENTATION.md#34-model-domain-services) |
| **Validate** | ValidationService | AgentScopeConfig | ScanError[] | [DDD Section 3.4](./DDD-IMPLEMENTATION.md#34-model-domain-services) |
| **Generate** | MermaidGenerator | AgentScopeConfig | Mermaid strings | [DDD Section 4.4](./DDD-IMPLEMENTATION.md#44-generator-domain-services) |
| **Generate** | MarkdownWriter | AgentScopeConfig | Markdown strings | [DDD Section 4.4](./DDD-IMPLEMENTATION.md#44-generator-domain-services) |

---

## 3. Event Flow Diagram

Shows internal domain events and external integration triggers.

```mermaid
flowchart TB
    subgraph External ["External Event Triggers"]
        PRE_COMMIT["pre-commit hook"]
        GIT_PUSH["git push"]
        GH_ACTION["GitHub Action"]
        MANUAL["CLI Manual Run"]
        WATCH["Watch Mode (future)"]
    end

    subgraph CLI ["CLI Domain"]
        SCAN_CMD["ScanCommand"]
        VALIDATE_CMD["ValidateCommand"]
    end

    subgraph Internal ["Internal Domain Events (CloudEvents)"]
        direction TB

        subgraph Scanner_Events ["Scanner Events"]
            SOURCE_SCANNED["SourceScanned"]
            SCAN_COMPLETED["ScanCompleted"]
            SCAN_FAILED["ScanFailed"]
        end

        subgraph Generator_Events ["Generator Events"]
            DIAGRAM_GEN["DiagramGenerated"]
            DOC_GEN["DocumentGenerated"]
            GEN_COMPLETED["GenerationCompleted"]
        end
    end

    subgraph Learning ["Self-Learning System"]
        PATTERN_STORE["PatternStore (HNSW)"]
        LEARNING_HOOKS["LearningHooks"]
    end

    subgraph Output_Events ["Output Triggers"]
        FILE_WRITE["Write to docs/"]
        CONSOLE_OUT["Console Summary"]
        EXIT_CODE["Exit Code (0/1)"]
    end

    %% External to CLI
    PRE_COMMIT -->|"validate only"| VALIDATE_CMD
    GIT_PUSH -->|"full scan"| SCAN_CMD
    GH_ACTION -->|"CI scan"| SCAN_CMD
    MANUAL --> SCAN_CMD
    MANUAL --> VALIDATE_CMD

    %% CLI to Events
    SCAN_CMD -->|"starts"| SOURCE_SCANNED
    SOURCE_SCANNED -->|"each source"| SCAN_COMPLETED
    SCAN_COMPLETED -->|"on failure"| SCAN_FAILED

    SCAN_COMPLETED -->|"triggers"| DIAGRAM_GEN
    DIAGRAM_GEN -->|"for each type"| DOC_GEN
    DOC_GEN --> GEN_COMPLETED

    %% Events to Learning
    SCAN_COMPLETED -->|"subscribe"| LEARNING_HOOKS
    GEN_COMPLETED -->|"subscribe"| LEARNING_HOOKS
    LEARNING_HOOKS --> PATTERN_STORE

    %% Events to Output
    GEN_COMPLETED --> FILE_WRITE
    GEN_COMPLETED --> CONSOLE_OUT
    SCAN_FAILED --> EXIT_CODE
    GEN_COMPLETED --> EXIT_CODE

    %% Styling
    classDef external fill:#ffebee,stroke:#c62828
    classDef cli fill:#e3f2fd,stroke:#1565c0
    classDef event fill:#fff8e1,stroke:#f9a825
    classDef learning fill:#e8f5e9,stroke:#2e7d32
    classDef output fill:#f3e5f5,stroke:#7b1fa2

    class PRE_COMMIT,GIT_PUSH,GH_ACTION,MANUAL,WATCH external
    class SCAN_CMD,VALIDATE_CMD cli
    class SOURCE_SCANNED,SCAN_COMPLETED,SCAN_FAILED,DIAGRAM_GEN,DOC_GEN,GEN_COMPLETED event
    class PATTERN_STORE,LEARNING_HOOKS learning
    class FILE_WRITE,CONSOLE_OUT,EXIT_CODE output
```

### Event Catalog

| Event | Source Domain | Type (CloudEvents) | Data | Reference |
|-------|--------------|-------------------|------|-----------|
| `SourceScanned` | Scanner | `com.agentscope.scanner.source-scanned` | sessionId, sourceType, fragmentCount | [DDD Section 6.1](./DDD-IMPLEMENTATION.md#61-event-definitions) |
| `ScanCompleted` | Scanner | `com.agentscope.scanner.scan-completed` | sessionId, counts, duration | [DDD Section 6.1](./DDD-IMPLEMENTATION.md#61-event-definitions) |
| `ScanFailed` | Scanner | `com.agentscope.scanner.scan-failed` | sessionId, error, source | [DDD Section 6.1](./DDD-IMPLEMENTATION.md#61-event-definitions) |
| `DiagramGenerated` | Generator | `com.agentscope.generator.diagram-generated` | sessionId, diagramType, outputPath | [DDD Section 6.1](./DDD-IMPLEMENTATION.md#61-event-definitions) |
| `DocumentGenerated` | Generator | `com.agentscope.generator.document-generated` | sessionId, documentType, outputPath | [DDD Section 6.1](./DDD-IMPLEMENTATION.md#61-event-definitions) |
| `GenerationCompleted` | Generator | `com.agentscope.generator.generation-completed` | sessionId, outputCount, counts | [DDD Section 6.1](./DDD-IMPLEMENTATION.md#61-event-definitions) |

---

## 4. Entity Relationship Diagram

Shows all domain entities and their relationships.

```mermaid
erDiagram
    AgentScopeConfig ||--o{ Agent : contains
    AgentScopeConfig ||--o{ Skill : contains
    AgentScopeConfig ||--o{ Hook : contains
    AgentScopeConfig ||--o{ Command : contains
    AgentScopeConfig ||--o{ MCPServer : contains
    AgentScopeConfig ||--|| ConfigMeta : has
    AgentScopeConfig ||--|| Settings : has
    AgentScopeConfig ||--o{ ScanError : records

    Agent ||--o{ SkillId : references
    Agent }o--o{ MCPServer : "uses tools from"

    Skill ||--o{ Trigger : has

    MCPServer ||--o{ MCPTool : provides

    Hook ||--|| HookEvent : "triggered by"

    ScanSession ||--o{ ScanSource : scans
    ScanSession ||--o{ ConfigFragment : produces

    GenerationSession ||--o{ GenerationOutput : produces
    GenerationSession }|--|| AgentScopeConfig : "generates from"

    %% Value Objects (shown as attributes)
    Agent {
        AgentId id PK
        AgentName name
        string description
        string source
        string sourcePath
        string[] allowedTools
        string configSnippet
    }

    Skill {
        SkillId id PK
        SkillName name
        string description
        string sourcePath
        string configSnippet
    }

    Hook {
        HookId id PK
        HookName name
        string command
        string sourcePath
    }

    MCPServer {
        MCPServerId id PK
        MCPServerName name
        string command
        string[] args
        object env
        string sourcePath
    }

    AgentScopeConfig {
        ConfigId id PK
    }

    ScanSession {
        ScanSessionId id PK
        ScanStatus status
        datetime startedAt
        datetime completedAt
    }

    GenerationSession {
        GenerationSessionId id PK
        GenerationStatus status
    }
```

### Entity Reference

For detailed entity definitions, see:

| Entity | Domain | Type | Details |
|--------|--------|------|---------|
| **AgentScopeConfig** | Model | Aggregate Root | [DDD Section 3.1](./DDD-IMPLEMENTATION.md#31-unified-config-aggregate) |
| **Agent** | Model | Entity | [DDD Section 3.2](./DDD-IMPLEMENTATION.md#32-model-entities) |
| **Skill** | Model | Entity | [DDD Section 3.2](./DDD-IMPLEMENTATION.md#32-model-entities) |
| **Hook** | Model | Entity | [DDD Section 3.2](./DDD-IMPLEMENTATION.md#32-model-entities) |
| **MCPServer** | Model | Entity | [DDD Section 3.2](./DDD-IMPLEMENTATION.md#32-model-entities) |
| **ScanSession** | Scanner | Aggregate Root | [DDD Section 2.1](./DDD-IMPLEMENTATION.md#21-scanner-aggregate-root) |
| **ScanSource** | Scanner | Entity | [DDD Section 2.2](./DDD-IMPLEMENTATION.md#22-scanner-entities) |
| **GenerationSession** | Generator | Aggregate Root | [DDD Section 4.1](./DDD-IMPLEMENTATION.md#41-generator-aggregate-root) |
| **GenerationOutput** | Generator | Entity | [DDD Section 4.2](./DDD-IMPLEMENTATION.md#42-generator-entities) |

---

## 5. File Reference Map

Maps which configuration files contain which entity types, with links to actual file locations.

```mermaid
flowchart TB
    subgraph Project_Config ["Project Configuration"]
        direction LR
        CLAUDE_DIR_ROOT[".claude/"]
        CLAUDE_MD_FILE["CLAUDE.md"]
        MCP_JSON_FILE[".mcp.json"]
    end

    subgraph Claude_Dir ["<strong>.claude/ Directory Structure</strong>"]
        direction TB
        AGENTS_DIR[".claude/agents/**/*.md"]
        SKILLS_DIR[".claude/skills/**/SKILL.md"]
        SETTINGS_FILE[".claude/settings.json"]
    end

    subgraph User_Config ["User Configuration"]
        USER_CLAUDE["~/.claude/"]
        USER_AGENTS["~/.claude/agents/"]
    end

    subgraph Entities ["Extracted Entities"]
        E_AGENTS["Agent[]"]
        E_SKILLS["Skill[]"]
        E_HOOKS["Hook[]"]
        E_COMMANDS["Command[]"]
        E_MCP["MCPServer[]"]
        E_SETTINGS["Settings"]
    end

    %% Mappings
    CLAUDE_DIR_ROOT --> AGENTS_DIR
    CLAUDE_DIR_ROOT --> SKILLS_DIR
    CLAUDE_DIR_ROOT --> SETTINGS_FILE

    AGENTS_DIR -->|"ClaudeCodeParser"| E_AGENTS
    SKILLS_DIR -->|"ClaudeCodeParser"| E_SKILLS
    CLAUDE_MD_FILE -->|"ClaudeCodeParser"| E_AGENTS
    CLAUDE_MD_FILE -->|"ClaudeCodeParser"| E_SKILLS
    CLAUDE_MD_FILE -->|"ClaudeCodeParser"| E_HOOKS
    CLAUDE_MD_FILE -->|"ClaudeCodeParser"| E_COMMANDS
    SETTINGS_FILE -->|"ClaudeCodeParser"| E_SETTINGS
    MCP_JSON_FILE -->|"MCPParser"| E_MCP
    USER_CLAUDE --> USER_AGENTS
    USER_AGENTS -->|"ClaudeCodeParser"| E_AGENTS

    classDef project fill:#e3f2fd,stroke:#1565c0
    classDef user fill:#fff3e0,stroke:#e65100
    classDef entity fill:#e8f5e9,stroke:#2e7d32

    class CLAUDE_DIR_ROOT,CLAUDE_MD_FILE,MCP_JSON_FILE,AGENTS_DIR,SKILLS_DIR,SETTINGS_FILE project
    class USER_CLAUDE,USER_AGENTS user
    class E_AGENTS,E_SKILLS,E_HOOKS,E_COMMANDS,E_MCP,E_SETTINGS entity
```

### File Location Reference

| File/Pattern | Parser | Entity Types | Example Path |
|--------------|--------|--------------|--------------|
| `.claude/agents/**/*.md` | ClaudeCodeParser | Agent | [.claude/agents/core/coder.md](../../.claude/agents/core/coder.md) |
| `.claude/skills/**/SKILL.md` | ClaudeCodeParser | Skill | [.claude/skills/sparc-methodology/SKILL.md](../../.claude/skills/sparc-methodology/SKILL.md) |
| `.claude/settings.json` | ClaudeCodeParser | Settings | [.claude/settings.json](../../.claude/settings.json) |
| `CLAUDE.md` | ClaudeCodeParser | Agent, Skill, Hook, Command | [CLAUDE.md](../../CLAUDE.md) |
| `.mcp.json` | MCPParser | MCPServer | [.mcp.json](../../.mcp.json) |
| `~/.claude/agents/` | ClaudeCodeParser | Agent (user-level) | User home directory |

### Parser Responsibilities

| Parser | Files Handled | Entity Extraction Logic |
|--------|--------------|------------------------|
| **ClaudeCodeParser** | `.claude/**`, `CLAUDE.md` | YAML frontmatter + markdown body parsing |
| **MCPParser** | `.mcp.json` | JSON parsing of `mcpServers` object |

For parser implementation details, see [DDD Section 2.4](./DDD-IMPLEMENTATION.md#24-scanner-domain-services).

---

## 6. External Integration Points

### 6.1 Integration Architecture

```mermaid
flowchart TB
    subgraph Triggers ["External Event Triggers"]
        direction LR

        subgraph Git_Hooks ["Git Hooks"]
            PRE_COMMIT["pre-commit"]
            POST_COMMIT["post-commit"]
            PRE_PUSH["pre-push"]
        end

        subgraph GitHub_Events ["GitHub Events"]
            GH_PUSH["push event"]
            GH_PR["pull_request event"]
            GH_SCHEDULE["schedule (cron)"]
        end

        subgraph IDE_Events ["IDE Events (Future v2.0+)"]
            FILE_SAVE["on file save"]
            CONFIG_CHANGE["on config change"]
        end
    end

    subgraph AgentScope ["AgentScope CLI"]
        SCAN["agentscope scan"]
        VALIDATE["agentscope validate"]
    end

    subgraph Outputs ["Generated Outputs"]
        DOCS["docs/agent-architecture/"]
        EXIT["Exit Code 0/1"]
        JSON_OUT["agentscope.json"]
    end

    subgraph Consumers ["Output Consumers"]
        GH_PAGES["GitHub Pages"]
        PR_COMMENT["PR Comment Bot"]
        MONITORING["Monitoring Dashboard"]
    end

    %% Trigger connections
    PRE_COMMIT -->|"--validate-only"| VALIDATE
    PRE_PUSH -->|"--strict"| SCAN
    GH_PUSH -->|"workflow_dispatch"| SCAN
    GH_PR -->|"on: pull_request"| SCAN
    GH_SCHEDULE -->|"weekly/daily"| SCAN

    FILE_SAVE -.->|"future"| VALIDATE
    CONFIG_CHANGE -.->|"future"| SCAN

    %% Output connections
    SCAN --> DOCS
    SCAN --> EXIT
    SCAN --> JSON_OUT
    VALIDATE --> EXIT

    DOCS --> GH_PAGES
    JSON_OUT --> PR_COMMENT
    JSON_OUT --> MONITORING

    classDef trigger fill:#ffebee,stroke:#c62828
    classDef cli fill:#e3f2fd,stroke:#1565c0
    classDef output fill:#e8f5e9,stroke:#2e7d32
    classDef consumer fill:#fff3e0,stroke:#e65100
    classDef future fill:#f5f5f5,stroke:#9e9e9e,stroke-dasharray: 5 5

    class PRE_COMMIT,POST_COMMIT,PRE_PUSH,GH_PUSH,GH_PR,GH_SCHEDULE trigger
    class SCAN,VALIDATE cli
    class DOCS,EXIT,JSON_OUT output
    class GH_PAGES,PR_COMMENT,MONITORING consumer
    class FILE_SAVE,CONFIG_CHANGE,IDE_Events future
```

### 6.2 Git Hooks Integration

```bash
# .git/hooks/pre-commit (or via husky/lint-staged)
#!/bin/bash
npx agentscope validate --strict
if [ $? -ne 0 ]; then
    echo "AgentScope validation failed. Fix configuration errors before committing."
    exit 1
fi
```

| Hook | Command | Purpose | Exit Behavior |
|------|---------|---------|---------------|
| `pre-commit` | `agentscope validate --strict` | Validate configs before commit | Exit 1 on fatal errors |
| `pre-push` | `agentscope scan --strict` | Full scan before push | Exit 1 on any errors |
| `post-commit` | `agentscope scan` | Update docs after commit | Non-blocking |

### 6.3 GitHub Actions Integration

```yaml
# .github/workflows/agentscope.yml
name: AgentScope Documentation

on:
  push:
    paths:
      - '.claude/**'
      - 'CLAUDE.md'
      - '.mcp.json'
  pull_request:
    paths:
      - '.claude/**'
      - 'CLAUDE.md'
      - '.mcp.json'
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run AgentScope
        run: npx agentscope scan --strict

      - name: Upload Documentation
        if: github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: agent-docs
          path: docs/agent-architecture/
```

### 6.4 CI/CD Pipeline Events

| Event Type | Trigger | AgentScope Action | Output |
|------------|---------|-------------------|--------|
| **Push to main** | `push` | Full scan + deploy docs | docs/agent-architecture/ |
| **Pull Request** | `pull_request` | Validate + comment | PR comment with summary |
| **Scheduled** | `schedule` | Full scan | Weekly report |
| **Manual** | `workflow_dispatch` | Configurable | User-selected options |

### 6.5 IDE Extension Events (Future v2.0+)

| Event | Trigger | Response |
|-------|---------|----------|
| `onDidSaveTextDocument` | Save `.claude/**/*.md` | Re-validate affected agent/skill |
| `onDidChangeConfiguration` | Save `.mcp.json` | Re-parse MCP config |
| `onDidOpenTextDocument` | Open agent file | Show related diagram |

For future roadmap details, see [PRD v2.0 Section 8](../AgentScope-PRD-v2.md#8-future-roadmap).

---

## 7. Component Map (Default Diagram)

The standard component map generated by AgentScope, showing detected agents, skills, hooks, and MCP servers.

```mermaid
flowchart TB
    subgraph Agents ["Agents (Detected)"]
        A_CODER["coder"]
        A_REVIEWER["reviewer"]
        A_TESTER["tester"]
        A_RESEARCHER["researcher"]
        A_PLANNER["planner"]
    end

    subgraph Skills ["Skills (Detected)"]
        S_SPARC["sparc-methodology"]
        S_SWARM["swarm-orchestration"]
        S_GITHUB["github-code-review"]
        S_PAIR["pair-programming"]
    end

    subgraph Hooks ["Hooks (from CLAUDE.md)"]
        H_PRE_TASK["pre-task"]
        H_POST_TASK["post-task"]
        H_PRE_EDIT["pre-edit"]
        H_POST_EDIT["post-edit"]
    end

    subgraph MCPs ["MCP Servers"]
        M_FLOW["claude-flow"]
        M_SWARM["ruv-swarm"]
        M_NEXUS["flow-nexus"]
    end

    %% Agent-Skill relationships
    A_CODER --> S_SPARC
    A_CODER --> S_PAIR
    A_REVIEWER --> S_GITHUB
    A_TESTER --> S_SWARM

    %% Agent-MCP relationships
    A_CODER --> M_FLOW
    A_RESEARCHER --> M_FLOW
    A_TESTER --> M_SWARM
```

**Note:** This is an example diagram. Actual output depends on scanned configuration.

For diagram generation implementation, see [DDD Section 4.4](./DDD-IMPLEMENTATION.md#44-generator-domain-services).

---

## 8. Workflow Sequence (Default Diagram)

Shows the typical request flow from user through agents to tools.

```mermaid
sequenceDiagram
    participant U as User
    participant CC as Claude Code
    participant Coord as Coordinator
    participant Agent as Specialized Agent
    participant Skill as Skill
    participant MCP as MCP Server

    U->>CC: Request (e.g., "implement feature")

    Note over CC: Task Complexity Detection

    CC->>Coord: Initialize swarm
    activate Coord

    Coord->>Agent: Spawn with task
    activate Agent

    Agent->>Skill: Invoke capability
    activate Skill

    Skill->>MCP: Execute tool
    activate MCP
    MCP-->>Skill: Tool result
    deactivate MCP

    Skill-->>Agent: Skill result
    deactivate Skill

    Agent-->>Coord: Task complete
    deactivate Agent

    Coord-->>CC: Aggregated result
    deactivate Coord

    CC-->>U: Response

    Note over CC: Store pattern in memory (learning)
```

**Reference:** For swarm orchestration patterns, see [CLAUDE.md - Auto-Start Swarm Protocol](../../CLAUDE.md#-auto-start-swarm-protocol-background-execution).

---

## 9. Bounded Context Map

Shows the Domain-Driven Design bounded contexts and their relationships.

```mermaid
flowchart TB
    subgraph Scanner_BC ["Scanner Domain (Core)"]
        direction TB
        SS[("ScanSession<br/>(Aggregate)")]
        SRC["ScanSource<br/>(Entity)"]
        FRAG["ConfigFragment<br/>(VO)"]
        CCP["ClaudeCodeParser<br/>(Service)"]
        MCPP["MCPParser<br/>(Service)"]
    end

    subgraph Model_BC ["Model Domain (Shared Kernel)"]
        direction TB
        ASC[("AgentScopeConfig<br/>(Aggregate)")]
        AGT["Agent<br/>(Entity)"]
        SKL["Skill<br/>(Entity)"]
        HK["Hook<br/>(Entity)"]
        MCP["MCPServer<br/>(Entity)"]
        TS["TransformService"]
        VS["ValidationService"]
    end

    subgraph Generator_BC ["Generator Domain (Core)"]
        direction TB
        GS[("GenerationSession<br/>(Aggregate)")]
        GO["GenerationOutput<br/>(Entity)"]
        MG["MermaidGenerator<br/>(Service)"]
        MW["MarkdownWriter<br/>(Service)"]
    end

    subgraph CLI_BC ["CLI Domain (Generic)"]
        direction TB
        SC["ScanCommand"]
        VC["ValidateCommand"]
        OPT["ScanOptions<br/>(VO)"]
    end

    %% Relationships
    Scanner_BC -->|"Domain Events<br/>(ScanCompleted)"| Model_BC
    Scanner_BC -.->|"ACL"| Model_BC
    Model_BC -->|"Published Language<br/>(Schema)"| Generator_BC
    Model_BC -.->|"ACL"| Generator_BC
    Generator_BC -->|"Conformist"| CLI_BC
    CLI_BC -->|"Orchestrates"| Scanner_BC
    CLI_BC -->|"Orchestrates"| Generator_BC

    classDef core fill:#e8f5e9,stroke:#2e7d32
    classDef shared fill:#fff3e0,stroke:#e65100
    classDef generic fill:#e3f2fd,stroke:#1565c0
    classDef aggregate fill:#ffecb3,stroke:#ff8f00,stroke-width:2px

    class Scanner_BC,Generator_BC core
    class Model_BC shared
    class CLI_BC generic
    class SS,ASC,GS aggregate
```

### Context Relationships Detail

| Upstream | Downstream | Pattern | Description |
|----------|------------|---------|-------------|
| Scanner | Model | Customer-Supplier + ACL | Scanner produces fragments, Model consumes via ACL |
| Model | Generator | Published Language | Shared schema (AgentScopeConfig) |
| Generator | CLI | Conformist | Generator adapts to CLI output needs |
| CLI | Scanner, Generator | Orchestration | CLI coordinates the workflow |

For detailed bounded context definitions, see [DDD Section 1.2](./DDD-IMPLEMENTATION.md#12-bounded-context-definitions).

---

## 10. Quick Reference Links

### Architecture Documents
- [DDD Implementation Plan](./DDD-IMPLEMENTATION.md) - Complete domain model
- [Security Architecture](./SECURITY-ARCHITECTURE.md) - Security considerations
- [Memory Architecture](./MEMORY-ARCHITECTURE.md) - Pattern storage
- [ADR Index](./decisions/README.md) - Architecture Decision Records

### Product Documents
- [PRD v2.0](../AgentScope-PRD-v2.md) - Product requirements
- [Definition of Done](../DEFINITION_OF_DONE.md) - Quality criteria
- [Changelog](../CHANGELOG.md) - Version history

### Configuration Reference
- [CLAUDE.md](../../CLAUDE.md) - Agent orchestration config
- [.claude/ Directory](../../.claude/) - Agents and skills
- [.mcp.json](../../.mcp.json) - MCP server config

### Research
- [Executive Summary](../research/00-EXECUTIVE-SUMMARY.md) - Research overview
- [Documentation Frameworks](../research/11-documentation-frameworks-deep-analysis.md) - Standards analysis
- [TDD Quality Framework](../research/07-tdd-quality-framework.md) - Testing approach

---

*Document Version: 1.0 | January 2026 | Status: Reference*
