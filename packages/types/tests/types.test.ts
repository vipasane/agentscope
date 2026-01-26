/**
 * @claude-flow/types - Type Tests
 *
 * Tests to verify type safety and structure
 */

import { describe, it, expect } from 'vitest';
import type {
  Agent,
  AgentId,
  AgentType,
  Tool,
  SecurityFinding,
  ThreatLevel,
  MemoryEntry,
  VectorEmbedding,
  Trajectory,
  Pattern,
  Result,
  Success,
  ErrorVariant,
} from '../src/index.js';
import {
  createSuccess,
  createError,
  isSuccess,
  isError,
  createAgentId,
  createTaskId,
  createMemoryId,
  createPatternId,
  createTrajectoryId,
} from '../src/index.js';

describe('Result Types', () => {
  it('should create success results', () => {
    const success = createSuccess({ id: '1', name: 'Test' });
    expect(success.type).toBe('success');
    expect(success.data.id).toBe('1');
    expect(success.timestamp).toBeInstanceOf(Date);
  });

  it('should create error results', () => {
    const error = createError('VALIDATION_ERROR', 'Invalid input', { field: 'email' });
    expect(error.type).toBe('error');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual({ field: 'email' });
  });

  it('should use type guards correctly', () => {
    const success: Result<string> = createSuccess('test');
    const error: Result<string> = createError('TEST', 'Error');

    expect(isSuccess(success)).toBe(true);
    expect(isError(success)).toBe(false);

    expect(isSuccess(error)).toBe(false);
    expect(isError(error)).toBe(true);
  });
});

describe('Branded Types', () => {
  it('should create branded IDs', () => {
    const agentId = createAgentId('agent-123');
    const taskId = createTaskId('task-456');
    const memoryId = createMemoryId('mem-789');

    expect(typeof agentId).toBe('string');
    expect(typeof taskId).toBe('string');
    expect(typeof memoryId).toBe('string');
  });

  it('should maintain type distinction', () => {
    const agentId = createAgentId('agent-123');
    const taskId = createTaskId('task-456');

    // These are distinct types at compile time
    // Runtime they're both strings, but TypeScript enforces type safety
    const _agentAssignment: AgentId = agentId; // OK
    // @ts-expect-error - Task ID is not assignable to AgentId
    const _agentAssignment2: AgentId = taskId; // Error at compile time
  });
});

describe('Agent Type Combinations', () => {
  it('should allow valid agent types', () => {
    const validTypes: AgentType[] = [
      'coder',
      'tester',
      'reviewer',
      'researcher',
      'architect',
    ];
    expect(validTypes).toHaveLength(5);
  });
});

describe('Memory Types', () => {
  it('should construct vector embeddings', () => {
    const embedding: VectorEmbedding = {
      values: [0.1, 0.2, 0.3],
      dimension: 3,
      model: 'test-model',
      normalized: true,
    };

    expect(embedding.dimension).toBe(3);
    expect(embedding.values).toHaveLength(3);
    expect(embedding.normalized).toBe(true);
  });

  it('should construct memory entries', () => {
    const entry: MemoryEntry<{ title: string }> = {
      id: createMemoryId('mem-1'),
      namespace: 'patterns',
      key: 'pattern-key',
      data: { title: 'Test Pattern' },
      metadata: {
        createdAt: new Date(),
        accessCount: 0,
      },
    };

    expect(entry.namespace).toBe('patterns');
    expect(entry.data.title).toBe('Test Pattern');
    expect(entry.metadata.accessCount).toBe(0);
  });
});

describe('Security Types', () => {
  it('should construct security findings', () => {
    const finding: SecurityFinding = {
      id: 'finding-1' as any,
      type: 'exposed_api_key',
      level: 'critical' as ThreatLevel,
      category: 'secrets',
      location: {
        file: 'src/config.ts',
        line: 42,
      },
      message: 'API key exposed',
      discoveredAt: new Date(),
    };

    expect(finding.level).toBe('critical');
    expect(finding.category).toBe('secrets');
    expect(finding.location.line).toBe(42);
  });

  it('should support all threat levels', () => {
    const levels: ThreatLevel[] = ['info', 'warning', 'error', 'critical'];
    expect(levels).toHaveLength(4);
  });
});

describe('Learning Types', () => {
  it('should construct trajectories', () => {
    const trajectory: Trajectory = {
      id: createTrajectoryId('traj-1'),
      task: 'implement-feature',
      steps: [
        {
          id: 'step-1',
          action: 'read-file',
          input: { path: 'src/index.ts' },
          output: { content: 'test' },
          quality: 0.95,
          latencyMs: 50,
        },
      ],
      outcome: 'success',
      reward: 0.85,
      durationMs: 5000,
      startedAt: new Date(),
      completedAt: new Date(),
    };

    expect(trajectory.outcome).toBe('success');
    expect(trajectory.steps).toHaveLength(1);
    expect(trajectory.reward).toBe(0.85);
  });

  it('should construct patterns', () => {
    const pattern: Pattern = {
      id: createPatternId('pat-1'),
      type: 'solution',
      task: 'auth-implementation',
      input: { requirements: 'JWT auth' },
      output: { implementation: 'code' },
      reward: 0.92,
      verdict: {
        type: 'correct',
        confidence: 0.95,
        reasoning: 'Tests pass',
      },
      criticality: 'high',
      learnedAt: new Date(),
      successCount: 5,
    };

    expect(pattern.type).toBe('solution');
    expect(pattern.verdict.type).toBe('correct');
    expect(pattern.successCount).toBe(5);
  });
});

describe('CLI Types', () => {
  it('should support output formats', () => {
    const formats = ['text', 'json', 'table', 'yaml', 'csv'] as const;
    expect(formats).toHaveLength(5);
  });

  it('should support command parameters', () => {
    const param = {
      name: 'file',
      description: 'File to process',
      type: 'string' as const,
      required: true,
      position: 0,
    };

    expect(param.position).toBe(0);
    expect(param.required).toBe(true);
  });
});

describe('Type Constraints', () => {
  it('should enforce readonly properties', () => {
    const agent: Agent = {
      id: createAgentId('agent-1'),
      config: {
        type: 'coder',
        name: 'coder-1',
        capabilities: [],
        tools: [],
      },
      status: 'idle',
      createdAt: new Date(),
      tasksCompleted: 0,
      tasksFailed: 0,
      health: 0.95 as any,
    };

    // Readonly enforcement at type-level
    // @ts-expect-error - Cannot assign to readonly property
    agent.id = createAgentId('new-id');
  });
});
