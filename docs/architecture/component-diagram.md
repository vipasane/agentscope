# AgentScope Component Diagrams

> **Version**: 1.0
> **Date**: January 2026
> **Status**: Ready for Implementation

This document contains Mermaid diagrams illustrating the AgentScope architecture at various levels of detail.

---

## 1. System Context Diagram (C4 Level 1)

Shows AgentScope in context with external systems and users.

```mermaid
C4Context
    title AgentScope System Context

    Person(developer, "Developer", "Uses Claude Code for AI-assisted development")

    System(agentscope, "AgentScope", "CLI tool that scans agent configurations and generates documentation")

    System_Ext(claude_code, "Claude Code", "AI coding assistant with agent configurations")
    System_Ext(github, "GitHub/GitLab", "Hosts generated documentation with rendered Mermaid diagrams")
    System_Ext(filesystem, "File System", "Project and user configuration files")

    Rel(developer, agentscope, "Runs CLI commands", "Terminal")
    Rel(agentscope, filesystem, "Reads configurations", "fs")
    Rel(agentscope, filesystem, "Writes documentation", "fs")
    Rel(developer, github, "Views rendered docs", "Browser")
    Rel(developer, claude_code, "Configures agents", "IDE")
```

---

## 2. Container Diagram (C4 Level 2)

Shows the high-level containers/packages within AgentScope.

```mermaid
C4Container
    title AgentScope Container Diagram

    Person(developer, "Developer", "Runs agentscope CLI")

    Container_Boundary(agentscope, "AgentScope") {
        Container(cli, "CLI", "TypeScript/Commander.js", "Command-line interface for scan and validate commands")
        Container(core, "Core Library", "TypeScript", "Domain model, services, and orchestration")
        Container(parsers, "Parsers", "TypeScript", "Framework-specific configuration parsers")
        Container(generators, "Generators", "TypeScript", "Mermaid diagrams and Markdown documentation generators")
        Container(validators, "Validators", "TypeScript/Zod", "Configuration validation and error detection")
    }

    System_Ext(fs_project, "Project Files", ".claude/, CLAUDE.md, .mcp.json")
    System_Ext(fs_user, "User Files", "~/.claude/")
    System_Ext(fs_output, "Output Directory", "docs/agent-architecture/")

    Rel(developer, cli, "Executes", "Terminal")
    Rel(cli, core, "Uses", "API")
    Rel(core, parsers, "Delegates to", "Plugin Interface")
    Rel(core, generators, "Delegates to", "Generator Interface")
    Rel(core, validators, "Validates with", "Zod Schemas")
    Rel(parsers, fs_project, "Reads", "globby/fs-extra")
    Rel(parsers, fs_user, "Reads", "globby/fs-extra")
    Rel(generators, fs_output, "Writes", "fs-extra")
```

---

## 3. Component Diagram (C4 Level 3)

### 3.1 Core Library Components

```mermaid
flowchart TB
    subgraph CLI["CLI Layer"]
        CMD_SCAN[scan command]
        CMD_VALIDATE[validate command]
        CMD_VERSION[version command]
        OUTPUT[Console Output]
    end

    subgraph Core["Core Domain Layer"]
        SCANNER[Scanner Service]
        MERGER[Config Merger]
        MODEL[Unified Model]
        ERRORS[Error Handler]
    end

    subgraph Parsers["Parser Layer"]
        REGISTRY[Parser Registry]
        CLAUDE_PARSER[Claude Code Parser]
        MCP_PARSER[MCP Parser]
    end

    subgraph Generators["Generator Layer"]
        DIAGRAM_GEN[Diagram Generator]
        DOCS_GEN[Docs Generator]
        TEMPLATES[Handlebars Templates]
    end

    subgraph Validators["Validation Layer"]
        SCHEMAS[Zod Schemas]
        VALIDATOR[Validator Service]
    end

    CMD_SCAN --> SCANNER
    CMD_VALIDATE --> VALIDATOR

    SCANNER --> REGISTRY
    REGISTRY --> CLAUDE_PARSER
    REGISTRY --> MCP_PARSER

    CLAUDE_PARSER --> MODEL
    MCP_PARSER --> MODEL

    SCANNER --> MERGER
    MERGER --> MODEL
    MERGER --> VALIDATOR

    VALIDATOR --> SCHEMAS
    VALIDATOR --> ERRORS

    SCANNER --> DIAGRAM_GEN
    SCANNER --> DOCS_GEN

    DOCS_GEN --> TEMPLATES
    DIAGRAM_GEN --> OUTPUT
    DOCS_GEN --> OUTPUT
    ERRORS --> OUTPUT
```

### 3.2 Parser Components Detail

