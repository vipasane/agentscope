/**
 * Dataflow Diagram Generator
 * Generates a Mermaid diagram showing data and message flow between components
 */

import type { AgentScopeConfig, Agent, Hook, McpServer } from '../../model/types.js';
import { MermaidThemeGenerator, resolveTheme, type ThemePalette } from '../../themes/index.js';

export interface DataflowOptions {
  /** Include hooks in the diagram */
  includeHooks?: boolean;
  /** Include MCP server data flow */
  includeMcpFlow?: boolean;
  /** Custom title */
  title?: string;
  /** Theme palette or theme name */
  theme?: ThemePalette | string;
  /** Path to custom theme file */
  themePath?: string;
}

/**
 * Generate a dataflow diagram showing how data moves through the system
 */
export function generateDataflow(
  config: AgentScopeConfig,
  options: DataflowOptions = {}
): string {
  const {
    includeHooks = true,
    includeMcpFlow = true,
    title = 'Agent Dataflow',
    theme,
    themePath,
  } = options;

  // Resolve theme
  const themeGenerator = new MermaidThemeGenerator(
    typeof theme === 'string' || !theme
      ? resolveTheme({ cliTheme: theme as string, themePath }).theme
      : theme
  );

  const lines: string[] = [
    '```mermaid',
    themeGenerator.getInit(),
    'flowchart LR',
    `    %% ${title}`,
    '',
  ];

  // Add user input node
  lines.push('    subgraph Input["Input Layer"]');
  lines.push('        USER[("User")]');
  lines.push('        PROMPT["Prompt"]');
  lines.push('    end');
  lines.push('');

  // Add hooks layer if enabled
  if (includeHooks && config.hooks.length > 0) {
    lines.push('    subgraph Hooks["Hook Layer"]');
    const hookGroups = groupHooksByEvent(config.hooks);

    for (const [event, hooks] of hookGroups) {
      const id = sanitizeId(event);
      lines.push(`        hook_${id}["${getHookIcon(event)} ${event}"]`);
    }
    lines.push('    end');
    lines.push('');
  }

  // Add agent processing layer
  lines.push('    subgraph Processing["Processing Layer"]');

  // Group agents by type for visual organization
  const agentsByType = groupAgentsByType(config.agents);

  if (agentsByType.coordinator.length > 0) {
    lines.push('        subgraph Coordinators["Coordinators"]');
    for (const agent of agentsByType.coordinator) {
      lines.push(`            ${sanitizeId(agent.name)}["${agent.name}"]`);
    }
    lines.push('        end');
  }

  if (agentsByType.worker.length > 0) {
    lines.push('        subgraph Workers["Workers"]');
    for (const agent of agentsByType.worker) {
      lines.push(`            ${sanitizeId(agent.name)}["${agent.name}"]`);
    }
    lines.push('        end');
  }

  if (agentsByType.specialist.length > 0) {
    lines.push('        subgraph Specialists["Specialists"]');
    for (const agent of agentsByType.specialist) {
      lines.push(`            ${sanitizeId(agent.name)}["${agent.name}"]`);
    }
    lines.push('        end');
  }

  if (agentsByType.reviewer.length > 0) {
    lines.push('        subgraph Reviewers["Reviewers"]');
    for (const agent of agentsByType.reviewer) {
      lines.push(`            ${sanitizeId(agent.name)}["${agent.name}"]`);
    }
    lines.push('        end');
  }

  lines.push('    end');
  lines.push('');

  // Add MCP servers layer if enabled
  if (includeMcpFlow && config.mcpServers.length > 0) {
    const enabledServers = config.mcpServers.filter(s => !s.disabled);
    if (enabledServers.length > 0) {
      lines.push('    subgraph External["External Services (MCP)"]');
      for (const server of enabledServers) {
        const icon = getServerIcon(server);
        lines.push(`        mcp_${sanitizeId(server.name)}[("${icon} ${server.name}")]`);
      }
      lines.push('    end');
      lines.push('');
    }
  }

  // Add output layer
  lines.push('    subgraph Output["Output Layer"]');
  lines.push('        RESPONSE["Response"]');
  lines.push('        ARTIFACTS["Artifacts"]');
  lines.push('    end');
  lines.push('');

  // Add flow connections
  lines.push('    %% Data Flow');

  // User to processing
  lines.push('    USER --> PROMPT');

  // Hooks intercept prompts
  if (includeHooks && config.hooks.length > 0) {
    const hookGroups = groupHooksByEvent(config.hooks);

    // UserPromptSubmit hooks
    if (hookGroups.has('UserPromptSubmit')) {
      lines.push('    PROMPT --> hook_UserPromptSubmit');
      lines.push('    hook_UserPromptSubmit --> Processing');
    } else {
      lines.push('    PROMPT --> Processing');
    }

    // PreToolUse hooks
    if (hookGroups.has('PreToolUse')) {
      lines.push('    Processing <--> hook_PreToolUse');
    }

    // PostToolUse hooks
    if (hookGroups.has('PostToolUse')) {
      lines.push('    Processing --> hook_PostToolUse');
    }
  } else {
    lines.push('    PROMPT --> Processing');
  }

  // Agent delegation flows
  for (const agent of config.agents) {
    if (agent.delegatesTo) {
      for (const target of agent.delegatesTo) {
        lines.push(`    ${sanitizeId(agent.name)} ==>|delegate| ${sanitizeId(target)}`);
      }
    }
  }

  // MCP connections
  if (includeMcpFlow) {
    for (const agent of config.agents) {
      if (agent.tools) {
        for (const tool of agent.tools) {
          const server = config.mcpServers.find(s => s.tools?.includes(tool) || s.name === tool);
          if (server && !server.disabled) {
            lines.push(`    ${sanitizeId(agent.name)} -.->|"${tool}"| mcp_${sanitizeId(server.name)}`);
          }
        }
      }
    }
  }

  // Processing to output
  lines.push('    Processing --> RESPONSE');
  lines.push('    Processing --> ARTIFACTS');

  // Add styling
  lines.push('');
  lines.push('    %% Styling');
  lines.push(...themeGenerator.getClassDefs().map(def => `    ${def}`));

  // Apply styling
  lines.push('    class USER,PROMPT input');
  lines.push('    class RESPONSE,ARTIFACTS output');

  if (includeHooks) {
    const hookGroups = groupHooksByEvent(config.hooks);
    for (const event of hookGroups.keys()) {
      lines.push(`    class hook_${sanitizeId(event)} hook`);
    }
  }

  for (const agent of config.agents) {
    const className = themeGenerator.getAgentClass(agent.type ?? 'worker');
    lines.push(`    class ${sanitizeId(agent.name)} ${className}`);
  }

  if (includeMcpFlow) {
    for (const server of config.mcpServers.filter(s => !s.disabled)) {
      lines.push(`    class mcp_${sanitizeId(server.name)} mcp`);
    }
  }

  lines.push('```');

  return lines.join('\n');
}

