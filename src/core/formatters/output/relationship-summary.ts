/**
 * Output Formatter Domain - Relationship Summary
 * Calculate and format relationship statistics from agent configuration
 */

import type { AgentScopeConfig } from '../../model/types.js';
import type { RelationshipSummary } from '../types.js';

/**
 * Calculate relationship statistics from configuration
 *
 * @param config - Agent scope configuration
 * @returns Relationship summary with counts and examples
 *
 * @example
 * ```typescript
 * const summary = calculateRelationships(config);
 * console.log(summary.delegations.count); // 12
 * console.log(summary.delegations.example); // "Coordinator → Worker"
 * ```
 */
export function calculateRelationships(config: AgentScopeConfig): RelationshipSummary {
  // Count delegations
  let delegationCount = 0;
  let delegationExample = 'None';

  for (const agent of config.agents) {
    if (agent.delegatesTo && agent.delegatesTo.length > 0) {
      delegationCount += agent.delegatesTo.length;

      if (delegationExample === 'None') {
        delegationExample = `${agent.name} → ${agent.delegatesTo[0]}`;
      }
    }
  }

  // Count tool usages
  let toolUsageCount = 0;
  let toolUsageExample = 'None';

  for (const agent of config.agents) {
    if (agent.tools && agent.tools.length > 0) {
      toolUsageCount += agent.tools.length;

      if (toolUsageExample === 'None') {
        toolUsageExample = `${agent.name} uses ${agent.tools[0]}`;
      }
    }
  }

  // Count skill usages (skills with triggers)
  let skillUsageCount = 0;
  let skillUsageExample = 'None';

  for (const skill of config.skills) {
    if (skill.triggers && skill.triggers.length > 0) {
      skillUsageCount += skill.triggers.length;

      if (skillUsageExample === 'None') {
        skillUsageExample = `"${skill.triggers[0]}" → ${skill.name}`;
      }
    }
  }

  return {
    delegations: {
      count: delegationCount,
      example: delegationExample,
    },
    toolUsages: {
      count: toolUsageCount,
      example: toolUsageExample,
    },
    skillUsages: {
      count: skillUsageCount,
      example: skillUsageExample,
    },
  };
}

/**
 * Generate relationship summary table in markdown
 *
 * @param summary - Relationship summary data
 * @returns Markdown table
 *
 * @example
 * ```typescript
 * const summary = calculateRelationships(config);
 * const table = generateRelationshipTable(summary);
 * ```
 */
export function generateRelationshipTable(summary: RelationshipSummary): string {
  const lines: string[] = [
    '| Type | Count | Example |',
    '|------|------:|---------|',
    `| Delegations | ${summary.delegations.count} | ${summary.delegations.example} |`,
    `| Tool Usages | ${summary.toolUsages.count} | ${summary.toolUsages.example} |`,
    `| Skill Usages | ${summary.skillUsages.count} | ${summary.skillUsages.example} |`,
  ];

  return lines.join('\n');
}

/**
 * Get detailed delegation chains
 *
 * @param config - Agent scope configuration
 * @returns Array of delegation chains
 *
 * @example
 * ```typescript
 * const chains = getDelegationChains(config);
 * // Returns: [['Coordinator', 'Worker1', 'Specialist'], ...]
 * ```
 */
export function getDelegationChains(config: AgentScopeConfig): string[][] {
  const chains: string[][] = [];
  const visited = new Set<string>();

  const buildChain = (agentName: string, currentChain: string[]): void => {
    if (visited.has(agentName)) {
      // Circular delegation detected
      return;
    }

    visited.add(agentName);
    currentChain.push(agentName);

    const agent = config.agents.find(a => a.name === agentName);

    if (agent?.delegatesTo && agent.delegatesTo.length > 0) {
      for (const target of agent.delegatesTo) {
        buildChain(target, [...currentChain]);
      }
    } else {
      // End of chain
      if (currentChain.length > 1) {
        chains.push([...currentChain]);
      }
    }

    visited.delete(agentName);
  };

  // Start from agents with no incoming delegations (potential roots)
  const allTargets = new Set(
    config.agents.flatMap(a => a.delegatesTo ?? [])
  );

  const roots = config.agents
    .filter(a => !allTargets.has(a.name))
    .map(a => a.name);

  for (const root of roots) {
    buildChain(root, []);
  }

  return chains;
}

/**
 * Generate delegation chain visualization
 *
 * @param chains - Delegation chains
 * @returns Markdown list
 */
export function generateDelegationChainList(chains: string[][]): string {
  if (chains.length === 0) {
    return 'No delegation chains found.';
  }

  const lines: string[] = ['**Delegation Chains**:\n'];

  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i];
    lines.push(`${i + 1}. ${chain.join(' → ')}`);
  }

  return lines.join('\n');
}

/**
 * Calculate tool usage by agent type
 *
 * @param config - Agent scope configuration
 * @returns Tool usage grouped by agent type
 */
export function getToolUsageByType(
  config: AgentScopeConfig
): Record<string, { count: number; tools: Set<string> }> {
  const usage: Record<string, { count: number; tools: Set<string> }> = {};

  for (const agent of config.agents) {
    const type = agent.type ?? 'worker';

    if (!usage[type]) {
      usage[type] = { count: 0, tools: new Set() };
    }

    if (agent.tools) {
      usage[type].count += agent.tools.length;
      agent.tools.forEach(tool => usage[type].tools.add(tool));
    }
  }

  return usage;
}

/**
 * Generate tool usage summary by type
 *
 * @param config - Agent scope configuration
 * @returns Markdown table
 */
export function generateToolUsageSummary(config: AgentScopeConfig): string {
  const usage = getToolUsageByType(config);

  const lines: string[] = [
    '| Agent Type | Tool Count | Unique Tools |',
    '|------------|----------:|------------:|',
  ];

  for (const [type, data] of Object.entries(usage)) {
    lines.push(`| ${capitalize(type)} | ${data.count} | ${data.tools.size} |`);
  }

  return lines.join('\n');
}

/**
 * Find circular dependencies in delegations
 *
 * @param config - Agent scope configuration
 * @returns Array of circular dependency chains
 */
export function findCircularDelegations(config: AgentScopeConfig): string[][] {
  const circular: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  const detectCycle = (agentName: string, path: string[]): void => {
    if (recStack.has(agentName)) {
      // Found a cycle
      const cycleStart = path.indexOf(agentName);
      circular.push([...path.slice(cycleStart), agentName]);
      return;
    }

    if (visited.has(agentName)) {
      return;
    }

    visited.add(agentName);
    recStack.add(agentName);

    const agent = config.agents.find(a => a.name === agentName);

    if (agent?.delegatesTo) {
      for (const target of agent.delegatesTo) {
        detectCycle(target, [...path, agentName]);
      }
    }

    recStack.delete(agentName);
  };

  for (const agent of config.agents) {
    if (!visited.has(agent.name)) {
      detectCycle(agent.name, []);
    }
  }

  return circular;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