```mermaid
flowchart LR
    subgraph ClaudeCodeParser["Claude Code Parser"]
        CC_DETECT[detect]
        CC_PARSE[parse]

        subgraph SubParsers["Sub-Parsers"]
            AGENT_P[Agent Parser]
            SKILL_P[Skill Parser]
            HOOK_P[Hook Parser]
            CMD_P[Command Parser]
            SETTINGS_P[Settings Parser]
        end

        CC_DETECT --> CC_PARSE
        CC_PARSE --> AGENT_P
        CC_PARSE --> SKILL_P
        CC_PARSE --> HOOK_P
        CC_PARSE --> CMD_P
        CC_PARSE --> SETTINGS_P
    end

    subgraph MCPParser["MCP Parser"]
        MCP_DETECT[detect]
        MCP_PARSE[parse]
        SERVER_P[Server Parser]
        TOOL_P[Tool Parser]

        MCP_DETECT --> MCP_PARSE
        MCP_PARSE --> SERVER_P
        MCP_PARSE --> TOOL_P
    end

    subgraph Files["Input Files"]
        F1[.claude/agents/*.md]
        F2[.claude/skills/*.md]
        F3[.claude/commands/*.md]
        F4[.claude/settings.json]
        F5[CLAUDE.md]
        F6[.mcp.json]
    end

    F1 --> AGENT_P
    F2 --> SKILL_P
    F3 --> CMD_P
    F4 --> SETTINGS_P
    F5 --> CC_PARSE
    F6 --> MCP_PARSE
```

### 3.3 Generator Components Detail

```mermaid
flowchart TB
    subgraph Input["Input"]
        CONFIG[AgentScopeConfig]
    end

    subgraph DiagramGenerators["Diagram Generators"]
        COMP_MAP[Component Map Generator]
        WORKFLOW[Workflow Sequence Generator]
        HIERARCHY[Hierarchy Generator]
        DATAFLOW[Data Flow Generator]
    end

    subgraph DocsGenerators["Documentation Generators"]
        README_GEN[README Generator]
        AGENTS_GEN[AGENTS.md Generator]
    end

    subgraph Templates["Templates"]
        README_TPL[readme.hbs]
        AGENTS_TPL[agents.hbs]
    end

    subgraph Output["Output Files"]
        OUT_README[README.md]
        OUT_AGENTS[AGENTS.md]
        OUT_JSON[agentscope.json]
        OUT_DIAGRAMS[Embedded Diagrams]
    end

    CONFIG --> COMP_MAP
    CONFIG --> WORKFLOW
    CONFIG --> HIERARCHY
    CONFIG --> DATAFLOW

    CONFIG --> README_GEN
    CONFIG --> AGENTS_GEN

    COMP_MAP --> OUT_DIAGRAMS
    WORKFLOW --> OUT_DIAGRAMS
    HIERARCHY --> OUT_DIAGRAMS
    DATAFLOW --> OUT_DIAGRAMS

    README_GEN --> README_TPL
    AGENTS_GEN --> AGENTS_TPL

    README_TPL --> OUT_README
    AGENTS_TPL --> OUT_AGENTS
    CONFIG --> OUT_JSON

    OUT_DIAGRAMS --> OUT_README
```

---

## 4. Data Flow Diagram

Shows how data flows through the system during a scan operation.

```mermaid
flowchart LR
    subgraph Input["Input Sources"]
        direction TB
        A1[".claude/agents/*.md"]
        A2[".claude/skills/*.md"]
        A3[".claude/commands/*.md"]
        A4["CLAUDE.md"]
        A5[".mcp.json"]
        A6["~/.claude/*"]
    end

    subgraph Discovery["File Discovery"]
        D1[globby patterns]
        D2[Platform paths]
    end

    subgraph Parsing["Parsing Phase"]
        P1[YAML Parser]
        P2[Frontmatter Parser]
        P3[JSON Parser]
        P4[Markdown Parser]
    end

    subgraph Transform["Transform Phase"]
        T1[Partial Configs]
        T2[Merge Operation]
        T3[Unified Model]
    end

    subgraph Validate["Validation Phase"]
        V1[Schema Validation]
        V2[Reference Check]
        V3[Error Collection]
    end

    subgraph Generate["Generation Phase"]
        G1[Mermaid Generation]
        G2[Template Rendering]
        G3[File Writing]
    end

    subgraph Output["Output"]
        O1["docs/agent-architecture/README.md"]
        O2["docs/agent-architecture/AGENTS.md"]
        O3["docs/agent-architecture/raw/agentscope.json"]
    end

    Input --> Discovery
    Discovery --> Parsing

    A1 & A2 & A3 --> P2
    A4 --> P4
    A5 --> P3
    A6 --> P2

    Parsing --> T1
    T1 --> T2
    T2 --> T3

    T3 --> V1
    V1 --> V2
    V2 --> V3

    T3 --> G1
    T3 --> G2
    G1 --> G2
    G2 --> G3

    G3 --> O1
    G3 --> O2
    G3 --> O3
```

