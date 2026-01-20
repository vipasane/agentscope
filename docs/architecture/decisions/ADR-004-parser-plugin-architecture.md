# ADR-004: Parser Plugin Architecture

## Status

Accepted

## Context

AgentScope must parse agent configurations from multiple sources:

**v1.0 Sources:**
- Claude Code project configs (`.claude/`, `CLAUDE.md`)
- Claude Code user configs (`~/.claude/`)
- MCP server definitions (`.mcp.json`)

**Future Sources (Post-MVP):**
- BMad Method configs
- Gemini CLI configs
- claude-flow configs
- Custom framework configs

The parsing system must:

1. **Support multiple input formats** - YAML, JSON, Markdown with frontmatter
2. **Output to unified model** - All parsers produce the same `AgentScopeConfig`
3. **Be independently testable** - Each parser can be tested in isolation
4. **Allow extension** - New parsers can be added without modifying existing code
5. **Handle partial failures gracefully** - One broken parser shouldn't crash the whole scan

The research identified that framework configs change frequently with no API contracts, making parser maintenance a significant concern.

## Decision

We will implement an **extensible parser plugin architecture** with the following design:

### Interface Definition

```typescript
// domain/ports/parser.ts
interface Parser {
  /** Unique identifier for this parser */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Check if this parser can handle the given project */
  canParse(projectPath: string): Promise<boolean>;

  /** Parse configurations and return partial config */
  parse(projectPath: string): Promise<PartialConfig>;

  /** Validate parser-specific requirements */
  validate(config: PartialConfig): ValidationResult;
}

interface PartialConfig {
  agents?: Agent[];
  skills?: Skill[];
  hooks?: Hook[];
  commands?: Command[];
  mcpServers?: MCPServer[];
  settings?: Partial<Settings>;
  errors?: ScanError[];
}
```

### Parser Registry

```typescript
// infrastructure/parsers/registry.ts
class ParserRegistry {
  private parsers: Map<string, Parser> = new Map();

  register(parser: Parser): void {
    this.parsers.set(parser.id, parser);
  }

  async scanAll(projectPath: string): Promise<AgentScopeConfig> {
    const results: PartialConfig[] = [];

    for (const parser of this.parsers.values()) {
      if (await parser.canParse(projectPath)) {
        try {
          const partial = await parser.parse(projectPath);
          results.push(partial);
        } catch (error) {
          results.push({
            errors: [{
              level: 'warning',
              message: `Parser ${parser.name} failed: ${error.message}`,
              file: projectPath,
            }]
          });
        }
      }
    }

    return this.merge(results);
  }
}
```

### Built-in Parsers (v1.0)

```
src/infrastructure/parsers/
├── registry.ts           # Parser registration and orchestration
├── claude-code/
│   ├── index.ts          # ClaudeCodeParser class
│   ├── agents.ts         # Parse .claude/agents/
│   ├── skills.ts         # Parse .claude/skills/
│   ├── settings.ts       # Parse .claude/settings.json
│   └── claude-md.ts      # Parse CLAUDE.md
└── mcp/
    ├── index.ts          # MCPParser class
    └── servers.ts        # Parse .mcp.json
```

### Merge Strategy

When multiple parsers provide the same data:
1. **Agents/Skills/Hooks**: Merge by ID, later parser wins on conflict
2. **Settings**: Deep merge with later parser winning on conflict
3. **Errors**: Concatenate all errors

### Extension Points

Future parsers can be added by:
1. Implementing the `Parser` interface
2. Registering with `ParserRegistry`
3. No changes to existing code required

```typescript
// Future: BMad parser
const bmadParser: Parser = {
  id: 'bmad',
  name: 'BMad Method',
  canParse: async (path) => existsSync(join(path, '.bmad')),
  parse: async (path) => { /* BMad-specific parsing */ },
  validate: (config) => { /* BMad-specific validation */ }
};

registry.register(bmadParser);
```

## Consequences

### Positive

- **Extensibility**: New frameworks can be supported without core changes
- **Isolation**: Parser bugs don't affect other parsers
- **Testability**: Each parser can be unit tested independently
- **Graceful degradation**: Partial failures produce warnings, not crashes
- **Clear contracts**: Interface defines exactly what parsers must provide

### Negative

- **Merge complexity**: Conflicting data from multiple parsers needs resolution
- **Discovery overhead**: Must check `canParse()` for all registered parsers
- **Interface evolution**: Changing the Parser interface affects all implementations

### Neutral

- Parsers are stateless, simplifying the implementation
- Error handling is standardized across all parsers

## Options Considered

### Option 1: Monolithic Parser

Single parser class with conditionals for each format.

- **Pros**: Simple, no abstraction overhead
- **Cons**: Hard to extend, grows unwieldy, can't test in isolation
- **Why rejected**: Doesn't scale with framework additions

### Option 2: Strategy Pattern

Parsers as strategies selected at runtime.

- **Pros**: Clean OOP pattern, easy to swap implementations
- **Cons**: Assumes one parser at a time, not multiple
- **Why rejected**: Need to run multiple parsers per scan

### Option 3: Plugin Architecture (Chosen)

Registry of parsers with discovery and merge capabilities.

- **Pros**: Supports multiple parsers, extensible, isolated failures
- **Cons**: More complex than monolithic
- **Why chosen**: Best fit for multi-framework support

### Option 4: Event-Driven Parsing

Parsers emit events, aggregator collects them.

- **Pros**: Highly decoupled, async-friendly
- **Cons**: Overengineered for this use case, harder to debug
- **Why rejected**: Complexity without proportional benefit

## Related Decisions

- [ADR-001](./ADR-001-architecture-style.md) - Architecture Style (parsers are infrastructure adapters)
- [ADR-007](./ADR-007-error-handling.md) - Error Handling (parser errors follow categorization)

## References

- [Plugin Architecture Pattern](https://martinfowler.com/eaaCatalog/plugin.html)
- [AgentScope PRD v2.0](../../AgentScope-PRD-v2.md) - Section 4.1: Scanner Module
- [Research: Critical Analysis](../../research/01-critical-analysis.md) - Framework volatility risks
