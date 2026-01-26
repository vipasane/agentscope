# @claude-flow/types

Comprehensive TypeScript type definitions for Claude Flow V3. Pure type declarations with zero runtime dependencies.

## Features

- **Agent Architecture**: Complete type system for agents, capabilities, tools, and roles
- **Memory System**: Vector embeddings, HNSW indexing, hybrid storage with semantic search
- **Security**: Security findings, threat levels, validation, scanning, and remediation
- **Learning System**: Trajectories, patterns, verdicts, and EWC++ consolidation
- **CLI**: Commands, options, output formatting, and interactive prompts
- **Common Utilities**: Branded types, Result discriminated unions, type guards

## Zero Dependencies

This package contains only TypeScript type definitions. No runtime code, no external dependencies.

```json
{
  "devDependencies": {
    "typescript": "^5.9.0"
  }
}
```

## Installation

```bash
npm install @claude-flow/types
```

## Usage

### Agent Types

```typescript
import type {
  Agent,
  AgentId,
  AgentType,
  AgentConfig,
  AgentCapability,
  Tool,
} from '@claude-flow/types';
import { createAgentId } from '@claude-flow/types';

const agentId: AgentId = createAgentId('my-agent-1');

const config: AgentConfig = {
  type: 'coder',
  name: 'main-coder',
  description: 'Primary implementation agent',
  capabilities: [
    {
      name: 'file-access',
      description: 'Read and write files',
      resource: 'filesystem',
      actions: ['read', 'write'],
    },
  ],
  tools: [
    {
      id: 'ts-compiler' as any,
      name: 'TypeScript Compiler',
      type: 'compiler',
      version: '5.0.0',
      description: 'Compile TypeScript',
    },
  ],
};
```

### Result Types

Discriminated union for type-safe error handling:

```typescript
import type { Result, Success, ErrorVariant } from '@claude-flow/types';
import { createSuccess, createError, isSuccess, unwrap } from '@claude-flow/types';

function processFile(path: string): Result<string> {
  try {
    const content = readFileSync(path, 'utf-8');
    return createSuccess(content);
  } catch (error) {
    return createError('FILE_READ_ERROR', `Failed to read ${path}`);
  }
}

const result = processFile('src/index.ts');
if (isSuccess(result)) {
  console.log(result.data); // Type: string
} else {
  console.error(result.message);
}
```

### Branded Types

Compile-time distinct types for IDs:

```typescript
import type {
  AgentId,
  TaskId,
  MemoryId,
  PatternId,
} from '@claude-flow/types';
import {
  createAgentId,
  createTaskId,
  createMemoryId,
  createPatternId,
} from '@claude-flow/types';

const agentId: AgentId = createAgentId('agent-123');
const taskId: TaskId = createTaskId('task-456');

function assignTask(agentId: AgentId, taskId: TaskId): void {
  // Ensures correct ID types at compile time
}

assignTask(agentId, taskId); // OK
assignTask(taskId, agentId); // TS Error: wrong types
```

### Memory Types

Vector embeddings and semantic search:

```typescript
import type {
  MemoryEntry,
  VectorEmbedding,
  MemorySearchQuery,
  MemorySearchResult,
} from '@claude-flow/types';
import { createMemoryId } from '@claude-flow/types';

const embedding: VectorEmbedding = {
  values: [0.23, -0.15, 0.89], // 384 or 768 dimensions
  dimension: 3,
  model: 'all-MiniLM-L6-v2',
  normalized: true,
};

const entry: MemoryEntry<CodePattern> = {
  id: createMemoryId('mem-123'),
  namespace: 'patterns',
  key: 'jwt-authentication',
  data: { implementation: 'class JWTAuth { ... }' },
  embedding,
  metadata: {
    createdAt: new Date(),
    accessCount: 5,
    tags: ['auth', 'jwt'],
  },
};

const query: MemorySearchQuery = {
  query: 'authentication patterns',
  namespace: 'patterns',
  limit: 10,
  threshold: 0.7,
  semantic: true,
};
```

