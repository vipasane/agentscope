import { describe, it, expect, beforeEach } from 'vitest';
import { TrajectoryTracker } from '../src/core/TrajectoryTracker.js';

describe('TrajectoryTracker', () => {
  let tracker: TrajectoryTracker;

  beforeEach(() => {
    tracker = new TrajectoryTracker();
  });

  describe('startTrajectory', () => {
    it('should create a new trajectory', () => {
      const id = tracker.startTrajectory('session-1', 'Test task', { foo: 'bar' });

      expect(id).toMatch(/^trajectory-session-1-\d+-\d+$/);
      const trajectory = tracker.getTrajectory(id);
      expect(trajectory.sessionId).toBe('session-1');
      expect(trajectory.task).toBe('Test task');
      expect(trajectory.input).toEqual({ foo: 'bar' });
      expect(trajectory.steps).toEqual([]);
    });

    it('should generate unique IDs', () => {
      const id1 = tracker.startTrajectory('session-1', 'Task 1', {});
      const id2 = tracker.startTrajectory('session-1', 'Task 2', {});

      expect(id1).not.toBe(id2);
    });
  });

  describe('recordStep', () => {
    it('should add a step to trajectory', () => {
      const id = tracker.startTrajectory('session-1', 'Test', {});

      tracker.recordStep(id, {
        action: 'test_action',
        observation: 'test_observation',
        thought: 'test_thought',
      });

      const trajectory = tracker.getTrajectory(id);
      expect(trajectory.steps).toHaveLength(1);
      expect(trajectory.steps[0].action).toBe('test_action');
      expect(trajectory.steps[0].observation).toBe('test_observation');
      expect(trajectory.steps[0].thought).toBe('test_thought');
      expect(trajectory.steps[0].timestamp).toBeGreaterThan(0);
    });

    it('should throw if trajectory not found', () => {
      expect(() => tracker.recordStep('invalid-id', {
        action: 'test',
        observation: 'test',
        thought: 'test',
      })).toThrow('Trajectory not found');
    });
  });

  describe('endTrajectory', () => {
    it('should finalize trajectory with success', () => {
      const id = tracker.startTrajectory('session-1', 'Test', { input: 'data' });
      tracker.recordStep(id, { action: 'do', observation: 'done', thought: 'thinking' });

      const trajectory = tracker.endTrajectory(id, { result: 'success' }, true);

      expect(trajectory.output).toEqual({ result: 'success' });
      expect(trajectory.success).toBe(true);
      expect(trajectory.endTime).toBeGreaterThan(0);
      expect(trajectory.totalLatencyMs).toBeGreaterThan(0);
    });

    it('should remove trajectory from active tracking', () => {
      const id = tracker.startTrajectory('session-1', 'Test', {});
      tracker.endTrajectory(id, {}, true);

      expect(() => tracker.getTrajectory(id)).toThrow('Trajectory not found');
    });

    it('should throw if trajectory not found', () => {
      expect(() => tracker.endTrajectory('invalid-id', {}, true)).toThrow('Trajectory not found');
    });
  });

  describe('getActiveTrajectories', () => {
    it('should return all active trajectory IDs', () => {
      const id1 = tracker.startTrajectory('session-1', 'Task 1', {});
      const id2 = tracker.startTrajectory('session-2', 'Task 2', {});

      const active = tracker.getActiveTrajectories();
      expect(active).toContain(id1);
      expect(active).toContain(id2);
      expect(active).toHaveLength(2);
    });

    it('should not include ended trajectories', () => {
      const id1 = tracker.startTrajectory('session-1', 'Task 1', {});
      const id2 = tracker.startTrajectory('session-2', 'Task 2', {});

      tracker.endTrajectory(id1, {}, true);

      const active = tracker.getActiveTrajectories();
      expect(active).not.toContain(id1);
      expect(active).toContain(id2);
      expect(active).toHaveLength(1);
    });
  });

  describe('cancelTrajectory', () => {
    it('should remove trajectory without finalizing', () => {
      const id = tracker.startTrajectory('session-1', 'Test', {});
      const cancelled = tracker.cancelTrajectory(id);

      expect(cancelled).toBe(true);
      expect(tracker.getActiveTrajectories()).not.toContain(id);
    });

    it('should return false for non-existent trajectory', () => {
      const cancelled = tracker.cancelTrajectory('invalid-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should remove all active trajectories', () => {
      tracker.startTrajectory('session-1', 'Task 1', {});
      tracker.startTrajectory('session-2', 'Task 2', {});

      tracker.clearAll();

      expect(tracker.getActiveTrajectories()).toHaveLength(0);
    });
  });
});
