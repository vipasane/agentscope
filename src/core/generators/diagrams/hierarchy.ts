/**
 * Hierarchy Diagram Generator
 * Generates a Mermaid diagram showing agent hierarchy and delegation chains
 */

import type { AgentScopeConfig, Agent } from '../../model/types.js';
import {
  categorizeAgents,
  filterByCategory,
  filterByType,
  filterByPattern,
  type AgentCategory,
} from './categories.js';
import { MermaidThemeGenerator, resolveTheme, type ThemePalette } from '../../themes/index.js';

export type ZoomLevel = 'summary' | 'category' | 'detail';

export interface HierarchyOptions {
  /** Direction of the diagram (TB, BT, LR, RL) */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  /** Custom title */
  title?: string;
  /** Show agent descriptions */
  showDescriptions?: boolean;
  /** Zoom level: summary (categories only), category (grouped), detail (full) */
  level?: ZoomLevel;
  /** Compact mode - names only */
  compact?: boolean;
  /** Filter by categories */
  categories?: AgentCategory[];
  /** Filter by agent types */
  types?: string[];
  /** Filter by name pattern */
  pattern?: string;
  /** Maximum agents per category before collapsing */
  maxPerCategory?: number;
  /** Theme palette or theme name */
  theme?: ThemePalette | string;
  /** Path to custom theme file */
  themePath?: string;
}

/**
 * Generate a hierarchy diagram showing agent relationships
 */
export function generateHierarchy(
  config: AgentScopeConfig,
  options: HierarchyOptions = {}
): string {
  const {
    direction = 'TB',
    title = 'Agent Hierarchy',
    showDescriptions = false,
    level = 'category',
    compact = false,
    categories,
    types,
    pattern,
    maxPerCategory = 15,
    theme,
    themePath,
  } = options;

  // Resolve theme
  const themeGenerator = new MermaidThemeGenerator(
    typeof theme === 'string' || !theme
      ? resolveTheme({ cliTheme: theme as string, themePath }).theme
      : theme
  );

  // Apply filters
  let agents = [...config.agents];

  if (categories && categories.length > 0) {
    agents = filterByCategory(agents, categories);
  }

  if (types && types.length > 0) {
    agents = filterByType(agents, types);
  }

  if (pattern) {
    agents = filterByPattern(agents, pattern);
  }

  // Generate based on zoom level
  switch (level) {
    case 'summary':
      return generateSummaryHierarchy(agents, config, { direction, title, themeGenerator });
    case 'category':
      return generateCategoryHierarchy(agents, config, {
        direction,
        title,
        showDescriptions: showDescriptions && !compact,
        maxPerCategory,
        themeGenerator,
      });
    case 'detail':
    default:
      return generateDetailHierarchy(agents, config, {
        direction,
        title,
        showDescriptions: showDescriptions && !compact,
        themeGenerator,
      });
  }
}

/**
 * Generate summary hierarchy - categories with delegation counts
 */