### Security Types

Vulnerability scanning and remediation:

```typescript
import type {
  SecurityFinding,
  ThreatLevel,
  ThreatCategory,
  SecurityScanResult,
  ValidationResult,
} from '@claude-flow/types';
import { createFindingId } from '@claude-flow/types';

const finding: SecurityFinding = {
  id: createFindingId('CVE-2024-1234'),
  type: 'exposed_api_key',
  level: 'critical' as ThreatLevel,
  category: 'secrets',
  location: {
    file: 'src/config.ts',
    line: 42,
    column: 5,
  },
  message: 'API key exposed in source code',
  evidence: 'ANTHROPIC_API_KEY=sk-ant-...',
  remediation: 'Move to .env.local or use environment variables',
  confidence: 0.98 as any,
  discoveredAt: new Date(),
};

const scanResult: SecurityScanResult = {
  startedAt: new Date(),
  completedAt: new Date(),
  findings: [finding],
  summary: {
    total: 1,
    byCritical: 1,
    byError: 0,
    byWarning: 0,
    byInfo: 0,
  },
  riskScore: 0.95 as any,
};
```

### Learning Types

Trajectories, patterns, and consolidation:

```typescript
import type {
  Trajectory,
  TrajectoryStep,
  Pattern,
  Verdict,
  ConsolidationResult,
} from '@claude-flow/types';
import { createTrajectoryId, createPatternId } from '@claude-flow/types';

const trajectory: Trajectory = {
  id: createTrajectoryId('traj-auth-impl'),
  task: 'implement-jwt-authentication',
  steps: [
    {
      id: 'step-1',
      action: 'analyze-requirements',
      input: { spec: 'JWT auth required' },
      output: { analysis: 'Create JWTAuth class' },
      quality: 0.95 as any,
      latencyMs: 250,
    },
    {
      id: 'step-2',
      action: 'implement-code',
      input: { analysis: '...' },
      output: { code: '...' },
      quality: 0.92 as any,
      latencyMs: 1500,
    },
  ],
  outcome: 'success',
  reward: 0.85 as any,
  durationMs: 1750,
  startedAt: new Date(),
  completedAt: new Date(),
  context: { repo: 'auth-service', agentType: 'coder' },
};

const pattern: Pattern = {
  id: createPatternId('pat-jwt-auth'),
  type: 'solution',
  task: 'implement-jwt-authentication',
  input: { requirements: 'JWT auth for API' },
  output: { implementation: 'JWTAuth class with tests' },
  reward: 0.92 as any,
  verdict: {
    type: 'correct',
    confidence: 0.95 as any,
    reasoning: 'All tests pass, security review passed',
    evidence: ['100% test coverage', 'No security findings'],
  },
  criticality: 'high',
  learnedAt: new Date(),
  successCount: 12,
  relatedPatterns: [createPatternId('pat-oauth')],
};
```

### CLI Types

Commands and options:

```typescript
import type {
  Command,
  CommandContext,
  CommandParameter,
  CommandOption,
  OutputFormat,
} from '@claude-flow/types';

const command: Command = {
  name: 'agent',
  description: 'Manage agents',
  usage: 'agent <subcommand> [options]',
  parameters: [
    {
      name: 'subcommand',
      description: 'Subcommand to run',
      type: 'string',
      required: true,
      position: 0,
    },
  ],
  options: [
    {
      name: 'verbose',
      description: 'Enable verbose output',
      type: 'boolean',
      short: 'v',
    },
    {
      name: 'format',
      description: 'Output format',
      type: 'string',
      default: 'text',
      choices: ['text', 'json', 'yaml'],
    },
  ],
  subcommands: [
    {
      name: 'spawn',
      description: 'Spawn a new agent',
      action: async (ctx: CommandContext) => ({
        status: 'success',
        data: { agentId: 'agent-123' },
        durationMs: 150,
      }),
    },
  ],
  action: async (ctx: CommandContext) => ({
    status: 'success',
    data: { commands: 1 },
    durationMs: 50,
  }),
};
```

