# AgentScope Architecture Document

> **Version**: 1.0
> **Date**: January 2026
> **Status**: Ready for Implementation

---

## 1. Overview

AgentScope is a CLI tool that scans Claude Code configurations and generates Mermaid diagrams plus documentation. This document describes the implementation architecture following Domain-Driven Design (DDD) principles.

### 1.1 Architecture Goals

| Goal | Description |
|------|-------------|
| **Extensibility** | Plugin-based parsers for future framework support |
| **Testability** | Clear separation of concerns enabling unit/integration/snapshot testing |
| **Simplicity** | Minimal dependencies (~11 packages), straightforward data flow |
| **Library-First** | Core logic usable as library; CLI is a thin wrapper |

### 1.2 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture Style | Layered with DDD | Clear boundaries, testable components |
| Primary Pattern | Pipeline | Scan -> Transform -> Generate |
| Plugin Model | Parser plugins | Enables framework extensibility |
| Error Strategy | Categorized (fatal/warning/info) | Continue on warnings, fail on fatals |
| Output Format | Mermaid markdown | GitHub-native rendering |

---

## 2. System Context (C4 Level 1)

```
+-------------------+
|     Developer     |
+--------+----------+
         |
         | runs CLI
         v
+-------------------+         +--------------------+
|    AgentScope     |-------->|  Generated Docs    |
|       CLI         |         |  (docs/agent-      |
+-------------------+         |   architecture/)   |
         |                    +--------------------+
         | reads
         v
+-------------------+
|  Project Files    |
|  - .claude/       |
|  - CLAUDE.md      |
|  - .mcp.json      |
|  - ~/.claude/     |
+-------------------+
```

### External Interfaces

| Interface | Direction | Description |
|-----------|-----------|-------------|
| File System (Read) | Input | Configuration files from project and user directories |
| File System (Write) | Output | Generated documentation and diagrams |
| stdout/stderr | Output | CLI feedback, progress, errors |
| Exit Codes | Output | 0 = success, 1 = fatal error |

---

## 3. Container Diagram (C4 Level 2)

