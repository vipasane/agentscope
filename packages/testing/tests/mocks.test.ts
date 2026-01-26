/**
 * Tests for mock factories
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockAgent,
  createMockMemory,
  createMockCLIExecutor,
  createMockHttpClient,
  createMockEventEmitter,
  createMockLogger,
  createSpy
} from '../src/mocks';
import {
  createBehavioralMockAgent,
  createMockSwarmAgent,
  createMockCoordinator,
  createMockLearningAgent,
  createMockSecurityAgent
} from '../src/mocks/agent-mocks';
import { createMockHNSWMemory } from '../src/mocks/memory-mocks';

describe('Mock Factories', () => {
  describe('Mock Agent', () => {
    it('should create mock agent', () => {
      const agent = createMockAgent();
      expect(agent.id).toBeDefined();
      expect(agent.type).toBe('agent');
      expect(agent.calls).toEqual([]);
    });

    it('should record agent calls', () => {
      const agent = createMockAgent();
      agent.call('execute', { data: 'test' });

      expect(agent.getCallCount()).toBe(1);
      expect(agent.getCalls()[0].method).toBe('execute');
    });

    it('should record errors', () => {
      const agent = createMockAgent();
      const error = new Error('Test error');
      agent.recordError(error);

      expect(agent.errors).toContain(error);
    });

    it('should reset agent', () => {
      const agent = createMockAgent();
      agent.call('test');
      agent.recordError(new Error('err'));

      agent.reset();

      expect(agent.calls).toHaveLength(0);
      expect(agent.errors).toHaveLength(0);
    });
  });

  describe('Mock Memory', () => {
    it('should store and retrieve', () => {
      const memory = createMockMemory();
      memory.store('key1', { data: 'value' });

      const result = memory.retrieve('key1');
      expect(result).toEqual({ data: 'value' });
    });

    it('should search memory', () => {
      const memory = createMockMemory();
      memory.store('auth-key', { token: 'jwt' });
      memory.store('db-key', { connection: 'postgres' });

      const results = memory.search('auth');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should delete from memory', () => {
      const memory = createMockMemory();
      memory.store('key1', 'value');
      memory.delete('key1');

      expect(memory.retrieve('key1')).toBeUndefined();
    });
  });

  describe('Mock CLI Executor', () => {
    it('should execute commands', async () => {
      const executor = createMockCLIExecutor();
      const result = await executor.execute('test', ['arg1', 'arg2']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('test');
    });

    it('should track command history', async () => {
      const executor = createMockCLIExecutor();
      await executor.execute('cmd1', ['arg']);
      await executor.execute('cmd2', ['arg']);

      const history = executor.getHistory();
      expect(history).toHaveLength(2);
    });
  });

  describe('Mock HTTP Client', () => {
    it('should make GET requests', async () => {
      const client = createMockHttpClient();
      const response = await client.get('http://example.com/api');

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should track requests', async () => {
      const client = createMockHttpClient();
      await client.post('http://example.com', { data: 'test' });

      const requests = client.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('POST');
    });
  });

  describe('Mock Event Emitter', () => {
    it('should emit and listen to events', () => {
      const emitter = createMockEventEmitter();
      let received = false;

      emitter.on('test', () => {
        received = true;
      });

      emitter.emit('test', {});
      expect(received).toBe(true);
    });

    it('should track events', () => {
      const emitter = createMockEventEmitter();
      emitter.emit('event1', { data: 'test' });
      emitter.emit('event2', { data: 'test2' });

      const events = emitter.getEvents();
      expect(events).toHaveLength(2);
    });
  });

  describe('Mock Logger', () => {
    it('should log messages', () => {
      const logger = createMockLogger();
      logger.info('test message');

      const logs = logger.getLogs('info');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('test message');
    });

    it('should filter logs by level', () => {
      const logger = createMockLogger();
      logger.info('info');
      logger.error('error');
      logger.debug('debug');

      expect(logger.getLogs('info')).toHaveLength(1);
      expect(logger.getLogs('error')).toHaveLength(1);
      expect(logger.getLogs('debug')).toHaveLength(1);
    });
  });

  describe('Spy Functions', () => {
    it('should create spy', () => {
      const { spy, callCount } = createSpy((x: number) => x * 2);

      spy(5);
      expect(callCount()).toBe(1);
    });
  });

  describe('Behavioral Mock Agent', () => {
    it('should create agent with behavior', async () => {
      const agent = createBehavioralMockAgent({ delay: 10 });
      const result = await agent.execute('test');

      expect(result).toBeDefined();
    });

    it('should fail based on behavior', async () => {
      const agent = createBehavioralMockAgent({ shouldFail: true });

      await expect(agent.execute('test')).rejects.toThrow();
    });
  });

  describe('Swarm Agent', () => {
    it('should manage workers', async () => {
      const agent = createMockSwarmAgent();
      await agent.spawn('worker1');

      const workers = await agent.getWorkers();
      expect(workers).toContain('worker1');
    });

    it('should dispatch tasks', async () => {
      const agent = createMockSwarmAgent();
      const taskId = await agent.dispatch({ work: 'test' });

      expect(taskId).toBeDefined();
    });
  });

  describe('Coordinator', () => {
    it('should register agents', async () => {
      const coordinator = createMockCoordinator();
      await coordinator.register('agent1', 'coder');

      const agents = await coordinator.getAgents();
      expect(agents.length).toBeGreaterThan(0);
    });
  });

  describe('Learning Agent', () => {
    it('should record trajectories', async () => {
      const agent = createMockLearningAgent();
      await agent.recordTrajectory('action1', 'result1', 0.8);

      const trajectory = agent.getTrajectory();
      expect(trajectory).toHaveLength(1);
      expect(trajectory[0].reward).toBe(0.8);
    });

    it('should learn from trajectory', async () => {
      const agent = createMockLearningAgent();
      await agent.recordTrajectory('action1', 'result1', 0.8);

      const learning = await agent.learn();
      expect(learning.improvement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Security Agent', () => {
    it('should detect threats', async () => {
      const agent = createMockSecurityAgent();
      const result = await agent.scan('DROP TABLE users;');

      expect(result).toBe('threat');
    });

    it('should validate safe input', async () => {
      const agent = createMockSecurityAgent();
      const result = await agent.validateInput('SELECT * FROM users');

      expect(result).toBe(true);
    });
  });

  describe('HNSW Memory', () => {
    it('should insert and retrieve', async () => {
      const memory = createMockHNSWMemory();
      await memory.insert('key1', { data: 'test' });

      const result = await memory.get('key1');
      expect(result).toEqual({ data: 'test' });
    });

    it('should search with embeddings', async () => {
      const memory = createMockHNSWMemory();
      const embedding = Array(768).fill(0.5);

      await memory.insert('key1', 'text1', embedding);
      const results = await memory.search(embedding, 5);

      expect(results.length).toBeGreaterThan(0);
    });
  });
});
