import { TrajectoryTracker } from '../src/trajectory/tracker';

describe('TrajectoryTracker', () => {
  let tracker: TrajectoryTracker;

  beforeEach(() => {
    tracker = new TrajectoryTracker();
  });

  describe('startTrajectory', () => {
    it('should create a new trajectory', () => {
      const id = tracker.startTrajectory('session-1', 'test task', { foo: 'bar' });

      expect(id).toMatch(/^traj-session-1-\d+$/);

      const trajectory = tracker.getTrajectory(id);
      expect(trajectory).toBeDefined();
      expect(trajectory?.sessionId).toBe('session-1');
      expect(trajectory?.task).toBe('test task');
      expect(trajectory?.input).toEqual({ foo: 'bar' });
      expect(trajectory?.steps).toEqual([]);
    });

    it('should generate unique IDs', () => {
      const id1 = tracker.startTrajectory('session-1', 'task1', {});
      const id2 = tracker.startTrajectory('session-1', 'task2', {});

      expect(id1).not.toBe(id2);
    });
  });

  describe('addStep', () => {
    it('should add step to trajectory', () => {
      const id = tracker.startTrajectory('session-1', 'test', {});

      tracker.addStep(id, {
        action: 'test action',
        observation: 'test observation',
        thought: 'test thought',
        timestamp: Date.now(),
      });

      const trajectory = tracker.getTrajectory(id);
      expect(trajectory?.steps).toHaveLength(1);
      expect(trajectory?.steps[0].action).toBe('test action');
    });

    it('should throw on invalid trajectory ID', () => {
      expect(() => {
        tracker.addStep('invalid-id', {
          action: 'test',
          observation: 'test',
          thought: 'test',
          timestamp: Date.now(),
        });
      }).toThrow('Trajectory not found');
    });

    it('should auto-set timestamp if not provided', () => {
      const id = tracker.startTrajectory('session-1', 'test', {});
      const before = Date.now();

      tracker.addStep(id, {
        action: 'test',
        observation: 'test',
        thought: 'test',
        timestamp: 0,
      });

      const after = Date.now();
      const trajectory = tracker.getTrajectory(id);
      const timestamp = trajectory?.steps[0].timestamp || 0;

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('endTrajectory', () => {
    it('should complete trajectory', () => {
      const id = tracker.startTrajectory('session-1', 'test', {});
      const output = { result: 'success' };

      const completed = tracker.endTrajectory(id, output, true);

      expect(completed.output).toEqual(output);
      expect(completed.success).toBe(true);
      expect(completed.endTime).toBeDefined();
      expect(completed.totalLatencyMs).toBeGreaterThan(0);
    });

    it('should throw on invalid trajectory ID', () => {
      expect(() => {
        tracker.endTrajectory('invalid-id', {}, true);
      }).toThrow('Trajectory not found');
    });
  });

  describe('getSessionTrajectories', () => {
    it('should return trajectories for session', () => {
      tracker.startTrajectory('session-1', 'task1', {});
      tracker.startTrajectory('session-1', 'task2', {});
      tracker.startTrajectory('session-2', 'task3', {});

      const session1 = tracker.getSessionTrajectories('session-1');
      expect(session1).toHaveLength(2);

      const session2 = tracker.getSessionTrajectories('session-2');
      expect(session2).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const id1 = tracker.startTrajectory('session-1', 'task1', {});
      tracker.addStep(id1, {
        action: 'step1',
        observation: 'obs1',
        thought: 'thought1',
        timestamp: Date.now(),
      });
      tracker.endTrajectory(id1, {}, true);

      const id2 = tracker.startTrajectory('session-1', 'task2', {});
      tracker.addStep(id2, {
        action: 'step2',
        observation: 'obs2',
        thought: 'thought2',
        timestamp: Date.now(),
      });
      tracker.endTrajectory(id2, {}, false);

      const id3 = tracker.startTrajectory('session-1', 'task3', {});

      const stats = tracker.getStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(1);
      expect(stats.completed).toBe(2);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.avgStepsPerTrajectory).toBe(2 / 3);
    });
  });

  describe('clear', () => {
    it('should remove all trajectories', () => {
      tracker.startTrajectory('session-1', 'task1', {});
      tracker.startTrajectory('session-1', 'task2', {});

      tracker.clear();

      const stats = tracker.getStats();
      expect(stats.total).toBe(0);
    });
  });
});
