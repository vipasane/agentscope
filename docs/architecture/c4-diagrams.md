# AgentScope v1.2 - C4 Architecture Diagrams

## C4 Model Overview

The C4 model provides a hierarchical view of the software architecture:

1. **System Context** - How AgentScope fits in the broader ecosystem
2. **Container** - High-level technology choices and system decomposition
3. **Component** - Detailed component responsibilities and relationships
4. **Code** - Class-level design (selective, for complex areas)

---

## Level 1: System Context Diagram

### Purpose

Shows how AgentScope fits into the user's development workflow.

```mermaid
C4Context
    title System Context Diagram - AgentScope v1.2

    Person(developer, "AI Developer", "Builds agents with Claude Code, Cursor, etc.")

    System(agentscope, "AgentScope", "Scans, validates, and documents AI agent configurations")

    System_Ext(claude_flow, "Claude-Flow", "Intelligence layer with hooks, memory, and workers")
    System_Ext(agentdb, "AgentDB", "Vector database with HNSW search")
    System_Ext(aidefence, "AIDefence", "Prompt injection and threat detection")

    SystemDb(config_files, "Agent Configs", ".claude/, CLAUDE.md, .mcp.json")

    System_Ext(github, "GitHub", "Version control and CI/CD")
    System_Ext(flow_nexus, "Flow-Nexus", "Cloud deployment (future)")

    Rel(developer, agentscope, "Uses", "CLI")
    Rel(agentscope, config_files, "Reads")
    Rel(agentscope, claude_flow, "Integrates with", "npx CLI")
    Rel(claude_flow, agentdb, "Stores patterns in")
    Rel(agentscope, aidefence, "Uses for threat detection")
    Rel(agentscope, github, "Integrates with", "GitHub Actions")
    Rel_U(developer, flow_nexus, "Future: Web UI")
```

### Key Actors

| Actor | Description |
|-------|-------------|
| **AI Developer** | Primary user - builds AI agents and needs documentation |
| **AgentScope** | Core system - scans and validates agent configurations |
| **Claude-Flow** | External system - provides intelligence and learning |
| **AgentDB** | External system - vector database for pattern storage |
| **AIDefence** | External system - advanced threat detection |
| **GitHub** | External system - version control and CI/CD integration |
| **Flow-Nexus** | Future external system - cloud deployment platform |

---

## Level 2: Container Diagram

### Purpose

Shows the major technology containers and how they interact.

```mermaid
C4Container
    title Container Diagram - AgentScope v1.2

    Person(developer, "AI Developer")

    Container_Boundary(agentscope_cli, "AgentScope CLI") {
        Container(cli, "Command-Line Interface", "Node.js/TypeScript", "Scan, validate, export commands")
    }

    Container_Boundary(integration_layer, "Integration Layer") {
        Container(hook_orchestrator, "Hook Orchestrator", "TypeScript", "Executes claude-flow hooks")
        Container(memory_manager, "Memory Manager", "TypeScript", "Manages AgentDB storage")
        Container(worker_coordinator, "Worker Coordinator", "TypeScript", "Dispatches background workers")
    }

    Container_Boundary(intelligence_layer, "Intelligence Layer") {
        Container(pattern_recognizer, "Pattern Recognizer", "TypeScript", "Identifies recurring patterns")
        Container(trajectory_tracker, "Trajectory Tracker", "TypeScript", "Tracks operation sequences")
        Container(neural_router, "Neural Router", "TypeScript", "Routes tasks with MoE")
    }

    Container_Boundary(security_layer, "Security Layer") {
        Container(validator_engine, "Validator Engine", "TypeScript", "Orchestrates 5 validators")
        Container(threat_detector, "Threat Detector", "TypeScript/AIDefence", "Detects security threats")
        Container(risk_assessor, "Risk Assessor", "TypeScript", "Calculates DREAD scores")
    }

    Container_Boundary(performance_layer, "Performance Layer") {
        Container(vector_search, "Vector Search", "TypeScript/AgentDB", "HNSW-based fast search")
        Container(cache_manager, "Cache Manager", "TypeScript", "Intelligent caching")
    }

    Container_Boundary(core_layer, "Core Layer (v1.1)") {
        Container(scanner, "Scanner", "TypeScript", "Parses agent configs")
        Container(generator, "Diagram Generator", "TypeScript", "Creates Mermaid diagrams")
        Container(formatter, "Output Formatter", "TypeScript", "Formats documentation")
    }

    ContainerDb(agentdb, "AgentDB", "SQLite/WASM", "Pattern and threat storage")

    System_Ext(claude_flow_cli, "Claude-Flow CLI", "npx @claude-flow/cli@latest")
    System_Ext(aidefence_lib, "AIDefence Library", "@claude-flow/aidefence")

    Rel(developer, cli, "Runs", "agentscope scan")
    Rel(cli, hook_orchestrator, "Triggers hooks")
    Rel(hook_orchestrator, claude_flow_cli, "Executes", "npx")
    Rel(hook_orchestrator, memory_manager, "Stores results")
    Rel(memory_manager, agentdb, "Reads/writes")
    Rel(pattern_recognizer, memory_manager, "Searches patterns")
    Rel(threat_detector, aidefence_lib, "Uses")
    Rel(threat_detector, memory_manager, "Searches threats")
    Rel(validator_engine, threat_detector, "Uses")
    Rel(vector_search, agentdb, "HNSW search")
    Rel(cli, scanner, "Initiates scan")
    Rel(scanner, generator, "Passes config")
    Rel(generator, formatter, "Passes diagrams")
```

