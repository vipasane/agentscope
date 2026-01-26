# ADR-101: AgentScope Core Architecture

## Status
**Accepted** - 2026-01-26

## Context

AgentScope needs a standalone CLI tool that transforms AI agent configurations from opaque black boxes into transparent, documented, and secure architectures. The tool must:

1. **Zero Dependencies**: Minimize attack surface and ensure fast, reliable installs
2. **Multi-Platform**: Support Claude Code, Cursor, Gemini CLI
3. **Security-First**: Detect secrets, prompt injection, misconfigurations
4. **High Performance**: <2s scan time, <500ms security validation
5. **Professional Output**: README, diagrams, security reports

### Key Architectural Drivers

| Driver | Requirement | Design Impact |
|--------|-------------|---------------|
| **Standalone** | Zero npm dependencies | Bundle validation/templating (~550 lines) |
| **Fast Scans** | <2s for 50 agents | Parallel parsing, lazy generation |
| **Security** | 100% secret detection | 5-layer security architecture |
| **Multi-Platform** | 3+ platforms | Platform abstraction layer |
| **Extensibility** | Future plugins | Clean domain boundaries |

## Decision

We adopt a **DDD-based layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                     CLI Layer                           │
│  (Commands: scan, validate, export, import, template)   │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│                Orchestration Layer                      │
│  (ScanOrchestrator coordinates all operations)          │
└───┬────────┬──────────┬──────────┬──────────┬──────────┘
    │        │          │          │          │
┌───▼───┐┌──▼──┐┌─────▼────┐┌───▼────┐┌────▼─────┐
│Scanner││Valid││Analyzer  ││Generator││Reporter  │
│Domain ││ator ││Domain    ││Domain   ││Domain    │
│       ││Domain│          │         │          │
└───┬───┘└──┬──┘└─────┬────┘└───┬────┘└────┬─────┘
    │       │         │         │          │
┌───▼───────▼─────────▼─────────▼──────────▼─────┐
│              Core Domain Model                  │
│  (Agent, Skill, Hook, MCP, Permission entities) │
└─────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. CLI Layer
**Purpose**: User interface, command parsing, help text

**Components**:
- `scan.ts` - Main scanning command
- `validate.ts` - Configuration validation
- `export.ts` - Export to JSON
- `import.ts` - Import from JSON
- `template.ts` - Generate templates

**Dependencies**: Commander.js pattern (bundled)

#### 2. Orchestration Layer
**Purpose**: Coordinate cross-domain operations

**Components**:
- `ScanOrchestrator` - Coordinates scan workflow
- `ValidationPipeline` - Runs security validators
- `AnalysisPipeline` - Runs analyzers
- `GenerationPipeline` - Runs generators

**Pattern**: Mediator pattern to avoid tight coupling

#### 3. Scanner Domain
**Purpose**: Discover and parse agent configurations

**Bounded Context**: Platform-specific scanning

**Aggregates**:
- `ClaudeCodeScanner` - Scans `.claude/` directories
- `CursorScanner` - Scans `.cursor/` directories
- `GeminiScanner` - Scans Gemini CLI configs
- `PlatformDetector` - Auto-detects platform

**Domain Services**:
- `FileDiscovery` - Recursive file discovery
- `EntityParser` - Parses individual files

#### 4. Validator Domain
**Purpose**: Security validation and risk assessment

**Bounded Context**: Security analysis

**Aggregates**:
- `SecretDetector` - Finds hardcoded secrets
- `PromptInjectionDetector` - Detects injection attempts
- `ConfigValidator` - Validates settings.json
- `McpEndpointValidator` - Validates MCP URLs
- `HookSecurityValidator` - Validates hook security

**Domain Services**:
- `DreadScorer` - Calculates DREAD risk scores
- `VulnerabilityClassifier` - Maps to CVEs

#### 5. Analyzer Domain
**Purpose**: Agent relationship and capability analysis

**Bounded Context**: Agent architecture analysis

