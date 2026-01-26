/**
 * Trajectory tracking for agent execution paths
 *
 * Tracks sequences of actions, observations, and thoughts during task execution.
 * Enables learning from complete execution trajectories rather than isolated actions.
 */

import { Trajectory, TrajectoryStep } from '../types';

export class TrajectoryTracker {
  private trajectories: Map<string, Trajectory> = new Map();
  private trajectoryIdCounter = 0;

  /**
   * Start tracking a new trajectory
   *
   * @param sessionId - Session identifier for grouping trajectories
   * @param task - Description of the task being executed
   * @param input - Initial input data
   * @returns Trajectory ID for tracking
   */
  startTrajectory(sessionId: string, task: string, input: unknown): string {
    const trajectoryId = `traj-${sessionId}-${this.trajectoryIdCounter++}`;

    const trajectory: Trajectory = {
      id: trajectoryId,
      sessionId,
      task,
      input,
      steps: [],
      startTime: Date.now(),
    };

    this.trajectories.set(trajectoryId, trajectory);
    return trajectoryId;
  }

  /**
   * Add a step to an ongoing trajectory
   *
   * @param trajectoryId - ID of the trajectory to update
   * @param step - Step data to add
   */
  addStep(trajectoryId: string, step: TrajectoryStep): void {
    const trajectory = this.trajectories.get(trajectoryId);

    if (!trajectory) {
      throw new Error(`Trajectory not found: ${trajectoryId}`);
    }

    trajectory.steps.push({
      ...step,
      timestamp: step.timestamp || Date.now(),
    });
  }

  /**
   * End a trajectory and mark it complete
   *
   * @param trajectoryId - ID of the trajectory to end
   * @param output - Final output from execution
   * @param success - Whether execution was successful
   */
  endTrajectory(trajectoryId: string, output: unknown, success: boolean): Trajectory {
    const trajectory = this.trajectories.get(trajectoryId);

    if (!trajectory) {
      throw new Error(`Trajectory not found: ${trajectoryId}`);
    }

    trajectory.output = output;
    trajectory.success = success;
    trajectory.endTime = Date.now();
    trajectory.totalLatencyMs = trajectory.endTime - trajectory.startTime;

    return trajectory;
  }

  /**
   * Get a trajectory by ID
   *
   * @param trajectoryId - ID of the trajectory to retrieve
   * @returns Trajectory if found, undefined otherwise
   */
  getTrajectory(trajectoryId: string): Trajectory | undefined {
    return this.trajectories.get(trajectoryId);
  }

  /**
   * Get all trajectories for a session
   *
   * @param sessionId - Session identifier
   * @returns Array of trajectories in the session
   */
  getSessionTrajectories(sessionId: string): Trajectory[] {
    return Array.from(this.trajectories.values())
      .filter(t => t.sessionId === sessionId);
  }

  /**
   * Get all active (incomplete) trajectories
   *
   * @returns Array of active trajectories
   */
  getActiveTrajectories(): Trajectory[] {
    return Array.from(this.trajectories.values())
      .filter(t => t.endTime === undefined);
  }

  /**
   * Get all completed trajectories
   *
   * @returns Array of completed trajectories
   */
  getCompletedTrajectories(): Trajectory[] {
    return Array.from(this.trajectories.values())
      .filter(t => t.endTime !== undefined);
  }

  /**
   * Remove a trajectory from tracking
   * Useful for cleaning up after storing to permanent storage
   *
   * @param trajectoryId - ID of the trajectory to remove
   * @returns true if removed, false if not found
   */
  removeTrajectory(trajectoryId: string): boolean {
    return this.trajectories.delete(trajectoryId);
  }

  /**
   * Clear all trajectories from memory
   */
  clear(): void {
    this.trajectories.clear();
    this.trajectoryIdCounter = 0;
  }

  /**
   * Get statistics about tracked trajectories
   */
  getStats(): {
    total: number;
    active: number;
    completed: number;
    successful: number;
    failed: number;
    avgStepsPerTrajectory: number;
    avgLatencyMs: number;
  } {
    const all = Array.from(this.trajectories.values());
    const completed = all.filter(t => t.endTime !== undefined);
    const successful = completed.filter(t => t.success === true);
    const failed = completed.filter(t => t.success === false);

    const totalSteps = all.reduce((sum, t) => sum + t.steps.length, 0);
    const totalLatency = completed.reduce(
      (sum, t) => sum + (t.totalLatencyMs || 0),
      0
    );

    return {
      total: all.length,
      active: all.length - completed.length,
      completed: completed.length,
      successful: successful.length,
      failed: failed.length,
      avgStepsPerTrajectory: all.length > 0 ? totalSteps / all.length : 0,
      avgLatencyMs: completed.length > 0 ? totalLatency / completed.length : 0,
    };
  }
}