```
+------------------------------------------------------------------+
|                         AgentScope                                |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+    +------------------+    +--------------+ |
|  |       CLI        |    |      Core        |    |   Plugins    | |
|  |   (commander)    |--->|    Library       |<---|  (Parsers)   | |
|  +------------------+    +------------------+    +--------------+ |
|                                 |                                 |
|                                 v                                 |
|  +------------------+    +------------------+    +--------------+ |
|  |    Generators    |<---|  Unified Model   |--->|  Validators  | |
|  |  (Mermaid/Docs)  |    | (AgentScopeConfig)|   |    (Zod)     | |
|  +------------------+    +------------------+    +--------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

---

## 4. Package Structure

```
agentscope/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Library entry point (exports)
│   │
│   ├── core/                    # Domain Layer
│   │   ├── model/               # Domain entities and value objects
│   │   │   ├── index.ts
│   │   │   ├── types.ts         # Core TypeScript interfaces
│   │   │   ├── agent.ts         # Agent entity
│   │   │   ├── skill.ts         # Skill value object
│   │   │   ├── hook.ts          # Hook value object
│   │   │   ├── command.ts       # Command value object
│   │   │   ├── mcp-server.ts    # MCPServer entity
│   │   │   └── scan-result.ts   # ScanResult aggregate root
│   │   │
│   │   ├── errors/              # Domain errors
│   │   │   ├── index.ts
│   │   │   ├── scan-error.ts    # ScanError with levels
│   │   │   └── validation-error.ts
│   │   │
│   │   └── services/            # Domain services
│   │       ├── index.ts
│   │       ├── scanner.ts       # Scanner orchestration service
│   │       └── merger.ts        # Config merge service
│   │
│   ├── parsers/                 # Infrastructure - Input Adapters
│   │   ├── index.ts
│   │   ├── parser.interface.ts  # Parser plugin interface
│   │   ├── parser-registry.ts   # Plugin registration
│   │   ├── claude-code/         # Claude Code parser plugin
│   │   │   ├── index.ts
│   │   │   ├── parser.ts        # Main parser implementation
│   │   │   ├── agent-parser.ts  # Agent file parser
│   │   │   ├── skill-parser.ts  # Skill file parser
│   │   │   ├── hook-parser.ts   # Hook parser
│   │   │   ├── command-parser.ts# Command parser
│   │   │   └── settings-parser.ts
│   │   │
│   │   └── mcp/                 # MCP parser plugin
│   │       ├── index.ts
│   │       └── parser.ts        # .mcp.json parser
│   │
│   ├── generators/              # Infrastructure - Output Adapters
│   │   ├── index.ts
│   │   ├── generator.interface.ts
│   │   ├── mermaid/             # Mermaid diagram generators
│   │   │   ├── index.ts
│   │   │   ├── component-map.ts # Component Map diagram
│   │   │   ├── workflow-sequence.ts # Workflow Sequence diagram
│   │   │   ├── hierarchy.ts     # Agent Hierarchy diagram
│   │   │   ├── dataflow.ts      # Data Flow diagram
│   │   │   └── utils.ts         # Mermaid syntax helpers
│   │   │
│   │   └── docs/                # Documentation generators
│   │       ├── index.ts
│   │       ├── readme.ts        # README.md generator
│   │       ├── agents.ts        # AGENTS.md generator
│   │       └── templates/       # Handlebars templates
│   │           ├── readme.hbs
│   │           └── agents.hbs
│   │
│   ├── validators/              # Infrastructure - Validation
│   │   ├── index.ts
│   │   ├── schemas.ts           # Zod schemas for all entities
│   │   └── validator.ts         # Validation service
│   │
│   ├── discovery/               # Infrastructure - File Discovery
│   │   ├── index.ts
│   │   ├── file-finder.ts       # Glob-based file discovery
│   │   └── paths.ts             # Platform-specific paths
│   │
│   ├── cli/                     # Application Layer - CLI
│   │   ├── index.ts             # CLI entry point
│   │   ├── program.ts           # Commander setup
│   │   ├── commands/
│   │   │   ├── scan.ts          # scan command
│   │   │   ├── validate.ts      # validate command
│   │   │   └── version.ts       # version command
│   │   │
│   │   ├── output/              # CLI output formatting
│   │   │   ├── index.ts
│   │   │   ├── console.ts       # Console output helpers
│   │   │   └── progress.ts      # Progress indicators
│   │   │
│   │   └── options.ts           # CLI option definitions
│   │
│   └── utils/                   # Shared utilities
│       ├── index.ts
│       ├── fs.ts                # File system helpers (fs-extra wrapper)
│       └── logger.ts            # Logging utility
│
├── tests/
│   ├── unit/
│   │   ├── core/
│   │   │   └── model/
│   │   ├── parsers/
│   │   │   ├── claude-code.test.ts
│   │   │   └── mcp.test.ts
│   │   ├── generators/
│   │   │   ├── mermaid.test.ts
│   │   │   └── docs.test.ts
│   │   └── validators/
│   │       └── schemas.test.ts
│   │
│   ├── integration/
│   │   ├── scan.test.ts
│   │   └── cli.test.ts
│   │
│   ├── snapshots/
│   │   └── diagrams/
│   │       ├── component-map.snap.md
│   │       └── workflow-sequence.snap.md
│   │
│   └── fixtures/
│       ├── minimal/             # Basic project structure
│       │   ├── .claude/
│       │   │   └── agents/
│       │   └── CLAUDE.md
│       │
│       ├── complete/            # All features used
│       │   ├── .claude/
│       │   │   ├── agents/
│       │   │   ├── skills/
│       │   │   ├── commands/
│       │   │   └── settings.json
│       │   ├── .mcp.json
│       │   └── CLAUDE.md
│       │
│       └── edge-cases/          # Error conditions
│           ├── invalid-yaml/
│           ├── missing-refs/
│           └── circular-deps/
│
└── bin/
    └── agentscope.js            # CLI executable entry