### Container Responsibilities

| Container | Technology | Responsibility |
|-----------|-----------|----------------|
| **CLI** | Node.js/TypeScript | User interface, command parsing |
| **Hook Orchestrator** | TypeScript | Execute lifecycle hooks |
| **Memory Manager** | TypeScript | AgentDB interface |
| **Worker Coordinator** | TypeScript | Background worker dispatch |
| **Pattern Recognizer** | TypeScript | Identify patterns in configs |
| **Trajectory Tracker** | TypeScript | Track operation sequences |
| **Neural Router** | TypeScript | MoE-based task routing |
| **Validator Engine** | TypeScript | Security validation orchestration |
| **Threat Detector** | TypeScript/AIDefence | Advanced threat detection |
| **Risk Assessor** | TypeScript | DREAD scoring |
| **Vector Search** | TypeScript/AgentDB | Fast pattern/threat search |
| **Cache Manager** | TypeScript | Intelligent caching |
| **Scanner** | TypeScript | Config file parsing |
| **Diagram Generator** | TypeScript | Mermaid diagram creation |
| **Output Formatter** | TypeScript | Documentation formatting |

---

## Level 3: Component Diagram

### Integration Layer Components

```mermaid
C4Component
    title Component Diagram - Integration Layer

    Container_Boundary(integration_layer, "Integration Layer") {
        Component(hook_registry, "Hook Registry", "Map<HookType, Hook[]>", "Stores registered hooks")
        Component(hook_executor, "Hook Executor", "Class", "Executes individual hooks")
        Component(pattern_store, "Pattern Store", "Class", "Stores successful patterns")
        Component(pattern_search, "Pattern Search", "Class", "Searches similar patterns")
        Component(worker_selector, "Worker Selector", "Class", "Selects appropriate worker")
        Component(worker_dispatcher, "Worker Dispatcher", "Class", "Dispatches workers")
    }

    ContainerDb(agentdb, "AgentDB")
    System_Ext(claude_flow_cli, "Claude-Flow CLI")

    Rel(hook_registry, hook_executor, "Provides hooks to")
    Rel(hook_executor, claude_flow_cli, "Executes via")
    Rel(hook_executor, pattern_store, "Stores results in")
    Rel(pattern_store, agentdb, "Persists to")
    Rel(pattern_search, agentdb, "Queries")
    Rel(worker_selector, worker_dispatcher, "Selects for")
    Rel(worker_dispatcher, claude_flow_cli, "Executes via")
```

---

### Security Layer Components

