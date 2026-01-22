# ADR-001: Architecture Style - DDD + Clean Architecture

## Status

Accepted

## Context

AgentScope is a CLI tool that scans agent configurations from multiple sources (Claude Code, MCP servers) and generates documentation and diagrams. We need to choose an architecture style that:

1. **Supports multiple input sources** - Claude Code configs, MCP definitions, potentially other frameworks in the future
2. **Separates concerns clearly** - Parsing, modeling, visualization, and documentation generation are distinct responsibilities
3. **Enables testability** - Each component should be independently testable
4. **Allows extension** - New parsers and output formats can be added without modifying core logic
5. **Maintains simplicity** - Avoid over-engineering for a CLI tool

The tool has three main responsibilities:
- **Scanner**: Parse configuration files from various sources
- **Visualizer**: Generate Mermaid diagrams
- **Documenter**: Generate Markdown documentation

## Decision

We will use a combination of **Domain-Driven Design (DDD)** principles and **Clean Architecture** patterns:

### Layer Structure

```
src/
├── domain/           # Core business logic (pure TypeScript, no dependencies)
│   ├── model/        # Unified configuration model (Agent, Skill, Hook, etc.)
│   └── errors/       # Domain-specific error types
├── application/      # Use cases (orchestration)
│   ├── scan/         # Scan use case
│   └── generate/     # Generate docs/diagrams use case
├── infrastructure/   # External concerns
│   ├── parsers/      # Claude Code parser, MCP parser
│   ├── generators/   # Mermaid generator, Markdown generator
│   └── filesystem/   # File I/O operations
└── cli/              # CLI interface (Commander.js)
    └── commands/     # scan, validate, version commands
```

### Key Principles

1. **Dependency Rule**: Dependencies point inward (CLI -> Application -> Domain)
2. **Unified Model**: All parsers output to a single `AgentScopeConfig` model
3. **Port/Adapter Pattern**: Parsers and generators implement interfaces defined in domain
4. **Single Responsibility**: Each module has one reason to change

### Domain Model

```typescript
// domain/model/types.ts
interface AgentScopeConfig {
  meta: ConfigMeta;
  agents: Agent[];
  skills: Skill[];
  hooks: Hook[];
  commands: Command[];
  mcpServers: MCPServer[];
  settings: Settings;
  errors: ScanError[];
}
```

## Consequences

### Positive

- **Testability**: Domain logic can be tested without file system or CLI
- **Extensibility**: New parsers (BMad, Gemini) can be added as infrastructure adapters
- **Maintainability**: Clear boundaries make code easier to understand and modify
- **Flexibility**: Output formats can change without affecting parsing logic
- **Consistency**: Single unified model ensures all components speak the same language

### Negative

- **Initial Complexity**: More files and directories than a simple script
- **Indirection**: Developers must understand layer boundaries
- **Overhead**: Small features require changes across multiple layers

### Neutral

- Framework-agnostic approach means we don't benefit from framework conventions
- Requires discipline to maintain layer boundaries

## Options Considered

### Option 1: Simple Script Architecture

Single-file or flat structure with all logic in one place.

- **Pros**: Fast to build, easy to understand initially
- **Cons**: Becomes unmaintainable as features grow, hard to test, tight coupling

### Option 2: MVC Pattern

Model-View-Controller with parsers as controllers.

- **Pros**: Familiar pattern, clear separation
- **Cons**: Designed for UI applications, doesn't fit CLI tool well

### Option 3: DDD + Clean Architecture (Chosen)

Layered architecture with domain at the center.

- **Pros**: Highly testable, extensible, maintains simplicity in each layer
- **Cons**: More initial setup, requires understanding of patterns

### Option 4: Hexagonal Architecture

Ports and adapters with explicit interface contracts.

- **Pros**: Very flexible, excellent for testing
- **Cons**: Overkill for current scope, adds complexity without proportional benefit

## Related Decisions

- [ADR-004](./ADR-004-parser-plugin-architecture.md) - Parser Plugin Architecture (implements infrastructure layer)
- [ADR-006](./ADR-006-test-strategy.md) - Test Strategy (leverages architecture for testing)

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [AgentScope PRD v2.0](../../AgentScope-PRD-v2.md) - Section 6: Technical Architecture