**Aggregates**:
- `DelegationAnalyzer` - Builds delegation graph
- `ToolAccessMatrix` - Analyzes tool permissions
- `SkillCoverageAnalyzer` - Analyzes skill assignments

**Domain Services**:
- `CycleDetector` - Finds circular delegations
- `PermissionAnalyzer` - Analyzes permission patterns

#### 6. Generator Domain
**Purpose**: Documentation and template generation

**Bounded Context**: Output generation

**Aggregates**:
- `ReadmeGenerator` - Generates README.md
- `AgentDocsGenerator` - Generates AGENTS.md
- `DiagramGenerator` - Generates Mermaid diagrams
- `SecurityReportGenerator` - Generates security reports
- `TemplateGenerator` - Generates config templates

**Domain Services**:
- `MermaidBuilder` - Builds diagram syntax
- `MarkdownFormatter` - Formats Markdown
- `ThemeApplier` - Applies diagram themes

#### 7. Reporter Domain
**Purpose**: Security reporting and metrics

**Bounded Context**: Reporting

**Aggregates**:
- `SecurityReporter` - Generates security reports
- `MetricsReporter` - Generates metrics
- `ComplianceReporter` - Generates compliance reports

**Domain Services**:
- `JsonExporter` - Exports to JSON
- `HtmlExporter` - Exports to HTML
- `MarkdownExporter` - Exports to Markdown

#### 8. Core Domain
**Purpose**: Shared domain model and business logic

**Entities**:
```typescript
interface Agent {
  id: string;
  name: string;
  type: AgentType;
  description?: string;
  tools: Tool[];
  capabilities: Capability[];
  delegatesTo: string[];
  skills: string[];
  source: SourceFile;
}

interface Skill {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  description?: string;
  source: SourceFile;
}

interface Hook {
  id: string;
  type: HookType;
  handler: string;
  config?: Record<string, unknown>;
  source: SourceFile;
}

interface McpServer {
  id: string;
  name: string;
  url: string;
  capabilities: string[];
  transport: 'stdio' | 'http';
  source: SourceFile;
}
```

**Value Objects**:
```typescript
interface Tool {
  name: string;
  category: ToolCategory;
}

interface Capability {
  name: string;
  description: string;
}

interface Permission {
  tool: string;
  granted: boolean;
  constraints?: string[];
}

interface SourceFile {
  path: string;
  platform: Platform;
  lastModified: number;
}
```

**Enums**:
```typescript
enum AgentType {
  Coder = 'coder',
  Reviewer = 'reviewer',
  Tester = 'tester',
  Researcher = 'researcher',
  Custom = 'custom'
}

enum ToolCategory {
  Read = 'read',
  Write = 'write',
  Execute = 'execute',
  Network = 'network'
}

enum Platform {
  ClaudeCode = 'claude-code',
  Cursor = 'cursor',
  GeminiCli = 'gemini-cli'
}

enum HookType {
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
```

## Consequences

### Positive
- **Clear Boundaries**: Each domain has well-defined responsibilities
- **Testability**: Domains can be tested independently
- **Extensibility**: New platforms/analyzers/generators can be added easily
- **Maintainability**: Changes localized to specific domains
- **Zero Coupling**: Domains communicate via orchestrator
- **Performance**: Parallel execution within each layer

### Negative
- **Complexity**: More files and abstractions than monolithic design
- **Learning Curve**: New contributors need to understand DDD patterns
- **Overhead**: Orchestration layer adds slight latency (<10ms)

### Neutral
- **File Structure**: More directories but better organization
- **Type Safety**: TypeScript strict mode required across all domains

## Related Decisions
- ADR-102: Zero Dependency Strategy
- ADR-103: Security Scanning Engine
- ADR-104: Multi-Platform Support
- DDD-101: Core Domain Model

