# ADR-010: Self-Learning Hooks - claude-flow Integration

## Status

Accepted

## Context

AgentScope is developed using agentic coding with Claude Code and claude-flow swarms. The development process can benefit from:

1. **Memory persistence** - Remember successful patterns across sessions
2. **Task routing** - Route tasks to optimal agents based on learned patterns
3. **Quality tracking** - Record successes and failures to improve over time
4. **Performance optimization** - Learn which approaches work best

claude-flow provides a hooks system with:
- Pre/post task hooks for tracking
- Memory storage for patterns
- Neural pattern training
- Background workers for optimization

The question is whether AgentScope should integrate with claude-flow hooks during its own development and potentially expose this pattern to users.

## Decision

We will integrate **claude-flow hooks** into the AgentScope development process, following the patterns documented in CLAUDE.md.

### Integration Points

#### 1. Development Workflow Hooks

```bash
# Before starting a task
npx @claude-flow/cli@latest hooks pre-task \
  --description "Implement Claude Code parser" \
  --coordinate-swarm

# After completing a task
npx @claude-flow/cli@latest hooks post-task \
  --task-id "claude-code-parser" \
  --success true \
  --store-results true
```

#### 2. Memory Storage for Patterns

```bash
# Store successful parsing pattern
npx @claude-flow/cli@latest memory store \
  --namespace patterns \
  --key "parser-frontmatter-extraction" \
  --value "Use gray-matter for YAML frontmatter, handle missing gracefully"

# Search for relevant patterns before implementing
npx @claude-flow/cli@latest memory search \
  --query "mermaid generation patterns" \
  --namespace patterns
```

#### 3. Edit Hooks for Learning

```bash
# Before editing a file
npx @claude-flow/cli@latest hooks pre-edit \
  --file "src/parsers/claude-code.ts" \
  --operation "update"

# After successful edit
npx @claude-flow/cli@latest hooks post-edit \
  --file "src/parsers/claude-code.ts" \
  --success true \
  --train-neural true
```

#### 4. Task Routing

```bash
# Route task to optimal agent
npx @claude-flow/cli@latest hooks route \
  --task "Add snapshot tests for Mermaid output" \
  --context "testing"
```

### Hook Types Used

| Hook | When | Purpose |
|------|------|---------|
| `pre-task` | Starting work | Get agent suggestions, coordinate swarm |
| `post-task` | Completing work | Record success, store results |
| `pre-edit` | Before file change | Get context, check patterns |
| `post-edit` | After file change | Record outcome, train neural |
| `route` | Task routing | Find optimal agent for task |
| `session-start` | Begin session | Restore previous context |
| `session-end` | End session | Persist learned patterns |

### Background Workers

| Worker | Trigger | Purpose |
|--------|---------|---------|
| `optimize` | After refactor | Performance optimization |
| `testgaps` | After feature | Find missing test coverage |
| `audit` | After security change | Security analysis |
| `document` | After API change | Update documentation |
| `map` | Every 5+ file changes | Update codebase map |

### Development Protocol

```bash
# Session start
npx @claude-flow/cli@latest hooks session-start --session-id "agentscope-dev"

# Before each task
npx @claude-flow/cli@latest memory search --query "[task keywords]" --namespace patterns
npx @claude-flow/cli@latest hooks pre-task --description "[task]"

# After each task
npx @claude-flow/cli@latest hooks post-task --task-id "[id]" --success true
npx @claude-flow/cli@latest memory store --namespace patterns --key "[pattern-name]" --value "[what worked]"

# Session end
npx @claude-flow/cli@latest hooks session-end --export-metrics true
```

### Future: User-Facing Integration (v2.0+)

AgentScope could optionally integrate with claude-flow for users:

```bash
# Future feature: AgentScope triggers hooks on scan
agentscope scan --hooks

# This would:
# 1. Store scan results in memory
# 2. Track scan patterns over time
# 3. Learn optimal diagram configurations
# 4. Predict documentation needs
```

### Benefits for Development

| Benefit | Mechanism |
|---------|-----------|
| **Pattern reuse** | Memory stores successful approaches |
| **Task optimization** | Routing learns best agent for task type |
| **Quality improvement** | Post-task tracking identifies what works |
| **Context persistence** | Sessions maintain state across conversations |
| **Performance insights** | Metrics reveal bottlenecks |

## Consequences

### Positive

- **Continuous improvement**: Development process improves over time
- **Knowledge retention**: Patterns survive across sessions
- **Task routing**: Right agent for right task
- **Quality tracking**: Measurable success metrics
- **Documentation**: Hooks encourage documenting what works

### Negative

- **Dependency**: Relies on claude-flow being available
- **Overhead**: Hook calls add latency to development
- **Learning curve**: Team must understand hook patterns
- **Optional**: Benefits only realized if consistently used

### Neutral

- Hooks are optional - development works without them
- Integration is development-time only (not runtime dependency)
- Patterns learned are specific to this codebase

## Options Considered

### Option 1: No Integration

Develop without hooks, standard workflow.

- **Pros**: Simpler, no external dependencies
- **Cons**: No learning, no pattern persistence, reinvent solutions
- **Why rejected**: Misses opportunity to improve over time

### Option 2: Custom Learning System

Build AgentScope-specific learning.

- **Pros**: Tailored to AgentScope needs
- **Cons**: Duplicates claude-flow functionality, maintenance burden
- **Why rejected**: claude-flow already provides this

### Option 3: claude-flow Integration (Chosen)

Use claude-flow hooks for development learning.

- **Pros**: Leverages existing system, proven patterns, no maintenance
- **Cons**: External dependency
- **Why chosen**: Best balance of capability and effort

### Option 4: Full Integration (User-Facing)

Integrate hooks into AgentScope CLI for users.

- **Pros**: Users benefit from learning
- **Cons**: Adds complexity, requires claude-flow installed
- **Why deferred**: Consider for v2.0 based on demand

## Related Decisions

- [ADR-006](./ADR-006-test-strategy.md) - Test Strategy (hooks track test success)
- [ADR-004](./ADR-004-parser-plugin-architecture.md) - Parser Architecture (hooks learn parser patterns)

## References

- [claude-flow Documentation](https://github.com/ruvnet/claude-flow)
- [CLAUDE.md](../../../CLAUDE.md) - Project hooks configuration
- [Research: Claude Code Tuning Best Practices](../../research/06-claude-code-tuning-best-practices.md)
