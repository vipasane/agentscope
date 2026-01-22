# ADR-006: Test Strategy - TDD with Snapshot Testing

## Status

Accepted

## Context

AgentScope is developed using agentic coding (AI-assisted development with Claude Code). This approach enables rapid development but requires strong quality gates because:

1. **Agents generate code quickly** - Human review becomes the bottleneck, not development
2. **Correctness is critical** - Incorrect diagrams or documentation provide negative value
3. **Regression detection** - Changes must not break existing functionality
4. **Output verification** - Generated Markdown and diagrams must be valid and correct

The PRD mandates:
- Tests MUST be written BEFORE implementation (TDD)
- 80%+ line coverage target
- All CLI commands must have integration tests
- All diagram types must have snapshot tests

We need a test strategy that:
- Supports TDD workflow
- Catches regressions in generated output
- Validates Mermaid syntax
- Runs fast enough for development iteration
- Integrates with CI/CD

## Decision

We will implement a **Test-Driven Development (TDD) approach with snapshot testing** for output verification.

### Test Pyramid

```
                  ┌─────────────────┐
                  │   E2E Tests     │  Few, slow, high confidence
                  │   (CLI flows)   │
                  ├─────────────────┤
                  │  Integration    │  Medium count, medium speed
                  │  Tests          │
                  ├─────────────────┤
                  │   Unit Tests    │  Many, fast, low cost
                  │                 │
                  └─────────────────┘
```

### Test Structure

```
tests/
├── unit/
│   ├── parsers/
│   │   ├── claude-code.test.ts      # Claude Code parser tests
│   │   └── mcp.test.ts              # MCP parser tests
│   ├── generators/
│   │   ├── mermaid.test.ts          # Mermaid generator tests
│   │   └── markdown.test.ts         # Markdown generator tests
│   └── model/
│       └── unified-config.test.ts   # Domain model tests
├── integration/
│   ├── scan.test.ts                 # Full scan workflow
│   └── generate.test.ts             # Full generation workflow
├── snapshots/
│   └── diagrams/
│       ├── component-map.snap.md    # Expected component map
│       └── workflow-sequence.snap.md # Expected sequence diagram
├── fixtures/
│   ├── minimal/                     # Basic happy path config
│   │   ├── .claude/
│   │   └── .mcp.json
│   ├── complete/                    # All features used
│   │   ├── .claude/
│   │   ├── CLAUDE.md
│   │   └── .mcp.json
│   └── edge-cases/                  # Error conditions
│       ├── invalid-json/
│       ├── missing-files/
│       └── circular-refs/
└── helpers/
    └── test-utils.ts                # Shared test utilities
```

### Test Types

#### 1. Unit Tests (Vitest)

Test individual functions in isolation.

```typescript
// tests/unit/parsers/claude-code.test.ts
describe('ClaudeCodeParser', () => {
  describe('parseAgentFile', () => {
    it('should extract agent name from frontmatter', async () => {
      const content = `---
name: dev-agent
description: Development assistant
---
# Instructions
...`;
      const agent = parseAgentFile(content, '/path/to/file.md');
      expect(agent.name).toBe('dev-agent');
      expect(agent.description).toBe('Development assistant');
    });

    it('should handle missing frontmatter gracefully', async () => {
      const content = '# No frontmatter here';
      const agent = parseAgentFile(content, '/path/to/file.md');
      expect(agent.name).toBe('file'); // Fallback to filename
    });
  });
});
```

#### 2. Snapshot Tests (Vitest)

Capture expected output and detect changes.

```typescript
// tests/snapshots/diagrams.test.ts
describe('Diagram Snapshots', () => {
  it('should generate correct component map', async () => {
    const config = loadFixture('complete');
    const diagram = generateComponentMap(config);
    expect(diagram).toMatchSnapshot();
  });

  it('should generate correct workflow sequence', async () => {
    const config = loadFixture('complete');
    const diagram = generateWorkflowSequence(config);
    expect(diagram).toMatchSnapshot();
  });
});
```