```mermaid
C4Component
    title Component Diagram - Security Layer

    Container_Boundary(security_layer, "Security Layer") {
        Component(settings_validator, "Settings Validator", "Class", "Validates .claude/settings.json")
        Component(prompt_injection_detector, "Prompt Injection Detector", "Class", "Detects CLAUDE.md injection")
        Component(agent_config_validator, "Agent Config Validator", "Class", "Validates agent definitions")
        Component(mcp_endpoint_validator, "MCP Endpoint Validator", "Class", "Validates MCP server configs")
        Component(secret_detector, "Secret Detector", "Class", "Detects hardcoded secrets")

        Component(threat_storage, "Threat Storage", "Class", "Stores known threats")
        Component(threat_search, "Threat Search", "Class", "Searches similar threats")
        Component(dread_calculator, "DREAD Calculator", "Class", "Calculates risk scores")
    }

    ContainerDb(agentdb, "AgentDB")
    System_Ext(aidefence, "AIDefence")

    Rel(settings_validator, threat_search, "Checks against")
    Rel(prompt_injection_detector, aidefence, "Uses")
    Rel(prompt_injection_detector, threat_search, "Checks against")
    Rel(secret_detector, threat_storage, "Stores new threats in")
    Rel(threat_storage, agentdb, "Persists to")
    Rel(threat_search, agentdb, "Queries")
    Rel(dread_calculator, settings_validator, "Scores results from")
```

---

### Performance Layer Components

```mermaid
C4Component
    title Component Diagram - Performance Layer

    Container_Boundary(performance_layer, "Performance Layer") {
        Component(hnsw_index, "HNSW Index", "Class", "Hierarchical NSW graph")
        Component(embedding_generator, "Embedding Generator", "Class", "Generates text embeddings")
        Component(cache_storage, "Cache Storage", "Map", "In-memory cache")
        Component(cache_policy, "Cache Policy", "Class", "LRU eviction policy")
        Component(cache_validator, "Cache Validator", "Class", "Validates cache entries")
    }

    ContainerDb(agentdb, "AgentDB")

    Rel(hnsw_index, agentdb, "Queries")
    Rel(embedding_generator, hnsw_index, "Provides embeddings to")
    Rel(cache_storage, cache_policy, "Uses")
    Rel(cache_validator, cache_storage, "Validates entries in")
```

---

## Level 4: Code Diagram (Selective)

### Hook Orchestrator Class Diagram

```mermaid
classDiagram
    class HookOrchestrator {
        -hookRegistry: Map~HookType, Hook[]~
        -memoryManager: MemoryManager
        -executor: HookExecutor
        +register(type: HookType, hook: Hook): void
        +execute(type: HookType, context: HookContext): Promise~HookResult[]~
        +unregister(type: HookType, hookName: string): boolean
    }

    class HookExecutor {
        +executeHook(hook: Hook, context: HookContext): Promise~HookResult~
        +validateHook(hook: Hook): boolean
        -buildCommand(hook: Hook): string
    }

    class MemoryManager {
        -agentDb: AgentDB
        +storePattern(pattern: Pattern): Promise~void~
        +searchPatterns(query: string, limit: number): Promise~Pattern[]~
        +storeThreat(threat: SecurityThreat): Promise~void~
        +searchThreats(content: string, limit: number): Promise~SecurityThreat[]~
        -generateEmbedding(data: unknown): Promise~number[]~
    }

    class Hook {
        +name: string
        +command: string
        +args: string
        +timeout?: number
        +continueOnError: boolean
    }

    class HookContext {
        +config: AgentConfig
        +operation: string
        +metadata: Record~string, unknown~
    }

    class HookResult {
        +success: boolean
        +output?: unknown
        +error?: string
        +duration: number
    }

    HookOrchestrator --> HookExecutor
    HookOrchestrator --> MemoryManager
    HookOrchestrator --> Hook
    HookExecutor ..> HookContext
    HookExecutor ..> HookResult
```

---

### Security Validator Class Hierarchy