---

## 5. Sequence Diagrams

### 5.1 Scan Command Sequence

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant CLI
    participant Scanner
    participant Registry
    participant Parser
    participant Validator
    participant Generator
    participant FileSystem

    User->>CLI: agentscope scan
    CLI->>Scanner: scan(projectPath, options)

    Scanner->>Registry: detectParsers(projectPath)
    Registry->>Parser: detect(projectPath)
    Parser-->>Registry: true/false
    Registry-->>Scanner: [ClaudeCodeParser, MCPParser]

    loop For each parser
        Scanner->>Parser: parse(projectPath)
        Parser->>FileSystem: globby(patterns)
        FileSystem-->>Parser: filePaths[]

        loop For each file
            Parser->>FileSystem: readFile(path)
            FileSystem-->>Parser: content
            Parser->>Parser: parseContent(content)
        end

        Parser-->>Scanner: PartialConfig
    end

    Scanner->>Scanner: mergeConfigs(partials)
    Scanner->>Validator: validate(config)
    Validator-->>Scanner: ValidationResult

    alt Validation has fatal errors
        Scanner-->>CLI: { errors, exitCode: 1 }
        CLI-->>User: Error output
    else Validation passes
        Scanner->>Generator: generateDiagrams(config)
        Generator-->>Scanner: DiagramResult[]

        Scanner->>Generator: generateDocs(config, diagrams)
        Generator->>FileSystem: writeFiles(files)
        FileSystem-->>Generator: success

        Generator-->>Scanner: GeneratedFile[]
        Scanner-->>CLI: ScanOutput
        CLI-->>User: Success output
    end
```

### 5.2 Validation Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Scanner
    participant Validator
    participant Schemas
    participant RefChecker

    Scanner->>Validator: validate(config, options)

    Validator->>Schemas: validateSchema(config)

    alt Schema invalid
        Schemas-->>Validator: { valid: false, errors }
        Validator-->>Scanner: ValidationResult(fatal errors)
    else Schema valid
        Schemas-->>Validator: { valid: true }

        Validator->>RefChecker: checkReferences(config)

        Note over RefChecker: Check agent->skill refs
        Note over RefChecker: Check agent->tool refs
        Note over RefChecker: Check circular dependencies

        RefChecker-->>Validator: warnings[]

        Validator->>Validator: combineErrors(schemaErrors, refWarnings)
        Validator-->>Scanner: ValidationResult(warnings only)
    end
```

---

## 6. Class Diagram (Simplified)

Shows the key classes and their relationships.

```mermaid
classDiagram
    class AgentScopeConfig {
        +ScanMeta meta
        +Agent[] agents
        +Skill[] skills
        +Hook[] hooks
        +Command[] commands
        +MCPServer[] mcpServers
        +Settings settings
        +ScanError[] errors
    }

    class Agent {
        +string id
        +string name
        +string description
        +ConfigSource source
        +string sourcePath
        +string[] allowedTools
        +string[] skills
        +AgentType type
        +string configSnippet
    }

    class Skill {
        +string id
        +string name
        +string description
        +string[] allowedTools
        +string[] triggers
        +string instructions
    }

    class MCPServer {
        +string id
        +string name
        +string command
        +string[] args
        +MCPTool[] tools
    }

    class ParserPlugin {
        <<interface>>
        +string name
        +string[] frameworks
        +detect(path) boolean
        +parse(path) PartialConfig
    }

    class DiagramGenerator {
        <<interface>>
        +DiagramType diagramType
        +generate(config) string
    }

    class ParserRegistry {
        -Map~string,ParserPlugin~ parsers
        +register(parser)
        +detectParsers(path)
        +getByName(name)
    }

    class Scanner {
        -ParserRegistry registry
        -Validator validator
        +scan(path, options) AgentScopeConfig
    }

    class Validator {
        +validate(config) ValidationResult
        +validatePartial(partial) ValidationResult
    }

    AgentScopeConfig "1" *-- "*" Agent
    AgentScopeConfig "1" *-- "*" Skill
    AgentScopeConfig "1" *-- "*" MCPServer

    Agent "*" --> "*" Skill : uses

    ParserRegistry "1" *-- "*" ParserPlugin
    Scanner --> ParserRegistry
    Scanner --> Validator
    Scanner --> DiagramGenerator
```

---

## 7. Package Dependency Diagram

Shows dependencies between internal packages.

