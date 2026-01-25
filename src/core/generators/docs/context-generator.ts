/**
 * CONTEXT.md Generator
 * Generates arc42 architecture context documentation
 * Phase 3 Implementation: Task 3.5 (CONTEXT.md generation)
 */

import type { AgentScopeConfig } from '../../model/types.js';

// ============================================================================
// CONTEXT.md Types
// ============================================================================

export interface ContextOptions {
  /** Project name */
  projectName?: string;
  /** Project description */
  projectDescription?: string;
  /** Business context description */
  businessContext?: string;
  /** Technical context description */
  technicalContext?: string;
}

// ============================================================================
// Task 3.5: CONTEXT.md Generator
// ============================================================================

/**
 * Generate CONTEXT.md with arc42 sections 1-3 auto-populated
 *
 * Task 3.5: CONTEXT.md Generator (~100 lines)
 * - Section 1: Introduction and Goals (from agent descriptions)
 * - Section 2: Constraints (from MCP servers, tools)
 * - Section 3: Context and Scope (system boundary diagram)
 * - Clearly marks user-filled vs auto-generated sections
 */
export function generateContextMd(
  config: AgentScopeConfig,
  options: ContextOptions = {}
): string {
  const {
    projectName = 'Agent System',
    projectDescription = 'AI Agent Architecture',
  } = options;

  const lines: string[] = [
    '# Architecture Context (arc42)',
    '',
    `> Architecture context documentation for **${projectName}**`,
    '',
    '---',
    '',
    '## 1. Introduction and Goals',
    '',
    '### 1.1 Requirements Overview',
    '',
    `<!-- AUTO-GENERATED from agent system configuration -->`,
    '',
    `**${projectDescription}** consists of ${config.agents.length} agents working together to provide:`,
    '',
  ];

  // Extract primary goals from agent descriptions
  const goals = extractGoalsFromAgents(config);
  for (const goal of goals) {
    lines.push(`* ${goal}`);
  }

  lines.push('');
  lines.push('### 1.2 Quality Goals');
  lines.push('');
  lines.push('<!-- USER INPUT REQUIRED: Define top 3-5 quality goals -->');
  lines.push('');
  lines.push('| Priority | Quality Goal | Scenario |');
  lines.push('|----------|--------------|----------|');
  lines.push('| 1 | [e.g., Maintainability] | [e.g., New agent can be added in <1 hour] |');
  lines.push('| 2 | [e.g., Testability] | [e.g., 90%+ test coverage] |');
  lines.push('| 3 | [e.g., Modularity] | [e.g., Agents are independently deployable] |');
  lines.push('');
  lines.push('### 1.3 Stakeholders');
  lines.push('');
  lines.push('<!-- USER INPUT REQUIRED: Identify stakeholders and their concerns -->');
  lines.push('');
  lines.push('| Role/Name | Contact | Expectations |');
  lines.push('|-----------|---------|--------------|');
  lines.push('| [e.g., Development Team] | [contact] | [e.g., Clear architecture, maintainable code] |');
  lines.push('| [e.g., Product Owner] | [contact] | [e.g., Reliable functionality, quick iterations] |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 2. Constraints');
  lines.push('');
  lines.push('### 2.1 Technical Constraints');
  lines.push('');
  lines.push('<!-- AUTO-GENERATED from MCP servers and tools -->');
  lines.push('');

  // List technical constraints from MCP servers
  if (config.mcpServers.length > 0) {
    lines.push('**MCP Server Dependencies:**');
    lines.push('');
    for (const server of config.mcpServers) {
      if (!server.disabled) {
        lines.push(`* **${server.name}** (${server.type})`);
        if (server.tools && server.tools.length > 0) {
          lines.push(`  * Tools: ${server.tools.join(', ')}`);
        }
      }
    }
    lines.push('');
  }

  // List tool dependencies
  const allTools = new Set<string>();
  for (const agent of config.agents) {
    if (agent.tools) {
      for (const tool of agent.tools) {
        allTools.add(tool);
      }
    }
  }

  if (allTools.size > 0) {
    lines.push('**Tool Dependencies:**');
    lines.push('');
    for (const tool of Array.from(allTools).sort()) {
      lines.push(`* ${tool}`);
    }
    lines.push('');
  }

  lines.push('### 2.2 Organizational Constraints');
  lines.push('');
  lines.push('<!-- USER INPUT REQUIRED: Describe organizational constraints -->');
  lines.push('');
  lines.push('* [e.g., Team structure, development process]');
  lines.push('* [e.g., Budget constraints, timeline constraints]');
  lines.push('');
  lines.push('### 2.3 Conventions');
  lines.push('');
  lines.push('<!-- USER INPUT REQUIRED: Document coding and architecture conventions -->');
  lines.push('');
  lines.push('* [e.g., Coding standards (TypeScript strict mode)]');
  lines.push('* [e.g., Documentation standards (arc42)]');
  lines.push('* [e.g., Testing standards (Vitest, 80%+ coverage)]');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 3. Context and Scope');
  lines.push('');
  lines.push('### 3.1 Business Context');
  lines.push('');
  lines.push('<!-- AUTO-GENERATED system boundary diagram -->');
  lines.push('');

  // Generate system boundary diagram
  const boundaryDiagram = generateSystemBoundaryDiagram(config);
  lines.push(boundaryDiagram);
  lines.push('');

  lines.push('**External Entities:**');
  lines.push('');
  lines.push('| Entity | Type | Interface | Purpose |');
  lines.push('|--------|------|-----------|---------|');
  lines.push('| User | Human | Natural Language | Provides prompts and commands |');

  if (config.mcpServers.length > 0) {
    for (const server of config.mcpServers) {
      if (!server.disabled) {
        lines.push(`| ${server.name} | MCP Server | ${server.type} | ${server.tools?.length || 0} tools available |`);
      }
    }
  }

  lines.push('| File System | Storage | File I/O | Configuration and data persistence |');
  lines.push('');
  lines.push('### 3.2 Technical Context');
  lines.push('');
  lines.push('<!-- AUTO-GENERATED technical interfaces -->');
  lines.push('');
  lines.push('**Communication Channels:**');
  lines.push('');

  // List MCP communication types
  const mcpTypes = new Set(config.mcpServers.map(s => s.type));
  for (const type of mcpTypes) {
    const description = getMcpTypeDescription(type);
    lines.push(`* **${type}**: ${description}`);
  }

  lines.push('');
  lines.push('**Data Formats:**');
  lines.push('');
  lines.push('* **Configuration**: JSON, YAML (frontmatter)');
  lines.push('* **Agent Communication**: JSON (internal)');
  lines.push('* **Documentation Output**: Markdown, Mermaid diagrams');
  lines.push('* **MCP Protocol**: JSON-RPC 2.0');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 4. Solution Strategy');
  lines.push('');
  lines.push('<!-- USER INPUT REQUIRED: Describe your solution strategy -->');
  lines.push('');
  lines.push('### 4.1 Technology Decisions');
  lines.push('');
  lines.push('| Aspect | Decision | Rationale |');
  lines.push('|--------|----------|-----------|');
  lines.push('| [e.g., Agent Framework] | [e.g., Custom TypeScript] | [e.g., Flexibility, type safety] |');
  lines.push('| [e.g., Communication] | [e.g., MCP Protocol] | [e.g., Standard, extensible] |');
  lines.push('');
  lines.push('### 4.2 Top-Level Decomposition');
  lines.push('');
  lines.push(`The system is decomposed into ${config.agents.length} agents:`);
  lines.push('');

  // List agents by type
  const agentsByType = groupAgentsByType(config);
  for (const [type, agents] of Object.entries(agentsByType)) {
    if (agents.length > 0) {
      lines.push(`* **${type}** (${agents.length}): ${agents.map(a => a.name).join(', ')}`);
    }
  }

  lines.push('');
  lines.push('### 4.3 Quality Achievement');
  lines.push('');
  lines.push('<!-- USER INPUT REQUIRED: How quality goals are achieved -->');
  lines.push('');
  lines.push('| Quality Goal | Approach |');
  lines.push('|--------------|----------|');
  lines.push('| [from 1.2] | [e.g., Modular architecture, clear interfaces] |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('[← Back to README](./README.md)');
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by AgentScope on ${new Date().toISOString().replace('T', ' at ').replace(/\.\d{3}Z$/, ' UTC')}*`);
  lines.push('');
  lines.push('<!-- Note: Sections marked AUTO-GENERATED are populated from configuration. -->');
  lines.push('<!-- Sections marked USER INPUT REQUIRED need manual completion. -->');

  return lines.join('\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract goals from agent descriptions
 */
function extractGoalsFromAgents(config: AgentScopeConfig): string[] {
  const goals = new Set<string>();

  // Analyze agent descriptions to extract capabilities
  const capabilityKeywords = [
    { keyword: 'code', goal: 'Code generation and implementation' },
    { keyword: 'review', goal: 'Code review and quality assurance' },
    { keyword: 'test', goal: 'Testing and validation' },
    { keyword: 'plan', goal: 'Planning and coordination' },
    { keyword: 'research', goal: 'Research and analysis' },
    { keyword: 'security', goal: 'Security scanning and validation' },
    { keyword: 'github', goal: 'GitHub integration and automation' },
    { keyword: 'deploy', goal: 'Deployment and release management' },
  ];

  for (const agent of config.agents) {
    const desc = agent.description?.toLowerCase() || '';
    for (const { keyword, goal } of capabilityKeywords) {
      if (desc.includes(keyword)) {
        goals.add(goal);
      }
    }
  }

  return Array.from(goals);
}

/**
 * Generate system boundary diagram
 */
function generateSystemBoundaryDiagram(config: AgentScopeConfig): string {
  const lines: string[] = [
    '```mermaid',
    'C4Context',
    '    title System Boundary Diagram',
    '',
    '    Person(user, "User", "Developer interacting with agents")',
    '',
    '    System_Boundary(agents, "Agent System") {',
    `        System(agentCore, "Agent System", "${config.agents.length} agents coordinating work")`,
    '    }',
    '',
  ];

  // Add MCP servers as external systems
  if (config.mcpServers.length > 0) {
    for (const server of config.mcpServers) {
      if (!server.disabled) {
        const id = sanitizeId(server.name);
        lines.push(`    System_Ext(${id}, "${server.name}", "MCP Server (${server.type})")`);
      }
    }
    lines.push('');
  }

  lines.push('    System_Ext(fs, "File System", "Configuration and data storage")');
  lines.push('');
  lines.push('    Rel(user, agentCore, "Sends prompts", "Natural Language")');
  lines.push('    Rel(agentCore, user, "Returns responses", "Text/Artifacts")');

  if (config.mcpServers.length > 0) {
    for (const server of config.mcpServers) {
      if (!server.disabled) {
        const id = sanitizeId(server.name);
        lines.push(`    Rel(agentCore, ${id}, "Uses tools", "JSON-RPC")`);
      }
    }
  }

  lines.push('    Rel(agentCore, fs, "Reads config", "JSON/YAML")');
  lines.push('    Rel(agentCore, fs, "Writes docs", "Markdown")');
  lines.push('');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Group agents by type
 */
function groupAgentsByType(config: AgentScopeConfig): Record<string, typeof config.agents> {
  const groups: Record<string, typeof config.agents> = {
    coordinator: [],
    worker: [],
    specialist: [],
    reviewer: [],
    custom: [],
  };

  for (const agent of config.agents) {
    const type = agent.type || 'worker';
    if (groups[type]) {
      groups[type].push(agent);
    } else {
      groups.custom.push(agent);
    }
  }

  return groups;
}

/**
 * Get MCP type description
 */
function getMcpTypeDescription(type: string): string {
  switch (type) {
    case 'stdio':
      return 'Standard input/output communication';
    case 'sse':
      return 'Server-Sent Events for streaming';
    case 'websocket':
      return 'WebSocket for bidirectional communication';
    default:
      return 'Custom communication protocol';
  }
}

/**
 * Sanitize string for use as diagram ID
 */
function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '_');
}