```mermaid
classDiagram
    class SecurityValidator {
        <<abstract>>
        +name: string
        +validate(config: AgentConfig, knownThreats: SecurityThreat[]): Promise~SecurityIssue[]~*
    }

    class ClaudeSettingsValidator {
        +name: "claude-settings"
        +validate(config, threats): Promise~SecurityIssue[]~
        -validateSchema(settings): ValidationResult
        -checkInsecureSettings(settings): SecurityIssue[]
    }

    class PromptInjectionDetector {
        +name: "prompt-injection"
        +validate(config, threats): Promise~SecurityIssue[]~
        -detectInjection(content: string): boolean
        -useAIDefence(content: string): Promise~DetectionResult~
    }

    class AgentConfigValidator {
        +name: "agent-config"
        +validate(config, threats): Promise~SecurityIssue[]~
        -validatePermissions(config): SecurityIssue[]
        -detectCircularDelegation(config): SecurityIssue[]
    }

    class McpEndpointValidator {
        +name: "mcp-endpoint"
        +validate(config, threats): Promise~SecurityIssue[]~
        -validateURL(url: string): boolean
        -checkTransportSecurity(server): SecurityIssue[]
    }

    class SecretDetector {
        +name: "secret-detector"
        +validate(config, threats): Promise~SecurityIssue[]~
        -detectSecrets(content: string): SecretFinding[]
        -calculateEntropy(str: string): number
    }

    SecurityValidator <|-- ClaudeSettingsValidator
    SecurityValidator <|-- PromptInjectionDetector
    SecurityValidator <|-- AgentConfigValidator
    SecurityValidator <|-- McpEndpointValidator
    SecurityValidator <|-- SecretDetector
```

---

### Memory Manager Pattern Storage

```mermaid
classDiagram
    class MemoryManager {
        -agentDb: AgentDB
        -embeddingGenerator: EmbeddingGenerator
        +storePattern(pattern): Promise~void~
        +searchPatterns(query, limit): Promise~Pattern[]~
    }

    class AgentDB {
        +store(entry): Promise~void~
        +searchHNSW(query): Promise~SearchResult[]~
        +search(query): Promise~SearchResult[]~
    }

    class EmbeddingGenerator {
        +generate(text): Promise~number[]~
        +batch(texts): Promise~number[][]~
    }

    class Pattern {
        +id: string
        +hook: string
        +context: HookContext
        +result: HookResult
        +timestamp: number
        +embedding: number[]
    }

    class SecurityThreat {
        +id: string
        +pattern: string
        +severity: string
        +category: string
        +embedding: number[]
    }

    MemoryManager --> AgentDB
    MemoryManager --> EmbeddingGenerator
    MemoryManager ..> Pattern
    MemoryManager ..> SecurityThreat
```

---

## Deployment Architecture

### Local Development

```
┌────────────────────────────────────────────────┐
│         Developer Machine                      │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │   Project Directory                      │  │
│  │   ├── .claude/                           │  │
│  │   ├── CLAUDE.md                          │  │
│  │   └── .mcp.json                          │  │
│  └──────────────────────────────────────────┘  │
│                    ↓                           │
│  ┌──────────────────────────────────────────┐  │
│  │   AgentScope CLI                         │  │
│  │   (npx @vipasane/agentscope scan)        │  │
│  └──────────────┬───────────────────────────┘  │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │   Integration Layer                      │  │
│  │   ├── Hook Orchestrator                  │  │
│  │   ├── Memory Manager                     │  │
│  │   └── Worker Coordinator                 │  │
│  └──────────────┬───────────────────────────┘  │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │   Claude-Flow CLI (npx)                  │  │
│  │   └── Hooks, Memory, Workers             │  │
│  └──────────────┬───────────────────────────┘  │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │   AgentDB (SQLite)                       │  │
│  │   ~/.agentscope/memory.db                │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

### CI/CD Integration (GitHub Actions)

```
┌────────────────────────────────────────────────┐
│         GitHub Actions Runner                  │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │   Step 1: Checkout Code                  │  │
│  └──────────────┬───────────────────────────┘  │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │   Step 2: Setup Node.js                  │  │
│  └──────────────┬───────────────────────────┘  │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │   Step 3: Install AgentScope             │  │
│  │   npm install -g @vipasane/agentscope    │  │
│  └──────────────┬───────────────────────────┘  │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │   Step 4: Scan & Validate                │  │
│  │   agentscope scan --security --strict    │  │
│  └──────────────┬───────────────────────────┘  │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │   Step 5: Check Security Report          │  │
│  │   if critical issues → fail build        │  │
│  └──────────────┬───────────────────────────┘  │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │   Step 6: Upload Artifacts               │  │
│  │   - Security report                      │  │
│  │   - Generated diagrams                   │  │
│  │   - Documentation                        │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

