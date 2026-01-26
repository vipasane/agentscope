/**
 * Category Diagram Generator (Task 2.3)
 * Generates per-category Mermaid diagrams showing:
 * - Agents within category
 * - Delegations within category (solid arrows)
 * - Cross-category dependencies (dashed arrows)
 * - Styled nodes (coordinators, workers, specialists)
 */

import type { Agent } from '../../model/types.js';
import type { AgentCategory } from './categories.js';
import { getCategoryInfo } from './categories.js';

export interface CategoryDiagramOptions {
  category: AgentCategory;
  categoryAgents: Agent[];
  allAgents?: Agent[];
  showCrossCategoryDeps?: boolean;
}

/**
 * Generate a category-specific Mermaid diagram
 * Following /examples/categories/*.md format
 */
export function generateCategoryDiagram(options: CategoryDiagramOptions): string {
  const {
    category,
    categoryAgents,
    allAgents = [],
    showCrossCategoryDeps = true,
  } = options;

  const categoryInfo = getCategoryInfo(category);
  const lines: string[] = [];

  // Start diagram
  lines.push('graph TB');

  // Create category subgraph
  lines.push(`    subgraph ${sanitizeId(category)}["${categoryInfo.icon} ${categoryInfo.label} Agents"]`);

  // Add agents as nodes within the subgraph
  const categoryAgentNames = new Set(categoryAgents.map(a => a.name));
  const nodeIds = new Map<string, string>();

  for (const agent of categoryAgents) {
    const nodeId = sanitizeId(agent.name);
    nodeIds.set(agent.name, nodeId);

    const typeIcon = getTypeIcon(agent.type);
    const description = agent.description
      ? truncate(agent.description, 30)
      : capitalize(agent.type || 'worker');

    lines.push(`        ${nodeId}["${typeIcon} ${agent.name}<br/><i>${description}</i>"]`);
  }

  lines.push('    end');
  lines.push('');

  // Add within-category delegations (solid arrows)
  const delegations: string[] = [];
  for (const agent of categoryAgents) {
    const fromId = nodeIds.get(agent.name);
    if (!fromId || !agent.delegatesTo) continue;

    for (const delegateName of agent.delegatesTo) {
      const toId = nodeIds.get(delegateName);
      if (toId && categoryAgentNames.has(delegateName)) {
        delegations.push(`    ${fromId} -->|delegates| ${toId}`);
      }
    }
  }

  if (delegations.length > 0) {
    lines.push(...delegations);
    lines.push('');
  }

  // Add cross-category dependencies (dashed arrows) if enabled
  if (showCrossCategoryDeps && allAgents.length > 0) {
    const crossDeps = generateCrossCategoryDependencies(
      categoryAgents,
      allAgents,
      nodeIds
    );

    if (crossDeps.length > 0) {
      lines.push(...crossDeps);
      lines.push('');
    }
  }

  // Add style definitions
  lines.push(...generateStyleDefinitions(categoryAgents, nodeIds));

  return lines.join('\n');
}

/**
 * Generate cross-category dependency arrows (dashed)
 */
function generateCrossCategoryDependencies(
  categoryAgents: Agent[],
  allAgents: Agent[],
  nodeIds: Map<string, string>
): string[] {
  const lines: string[] = [];
  const categoryAgentNames = new Set(categoryAgents.map(a => a.name));
  const externalNodes = new Set<string>();

  // Find all external agents this category delegates to
  for (const agent of categoryAgents) {
    const fromId = nodeIds.get(agent.name);
    if (!fromId || !agent.delegatesTo) continue;

    for (const delegateName of agent.delegatesTo) {
      if (!categoryAgentNames.has(delegateName)) {
        // This is a cross-category delegation
        const delegateAgent = allAgents.find(a => a.name === delegateName);
        if (delegateAgent) {
          const toId = sanitizeId(delegateName);
          externalNodes.add(toId);

          const delegateCategoryInfo = getCategoryInfo(
            (delegateAgent.category || 'development') as AgentCategory
          );

          lines.push(
            `    ${fromId} -.->|uses| ${toId}["${delegateCategoryInfo.icon} ${delegateName}"]`
          );
        }
      }
    }
  }

  return lines;
}

/**
 * Generate style definitions for nodes
 */
function generateStyleDefinitions(
  agents: Agent[],
  nodeIds: Map<string, string>
): string[] {
  const lines: string[] = [];
  const coordinators: string[] = [];
  const workers: string[] = [];
  const specialists: string[] = [];
  const external: string[] = [];

  for (const agent of agents) {
    const nodeId = nodeIds.get(agent.name);
    if (!nodeId) continue;

    switch (agent.type?.toLowerCase()) {
      case 'coordinator':
        coordinators.push(nodeId);
        break;
      case 'specialist':
        specialists.push(nodeId);
        break;
      default:
        workers.push(nodeId);
        break;
    }
  }

  // Define styles
  lines.push('    classDef coord fill:#e1f5fe,stroke:#01579b,stroke-width:2px');
  lines.push('    classDef worker fill:#f3e5f5,stroke:#4a148c');
  lines.push('    classDef specialist fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px');
  lines.push('    classDef external fill:#fafafa,stroke:#9e9e9e,stroke-dasharray: 3 3');

  // Apply styles
  if (coordinators.length > 0) {
    lines.push(`    class ${coordinators.join(',')} coord`);
  }
  if (workers.length > 0) {
    lines.push(`    class ${workers.join(',')} worker`);
  }
  if (specialists.length > 0) {
    lines.push(`    class ${specialists.join(',')} specialist`);
  }

  return lines;
}

/**
 * Sanitize ID for Mermaid (replace hyphens and special chars with underscores)
 */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Get icon for agent type
 */
function getTypeIcon(type?: string): string {
  switch (type?.toLowerCase()) {
    case 'coordinator':
      return '👑';
    case 'specialist':
      return '🎯';
    case 'reviewer':
      return '👀';
    case 'analyst':
      return '🔍';
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
 * Capitalize first letter of string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