```

---

## 5. Component Diagram (C4 Level 3)

### 5.1 Core Domain Layer

The domain layer contains the business logic and is framework-agnostic.

```
+-------------------------------------------------------------------+
|                          Core Domain                               |
+-------------------------------------------------------------------+
|                                                                    |
|  +------------------+    +------------------+    +---------------+ |
|  |   ScanResult     |    |     Agent        |    |    Skill      | |
|  |  (Aggregate)     |    |    (Entity)      |    | (Value Obj)   | |
|  |                  |    |                  |    |               | |
|  | - meta           |    | - id             |    | - id          | |
|  | - agents[]       |    | - name           |    | - name        | |
|  | - skills[]       |    | - description    |    | - description | |
|  | - hooks[]        |    | - source         |    | - allowedTools| |
|  | - commands[]     |    | - sourcePath     |    | - triggers    | |
|  | - mcpServers[]   |    | - allowedTools   |    +---------------+ |
|  | - settings       |    | - skills[]       |                      |
|  | - errors[]       |    | - configSnippet  |                      |
|  +------------------+    +------------------+                      |
|                                                                    |
|  +------------------+    +------------------+    +---------------+ |
|  |     Hook         |    |    Command       |    |   MCPServer   | |
|  |  (Value Obj)     |    |  (Value Obj)     |    |   (Entity)    | |
|  |                  |    |                  |    |               | |
|  | - id             |    | - id             |    | - id          | |
|  | - event          |    | - name           |    | - name        | |
|  | - handler        |    | - description    |    | - command     | |
|  | - matcher        |    | - allowedTools   |    | - args        | |
|  +------------------+    +------------------+    | - tools[]     | |
|                                                  +---------------+ |
+-------------------------------------------------------------------+
```

### 5.2 Parser Layer

Parsers implement a common interface and are registered in a plugin registry.

```
+-------------------------------------------------------------------+
|                         Parser Layer                               |
+-------------------------------------------------------------------+
|                                                                    |
|  +--------------------+         +-----------------------------+   |
|  |  ParserRegistry    |         |     ParserInterface         |   |
|  |--------------------|         |-----------------------------|   |
|  | - parsers: Map     |<--------|  + detect(path): boolean    |   |
|  | + register()       |         |  + parse(path): PartialConfig|   |
|  | + getParser()      |         |  + name: string             |   |
|  | + getAllParsers()  |         |  + frameworks: string[]     |   |
|  +--------------------+         +-----------------------------+   |
|           ^                              ^                        |
|           |                              |                        |
|           |     +------------------------+------------------------+
|           |     |                        |                        |
|  +--------+-----+-------+    +-----------+---------+             |
|  |  ClaudeCodeParser    |    |     MCPParser       |             |
|  |-----------------------|    |---------------------|             |
|  | + detect()            |    | + detect()          |             |
|  | + parse()             |    | + parse()           |             |
|  | - parseAgents()       |    | - parseServers()    |             |
|  | - parseSkills()       |    | - parseTools()      |             |
|  | - parseHooks()        |    +---------------------+             |
|  | - parseCommands()     |                                        |
|  +-----------------------+                                        |
|                                                                    |
+-------------------------------------------------------------------+
```

### 5.3 Generator Layer

Generators produce output artifacts from the unified model.

```
+-------------------------------------------------------------------+
|                        Generator Layer                             |
+-------------------------------------------------------------------+
|                                                                    |
|  +------------------------+        +--------------------------+   |
|  |  GeneratorInterface    |        |    DiagramGenerator      |   |
|  |------------------------|<-------|--------------------------|   |
|  | + generate(config,     |        | + generateComponentMap() |   |
|  |   options): string     |        | + generateWorkflow()     |   |
|  +------------------------+        | + generateHierarchy()    |   |
|           ^                        | + generateDataFlow()     |   |
|           |                        +--------------------------+   |
|           |                                                       |
|  +--------+----------------+       +--------------------------+   |
|  |    DocsGenerator        |       |   MermaidUtils           |   |
|  |-------------------------|       |--------------------------|   |
|  | + generateReadme()      |       | + escapeLabel()          |   |
|  | + generateAgentsDoc()   |       | + formatNode()           |   |
|  | - loadTemplate()        |       | + formatLink()           |   |
|  | - renderTemplate()      |       | + indent()               |   |
|  +-------------------------+       +--------------------------+   |
|                                                                    |
+-------------------------------------------------------------------+
```

---

## 6. Data Flow

### 6.1 Scan Pipeline

```
                                SCAN PIPELINE
