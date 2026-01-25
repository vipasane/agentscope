/**
 * Category Documentation Formatter (Task 2.4)
 * Generates complete category markdown files with:
 * - Overview (category, counts)
 * - Category diagram
 * - Agents table
 * - Capabilities matrix
 * - Delegation chains
 * - Cross-category dependencies
 * - Skills used
 * - Back navigation
 */

import type { Agent } from '../../model/types.js';
import type { AgentCategory } from '../../generators/diagrams/categories.js';
import { getCategoryInfo } from '../../generators/diagrams/categories.js';

export interface CategoryDocumentOptions {
  category: AgentCategory;
  categoryAgents: Agent[];
  allAgents: Agent[];
  categoryDiagram: string;
  relativePathToRoot?: string;
}

/**
 * Format a complete category markdown document
 * Following /examples/categories/*.md format
 */
export function formatCategoryDocument(options: CategoryDocumentOptions): string {
  const {
    category,
    categoryAgents,
    allAgents,
    categoryDiagram,
    relativePathToRoot = '..',
  } = options;

  const categoryInfo = getCategoryInfo(category);
  const sections: string[] = [];

  // Header with navigation
  sections.push(formatHeader(category, categoryInfo, relativePathToRoot));

  // Summary
  sections.push(formatSummary(categoryAgents));

  // Category diagram
  sections.push(formatCategoryDiagram(categoryDiagram));

  // Agents detail table
  sections.push(formatAgentsTable(categoryAgents));

  // Relationships section (incoming/outgoing)
  sections.push(formatRelationships(category, categoryAgents, allAgents));

  // Related skills (if any)
  sections.push(formatRelatedSkills(categoryAgents));

  // Cross-references to other categories
  sections.push(formatCrossReferences(category, categoryAgents, allAgents, relativePathToRoot));

  // Footer navigation
  sections.push(formatFooter(relativePathToRoot));

  return sections.filter(s => s.length > 0).join('\n\n---\n\n');
}

/**
 * Format header with navigation
 */
function formatHeader(
  category: AgentCategory,
  categoryInfo: { label: string; icon: string },
  relativePathToRoot: string
): string {
  return `# ${categoryInfo.icon} ${categoryInfo.label} Agents

[← Back to Overview](${relativePathToRoot}/README.md) | [↑ Component Map](${relativePathToRoot}/component-map.md)`;
}

/**
 * Format summary statistics
 */
function formatSummary(agents: Agent[]): string {
  const coordinators = agents.filter(a => a.type === 'coordinator').length;
  const workers = agents.filter(a => a.type === 'worker').length;
  const specialists = agents.filter(a => a.type === 'specialist').length;

  const lines = [
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|------:|',
    `| Total Agents | ${agents.length} |`,
  ];

  if (coordinators > 0) {
    lines.push(`| Coordinators | ${coordinators} |`);
  }
  if (workers > 0) {
    lines.push(`| Workers | ${workers} |`);
  }
  if (specialists > 0) {
    lines.push(`| Specialists | ${specialists} |`);
  }

  return lines.join('\n');
}

/**
 * Format category diagram section
 */
function formatCategoryDiagram(diagram: string): string {
  return `## Category Diagram

\`\`\`mermaid
${diagram}
\`\`\``;
}

/**
 * Format agents detail table
 */
function formatAgentsTable(agents: Agent[]): string {
  const lines = [
    '## Agents Detail',
    '',
    '| Agent | Type | Delegates To | Tools | Defined In |',
    '|-------|------|--------------|-------|------------|',
  ];

  for (const agent of agents) {
    const typeIcon = getTypeIcon(agent.type);
    const typeName = agent.type ? `${typeIcon} ${capitalize(agent.type)}` : '🤖 Worker';
    const delegatesTo = agent.delegatesTo && agent.delegatesTo.length > 0
      ? agent.delegatesTo.join(', ')
      : '—';
    const tools = agent.tools && agent.tools.length > 0
      ? agent.tools.slice(0, 3).join(', ') + (agent.tools.length > 3 ? '...' : '')
      : '—';
    const path = agent.path.replace(/\\/g, '/');

    lines.push(`| ${agent.name} | ${typeName} | ${delegatesTo} | ${tools} | [→](${path}) |`);
  }

  return lines.join('\n');
}

/**
 * Format relationships section (incoming and outgoing delegations)
 */