```mermaid
flowchart BT
    subgraph External["External Dependencies"]
        commander
        globby
        gray-matter[gray-matter]
        js-yaml[js-yaml]
        zod
        fs-extra[fs-extra]
        handlebars
    end

    subgraph Internal["Internal Packages"]
        utils["src/utils"]
        model["src/core/model"]
        errors["src/core/errors"]
        services["src/core/services"]
        discovery["src/discovery"]
        validators["src/validators"]
        parsers["src/parsers"]
        generators["src/generators"]
        cli["src/cli"]
    end

    utils --> fs-extra

    model --> zod
    errors --> model

    discovery --> globby
    discovery --> utils

    validators --> zod
    validators --> model
    validators --> errors

    parsers --> gray-matter
    parsers --> js-yaml
    parsers --> model
    parsers --> discovery
    parsers --> errors

    generators --> handlebars
    generators --> model
    generators --> utils

    services --> parsers
    services --> validators
    services --> generators
    services --> model

    cli --> commander
    cli --> services
    cli --> model
```

---

## 8. Deployment Diagram

Shows how AgentScope is distributed and used.

```mermaid
flowchart TB
    subgraph npm["npm Registry"]
        PKG[agentscope package]
    end

    subgraph DevMachine["Developer Machine"]
        subgraph Global["Global Install"]
            GLOBAL_BIN[/usr/local/bin/agentscope]
        end

        subgraph Project["Project Directory"]
            NODE_MODULES[node_modules/agentscope]
            PROJECT_FILES[.claude/, CLAUDE.md, .mcp.json]
            OUTPUT_DIR[docs/agent-architecture/]
        end

        subgraph UserDir["User Directory"]
            USER_CONFIG[~/.claude/]
        end
    end

    subgraph Usage["Usage Patterns"]
        NPM_GLOBAL[npm install -g agentscope]
        NPM_DEV[npm install -D agentscope]
        NPX[npx agentscope scan]
    end

    PKG --> NPM_GLOBAL
    PKG --> NPM_DEV
    PKG --> NPX

    NPM_GLOBAL --> GLOBAL_BIN
    NPM_DEV --> NODE_MODULES
    NPX --> NODE_MODULES

    GLOBAL_BIN --> PROJECT_FILES
    NODE_MODULES --> PROJECT_FILES

    PROJECT_FILES --> OUTPUT_DIR
    USER_CONFIG --> OUTPUT_DIR
```

---

## 9. State Diagram: Scan Process

```mermaid
stateDiagram-v2
    [*] --> Initializing: agentscope scan

    Initializing --> Discovering: Parse CLI options

    Discovering --> Parsing: Files found
    Discovering --> NoFilesError: No config files

    Parsing --> Merging: All files parsed
    Parsing --> ParseError: Fatal parse error

    Merging --> Validating: Configs merged

    Validating --> Generating: Validation passed
    Validating --> ValidationError: Fatal validation error
    Validating --> Generating: Warnings only

    Generating --> Writing: Content generated

    Writing --> Complete: Files written
    Writing --> WriteError: Write failed

    Complete --> [*]: Exit 0

    NoFilesError --> [*]: Exit 1
    ParseError --> [*]: Exit 1
    ValidationError --> [*]: Exit 1
    WriteError --> [*]: Exit 1

    note right of Validating
        Warnings are collected
        but don't stop execution
    end note
```

---

## 10. Error Handling Flow

```mermaid
flowchart TB
    subgraph Sources["Error Sources"]
        PARSE[Parse Errors]
        VALIDATE[Validation Errors]
        IO[I/O Errors]
    end

    subgraph Classification["Classification"]
        FATAL[Fatal Errors]
        WARNING[Warnings]
        INFO[Info Messages]
    end

    subgraph Handling["Error Handling"]
        COLLECT[Error Collector]
        REPORT[Error Reporter]
        EXIT[Exit Handler]
    end

    subgraph Output["Output"]
        STDERR[stderr]
        STDOUT[stdout]
        DOCS[Generated Docs]
        CODE[Exit Code]
    end

    PARSE --> FATAL
    PARSE --> WARNING
    VALIDATE --> WARNING
    VALIDATE --> INFO
    IO --> FATAL

    FATAL --> COLLECT
    WARNING --> COLLECT
    INFO --> COLLECT

    COLLECT --> REPORT

    FATAL --> EXIT

    REPORT --> STDERR
    REPORT --> STDOUT
    WARNING --> DOCS
    INFO --> DOCS

    EXIT --> CODE

    style FATAL fill:#f96,stroke:#333
    style WARNING fill:#ff9,stroke:#333
    style INFO fill:#9cf,stroke:#333
```

---

*Document Version: 1.0 | January 2026 | Architecture Diagrams*