function generateSummaryHierarchy(
  agents: Agent[],
  config: AgentScopeConfig,
  options: { direction: string; title: string; themeGenerator: MermaidThemeGenerator }
): string {
  const categorized = categorizeAgents(agents);

  const lines: string[] = [
    '```mermaid',
    options.themeGenerator.getInit(),
    `graph ${options.direction}`,
    `    %% ${options.title} - Summary View`,
    '',
  ];

  // Count cross-category delegations
  const delegationCounts = new Map<string, number>();

  for (const cat of categorized) {
    for (const agent of cat.agents) {
      if (agent.delegatesTo) {
        for (const target of agent.delegatesTo) {
          const targetAgent = agents.find(a => a.name === target);
          if (targetAgent) {
            const targetCat = categorized.find(c => c.agents.includes(targetAgent));
            if (targetCat && targetCat.category !== cat.category) {
              const key = `${cat.category}->${targetCat.category}`;
              delegationCounts.set(key, (delegationCounts.get(key) ?? 0) + 1);
            }
          }
        }
      }
    }
  }

  // Add category nodes
  for (const cat of categorized) {
    const id = sanitizeId(cat.category);
    const coordinators = cat.agents.filter(a => a.type === 'coordinator').length;
    const label = coordinators > 0
      ? `${cat.icon} ${cat.label}<br/>${cat.agents.length} agents (${coordinators} coordinators)`
      : `${cat.icon} ${cat.label}<br/>${cat.agents.length} agents`;
    lines.push(`    ${id}["${label}"]`);
  }

  lines.push('');

  // Add cross-category connections
  for (const [key, count] of delegationCounts) {
    const [from, to] = key.split('->');
    lines.push(`    ${sanitizeId(from)} -->|${count}| ${sanitizeId(to)}`);
  }

  // Skills summary
  if (config.skills.length > 0) {
    lines.push('');
    lines.push(`    Skills(["⚡ ${config.skills.length} Skills"])`);
  }

  // Styling
  lines.push('');
  lines.push('    %% Styling');
  lines.push(...options.themeGenerator.getClassDefs().map(def => `    ${def}`));

  for (const cat of categorized) {
    lines.push(`    class ${sanitizeId(cat.category)} category`);
  }

  if (config.skills.length > 0) {
    lines.push('    class Skills skill');
  }

  lines.push('```');

  // Add timestamp footer
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by AgentScope on ${new Date().toISOString().replace('T', ' at ').replace(/\.\d{3}Z$/, ' UTC')}*`);

  return lines.join('\n');
}

/**
 * Generate category hierarchy - grouped with key agents visible
 */
function generateCategoryHierarchy(
  agents: Agent[],
  config: AgentScopeConfig,
  options: {
    direction: string;
    title: string;
    showDescriptions: boolean;
    maxPerCategory: number;
    themeGenerator: MermaidThemeGenerator;
  }
): string {
  const categorized = categorizeAgents(agents);
  const delegationMap = buildDelegationMap(agents);
  const rootAgents = findRootAgents(agents, delegationMap);

  const lines: string[] = [
    '```mermaid',
    options.themeGenerator.getInit(),
    `graph ${options.direction}`,
    `    %% ${options.title} - Category View`,
    '',
  ];

  // Generate subgraph for each category
  for (const cat of categorized) {
    const catId = sanitizeId(cat.category);

    // Prioritize coordinators and root agents
    const coordinators = cat.agents.filter(a => a.type === 'coordinator');
    const roots = cat.agents.filter(a => rootAgents.includes(a) && a.type !== 'coordinator');
    const others = cat.agents.filter(a => !coordinators.includes(a) && !roots.includes(a));

    // Show coordinators first, then roots, then others up to max
    const prioritized = [...coordinators, ...roots, ...others];
    const displayAgents = prioritized.slice(0, options.maxPerCategory);
    const hasMore = cat.agents.length > options.maxPerCategory;

    lines.push(`    subgraph ${catId}["${cat.icon} ${cat.label} (${cat.agents.length})"]`);

    const visited = new Set<string>();
    for (const agent of displayAgents) {
      addAgentNode(lines, agent, options.showDescriptions, visited);
    }

    if (hasMore) {
      const moreCount = cat.agents.length - options.maxPerCategory;
      lines.push(`        ${catId}_more[["... +${moreCount} more"]]`);
    }

    lines.push('    end');
    lines.push('');
  }

  // Add delegation relationships (only for displayed agents)
  lines.push('    %% Delegation Relationships');
  const displayedAgentNames = new Set(
    categorized.flatMap(c => c.agents.slice(0, options.maxPerCategory).map(a => a.name))
  );

  for (const agent of agents) {
    if (!displayedAgentNames.has(agent.name)) continue;

    if (agent.delegatesTo) {
      for (const target of agent.delegatesTo) {
        if (displayedAgentNames.has(target)) {
          lines.push(`    ${sanitizeId(agent.name)} -->|delegates| ${sanitizeId(target)}`);
        }
      }
    }
  }

  // Skills (collapsed)
  if (config.skills.length > 0) {
    lines.push('');
    lines.push('    %% Skills');
    const displaySkills = config.skills.slice(0, 5);
    for (const skill of displaySkills) {
      lines.push(`    skill_${sanitizeId(skill.name)}(["${skill.name}"])`);
    }
    if (config.skills.length > 5) {
      lines.push(`    skills_more[["... +${config.skills.length - 5} more skills"]]`);
    }
  }

  // Styling
  addHierarchyStyling(lines, agents, config.skills, categorized, options.themeGenerator);

  lines.push('```');

  // Add timestamp footer
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by AgentScope on ${new Date().toISOString().replace('T', ' at ').replace(/\\.\\d{3}Z$/, ' UTC')}*`);

  return lines.join('\n');
}

/**
 * Generate detailed hierarchy - full view
 */
function generateDetailHierarchy(
  agents: Agent[],
  config: AgentScopeConfig,
  options: {
    direction: string;
    title: string;
    showDescriptions: boolean;
    themeGenerator: MermaidThemeGenerator;
  }
): string {
  const categorized = categorizeAgents(agents);
  const delegationMap = buildDelegationMap(agents);
  const rootAgents = findRootAgents(agents, delegationMap);

  const lines: string[] = [
    '```mermaid',
    options.themeGenerator.getInit(),
    `graph ${options.direction}`,
    `    %% ${options.title} - Detail View`,
    '',
  ];

  // Generate subgraph for each category
  for (const cat of categorized) {
    const catId = sanitizeId(cat.category);

    lines.push(`    subgraph ${catId}["${cat.icon} ${cat.label} (${cat.agents.length})"]`);

    const visited = new Set<string>();

    // First add root agents (coordinators with no parents)
    const catRoots = cat.agents.filter(a => rootAgents.includes(a));
    for (const agent of catRoots) {
      addAgentNode(lines, agent, options.showDescriptions, visited);
    }

    // Add remaining agents
    for (const agent of cat.agents) {
      addAgentNode(lines, agent, options.showDescriptions, visited);
    }

    lines.push('    end');
    lines.push('');
  }

  // Add delegation relationships
  lines.push('    %% Delegation Relationships');
  for (const agent of agents) {
    if (agent.delegatesTo) {
      for (const target of agent.delegatesTo) {
        const targetAgent = agents.find(a => a.name === target);
        if (targetAgent) {
          lines.push(`    ${sanitizeId(agent.name)} -->|delegates| ${sanitizeId(target)}`);
        }
      }
    }
  }

  // Skills
  if (config.skills.length > 0) {
    lines.push('');
    lines.push('    %% Skills');
    for (const skill of config.skills) {
      lines.push(`    skill_${sanitizeId(skill.name)}(["${skill.name}"])`);

      // Connect skills to agents if naming convention match
      for (const agent of agents) {
        if (
          skill.name.toLowerCase().includes(agent.name.toLowerCase()) ||
          agent.name.toLowerCase().includes(skill.name.toLowerCase())
        ) {
          lines.push(`    ${sanitizeId(agent.name)} -->|uses| skill_${sanitizeId(skill.name)}`);
        }
      }
    }
  }

  // Styling
  addHierarchyStyling(lines, agents, config.skills, categorized, options.themeGenerator);

  lines.push('```');

  // Add timestamp footer
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by AgentScope on ${new Date().toISOString().replace('T', ' at ').replace(/\\.\\d{3}Z$/, ' UTC')}*`);

  return lines.join('\n');
}

/**
 * Add hierarchy styling
 */
function addHierarchyStyling(
  lines: string[],
  agents: Agent[],
  skills: AgentScopeConfig['skills'],
  categorized: ReturnType<typeof categorizeAgents>,
  themeGenerator: MermaidThemeGenerator
): void {
  lines.push('');
  lines.push('    %% Styling');
  lines.push(...themeGenerator.getClassDefs().map(def => `    ${def}`));

  // Apply styling based on agent type
  for (const agent of agents) {
    const className = themeGenerator.getAgentClass(agent.type ?? 'worker');
    lines.push(`    class ${sanitizeId(agent.name)} ${className}`);
  }

  // Style skills
  for (const skill of skills) {
    lines.push(`    class skill_${sanitizeId(skill.name)} skill`);
  }

  // Style "more" nodes
  for (const cat of categorized) {
    lines.push(`    class ${sanitizeId(cat.category)}_more more`);
  }
  lines.push('    class skills_more more');
}

/**
 * Add an agent node to the diagram
 */
function addAgentNode(
  lines: string[],
  agent: Agent,
  showDescriptions: boolean,
  visited: Set<string>
): void {
  if (visited.has(agent.name)) return;
  visited.add(agent.name);

  const id = sanitizeId(agent.name);
  const shape = getAgentShape(agent.type);
  const label = showDescriptions && agent.description
    ? `${agent.name}<br/><small>${truncate(agent.description, 40)}</small>`
    : agent.name;

  lines.push(`        ${id}${shape.open}"${label}"${shape.close}`);
}

/**
 * Get shape delimiters for agent type
 */
function getAgentShape(type: Agent['type']): { open: string; close: string } {
  switch (type) {
    case 'coordinator':
      return { open: '[[', close: ']]' }; // Stadium shape
    case 'reviewer':
      return { open: '{{', close: '}}' }; // Hexagon
    case 'specialist':
      return { open: '([', close: '])' }; // Cylinder
    case 'worker':
    default:
      return { open: '[', close: ']' }; // Rectangle
  }
}

/**
 * Build a map of which agents delegate to which
 */
function buildDelegationMap(agents: Agent[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const agent of agents) {
    if (agent.delegatesTo) {
      for (const target of agent.delegatesTo) {
        const existing = map.get(target) ?? [];
        existing.push(agent.name);
        map.set(target, existing);
      }
    }
  }

  return map;
}

/**
 * Find root agents (those with no parent delegators)
 */
function findRootAgents(agents: Agent[], delegationMap: Map<string, string[]>): Agent[] {
  return agents.filter(agent => {
    const parents = delegationMap.get(agent.name);
    return !parents || parents.length === 0;
  });
}

/**
 * Sanitize string for use as Mermaid ID
 */
function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