## Type Safety Features

### Strict Readonly Properties

All types use readonly to prevent accidental mutations:

```typescript
const agent: Agent = { ... };

// TS Error: Cannot assign to readonly property
agent.health = 0.5;

// Must create new object instead
const updatedAgent = { ...agent, health: 0.5 };
```

### Discriminated Unions

Result types use discriminated unions for exhaustive pattern matching:

```typescript
function handleResult<T>(result: Result<T>): void {
  switch (result.type) {
    case 'success':
      console.log(result.data); // Type: T
      break;
    case 'error':
      console.error(result.message); // Type: string
      break;
    case 'pending':
      console.log('Loading...'); // Type: Pending<T>
      break;
    // TS ensures all cases are handled
  }
}
```

### Generic Constraints

Type-safe APIs with generic constraints:

```typescript
function processMemoryEntry<T extends object>(
  entry: MemoryEntry<T>
): T {
  return entry.data; // Type-safe data access
}

const entry: MemoryEntry<CodePattern> = { ... };
const pattern = processMemoryEntry(entry); // Type: CodePattern
```

### Branded Types for ID Safety

Prevent accidental ID type mixing:

```typescript
function assignTask(agentId: AgentId, taskId: TaskId): void { ... }

// Compile-time error - TaskId not assignable to AgentId
const taskId = createTaskId('task-1');
assignTask(taskId, taskId); // TS Error
```

## Architecture

```
packages/types/
├── src/
│   ├── index.ts                    # Main export
│   ├── common/
│   │   ├── result.ts               # Result types & helpers
│   │   ├── branded.ts              # Branded ID types
│   │   └── index.ts
│   ├── agent/
│   │   ├── agent.ts                # Agent architecture
│   │   └── index.ts
│   ├── memory/
│   │   ├── memory.ts               # Memory system types
│   │   └── index.ts
│   ├── security/
│   │   ├── security.ts             # Security types
│   │   └── index.ts
│   ├── learning/
│   │   ├── learning.ts             # Learning system types
│   │   └── index.ts
│   └── cli/
│       ├── cli.ts                  # CLI types
│       └── index.ts
├── tests/
│   └── types.test.ts               # Type tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Building

```bash
# Build type definitions
npm run build

# Watch mode during development
npm run dev

# Type check
npm run typecheck

# Run tests
npm run test
```

## Package Exports

The package provides named exports for granular importing:

```typescript
// Main export
import type { Agent, SecurityFinding, Pattern } from '@claude-flow/types';

// Subpackage exports
import type { Tool, AgentCapability } from '@claude-flow/types/agent';
import type { MemoryEntry, VectorEmbedding } from '@claude-flow/types/memory';
import type { SecurityFinding } from '@claude-flow/types/security';
import type { Trajectory, Pattern } from '@claude-flow/types/learning';
import type { Command, OutputFormat } from '@claude-flow/types/cli';
import type { Result, AgentId } from '@claude-flow/types/common';
```

## Strict Type Checking

All types compile with TypeScript strict mode:

```bash
npm run typecheck
```

## Contributing

When adding new types:

1. Add to appropriate module (agent, memory, security, learning, cli, or common)
2. Include comprehensive JSDoc comments with examples
3. Use readonly for all properties
4. Create type tests in `tests/types.test.ts`
5. Update this README with usage examples
6. Ensure strict TypeScript compilation

## License

MIT

## See Also

- [Claude Flow V3](https://github.com/ruvnet/claude-flow)
- [AgentScope](https://github.com/vipasane/agentscope)
- [Claude Code Documentation](https://claude.ai)