/**
 * Group agents by type
 */
function groupAgentsByType(agents: Agent[]): Record<string, Agent[]> {
  const groups: Record<string, Agent[]> = {
    coordinator: [],
    worker: [],
    specialist: [],
    reviewer: [],
    custom: [],
  };

  for (const agent of agents) {
    const type = agent.type ?? 'worker';
    if (groups[type]) {
      groups[type].push(agent);
    } else {
      groups.custom.push(agent);
    }
  }

  return groups;
}

/**
 * Group hooks by event type
 */
function groupHooksByEvent(hooks: Hook[]): Map<string, Hook[]> {
  const map = new Map<string, Hook[]>();

  for (const hook of hooks) {
    const existing = map.get(hook.event) ?? [];
    existing.push(hook);
    map.set(hook.event, existing);
  }

  return map;
}

/**
 * Get icon for hook event type
 */
function getHookIcon(event: string): string {
  switch (event) {
    case 'PreToolUse':
      return '🔒';
    case 'PostToolUse':
      return '✅';
    case 'UserPromptSubmit':
      return '📝';
    case 'Notification':
      return '🔔';
    case 'Stop':
      return '🛑';
    case 'SubagentStop':
      return '⏹️';
    default:
      return '⚡';
  }
}

/**
 * Get icon for server type
 */
function getServerIcon(server: McpServer): string {
  switch (server.type) {
    case 'sse':
      return '📡';
    case 'websocket':
      return '🔌';
    case 'stdio':
    default:
      return '💾';
  }
}

/**
 * Sanitize string for use as Mermaid ID
 */
function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '_');
}
