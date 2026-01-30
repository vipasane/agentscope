/**
 * Advanced unit tests for TrajectoryTracker
 * Tests all methods, edge cases, and performance characteristics
 */

import { TrajectoryTracker } from '../../src/trajectory/tracker';
import { TrajectoryStep } from '../../src/types';

describe('TrajectoryTracker - Advanced Tests', () => {
  let tracker: TrajectoryTracker;

  beforeEach(() => {
    tracker = new TrajectoryTracker();
  });

  describe('Trajectory lifecycle', () => {
    it('should create trajectory with valid ID format', () => {
      const id = tracker.startTrajectory('session-123', 'Test task', { foo: 'bar' });

      expect(id).toMatch(/^traj-session-123-\d+$/);
    });

    it('should store trajectory with correct initial state', () => {
      const id = tracker.startTrajectory('session-1', 'Test task', { input: 'data' });
      const trajectory = tracker.getTrajectory(id);

      expect(trajectory).toBeDefined();
      expect(trajectory!.id).toBe(id);
      expect(trajectory!.sessionId).toBe('session-1');
      expect(trajectory!.task).toBe('Test task');
      expect(trajectory!.input).toEqual({ input: 'data' });
      expect(trajectory!.steps).toEqual([]);
      expect(trajectory!.startTime).toBeGreaterThan(0);
      expect(trajectory!.endTime).toBeUndefined();
    });

    it('should increment trajectory counter', () => {
      const id1 = tracker.startTrajectory('session-1', 'Task 1', {});
      const id2 = tracker.startTrajectory('session-1', 'Task 2', {});
      const id3 = tracker.startTrajectory('session-1', 'Task 3', {});

      expect(id1).toMatch(/traj-session-1-0$/);
      expect(id2).toMatch(/traj-session-1-1$/);
      expect(id3).toMatch(/traj-session-1-2$/);
    });

    it('should handle multiple sessions independently', () => {
      const id1 = tracker.startTrajectory('session-A', 'Task', {});
      const id2 = tracker.startTrajectory('session-B', 'Task', {});

      expect(id1).toContain('session-A');
      expect(id2).toContain('session-B');

      const traj1 = tracker.getTrajectory(id1);
      const traj2 = tracker.getTrajectory(id2);

      expect(traj1!.sessionId).toBe('session-A');
      expect(traj2!.sessionId).toBe('session-B');
    });
  });

  describe('Step management', () => {
    it('should add step with all fields', () => {
      const id = tracker.startTrajectory('session-1', 'Task', {});

      const step: TrajectoryStep = {
        action: 'Test action',
        observation: 'Test observation',
        thought: 'Test thought',
        timestamp: Date.now(),
        metadata: { key: 'value' },
      };

      tracker.addStep(id, step);

      const trajectory = tracker.getTrajectory(id);
      expect(trajectory!.steps).toHaveLength(1);
      expect(trajectory!.steps[0]).toEqual(step);
    });

    it('should auto-generate timestamp if not provided', () => {
      const id = tracker.startTrajectory('session-1', 'Task', {});
      const before = Date.now();

      tracker.addStep(id, {
        action: 'Action',
        observation: 'Observation',
        thought: 'Thought',
        timestamp: 0, // Will be replaced
      });

      const after = Date.now();
      const trajectory = tracker.getTrajectory(id);

      expect(trajectory!.steps[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(trajectory!.steps[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should maintain step order', () => {
      const id = tracker.startTrajectory('session-1', 'Task', {});

      for (let i = 0; i < 10; i++) {
        tracker.addStep(id, {
          action: `Action ${i}`,
          observation: `Result ${i}`,
          thought: `Thought ${i}`,
          timestamp: Date.now() + i,
        });
      }

      const trajectory = tracker.getTrajectory(id);
      expect(trajectory!.steps).toHaveLength(10);

      for (let i = 0; i < 10; i++) {
        expect(trajectory!.steps[i].action).toBe(`Action ${i}`);
      }
    });

    it('should throw error when adding step to nonexistent trajectory', () => {
      expect(() => {
        tracker.addStep('invalid-id', {
          action: 'Test',
          observation: 'Test',
          thought: 'Test',
          timestamp: Date.now(),
        });
      }).toThrow('Trajectory not found: invalid-id');
    });

    it('should handle very large number of steps', () => {
      const id = tracker.startTrajectory('session-1', 'Task', {});

      // Add 10,000 steps
      for (let i = 0; i < 10000; i++) {
        tracker.addStep(id, {
          action: `Action ${i}`,
          observation: `Result ${i}`,
          thought: `Thought ${i}`,
          timestamp: Date.now(),
        });
      }

      const trajectory = tracker.getTrajectory(id);
      expect(trajectory!.steps).toHaveLength(10000);
    });
  });

  describe('Trajectory completion', () => {
    it('should mark trajectory as complete with all fields', () => {
      const id = tracker.startTrajectory('session-1', 'Task', {});
      tracker.addStep(id, {
        action: 'Action',
        observation: 'Observation',
        thought: 'Thought',
        timestamp: Date.now(),
      });

      const output = { result: 'success' };
      const completed = tracker.endTrajectory(id, output, true);

      expect(completed.output).toEqual(output);
      expect(completed.success).toBe(true);
      expect(completed.endTime).toBeDefined();
      expect(completed.totalLatencyMs).toBeDefined();
      expect(completed.totalLatencyMs!).toBeGreaterThan(0);
    });

    it('should calculate latency correctly', () => {
      const id = tracker.startTrajectory('session-1', 'Task', {});

      // Wait a bit
      const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      return wait(50).then(() => {
        const completed = tracker.endTrajectory(id, {}, true);

        expect(completed.totalLatencyMs).toBeGreaterThanOrEqual(50);
        expect(completed.totalLatencyMs).toBeLessThan(200); // Should be fast
      });
    });

    it('should throw error when ending nonexistent trajectory', () => {
      expect(() => {
        tracker.endTrajectory('invalid-id', {}, true);
      }).toThrow('Trajectory not found: invalid-id');
    });

    it('should allow ending trajectory multiple times (idempotent)', () => {
      const id = tracker.startTrajectory('session-1', 'Task', {});

      const result1 = tracker.endTrajectory(id, { v: 1 }, true);
      const result2 = tracker.endTrajectory(id, { v: 2 }, false);

      // Last call wins
      expect(result2.output).toEqual({ v: 2 });
      expect(result2.success).toBe(false);
    });
  });

  describe('Query methods', () => {
    beforeEach(() => {
      // Create test data
      tracker.startTrajectory('session-1', 'Task A', {});
      tracker.startTrajectory('session-1', 'Task B', {});
      tracker.startTrajectory('session-2', 'Task C', {});
      tracker.startTrajectory('session-2', 'Task D', {});
    });

    it('should get trajectory by ID', () => {
      const id = tracker.startTrajectory('test-session', 'Test', {});
      const retrieved = tracker.getTrajectory(id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(id);
    });

    it('should return undefined for nonexistent trajectory', () => {
      const retrieved = tracker.getTrajectory('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should get all trajectories for a session', () => {
      const session1 = tracker.getSessionTrajectories('session-1');
      const session2 = tracker.getSessionTrajectories('session-2');

      expect(session1).toHaveLength(2);
      expect(session2).toHaveLength(2);
      expect(session1.every(t => t.sessionId === 'session-1')).toBe(true);
      expect(session2.every(t => t.sessionId === 'session-2')).toBe(true);
    });

    it('should return empty array for nonexistent session', () => {
      const trajectories = tracker.getSessionTrajectories('nonexistent');
      expect(trajectories).toEqual([]);
    });

    it('should distinguish between active and completed trajectories', () => {
      const id1 = tracker.startTrajectory('session', 'Task 1', {});
      const id2 = tracker.startTrajectory('session', 'Task 2', {});
      const id3 = tracker.startTrajectory('session', 'Task 3', {});

      // Complete some
      tracker.endTrajectory(id1, {}, true);
      tracker.endTrajectory(id3, {}, false);

      const active = tracker.getActiveTrajectories();
      const completed = tracker.getCompletedTrajectories();

      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(id2);

      expect(completed).toHaveLength(2);
      expect(completed.map(t => t.id)).toContain(id1);
      expect(completed.map(t => t.id)).toContain(id3);
    });
  });

  describe('Cleanup methods', () => {
    it('should remove trajectory by ID', () => {
      const id = tracker.startTrajectory('session', 'Task', {});
      expect(tracker.getTrajectory(id)).toBeDefined();

      const removed = tracker.removeTrajectory(id);
      expect(removed).toBe(true);
      expect(tracker.getTrajectory(id)).toBeUndefined();
    });

    it('should return false when removing nonexistent trajectory', () => {
      const removed = tracker.removeTrajectory('nonexistent');
      expect(removed).toBe(false);
    });

    it('should clear all trajectories', () => {
      tracker.startTrajectory('session-1', 'Task 1', {});
      tracker.startTrajectory('session-2', 'Task 2', {});
      tracker.startTrajectory('session-3', 'Task 3', {});

      tracker.clear();

      expect(tracker.getActiveTrajectories()).toHaveLength(0);
      expect(tracker.getCompletedTrajectories()).toHaveLength(0);
    });

    it('should reset counter after clear', () => {
      tracker.startTrajectory('session', 'Task 1', {});
      tracker.startTrajectory('session', 'Task 2', {});

      tracker.clear();

      const id = tracker.startTrajectory('session', 'Task 3', {});
      expect(id).toMatch(/traj-session-0$/); // Counter reset
    });
  });

  describe('Statistics', () => {
    it('should compute accurate statistics', () => {
      const id1 = tracker.startTrajectory('session', 'Task 1', {});
      tracker.addStep(id1, {
        action: 'A',
        observation: 'O',
        thought: 'T',
        timestamp: Date.now(),
      });
      tracker.addStep(id1, {
        action: 'A',
        observation: 'O',
        thought: 'T',
        timestamp: Date.now(),
      });
      tracker.endTrajectory(id1, {}, true);

      const id2 = tracker.startTrajectory('session', 'Task 2', {});
      tracker.addStep(id2, {
        action: 'A',
        observation: 'O',
        thought: 'T',
        timestamp: Date.now(),
      });
      tracker.endTrajectory(id2, {}, false);

      const id3 = tracker.startTrajectory('session', 'Task 3', {});
      tracker.addStep(id3, {
        action: 'A',
        observation: 'O',
        thought: 'T',
        timestamp: Date.now(),
      });
      // Leave active

      const stats = tracker.getStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(1);
      expect(stats.completed).toBe(2);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.avgStepsPerTrajectory).toBeCloseTo(1.33, 1);
    });

    it('should handle empty state statistics', () => {
      const stats = tracker.getStats();

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.avgStepsPerTrajectory).toBe(0);
      expect(stats.avgLatencyMs).toBe(0);
    });

    it('should track average latency correctly', () => {
      const id1 = tracker.startTrajectory('s', 'T1', {});
      const id2 = tracker.startTrajectory('s', 'T2', {});

      // Mock latencies
      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        tracker.endTrajectory(id1, {}, true);
        return new Promise(resolve => setTimeout(resolve, 20));
      }).then(() => {
        tracker.endTrajectory(id2, {}, true);

        const stats = tracker.getStats();
        expect(stats.avgLatencyMs).toBeGreaterThan(0);
      });
    });
  });

  describe('Memory efficiency', () => {
    it('should handle thousands of trajectories', () => {
      const count = 5000;

      for (let i = 0; i < count; i++) {
        const id = tracker.startTrajectory(`session-${i % 10}`, `Task ${i}`, {});
        tracker.addStep(id, {
          action: 'Action',
          observation: 'Observation',
          thought: 'Thought',
          timestamp: Date.now(),
        });
        if (i % 2 === 0) {
          tracker.endTrajectory(id, {}, true);
        }
      }

      const stats = tracker.getStats();
      expect(stats.total).toBe(count);
      expect(stats.completed).toBe(count / 2);
      expect(stats.active).toBe(count / 2);
    });

    it('should support cleanup of completed trajectories', () => {
      // Create and complete many trajectories
      for (let i = 0; i < 100; i++) {
        const id = tracker.startTrajectory('session', `Task ${i}`, {});
        tracker.endTrajectory(id, {}, true);
      }

      const completed = tracker.getCompletedTrajectories();
      expect(completed).toHaveLength(100);

      // Cleanup old ones
      completed.forEach(t => tracker.removeTrajectory(t.id));

      expect(tracker.getCompletedTrajectories()).toHaveLength(0);
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent trajectory creation', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(tracker.startTrajectory(`session-${i}`, `Task ${i}`, {}))
      );

      const ids = await Promise.all(promises);

      expect(ids).toHaveLength(100);
      expect(new Set(ids).size).toBe(100); // All unique
    });

    it('should handle concurrent step additions', async () => {
      const id = tracker.startTrajectory('session', 'Task', {});

      const promises = Array.from({ length: 50 }, (_, i) =>
        Promise.resolve(
          tracker.addStep(id, {
            action: `Action ${i}`,
            observation: `Observation ${i}`,
            thought: `Thought ${i}`,
            timestamp: Date.now(),
          })
        )
      );

      await Promise.all(promises);

      const trajectory = tracker.getTrajectory(id);
      expect(trajectory!.steps).toHaveLength(50);
    });
  });
});