## References
- [Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- PRD: /workspaces/agentscope/docs/PRD-AgentScope-Core.md

## Implementation Notes

### Directory Structure
```
src/
├── cli/                    # CLI Layer
│   ├── commands/
│   │   ├── scan.ts
│   │   ├── validate.ts
│   │   ├── export.ts
│   │   ├── import.ts
│   │   └── template.ts
│   └── index.ts
├── orchestration/          # Orchestration Layer
│   ├── ScanOrchestrator.ts
│   ├── ValidationPipeline.ts
│   ├── AnalysisPipeline.ts
│   └── GenerationPipeline.ts
├── scanner/                # Scanner Domain
│   ├── ClaudeCodeScanner.ts
│   ├── CursorScanner.ts
│   ├── GeminiScanner.ts
│   └── PlatformDetector.ts
├── validator/              # Validator Domain
│   ├── SecretDetector.ts
│   ├── PromptInjectionDetector.ts
│   ├── ConfigValidator.ts
│   └── DreadScorer.ts
├── analyzer/               # Analyzer Domain
│   ├── DelegationAnalyzer.ts
│   ├── ToolAccessMatrix.ts
│   └── SkillCoverageAnalyzer.ts
├── generator/              # Generator Domain
│   ├── ReadmeGenerator.ts
│   ├── DiagramGenerator.ts
│   └── TemplateGenerator.ts
├── reporter/               # Reporter Domain
│   ├── SecurityReporter.ts
│   └── MetricsReporter.ts
├── core/                   # Core Domain
│   ├── entities/
│   │   ├── Agent.ts
│   │   ├── Skill.ts
│   │   ├── Hook.ts
│   │   └── McpServer.ts
│   ├── value-objects/
│   │   ├── Tool.ts
│   │   ├── Capability.ts
│   │   └── Permission.ts
│   └── schemas/
│       └── zod-schemas.ts
└── utils/                  # Shared Utilities
    ├── file-utils.ts
    ├── sanitizer.ts
    └── theme-loader.ts
```

### Data Flow Example

```typescript
// User runs: agentscope scan --output ./docs

// 1. CLI Layer receives command
const scanCommand = new ScanCommand();
await scanCommand.execute({ output: './docs' });

// 2. Orchestrator coordinates workflow
const orchestrator = new ScanOrchestrator();
const result = await orchestrator.execute({
  path: process.cwd(),
  output: './docs'
});

// 3. Scanner Domain discovers and parses files
const scanner = platformDetector.detect(path);
const config = await scanner.scan(path);

// 4. Validator Domain runs security checks
const findings = await validationPipeline.execute(config);

// 5. Analyzer Domain analyzes relationships
const analysis = await analysisPipeline.execute(config);

// 6. Generator Domain creates documentation
await generationPipeline.execute({
  config,
  findings,
  analysis,
  output: './docs'
});

// 7. Reporter Domain outputs results
await reporter.report({
  config,
  findings,
  analysis
});
```

### Integration with Common Core

AgentScope Core uses `@claude-flow/security` for:
- Input validation (Zod schemas)
- Path traversal prevention
- Secrets sanitization

```typescript
import { InputValidator, PathValidator, SecretsSanitizer } from '@claude-flow/security';

// Validate user input
const config = InputValidator.validate(AgentConfigSchema, userInput);

// Validate paths
const safePath = PathValidator.validatePath(basePath, userPath);

// Sanitize output
const sanitized = SecretsSanitizer.sanitize(reportText);
```

### Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Scan (50 agents) | <2s | Parallel parsing |
| Security validation | <500ms | Compiled regex patterns |
| Diagram generation | <300ms | Lazy rendering |
| Export to JSON | <100ms | Streaming |
| CLI startup | <300ms | Lazy module loading |

### Security Posture

- **Input Validation**: All user inputs validated via Zod
- **Path Safety**: All file paths checked for traversal
- **Secret Detection**: 100% coverage for known patterns
- **Injection Prevention**: All output sanitized
- **Secure Defaults**: Templates use deny-by-default

---

**Approved by**: ADR Architect Agent
**Implementation**: Week 1-2 of v1.2
**Review Date**: 2026-02-15
