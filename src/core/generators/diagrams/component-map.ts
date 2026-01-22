/**
 * Component Map Diagram Generator
 * Generates a Mermaid diagram showing all components and their relationships
 */

import type { AgentScopeConfig, Agent, McpServer, Skill } from '../../model/types.js';
import {
  categorizeAgents,
  filterByCategory,
  filterByType,
  filterByPattern,
  getCategoryInfo,
  type AgentCategory,
  type CategorizedAgents,
} from './categories.js';
import { MermaidThemeGenerator, resolveTheme, type ThemePalette } from '../../themes/index.js';
import { sanitizeId, sanitizeNodeLabel, validateThemeName } from '../../security/index.js';
import {
  invokePreGenerateHook,
  invokePostGenerateHook,
  generateRequestId,
  type PreGenerateHookInput,
  type ComponentMapOptions as HookComponentMapOptions,
} from '../../hooks/index.js';

export type ZoomLevel = 'summary' | 'category' | 'detail';

export interface ComponentMapOptions {
  /** Include disabled servers */
  includeDisabled?: boolean;
  /** Show tool connections */
  showTools?: boolean;
  /** Custom title */
  title?: string;
  /** Zoom level: summary (categories only), category (grouped), detail (full) */
  level?: ZoomLevel;
  /** Compact mode - names only, no descriptions */
  compact?: boolean;
  /** Filter by categories */
  categories?: AgentCategory[];
  /** Filter by agent types */
  types?: string[];
  /** Filter by name pattern (glob-like) */
  pattern?: string;
  /** Maximum agents per category before collapsing */
  maxPerCategory?: number;
  /** Theme palette or theme name */
  theme?: ThemePalette | string;
  /** Path to custom theme file */
  themePath?: string;
}

/**
 * Generate a component map diagram showing all system components
 */
export async function generateComponentMap(
  config: AgentScopeConfig,
  options: ComponentMapOptions = {}
): Promise<string> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Invoke pre-generate hook
  const preHookInput: PreGenerateHookInput = {
    config,
    options: options as HookComponentMapOptions,
    requestId,
    context: {
      timestamp: startTime,
      caller: 'generateComponentMap',
      version: '1.0.0',
    },
  };

  const preHookResult = await invokePreGenerateHook(preHookInput);

  // Check validation
  if (!preHookResult.validated) {
    throw new Error(`Input validation failed: ${preHookResult.warnings.join(', ')}`);
  }

  // Return cached result if available
  if (preHookResult.cachedResult) {
    console.log('[Component Map] Returning cached result');
    return preHookResult.cachedResult;
  }

  // Use sanitized options from hook (cast back to local type)
  const sanitizedOptions = preHookResult.sanitizedOptions as ComponentMapOptions;
  const {
    includeDisabled = false,
    showTools = true,
    title = 'Agent Architecture Component Map',
    level = sanitizedOptions.level ?? 'category',
    compact = false,
    categories,
    types,
    pattern,
    maxPerCategory = 20,
    theme,
    themePath,
  } = sanitizedOptions;

  // Resolve and validate theme
  let resolvedTheme: ThemePalette;

  if (typeof theme === 'string') {
    // Validate theme name before resolving
    if (theme && !validateThemeName(theme)) {
      throw new Error(`Invalid theme name: "${theme}". Must be one of: light, dark, high-contrast-light, high-contrast-dark, colorblind-light, colorblind-dark`);
    }
    resolvedTheme = resolveTheme({ cliTheme: theme, themePath }).theme;
  } else if (theme) {
    resolvedTheme = theme;
  } else {
    resolvedTheme = resolveTheme({ cliTheme: undefined, themePath }).theme;
  }

  const themeGenerator = new MermaidThemeGenerator(resolvedTheme);

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
  let diagram: string;
  let success = true;
  let error: Error | undefined;

  try {
    switch (level) {
      case 'summary':
        diagram = generateSummaryDiagram(agents, config, { title, includeDisabled, themeGenerator });
        break;
      case 'category':
        diagram = generateCategoryDiagram(agents, config, {
          title,
          includeDisabled,
          showTools,
          compact,
          maxPerCategory,
          themeGenerator,
        });
        break;
      case 'detail':
      default:
        diagram = generateDetailDiagram(agents, config, {
          title,
          includeDisabled,
          showTools,
          compact,
          themeGenerator,
        });
    }
  } catch (err) {
    success = false;
    error = err as Error;
    diagram = '';
  }

  // Calculate metrics
  const nodeCount = countNodes(diagram);
  const edgeCount = countEdges(diagram);
  const generationTimeMs = Date.now() - startTime;

  // Invoke post-generate hook
  await invokePostGenerateHook({
    requestId,
    input: preHookInput,
    output: {
      diagram,
      generationTimeMs,
      nodeCount,
      edgeCount,
    },
    success,
    error,
  });

  if (!success) {
    throw error;
  }

  return diagram;
}

