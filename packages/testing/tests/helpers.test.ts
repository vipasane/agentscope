/**
 * Tests for helper utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestContext,
  completeTestContext,
  sleep,
  retry,
  waitFor,
  captureConsoleOutput,
  measureAsyncExecution,
  createDeferred
} from '../src/helpers';

describe('Test Helpers', () => {
  describe('Test Context', () => {
    it('should create test context', () => {
      const context = createTestContext('test-name');
      expect(context.name).toBe('test-name');
      expect(context.status).toBe('pending');
      expect(context.id).toBeDefined();
      expect(context.startTime).toBeDefined();
    });

    it('should complete test context', () => {
      const context = createTestContext('test');
      const completed = completeTestContext(context, 'passed');

      expect(completed.status).toBe('passed');
      expect(completed.duration).toBeGreaterThanOrEqual(0);
      expect(completed.endTime).toBeDefined();
    });

    it('should complete context with error', () => {
      const context = createTestContext('test');
      const error = new Error('Test error');
      const completed = completeTestContext(context, 'failed', error);

      expect(completed.status).toBe('failed');
      expect(completed.error).toBe(error);
    });
  });

  describe('Async Utilities', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await sleep(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const result = await retry(async () => {
        attempts++;
        if (attempts < 2) throw new Error('Fail');
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should fail after max retries', async () => {
      let attempts = 0;
      await expect(
        retry(
          async () => {
            attempts++;
            throw new Error('Always fails');
          },
          { retries: 2 }
        )
      ).rejects.toThrow('Always fails');

      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe('Wait For Condition', () => {
    it('should wait for condition', async () => {
      let value = 0;
      setTimeout(() => {
        value = 1;
      }, 100);

      await waitFor(() => value === 1);
      expect(value).toBe(1);
    });

    it('should timeout waiting for condition', async () => {
      await expect(
        waitFor(() => false, { timeout: 100 })
      ).rejects.toThrow('Condition not met');
    });
  });

  describe('Console Output Capture', () => {
    it('should capture console output', () => {
      const { capture, release, getOutput } = captureConsoleOutput();

      capture();
      console.log('test log');
      console.error('test error');
      console.warn('test warn');
      release();

      const output = getOutput();
      expect(output.logs).toContain('test log');
      expect(output.errors).toContain('test error');
      expect(output.warns).toContain('test warn');
    });
  });

  describe('Performance Measurement', () => {
    it('should measure async execution', async () => {
      const { result, duration } = await measureAsyncExecution(async () => {
        await sleep(50);
        return 'done';
      });

      expect(result).toBe('done');
      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Deferred Promise', () => {
    it('should create deferred promise', async () => {
      const deferred = createDeferred<string>();

      setTimeout(() => {
        deferred.resolve('value');
      }, 50);

      const result = await deferred.promise;
      expect(result).toBe('value');
    });

    it('should reject deferred promise', async () => {
      const deferred = createDeferred<string>();

      setTimeout(() => {
        deferred.reject(new Error('rejected'));
      }, 50);

      await expect(deferred.promise).rejects.toThrow('rejected');
    });
  });
});