+-----------------------------------------------------------------------+
|                                                                        |
|   [1] DISCOVER        [2] PARSE          [3] VALIDATE    [4] GENERATE |
|                                                                        |
|   +-----------+      +------------+      +----------+    +----------+ |
|   | FileFinder|----->| Parsers    |----->| Validator|    | Mermaid  | |
|   +-----------+      +------------+      +----------+    | Generator| |
|        |                  |                   |          +----------+ |
|        v                  v                   v               |       |
|   List<Path>         PartialConfig       ScanResult          |       |
|                           |                   |               v       |
|                           v                   |          +----------+ |
|                      +--------+               |          | Docs     | |
|                      | Merger |               |          | Generator| |
|                      +--------+               |          +----------+ |
|                           |                   |               |       |
|                           +-------------------+               |       |
|                                                               v       |
|                                                          Output Files |
+-----------------------------------------------------------------------+
```

### 6.2 Detailed Flow Steps

| Step | Component | Input | Output | Errors |
|------|-----------|-------|--------|--------|
| 1. Discover | FileFinder | Project path | List of config file paths | Warning if no files found |
| 2. Parse | Parsers | File paths | PartialConfig objects | Fatal on invalid syntax |
| 3. Merge | Merger | PartialConfigs | Unified ScanResult | Warning on conflicts |
| 4. Validate | Validator | ScanResult | Validated ScanResult | Warning on missing refs |
| 5. Generate Diagrams | MermaidGenerator | ScanResult | Mermaid markdown strings | None expected |
| 6. Generate Docs | DocsGenerator | ScanResult + Diagrams | Markdown files | None expected |
| 7. Write | FileWriter | Generated content | Files on disk | Fatal on write failure |

---

## 7. Error Handling Strategy

### 7.1 Error Categories

```typescript
type ErrorLevel = 'fatal' | 'warning' | 'info';

interface ScanError {
  level: ErrorLevel;
  code: string;           // e.g., 'PARSE_ERROR', 'MISSING_REF'
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}
```

### 7.2 Error Behavior

| Level | Behavior | Example |
|-------|----------|---------|
| **fatal** | Stop scan, exit code 1 | Invalid JSON in .mcp.json |
| **warning** | Continue, include in report | Agent references missing skill |
| **info** | Continue, optional display | Deprecated config format |

### 7.3 Error Codes

| Code | Level | Description |
|------|-------|-------------|
| `E001` | fatal | Invalid YAML syntax |
| `E002` | fatal | Invalid JSON syntax |
| `E003` | fatal | File read permission denied |
| `W001` | warning | Agent references missing skill |
| `W002` | warning | MCP server has no tools defined |
| `W003` | warning | Duplicate agent ID |
| `I001` | info | Deprecated config format |
| `I002` | info | Empty configuration file |

---

## 8. Plugin Architecture

### 8.1 Parser Plugin Interface

```typescript
interface ParserPlugin {
  /** Unique plugin name */
  name: string;

  /** Supported framework identifiers */
  frameworks: string[];

  /** Check if this parser handles the given project */
  detect(projectPath: string): Promise<boolean>;

  /** Parse configurations and return partial config */
  parse(projectPath: string): Promise<PartialConfig>;
}
```

### 8.2 Plugin Registration

```typescript
// Built-in parsers are auto-registered
const registry = new ParserRegistry();
registry.register(new ClaudeCodeParser());
registry.register(new MCPParser());

// Future: External plugins
// registry.register(require('agentscope-parser-bmad'));
```

### 8.3 Extension Points

| Extension Point | Description | Example |
|-----------------|-------------|---------|
| Parser Plugin | Add support for new frameworks | BMad, Gemini CLI |
| Diagram Plugin | Add new diagram types | Timeline, State Machine |
| Output Plugin | Add new output formats | HTML, PDF |

---

## 9. Configuration

### 9.1 CLI Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--output` | string | `./docs/agent-architecture` | Output directory |
| `--format` | enum | `md` | Output format (md, json) |
| `--diagram` | string | (all defaults) | Specific diagram to generate |
| `--all-diagrams` | boolean | false | Generate all diagram types |
| `--strict` | boolean | false | Fail on any warning |
| `--project-only` | boolean | false | Skip user-level configs |
| `--verbose` | boolean | false | Verbose output |