/**
 * Generate summary diagram - categories with counts only
 */
function generateSummaryDiagram(
  agents: Agent[],
  config: AgentScopeConfig,
  options: { title: string; includeDisabled: boolean; themeGenerator: MermaidThemeGenerator }
): string {
  const categorized = categorizeAgents(agents);
  const servers = options.includeDisabled
    ? config.mcpServers
    : config.mcpServers.filter(s => !s.disabled);

  const lines: string[] = [
    '```mermaid',
    options.themeGenerator.getInit(),
    'graph TB',
    `    %% ${options.title} - Summary View`,
    '',
  ];

  // Main system node
  lines.push('    System["🏗️ Agent System"]');
  lines.push('');

  // Category nodes with counts
  for (const cat of categorized) {
    const id = sanitizeId(cat.category);
    const label = sanitizeNodeLabel(`${cat.icon} ${cat.label}<br/><b>${cat.agents.length} agents</b>`);
    lines.push(`    ${id}["${label}"]`);
    lines.push(`    System --> ${id}`);
  }

  // MCP and Skills summary
  if (servers.length > 0) {
    lines.push('');
    lines.push(`    MCP["🔌 MCP Servers<br/><b>${servers.length} servers</b>"]`);
    lines.push('    System --> MCP');
  }

  if (config.skills.length > 0) {
    lines.push(`    Skills["⚡ Skills<br/><b>${config.skills.length} skills</b>"]`);
    lines.push('    System --> Skills');
  }

  // Styling
  lines.push('');
  lines.push('    %% Styling');
  lines.push(...options.themeGenerator.getClassDefs().map(def => `    ${def}`));
  lines.push('    class System coordinator');

  for (const cat of categorized) {
    lines.push(`    class ${sanitizeId(cat.category)} category`);
  }

  if (servers.length > 0) {
    lines.push('    class MCP mcp');
  }
  if (config.skills.length > 0) {
    lines.push('    class Skills skill');
  }

  lines.push('```');

  // Add timestamp footer
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by AgentScope on ${new Date().toISOString().replace('T', ' at ').replace(/\\.\\d{3}Z$/, ' UTC')}*`);

  return lines.join('\n');
}

/**
 * Generate category diagram - grouped by category with agent names
 */
function generateCategoryDiagram(
  agents: Agent[],
  config: AgentScopeConfig,
  options: {
    title: string;
    includeDisabled: boolean;
    showTools: boolean;
    compact: boolean;
    maxPerCategory: number;
    themeGenerator: MermaidThemeGenerator;
  }
): string {
  const categorized = categorizeAgents(agents);
  const servers = options.includeDisabled
    ? config.mcpServers
    : config.mcpServers.filter(s => !s.disabled);

  const lines: string[] = [
    '```mermaid',
    options.themeGenerator.getInit(),
    'graph TB',
    `    %% ${options.title} - Category View`,
    '',
  ];

  // Generate subgraph for each category
  for (const cat of categorized) {
    const catId = sanitizeId(cat.category);
    const displayAgents = cat.agents.slice(0, options.maxPerCategory);
    const hasMore = cat.agents.length > options.maxPerCategory;

    lines.push(`    subgraph ${catId}["${cat.icon} ${cat.label} (${cat.agents.length})"]`);

    for (const agent of displayAgents) {
      const agentId = sanitizeId(agent.name);
      const rawLabel = options.compact
        ? agent.name
        : formatAgentLabelCompact(agent);
      const label = sanitizeNodeLabel(rawLabel);
      lines.push(`        ${agentId}["${label}"]`);
    }

    if (hasMore) {
      const moreCount = cat.agents.length - options.maxPerCategory;
      lines.push(`        ${catId}_more[["... +${moreCount} more"]]`);
    }

    lines.push('    end');
    lines.push('');
  }

  // MCP Servers subgraph
  if (servers.length > 0) {
    lines.push('    subgraph MCP["🔌 MCP Servers"]');
    for (const server of servers) {
      const rawLabel = formatServerLabel(server);
      const label = sanitizeNodeLabel(rawLabel);
      lines.push(`        mcp_${sanitizeId(server.name)}["${label}"]`);
    }
    lines.push('    end');
    lines.push('');
  }

  // Skills subgraph (collapsed if many)
  if (config.skills.length > 0) {
    lines.push('    subgraph Skills["⚡ Skills"]');
    const displaySkills = config.skills.slice(0, 10);
    for (const skill of displaySkills) {
      const label = sanitizeNodeLabel(skill.name);
      lines.push(`        skill_${sanitizeId(skill.name)}["${label}"]`);
    }
    if (config.skills.length > 10) {
      const moreCount = config.skills.length - 10;
      lines.push(`        skills_more[["... +${moreCount} more"]]`);
    }
    lines.push('    end');
    lines.push('');
  }

  // Add cross-category connections (delegation)
  lines.push('    %% Cross-category relationships');
  const addedConnections = new Set<string>();

  for (const agent of agents) {
    if (agent.delegatesTo) {
      for (const target of agent.delegatesTo) {
        const targetAgent = agents.find(a => a.name === target);
        if (targetAgent) {
          const connId = `${agent.name}->${target}`;
          if (!addedConnections.has(connId)) {
            addedConnections.add(connId);
            lines.push(`    ${sanitizeId(agent.name)} --> ${sanitizeId(target)}`);
          }
        }
      }
    }
  }

  // Add MCP tool connections if requested
  if (options.showTools) {
    lines.push('');
    lines.push('    %% Tool connections');
    for (const agent of agents) {
      if (agent.tools) {
        for (const tool of agent.tools) {
          const server = findServerByTool(servers, tool);
          if (server) {
            lines.push(`    ${sanitizeId(agent.name)} -.-> mcp_${sanitizeId(server.name)}`);
          }
        }
      }
    }
  }

  // Styling
  addStyling(lines, categorized, agents, servers, config.skills, options.themeGenerator);

  lines.push('```');

  // Add timestamp footer
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by AgentScope on ${new Date().toISOString().replace('T', ' at ').replace(/\\.\\d{3}Z$/, ' UTC')}*`);

  return lines.join('\n');
}

/**
 * Generate detailed diagram - full view with descriptions (legacy behavior)
 */
function generateDetailDiagram(
  agents: Agent[],
  config: AgentScopeConfig,
  options: {
    title: string;
    includeDisabled: boolean;
    showTools: boolean;
    compact: boolean;
    themeGenerator: MermaidThemeGenerator;
  }
): string {
  const categorized = categorizeAgents(agents);
  const servers = options.includeDisabled
    ? config.mcpServers
    : config.mcpServers.filter(s => !s.disabled);

  const lines: string[] = [
    '```mermaid',
    options.themeGenerator.getInit(),
    'graph TB',
    `    %% ${options.title} - Detail View`,
    '',
  ];

  // Generate subgraph for each category (with full details)
  for (const cat of categorized) {
    const catId = sanitizeId(cat.category);

    lines.push(`    subgraph ${catId}["${cat.icon} ${cat.label} (${cat.agents.length})"]`);

    for (const agent of cat.agents) {
      const agentId = sanitizeId(agent.name);
      const rawLabel = options.compact
        ? agent.name
        : formatAgentLabel(agent);
      const label = sanitizeNodeLabel(rawLabel);
      lines.push(`        ${agentId}["${label}"]`);
    }

    lines.push('    end');
    lines.push('');
  }

  // MCP Servers
  if (servers.length > 0) {
    lines.push('    subgraph MCP["🔌 MCP Servers"]');
    for (const server of servers) {
      const rawLabel = formatServerLabel(server);
      const label = sanitizeNodeLabel(rawLabel);
      const style = server.disabled ? ':::disabled' : '';
      lines.push(`        mcp_${sanitizeId(server.name)}["${label}"]${style}`);
    }
    lines.push('    end');
    lines.push('');
  }

  // Skills
  if (config.skills.length > 0) {
    lines.push('    subgraph Skills["⚡ Skills"]');
    for (const skill of config.skills) {
      const rawLabel = formatSkillLabel(skill);
      const label = sanitizeNodeLabel(rawLabel);
      lines.push(`        skill_${sanitizeId(skill.name)}["${label}"]`);
    }
    lines.push('    end');
    lines.push('');
  }

  // Connections
  lines.push('    %% Agent Relationships');
  for (const agent of agents) {
    if (agent.delegatesTo) {
      for (const target of agent.delegatesTo) {
        lines.push(`    ${sanitizeId(agent.name)} --> ${sanitizeId(target)}`);
      }
    }

    if (options.showTools && agent.tools) {
      for (const tool of agent.tools) {
        const server = findServerByTool(servers, tool);
        if (server) {
          lines.push(`    ${sanitizeId(agent.name)} -.-> mcp_${sanitizeId(server.name)}`);
        }
      }
    }
  }

  // Skill dependencies
  for (const skill of config.skills) {
    if (skill.dependencies) {
      for (const dep of skill.dependencies) {
        lines.push(`    skill_${sanitizeId(skill.name)} --> skill_${sanitizeId(dep)}`);
      }
    }
  }

  // Styling
  addStyling(lines, categorized, agents, servers, config.skills, options.themeGenerator);

  lines.push('```');

  // Add timestamp footer
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by AgentScope on ${new Date().toISOString().replace('T', ' at ').replace(/\\.\\d{3}Z$/, ' UTC')}*`);

  return lines.join('\n');
}

/**
 * Add styling to diagram
 */
function addStyling(
  lines: string[],
  categorized: CategorizedAgents[],
  agents: Agent[],
  servers: McpServer[],
  skills: Skill[],
  themeGenerator: MermaidThemeGenerator
): void {
  lines.push('');
  lines.push('    %% Styling');
  lines.push(...themeGenerator.getClassDefs().map(def => `    ${def}`));

  // Apply agent type styling
  for (const agent of agents) {
    const className = themeGenerator.getAgentClass(agent.type ?? 'worker');
    lines.push(`    class ${sanitizeId(agent.name)} ${className}`);
  }

  // Apply MCP server styling
  for (const server of servers) {
    lines.push(`    class mcp_${sanitizeId(server.name)} mcp`);
  }

  // Apply skill styling
  for (const skill of skills) {
    lines.push(`    class skill_${sanitizeId(skill.name)} skill`);
  }

  // Style "more" nodes
  for (const cat of categorized) {
    if (cat.agents.length > 20) {
      lines.push(`    class ${sanitizeId(cat.category)}_more more`);
    }
  }
}

/**
 * Get style class for agent type
 */
function getStyleClass(type: string): string {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('coordinator') || lowerType === 'coordinator') {
    return 'coordinator';
  }
  if (lowerType.includes('reviewer') || lowerType === 'reviewer' || lowerType === 'validator') {
    return 'reviewer';
  }
  if (lowerType.includes('specialist') || lowerType === 'specialist') {
    return 'specialist';
  }
  return 'worker';
}

/**
 * Format agent label for display (full)
 */
function formatAgentLabel(agent: Agent): string {
  const icon = getAgentIcon(agent.type);
  const name = agent.name;
  const desc = agent.description ? `<br/><small>${truncate(agent.description, 30)}</small>` : '';
  return `${icon} ${name}${desc}`;
}

/**
 * Format agent label compact (no description)
 */
function formatAgentLabelCompact(agent: Agent): string {
  const icon = getAgentIcon(agent.type);
  return `${icon} ${agent.name}`;
}

/**
 * Format server label for display
 */
function formatServerLabel(server: McpServer): string {
  const icon = server.disabled ? '🔴' : '🟢';
  return `${icon} ${server.name}`;
}

/**
 * Format skill label for display
 */
function formatSkillLabel(skill: Skill): string {
  const icon = skill.enabled === false ? '⚪' : '⚡';
  return `${icon} ${skill.name}`;
}

/**
 * Get icon for agent type
 */
function getAgentIcon(type: Agent['type']): string {
  switch (type) {
    case 'coordinator':
      return '👑';
    case 'reviewer':
      return '👁️';
    case 'specialist':
      return '🎯';
    case 'worker':
    default:
      return '🤖';
  }
}


/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Find MCP server that provides a specific tool
 */
function findServerByTool(servers: McpServer[], tool: string): McpServer | undefined {
  return servers.find(s => s.tools?.includes(tool) || s.name === tool);
}

/**
 * Count nodes in diagram (for metrics)
 */
function countNodes(diagram: string): number {
  // Count lines with node definitions (contain ["..."])
  const nodePattern = /\["[^\]]+"\]/g;
  const matches = diagram.match(nodePattern);
  return matches ? matches.length : 0;
}

/**
 * Count edges in diagram (for metrics)
 */
function countEdges(diagram: string): number {
  // Count lines with arrows (-->, -.->)
  const edgePattern = /(-->|-.->)/g;
  const matches = diagram.match(edgePattern);
  return matches ? matches.length : 0;
}

/**
 * Generate separate diagrams for each category
 */
export async function generateCategoryDiagrams(
  config: AgentScopeConfig,
  options: Omit<ComponentMapOptions, 'categories'> = {}
): Promise<Map<AgentCategory, string>> {
  const categorized = categorizeAgents(config.agents);
  const diagrams = new Map<AgentCategory, string>();

  for (const cat of categorized) {
    const categoryConfig: AgentScopeConfig = {
      ...config,
      agents: cat.agents,
    };

    const info = getCategoryInfo(cat.category);
    const diagram = await generateComponentMap(categoryConfig, {
      ...options,
      title: `${info.icon} ${info.label} Agents`,
      level: 'detail',
    });

    diagrams.set(cat.category, diagram);
  }

  return diagrams;
}