function formatRelationships(
  category: AgentCategory,
  categoryAgents: Agent[],
  allAgents: Agent[]
): string {
  const categoryAgentNames = new Set(categoryAgents.map(a => a.name));

  // Find incoming relationships (agents outside this category delegating to agents in this category)
  const incoming: Array<{ from: Agent; to: string; fromCategory: string }> = [];
  for (const agent of allAgents) {
    if (!categoryAgentNames.has(agent.name) && agent.delegatesTo) {
      for (const delegate of agent.delegatesTo) {
        if (categoryAgentNames.has(delegate)) {
          incoming.push({
            from: agent,
            to: delegate,
            fromCategory: agent.category || 'development',
          });
        }
      }
    }
  }

  // Find outgoing relationships (agents in this category delegating to agents outside)
  const outgoing: Array<{ from: string; to: Agent; toCategory: string }> = [];
  for (const agent of categoryAgents) {
    if (agent.delegatesTo) {
      for (const delegateName of agent.delegatesTo) {
        const delegateAgent = allAgents.find(a => a.name === delegateName);
        if (delegateAgent && !categoryAgentNames.has(delegateName)) {
          outgoing.push({
            from: agent.name,
            to: delegateAgent,
            toCategory: delegateAgent.category || 'development',
          });
        }
      }
    }
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    return '';
  }

  const lines = ['## Relationships'];

  if (incoming.length > 0) {
    lines.push('', '### Incoming (delegated from other categories)', '');
    lines.push('| From Agent | From Category | Relationship |');
    lines.push('|------------|---------------|--------------|');

    for (const rel of incoming) {
      const fromCategoryInfo = getCategoryInfo(rel.fromCategory as AgentCategory);
      lines.push(`| ${rel.from.name} | ${fromCategoryInfo.icon} ${fromCategoryInfo.label} | delegates to ${rel.to} |`);
    }
  }

  if (outgoing.length > 0) {
    lines.push('', '### Outgoing (delegates to other categories)', '');
    lines.push('| To Agent | To Category | Relationship |');
    lines.push('|----------|-------------|--------------|');

    for (const rel of outgoing) {
      const toCategoryInfo = getCategoryInfo(rel.toCategory as AgentCategory);
      lines.push(`| ${rel.to.name} | ${toCategoryInfo.icon} ${toCategoryInfo.label} | ${rel.from} delegates |`);
    }
  }

  return lines.join('\n');
}

/**
 * Format related skills section
 */
function formatRelatedSkills(agents: Agent[]): string {
  // For now, return empty - will be implemented when skills are parsed
  // TODO: Parse skills from agent metadata and group by category
  return '';
}

/**
 * Format cross-references to related categories
 */
function formatCrossReferences(
  category: AgentCategory,
  categoryAgents: Agent[],
  allAgents: Agent[],
  relativePathToRoot: string
): string {
  const categoryAgentNames = new Set(categoryAgents.map(a => a.name));

  // Find all categories that this category interacts with
  const relatedCategories = new Set<string>();

  // Check outgoing delegations
  for (const agent of categoryAgents) {
    if (agent.delegatesTo) {
      for (const delegateName of agent.delegatesTo) {
        const delegateAgent = allAgents.find(a => a.name === delegateName);
        if (delegateAgent && !categoryAgentNames.has(delegateName)) {
          relatedCategories.add(delegateAgent.category || 'development');
        }
      }
    }
  }

  // Check incoming delegations
  for (const agent of allAgents) {
    if (!categoryAgentNames.has(agent.name) && agent.delegatesTo) {
      for (const delegate of agent.delegatesTo) {
        if (categoryAgentNames.has(delegate)) {
          relatedCategories.add(agent.category || 'development');
        }
      }
    }
  }

  if (relatedCategories.size === 0) {
    return '';
  }

  const lines = [
    '## Cross-References',
    '',
    '| Related Categories | Link |',
    '|--------------------|------|',
  ];

  for (const relatedCategory of Array.from(relatedCategories).sort()) {
    const categoryInfo = getCategoryInfo(relatedCategory as AgentCategory);
    lines.push(`| ${categoryInfo.icon} ${categoryInfo.label} | [→ ${relatedCategory}.md](${relativePathToRoot}/categories/${relatedCategory}.md) |`);
  }

  return lines.join('\n');
}

/**
 * Format footer navigation
 */
function formatFooter(relativePathToRoot: string): string {
  return `[← Back to Overview](${relativePathToRoot}/README.md)`;
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
 * Capitalize first letter of string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