### 9.2 Configuration File (Future)

```yaml
# agentscope.config.yaml (v1.1+)
output:
  directory: ./docs/agent-architecture
  format: md

diagrams:
  defaults:
    - component-map
    - workflow-sequence
  theme: default

parsers:
  include:
    - claude-code
    - mcp
  exclude: []

validation:
  strict: false
  ignorePatterns:
    - "test-*"
```

---

## 10. Testing Strategy

### 10.1 Test Pyramid

```
                    /\
                   /  \
                  / E2E \        <- Manual: Final verification
                 /------\
                /        \
               / Integr.  \      <- Integration: CLI commands, file I/O
              /------------\
             /              \
            /    Unit        \   <- Unit: Parsers, generators, validators
           /------------------\
```

### 10.2 Test Coverage Targets

| Category | Target | Tool |
|----------|--------|------|
| Unit Tests | 80%+ line coverage | Vitest |
| Integration Tests | All CLI commands | Vitest |
| Snapshot Tests | All diagram types | Vitest snapshots |
| Type Coverage | 100% strict mode | TypeScript |

### 10.3 Test Fixtures

| Fixture | Purpose | Contents |
|---------|---------|----------|
| `minimal/` | Happy path | 1 agent, 1 skill, CLAUDE.md |
| `complete/` | Full coverage | All features used |
| `edge-cases/` | Error handling | Invalid files, missing refs |

---

## 11. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Path Traversal | Validate all paths, no `..` allowed |
| Code Injection | No code execution, read-only file access |
| Sensitive Data | Do not parse or expose API keys |
| Large Files | Limit file size to prevent DoS |
| Symlink Attacks | Do not follow symlinks by default |

---

## 12. Performance Considerations

### 12.1 Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scan time (50 components) | < 3 seconds | Benchmark test |
| Memory usage | < 100MB | Heap snapshot |
| File I/O | Parallel where possible | Async operations |

### 12.2 Optimization Strategies

1. **Lazy Loading**: Only load parsers that detect relevant files
2. **Parallel I/O**: Use `Promise.all` for independent file reads
3. **Streaming**: Process large files without loading entirely into memory
4. **Caching**: Cache parsed configs for watch mode (future)

---

## 13. Dependencies

### 13.1 Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| commander | ^12.0.0 | CLI framework |
| globby | ^14.0.0 | File discovery |
| gray-matter | ^4.0.3 | Frontmatter parsing |
| js-yaml | ^4.1.0 | YAML parsing |
| zod | ^3.22.0 | Schema validation |
| fs-extra | ^11.2.0 | File operations |
| handlebars | ^4.7.8 | Template engine |

### 13.2 Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.3.0 | Type system |
| vitest | ^1.0.0 | Testing framework |
| eslint | ^8.0.0 | Linting |
| prettier | ^3.0.0 | Code formatting |

---

## 14. Deployment

### 14.1 Package Distribution

```json
{
  "name": "agentscope",
  "version": "1.0.0",
  "bin": {
    "agentscope": "./bin/agentscope.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### 14.2 Installation Methods

| Method | Command |
|--------|---------|
| Global | `npm install -g agentscope` |
| npx | `npx agentscope scan` |
| Project | `npm install --save-dev agentscope` |

---

## Appendix A: ADR Summary

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-001 | Use Commander.js for CLI | Most widely used, excellent TypeScript support |
| ADR-002 | Use Zod for validation | TypeScript-first, inference support |
| ADR-003 | Plugin-based parsers | Enables future framework support |
| ADR-004 | Mermaid as primary output | GitHub-native rendering |
| ADR-005 | Categorized error handling | Balance between strict and lenient |
| ADR-006 | Library-first architecture | Enables programmatic use |

---

*Document Version: 1.0 | January 2026 | Architecture Phase*
