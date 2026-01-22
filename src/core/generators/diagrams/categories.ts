/**
 * Agent Category Detection
 * Automatically categorizes agents based on name patterns and types
 */

import type { Agent } from '../../model/types.js';

export type AgentCategory =
  | 'github'
  | 'security'
  | 'sparc'
  | 'flow-nexus'
  | 'consensus'
  | 'coordination'
  | 'v3-core'
  | 'performance'
  | 'memory'
  | 'development'
  | 'testing'
  | 'analysis'
  | 'documentation'
  | 'other';

export interface CategorizedAgents {
  category: AgentCategory;
  label: string;
  icon: string;
  agents: Agent[];
}

/**
 * Category definitions with detection patterns
 */
const CATEGORY_PATTERNS: Array<{
  category: AgentCategory;
  label: string;
  icon: string;
  patterns: RegExp[];
  typePatterns?: string[];
}> = [
  {
    category: 'github',
    label: 'GitHub',
    icon: '🐙',
    patterns: [
      /^github[_-]/i,
      /^pr[_-]manager/i,
      /^issue[_-]/i,
      /^release[_-]/i,
      /^repo[_-]/i,
      /^workflow[_-]automation/i,
      /^code[_-]review[_-]swarm/i,
      /^swarm[_-]pr/i,
      /^swarm[_-]issue/i,
      /^sync[_-]coordinator/i,
      /^multi[_-]repo/i,
      /^project[_-]board/i,
    ],
  },
  {
    category: 'security',
    label: 'Security',
    icon: '🔒',
    patterns: [
      /^security[_-]/i,
      /^pii[_-]/i,
      /^injection[_-]/i,
      /^aidefence/i,
      /^claims[_-]authorizer/i,
      /^audit$/i,
    ],
    typePatterns: ['security'],
  },
  {
    category: 'sparc',
    label: 'SPARC',
    icon: '⚡',
    patterns: [
      /^sparc[_-]/i,
      /^specification$/i,
      /^pseudocode$/i,
      /^architecture$/i,
      /^refinement$/i,
    ],
  },
  {
    category: 'flow-nexus',
    label: 'Flow Nexus',
    icon: '🌊',
    patterns: [/^flow[_-]nexus/i],
  },
  {
    category: 'consensus',
    label: 'Consensus',
    icon: '🤝',
    patterns: [
      /^byzantine/i,
      /^raft[_-]/i,
      /^gossip[_-]/i,
      /^crdt[_-]/i,
      /^quorum[_-]/i,
      /^consensus[_-]/i,
    ],
  },
  {
    category: 'coordination',
    label: 'Coordination',
    icon: '👑',
    patterns: [
      /coordinator$/i,
      /^hierarchical[_-]coordinator/i,
      /^mesh[_-]coordinator/i,
      /^adaptive[_-]coordinator/i,
      /^collective[_-]intelligence/i,
      /^swarm[_-]init/i,
      /^swarm[_-]memory/i,
      /^task[_-]orchestrator/i,
      /^smart[_-]agent/i,
      /^hive[_-]mind/i,
      /^load[_-]balancing/i,
      /^topology[_-]optimizer/i,
      /^resource[_-]allocator/i,
    ],
    typePatterns: ['coordinator'],
  },
  {
    category: 'v3-core',
    label: 'V3 Core',
    icon: '🚀',
    patterns: [
      /^v3[_-]/i,
      /^reasoningbank/i,
      /^adr[_-]architect/i,
      /^ddd[_-]domain/i,
      /^sona[_-]/i,
    ],
  },
  {
    category: 'performance',
    label: 'Performance',
    icon: '📈',
    patterns: [
      /^performance[_-]/i,
      /^perf[_-]/i,
      /^benchmark/i,
      /^optimize$/i,
      /^matrix[_-]optimizer/i,
      /^pagerank/i,
      /^trading[_-]predictor/i,
    ],
  },
  {
    category: 'memory',
    label: 'Memory',
    icon: '🧠',
    patterns: [
      /^memory[_-]/i,
      /^consolidate$/i,
      /^predict$/i,
      /^preload$/i,
      /^ultralearn$/i,
    ],
    typePatterns: ['specialist'],
  },
  {
    category: 'development',
    label: 'Development',
    icon: '💻',
    patterns: [
      /^coder$/i,
      /^backend[_-]dev/i,
      /^mobile[_-]dev/i,
      /^ml[_-]developer/i,
      /^cicd[_-]engineer/i,
      /^base[_-]template/i,
      /^refactor$/i,
      /^goal[_-]planner/i,
      /^sublinear[_-]goal/i,
      /^agentic[_-]payments/i,
    ],
    typePatterns: ['developer', 'development'],
  },
  {
    category: 'testing',
    label: 'Testing',
    icon: '🧪',
    patterns: [
      /^tester$/i,
      /^tdd[_-]/i,
      /^test[_-]/i,
      /^testgaps$/i,
      /^production[_-]validator/i,
    ],
    typePatterns: ['validator', 'tester'],
  },
  {
    category: 'analysis',
    label: 'Analysis',
    icon: '🔍',
    patterns: [
      /^analyst$/i,
      /^researcher$/i,
      /^reviewer$/i,
      /^code[_-]analyzer/i,
      /^deepdive$/i,
      /^planner$/i,
    ],
    typePatterns: ['analyst', 'reviewer'],
  },
  {
    category: 'documentation',
    label: 'Documentation',
    icon: '📚',
    patterns: [/^api[_-]docs/i, /^document$/i, /^system[_-]architect/i],
    typePatterns: ['documentation'],
  },
];