### Cloud Deployment (Future - Flow-Nexus)

```
┌────────────────────────────────────────────────┐
│         User Browser                           │
└──────────────────┬─────────────────────────────┘
                   ↓ HTTPS
┌────────────────────────────────────────────────┐
│         Load Balancer                          │
└──────────────────┬─────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────┐
│         Flow-Nexus Web UI                      │
│         (React/Next.js)                        │
└──────────────────┬─────────────────────────────┘
                   ↓ REST API
┌────────────────────────────────────────────────┐
│         AgentScope API Server                  │
│         (Node.js/Express)                      │
│  ┌──────────────────────────────────────────┐  │
│  │   API Endpoints                          │  │
│  │   - POST /api/scan                       │  │
│  │   - GET /api/security-report/:id         │  │
│  │   - GET /api/diagrams/:id                │  │
│  └──────────────┬───────────────────────────┘  │
│                 ↓                              │
│  ┌──────────────────────────────────────────┐  │
│  │   Integration Layer                      │  │
│  └──────────────┬───────────────────────────┘  │
└─────────────────┼──────────────────────────────┘
                  ↓
┌────────────────────────────────────────────────┐
│         AgentDB (PostgreSQL + pgvector)        │
│         - Pattern storage                      │
│         - Threat database                      │
│         - HNSW indices                         │
└────────────────────────────────────────────────┘
```

---

## Communication Patterns

### Synchronous Communication

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Integration
    participant Security
    participant Core

    User->>CLI: agentscope scan
    CLI->>Integration: Initialize hooks
    Integration->>Security: Validate config
    Security-->>Integration: Security report
    Integration->>Core: Scan configs
    Core-->>Integration: Parsed configs
    Integration-->>CLI: Results
    CLI-->>User: Output
```

---

### Asynchronous Communication (Workers)

```mermaid
sequenceDiagram
    participant CLI
    participant Integration
    participant ClaudeFlow
    participant Workers

    CLI->>Integration: Scan complete
    Integration->>Integration: Analyze results
    Integration->>ClaudeFlow: Dispatch worker (async)
    ClaudeFlow->>Workers: Trigger map worker
    Note over Workers: Worker runs in background
    Integration-->>CLI: Return results immediately
    Workers-->>ClaudeFlow: Worker complete (callback)
    ClaudeFlow->>Integration: Update memory
```

---

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | >=18.0.0 | JavaScript runtime |
| Language | TypeScript | ^5.9.0 | Type-safe development |
| CLI Framework | Commander | ^14.0.2 | Command-line interface |
| File Parsing | js-yaml | ^4.1.0 | YAML parsing |
| File Globbing | fast-glob | ^3.3.3 | File discovery |
| Testing | Vitest | ^3.0.0 | Unit/integration tests |

---

### Integration Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Claude-Flow | @claude-flow/cli@latest (npx) | Intelligence layer |
| AgentDB | SQLite/WASM | Pattern/threat storage |
| AIDefence | @claude-flow/aidefence | Threat detection |
| Embeddings | @claude-flow/embeddings | Vector generation |

---

### Future Technologies

| Component | Technology | Status | Purpose |
|-----------|-----------|--------|---------|
| WASM Acceleration | WASM SIMD | Planned | 75x faster embeddings |
| Cloud DB | PostgreSQL + pgvector | Planned | Cloud deployment |
| Web UI | React/Next.js | Planned | Browser-based UI |
| API Server | Express.js | Planned | REST API |

---

## Conclusion

The C4 model provides a comprehensive view of AgentScope v1.2's architecture:

- **Level 1 (System Context)**: Shows AgentScope in the broader ecosystem
- **Level 2 (Container)**: Shows the 5-layer architecture and technology choices
- **Level 3 (Component)**: Details component responsibilities within each layer
- **Level 4 (Code)**: Shows class-level design for complex areas

This architecture enables:
- ✅ Modularity and maintainability
- ✅ Clear separation of concerns
- ✅ Extensibility through plugin system
- ✅ Testability at all levels
- ✅ Backward compatibility with v1.1

---

*AgentScope Architecture Team*
*2026-01-25*