#### 3. Integration Tests

Test complete workflows with fixtures.

```typescript
// tests/integration/scan.test.ts
describe('Scan Command', () => {
  it('should scan and generate all outputs', async () => {
    const result = await runScan('fixtures/complete');

    expect(result.exitCode).toBe(0);
    expect(result.files).toContain('README.md');
    expect(result.files).toContain('AGENTS.md');
    expect(result.files).toContain('raw/agentscope.json');
  });

  it('should report warnings for missing references', async () => {
    const result = await runScan('fixtures/edge-cases/missing-skill');

    expect(result.exitCode).toBe(0);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ level: 'warning' })
    );
  });
});
```

#### 4. Mermaid Validation

Verify generated diagrams are syntactically valid.

```typescript
// tests/unit/generators/mermaid.test.ts
import { validateMermaid } from '../helpers/mermaid-validator';

describe('Mermaid Generator', () => {
  it('should generate valid Mermaid syntax', async () => {
    const config = loadFixture('complete');
    const diagram = generateComponentMap(config);

    const validation = await validateMermaid(diagram);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
```

### TDD Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Write     │────▶│   Run       │────▶│   Implement │
│   Test      │     │   (Fail)    │     │   Code      │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Commit    │◀────│   Refactor  │◀────│   Run       │
│             │     │   (Clean)   │     │   (Pass)    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Coverage Requirements

| Category | Target | Blocks CI |
|----------|--------|-----------|
| Line Coverage | 80% | Yes |
| Branch Coverage | 70% | No |
| Function Coverage | 90% | No |

### Test Tooling

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner (fast, TypeScript-native) |
| **@vitest/coverage-v8** | Coverage reporting |
| **mermaid-cli** | Mermaid syntax validation |
| **memfs** | In-memory filesystem for tests |

## Consequences

### Positive

- **Regression prevention**: Snapshots catch unexpected output changes
- **Fast feedback**: Unit tests run in milliseconds
- **Confidence**: High coverage ensures code correctness
- **Documentation**: Tests serve as usage examples
- **CI integration**: Automated quality gates prevent bad merges

### Negative

- **Snapshot maintenance**: Changes require snapshot updates
- **TDD discipline**: Requires writing tests before code
- **Initial overhead**: Fixture setup takes time upfront

### Neutral

- Snapshot diffs can be noisy for large changes
- 80% coverage is achievable but not trivial

## Options Considered

### Option 1: Manual Testing

Test by running CLI and inspecting output.

- **Pros**: Fast to start, no test infrastructure
- **Cons**: Not repeatable, misses regressions, doesn't scale
- **Why rejected**: Unacceptable for agentic coding velocity

### Option 2: Unit Tests Only

Test functions but not outputs.

- **Pros**: Fast, focused tests
- **Cons**: Doesn't verify actual outputs, misses integration issues
- **Why rejected**: Output correctness is critical

### Option 3: TDD + Snapshot Testing (Chosen)

Full test pyramid with snapshot verification.

- **Pros**: Catches all regression types, verifies outputs
- **Cons**: More infrastructure to maintain
- **Why chosen**: Best balance of coverage and maintainability

### Option 4: Property-Based Testing

Generate random inputs and verify properties.

- **Pros**: Finds edge cases automatically
- **Cons**: Harder to set up, may not catch output format issues
- **Why rejected**: Can be added later, not essential for v1.0

## Related Decisions

- [ADR-001](./ADR-001-architecture-style.md) - Architecture Style (enables testability)
- [ADR-007](./ADR-007-error-handling.md) - Error Handling (tests verify error categorization)

## References

- [Vitest Documentation](https://vitest.dev/)
- [Snapshot Testing Best Practices](https://jestjs.io/docs/snapshot-testing)
- [AgentScope PRD v2.0](../../AgentScope-PRD-v2.md) - Section 5: Quality Requirements
- [Research: TDD Quality Framework](../../research/07-tdd-quality-framework.md)