/**
 * Detect the category for a single agent
 */
export function detectCategory(agent: Agent): AgentCategory {
  const name = agent.name.toLowerCase();
  const type = agent.type?.toLowerCase() ?? '';

  for (const def of CATEGORY_PATTERNS) {
    // Check name patterns
    for (const pattern of def.patterns) {
      if (pattern.test(name)) {
        return def.category;
      }
    }

    // Check type patterns
    if (def.typePatterns) {
      for (const typePattern of def.typePatterns) {
        if (type.includes(typePattern)) {
          return def.category;
        }
      }
    }
  }

  return 'other';
}

/**
 * Get category metadata
 */
export function getCategoryInfo(category: AgentCategory): { label: string; icon: string } {
  const def = CATEGORY_PATTERNS.find(p => p.category === category);
  if (def) {
    return { label: def.label, icon: def.icon };
  }
  return { label: 'Other', icon: '📦' };
}

/**
 * Group agents by category
 */
export function categorizeAgents(agents: Agent[]): CategorizedAgents[] {
  const categoryMap = new Map<AgentCategory, Agent[]>();

  // Initialize all categories
  for (const def of CATEGORY_PATTERNS) {
    categoryMap.set(def.category, []);
  }
  categoryMap.set('other', []);

  // Categorize each agent
  for (const agent of agents) {
    const category = detectCategory(agent);
    const existing = categoryMap.get(category) ?? [];
    existing.push(agent);
    categoryMap.set(category, existing);
  }

  // Convert to array, filter empty, and sort by count
  const result: CategorizedAgents[] = [];
  for (const [category, categoryAgents] of categoryMap) {
    if (categoryAgents.length > 0) {
      const info = getCategoryInfo(category);
      result.push({
        category,
        label: info.label,
        icon: info.icon,
        agents: categoryAgents,
      });
    }
  }

  // Sort by agent count (descending)
  result.sort((a, b) => b.agents.length - a.agents.length);

  return result;
}

/**
 * Filter agents by category
 */
export function filterByCategory(agents: Agent[], categories: AgentCategory[]): Agent[] {
  return agents.filter(agent => categories.includes(detectCategory(agent)));
}

/**
 * Filter agents by type
 */
export function filterByType(agents: Agent[], types: string[]): Agent[] {
  const lowerTypes = types.map(t => t.toLowerCase());
  return agents.filter(agent => {
    const agentType = agent.type?.toLowerCase() ?? 'worker';
    return lowerTypes.includes(agentType);
  });
}

/**
 * Filter agents by name pattern
 */
export function filterByPattern(agents: Agent[], pattern: string): Agent[] {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
  return agents.filter(agent => regex.test(agent.name));
}

/**
 * Get all available categories
 */
export function getAllCategories(): AgentCategory[] {
  return CATEGORY_PATTERNS.map(p => p.category).concat(['other']);
}
