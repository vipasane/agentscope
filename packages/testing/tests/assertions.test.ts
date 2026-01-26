/**
 * Tests for custom assertions
 */

import { describe, it, expect } from 'vitest';
import {
  expectTestContext,
  expectAgent,
  expectPerformance,
  expectAsync,
  expectError,
  expectCollection,
  expectStructure
} from '../src/assertions';
import { createTestContext, completeTestContext } from '../src/helpers';
import { createMockAgent } from '../src/mocks';

describe('Custom Assertions', () => {
  describe('Test Context Assertions', () => {
    it('should assert passed context', () => {
      const context = createTestContext('test');
      const completed = completeTestContext(context, 'passed');

      expect(() => {
        expectTestContext(completed).toHavePassed();
      }).not.toThrow();
    });

    it('should assert failed context', () => {
      const context = createTestContext('test');
      const error = new Error('Test error');
      const completed = completeTestContext(context, 'failed', error);

      expect(() => {
        expectTestContext(completed).toHaveFailed();
      }).not.toThrow();
    });

    it('should assert duration', () => {
      const context = createTestContext('test');
      const completed = completeTestContext(context, 'passed');

      expect(() => {
        expectTestContext(completed).toHaveDuration(0, 1000);
      }).not.toThrow();
    });

    it('should assert error', () => {
      const context = createTestContext('test');
      const error = new Error('Test error');
      const completed = completeTestContext(context, 'failed', error);

      expect(() => {
        expectTestContext(completed).toHaveError('Test error');
      }).not.toThrow();
    });
  });

  describe('Agent Assertions', () => {
    it('should assert agent called', () => {
      const agent = createMockAgent();
      agent.call('execute', 'data');

      expect(() => {
        expectAgent(agent).toHaveCalled('execute');
      }).not.toThrow();
    });

    it('should assert call count', () => {
      const agent = createMockAgent();
      agent.call('execute', 'data');
      agent.call('execute', 'data');

      expect(() => {
        expectAgent(agent).toHaveCalledTimes(2, 'execute');
      }).not.toThrow();
    });

    it('should assert error', () => {
      const agent = createMockAgent();
      const error = new Error('Test error');
      agent.recordError(error);

      expect(() => {
        expectAgent(agent).toHaveError('Test error');
      }).not.toThrow();
    });
  });

  describe('Performance Assertions', () => {
    it('should assert duration', () => {
      const metrics = {
        startTime: Date.now() - 100,
        calls: 10,
        duration: 100
      };

      expect(() => {
        expectPerformance(metrics).toBeWithinDuration(50, 150);
      }).not.toThrow();
    });

    it('should assert call count', () => {
      const metrics = {
        startTime: Date.now(),
        calls: 5,
        duration: 100
      };

      expect(() => {
        expectPerformance(metrics).toHaveCallCount(5);
      }).not.toThrow();
    });
  });

  describe('Async Assertions', () => {
    it('should assert async resolution', async () => {
      const promise = Promise.resolve('value');

      await expect(async () => {
        await expectAsync(promise).toResolveWith('value');
      }).not.rejects.toThrow();
    });

    it('should assert async rejection', async () => {
      const promise = Promise.reject(new Error('Failed'));

      await expect(async () => {
        await expectAsync(promise).toRejectWith('Failed');
      }).not.rejects.toThrow();
    });
  });

  describe('Collection Assertions', () => {
    it('should assert item in collection', () => {
      const collection = [1, 2, 3];

      expect(() => {
        expectCollection(collection).toContainItem(2);
      }).not.toThrow();
    });

    it('should assert collection length', () => {
      const collection = [1, 2, 3];

      expect(() => {
        expectCollection(collection).toHaveLength(3);
      }).not.toThrow();
    });

    it('should assert empty collection', () => {
      const collection: number[] = [];

      expect(() => {
        expectCollection(collection).toBeEmpty();
      }).not.toThrow();
    });

    it('should assert non-empty collection', () => {
      const collection = [1, 2, 3];

      expect(() => {
        expectCollection(collection).toNotBeEmpty();
      }).not.toThrow();
    });
  });

  describe('Error Assertions', () => {
    it('should assert error exists', () => {
      const error = new Error('Test');

      expect(() => {
        expectError(error).toExist();
      }).not.toThrow();
    });

    it('should assert error message', () => {
      const error = new Error('Test error message');

      expect(() => {
        expectError(error).toHaveMessage('error message');
      }).not.toThrow();
    });

    it('should assert no error', () => {
      expect(() => {
        expectError(null).toNotExist();
      }).not.toThrow();
    });
  });

  describe('Structure Assertions', () => {
    it('should assert properties', () => {
      const data = { id: 1, name: 'test' };

      expect(() => {
        expectStructure(data).toHaveProperties(['id', 'name']);
      }).not.toThrow();
    });

    it('should assert property value', () => {
      const data = { id: 1, name: 'test' };

      expect(() => {
        expectStructure(data).toHaveProperty('name', 'test');
      }).not.toThrow();
    });

    it('should assert structure match', () => {
      const data = { id: 1, name: 'test', active: true };

      expect(() => {
        expectStructure(data).toMatch({ id: 1, name: 'test' });
      }).not.toThrow();
    });
  });
});
