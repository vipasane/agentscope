/**
 * Agent-specific mock implementations
 */

import { v4 as uuidv4 } from 'uuid';

export interface MockAgentBehavior {
  delay?: number;
  shouldFail?: boolean;
  failureRate?: number;
  responseOverride?: unknown;
}

/**
 * Create a mock agent with configurable behavior
 */
export function createBehavioralMockAgent(behavior: MockAgentBehavior = {}) {
  const {
    delay = 0,
    shouldFail = false,
    failureRate = 0,
    responseOverride
  } = behavior;

  return {
    async execute(input: unknown): Promise<unknown> {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (shouldFail || Math.random() < failureRate) {
        throw new Error('Mock agent execution failed');
      }

      return responseOverride || { input, processed: true };
    },

    async batch(inputs: unknown[]): Promise<unknown[]> {
      return Promise.all(
        inputs.map(input => this.execute(input))
      );
    },

    getState() {
      return { behavior };
    },

    updateBehavior(updates: Partial<MockAgentBehavior>) {
      Object.assign(behavior, updates);
    }
  };
}

/**
 * Create a mock swarm agent
 */
export function createMockSwarmAgent(id: string = uuidv4()) {
  const workers: Map<string, unknown> = new Map();
  const taskQueue: Array<{ id: string; data: unknown }> = [];

  return {
    id,

    async spawn(workerId: string, config?: unknown): Promise<void> {
      workers.set(workerId, config);
    },

    async dispatch(task: unknown): Promise<string> {
      const taskId = uuidv4();
      taskQueue.push({ id: taskId, data: task });
      return taskId;
    },

    async getStatus(): Promise<{ workers: number; queuedTasks: number }> {
      return {
        workers: workers.size,
        queuedTasks: taskQueue.length
      };
    },

    async getWorkers(): Promise<string[]> {
      return Array.from(workers.keys());
    },

    async getTasks(): Promise<Array<{ id: string; data: unknown }>> {
      return [...taskQueue];
    },

    reset(): void {
      workers.clear();
      taskQueue.length = 0;
    }
  };
}

/**
 * Create a mock hierarchical coordinator
 */
export function createMockCoordinator() {
  const agents: Map<string, { type: string; status: string }> = new Map();
  const decisions: Array<{ topic: string; decision: unknown }> = [];

  return {
    async register(agentId: string, agentType: string): Promise<void> {
      agents.set(agentId, { type: agentType, status: 'registered' });
    },

    async coordinate(topic: string, data: unknown): Promise<unknown> {
      const decision = { topic, result: data };
      decisions.push(decision);
      return decision;
    },

    async getAgents(): Promise<Array<[string, { type: string; status: string }]>> {
      return Array.from(agents.entries());
    },

    async getDecisions(): Promise<Array<{ topic: string; decision: unknown }>> {
      return decisions;
    },

    reset(): void {
      agents.clear();
      decisions.length = 0;
    }
  };
}

/**
 * Create a mock Byzantine fault-tolerant coordinator
 */
export function createMockByzantineCoordinator(quorumSize: number = 3) {
  const nodes: Map<string, { vote: unknown; timestamp: number }> = new Map();
  const proposals: Array<{ id: string; value: unknown; votes: number }> = [];

  return {
    async propose(id: string, value: unknown): Promise<void> {
      proposals.push({ id, value, votes: 0 });
    },

    async vote(nodeId: string, proposalId: string, value: unknown): Promise<void> {
      nodes.set(`${nodeId}-${proposalId}`, { vote: value, timestamp: Date.now() });

      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal) {
        proposal.votes++;
      }
    },

    async getConsensus(): Promise<unknown> {
      const consensusProposals = proposals.filter(p => p.votes >= quorumSize);
      return consensusProposals.length > 0 ? consensusProposals[0] : null;
    },

    async getProposals(): Promise<Array<{ id: string; value: unknown; votes: number }>> {
      return proposals;
    },

    reset(): void {
      nodes.clear();
      proposals.length = 0;
    }
  };
}

/**
 * Create a mock learning agent
 */
export function createMockLearningAgent() {
  const trajectory: Array<{ action: string; result: unknown; reward: number }> = [];
  let totalReward = 0;

  return {
    async recordTrajectory(action: string, result: unknown, reward: number): Promise<void> {
      trajectory.push({ action, result, reward });
      totalReward += reward;
    },

    async learn(): Promise<{ improvement: number; totalReward: number }> {
      // Simulate learning
      return {
        improvement: trajectory.length > 0 ? 0.1 : 0,
        totalReward
      };
    },

    async predict(input: unknown): Promise<unknown> {
      // Simulate prediction based on trajectory
      if (trajectory.length === 0) {
        return null;
      }
      return trajectory[trajectory.length - 1].result;
    },

    getTrajectory(): Array<{ action: string; result: unknown; reward: number }> {
      return [...trajectory];
    },

    getTotalReward(): number {
      return totalReward;
    },

    reset(): void {
      trajectory.length = 0;
      totalReward = 0;
    }
  };
}

/**
 * Create a mock security validator agent
 */
export function createMockSecurityAgent() {
  const scans: Array<{ input: unknown; result: 'safe' | 'threat' }> = [];

  return {
    async scan(input: unknown): Promise<'safe' | 'threat'> {
      const result = typeof input === 'string' && input.includes('DROP TABLE') ? 'threat' : 'safe';
      scans.push({ input, result });
      return result;
    },

    async validateInput(input: unknown): Promise<boolean> {
      const result = await this.scan(input);
      return result === 'safe';
    },

    async getScans(): Promise<Array<{ input: unknown; result: 'safe' | 'threat' }>> {
      return scans;
    },

    async getScanCount(): Promise<{ safe: number; threat: number }> {
      return {
        safe: scans.filter(s => s.result === 'safe').length,
        threat: scans.filter(s => s.result === 'threat').length
      };
    },

    reset(): void {
      scans.length = 0;
    }
  };
}
