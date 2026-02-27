/**
 * Section Formatters for Markdown Documentation
 *
 * Generates formatted markdown sections for all 7 entity types:
 * - Agents
 * - Skills
 * - MCP Servers
 * - Hooks
 * - Commands
 * - Plugins
 * - Permissions
 *
 * Implements the target format from examples/README-example.md with:
 * - Summary tables with emoji indicators
 * - Collapsible details sections
 * - Security sanitization
 * - Both compact and detailed modes
 */

import type {
  Agent,
  Skill,
  McpServer,
  Hook,
  Command,
  Plugin,
  PermissionSummary,
  PermissionRule,
} from '../../model/types.js';
import { sanitizeNodeLabel, sanitizeMarkdown } from '../../security/sanitizers.js';

// ============================================================================
// Types
// ============================================================================

export interface FormatterOptions {
  /** Compact mode - summary tables only, no details */
  compact?: boolean;
  /** Include collapsible details sections */
  includeDetails?: boolean;
  /** Maximum items to show in summary (for large collections) */
  maxSummaryItems?: number;
}

export interface HookDisplayInfo {
  event: string;
  matcher: string;
  type: 'command' | 'prompt';
  timeout: string;
  status: string;
  statusIcon: string;
  command?: string;
  prompt?: string;
  description?: string;
  rawHook: Hook;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitizes a string for safe markdown output
 */
function sanitize(str: string | undefined | null): string {
  if (!str) return '';
  return sanitizeNodeLabel(str);
}

/**
 * Truncates a string to a maximum length
 */
function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Escapes pipe characters for markdown tables
 */
function escapeTableCell(str: string): string {
  return str.replace(/\|/g, '\\|');
}

/**
 * Gets status icon based on enabled state
 */
function getStatusIcon(enabled: boolean | undefined): string {
  return enabled === false ? '\u{1F534}' : '\u{1F7E2}'; // red circle : green circle
}

/**
 * Formats timeout value for display
 */
function formatTimeout(ms: number | undefined): string {
  if (!ms) return '-';
  if (ms >= 1000) {
    return `${Math.round(ms / 1000)}s`;
  }
  return `${ms}ms`;
}

/**
 * Creates an anchor-safe ID from a string
 */
function toAnchorId(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================================
// Hook Formatters
// ============================================================================

/**
 * Extracts matcher pattern from hook configuration
 * Hooks can match specific tools (e.g., "Bash") or all tools ("*")
 */
function extractHookMatcher(hook: Hook): string {
  // Check if hook has a matcher in metadata or infer from command
  const metadata = hook as Hook & { matcher?: string };
  if (metadata.matcher) {
    return metadata.matcher;
  }

  // Default to event name if no specific matcher
  return '-';
}

/**
 * Determines hook type (command vs prompt)
 */
function getHookType(hook: Hook): 'command' | 'prompt' {
  // Check if hook is prompt-based or command-based
  const metadata = hook as Hook & { type?: string; prompt?: string };
  if (metadata.type === 'prompt' || metadata.prompt) {
    return 'prompt';
  }
  return 'command';
}

/**
 * Builds display info for a hook
 */
function buildHookDisplayInfo(hook: Hook): HookDisplayInfo {
  const hookType = getHookType(hook);
  const metadata = hook as Hook & { matcher?: string; prompt?: string; description?: string };

  return {
    event: hook.event,
    matcher: extractHookMatcher(hook),
    type: hookType,
    timeout: formatTimeout(hook.timeout),
    status: hook.enabled === false ? 'Disabled' : 'Enabled',
    statusIcon: getStatusIcon(hook.enabled),
    command: hook.command,
    prompt: metadata.prompt,
    description: metadata.description,
    rawHook: hook,
  };
}

/**
 * Generates the hooks section with summary table and collapsible details
 *
 * @example Output:
 * ## Hooks
 *
 * | Event | Matcher | Type | Timeout | Status |
 * |-------|---------|------|--------:|:------:|
 * | PreToolUse | `Bash` | command | 10s | green |
 *
 * <details>
 * <summary>Hook Details</summary>
 * ### PreToolUse: Bash
 * Validates bash commands...
 * ```json
 * {...}
 * ```
 * </details>
 */
export function formatHooksSection(
  hooks: Hook[],
  options: FormatterOptions = {}
): string {
  if (hooks.length === 0) {
    return '';
  }

  const { compact = false, includeDetails = true } = options;
  const lines: string[] = [];

  // Summary table
  lines.push('| Event | Matcher | Type | Timeout | Status |');
  lines.push('|-------|---------|------|--------:|:------:|');

  const hookInfos = hooks.map(buildHookDisplayInfo);

  for (const info of hookInfos) {
    const matcher = info.matcher !== '-' ? `\`${sanitize(info.matcher)}\`` : '-';
    lines.push(
      `| ${sanitize(info.event)} | ${matcher} | ${info.type} | ${info.timeout} | ${info.statusIcon} |`
    );
  }

  // Collapsible details section
  if (!compact && includeDetails && hooks.length > 0) {
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>\u{1FA9D} Hook Details</summary>');
    lines.push('');

    for (const info of hookInfos) {
      const titleSuffix = info.matcher !== '-' ? `: ${sanitize(info.matcher)}` : '';
      lines.push(`### ${sanitize(info.event)}${titleSuffix}`);
      lines.push('');

      // Description
      if (info.description) {
        lines.push(sanitizeMarkdown(info.description));
        lines.push('');
      } else {
        lines.push(getHookEventDescription(info.event));
        lines.push('');
      }

      // Configuration JSON
      const config: Record<string, unknown> = {
        type: info.type,
      };
      if (info.command) {
        config.command = sanitize(truncate(info.command, 100));
      }
      if (info.prompt) {
        config.prompt = sanitize(truncate(info.prompt, 100));
      }
      if (info.rawHook.timeout) {
        config.timeout = info.rawHook.timeout;
      }
      if (info.matcher !== '-') {
        config.matcher = info.matcher;
      }

      lines.push('```json');
      lines.push(JSON.stringify(config, null, 2));
      lines.push('```');
      lines.push('');
    }

    lines.push('</details>');
  }

  return lines.join('\n');
}

/**
 * Returns description for a hook event type
 */
function getHookEventDescription(event: string): string {
  const descriptions: Record<string, string> = {
    PreToolUse: 'Validates tool usage before execution.',
    PostToolUse: 'Logs or processes tool usage after execution.',
    UserPromptSubmit: 'Processes user input before handling.',
    Notification: 'Handles notifications and alerts.',
    Stop: 'Triggered when the main agent stops.',
    SubagentStop: 'Triggered when a subagent stops.',
  };

  return descriptions[event] ?? 'Custom hook event.';
}

// ============================================================================
// Command Formatters
// ============================================================================

/**
 * Generates the commands section with tool permissions
 *
 * @example Output:
 * ## Commands
 *
 * | Command | Description | Allowed Tools | Disallowed Tools |
 * |---------|-------------|---------------|------------------|
 * | /commit | Create git commit | Bash, Read | Write, Edit |
 */
export function formatCommandsSection(
  commands: Command[],
  options: FormatterOptions = {}
): string {
  if (commands.length === 0) {
    return '';
  }

  const { compact = false, includeDetails = true } = options;
  const lines: string[] = [];

  // Summary table
  lines.push('| Command | Description | Allowed Tools | Disallowed Tools |');
  lines.push('|---------|-------------|---------------|------------------|');

  for (const command of commands) {
    const name = `\`${sanitize(command.name)}\``;
    const description = escapeTableCell(sanitize(truncate(command.description ?? '-', 50)));
    const allowed = command.allowedTools?.map(t => sanitize(t)).join(', ') || '-';
    const disallowed = command.disallowedTools?.map(t => sanitize(t)).join(', ') || '-';

    lines.push(`| ${name} | ${description} | ${allowed} | ${disallowed} |`);
  }

  // Collapsible details section
  if (!compact && includeDetails && commands.length > 0) {
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>\u2318 Command Details</summary>');
    lines.push('');

    for (const command of commands) {
      lines.push(`### ${sanitize(command.name)}`);
      lines.push('');

      if (command.description) {
        lines.push(sanitizeMarkdown(command.description));
        lines.push('');
      }

      if (command.allowedTools && command.allowedTools.length > 0) {
        lines.push(`**Allowed:** ${command.allowedTools.map(t => `\`${sanitize(t)}\``).join(', ')}`);
      }

      if (command.disallowedTools && command.disallowedTools.length > 0) {
        lines.push(`**Disallowed:** ${command.disallowedTools.map(t => `\`${sanitize(t)}\``).join(', ')}`);
      }

      lines.push('');
    }

    lines.push('</details>');
  }

  return lines.join('\n');
}

// ============================================================================
// Plugin Formatters
// ============================================================================

/**
 * Generates the plugins section with marketplace info and status
 *
 * @example Output:
 * ## Plugins
 *
 * | Plugin | Marketplace | Status | Version | Description |
 * |--------|-------------|:------:|---------|-------------|
 * | sparc-modes | anthropic | green | 1.2.0 | SPARC methodology |
 */
export function formatPluginsSection(
  plugins: Plugin[],
  options: FormatterOptions = {}
): string {
  if (plugins.length === 0) {
    return '';
  }

  const { compact = false, includeDetails = true } = options;
  const lines: string[] = [];

  // Summary table
  lines.push('| Plugin | Marketplace | Status | Version | Description |');
  lines.push('|--------|-------------|:------:|---------|-------------|');

  for (const plugin of plugins) {
    const name = sanitize(plugin.name);
    const marketplace = sanitize(plugin.marketplace ?? '-');
    const statusIcon = getStatusIcon(plugin.enabled);
    const version = sanitize(plugin.version ?? '-');
    const description = escapeTableCell(sanitize(truncate(plugin.description ?? '-', 40)));

    lines.push(`| ${name} | ${marketplace} | ${statusIcon} | ${version} | ${description} |`);
  }

  // Collapsible details section
  if (!compact && includeDetails && plugins.length > 0) {
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>\u{1F9E9} Plugin Details</summary>');
    lines.push('');

    for (const plugin of plugins) {
      const marketplaceSuffix = plugin.marketplace ? `@${sanitize(plugin.marketplace)}` : '';
      lines.push(`### ${sanitize(plugin.name)}${marketplaceSuffix}`);
      lines.push('');

      if (plugin.source) {
        lines.push(`**Source:** \`${sanitize(plugin.source.type)}:${sanitize(plugin.source.location)}\``);
      }

      lines.push(`**Status:** ${plugin.enabled ? 'Enabled' : 'Disabled'}`);

      if (plugin.version) {
        lines.push(`**Version:** ${sanitize(plugin.version)}`);
      }

      lines.push('');

      if (plugin.description) {
        lines.push(sanitizeMarkdown(plugin.description));
        lines.push('');
      }
    }

    lines.push('</details>');
  }

  return lines.join('\n');
}

// ============================================================================
// Permission Formatters
// ============================================================================

/**
 * Groups permission rules by type
 */
function groupPermissionsByType(rules: PermissionRule[]): Map<string, PermissionRule[]> {
  const groups = new Map<string, PermissionRule[]>();

  for (const rule of rules) {
    const type = rule.type;
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(rule);
  }

  return groups;
}

/**
 * Gets icon for permission type
 */
function getPermissionTypeIcon(type: string): string {
  switch (type) {
    case 'allow':
      return '\u2705'; // checkmark
    case 'deny':
      return '\u274C'; // red X
    case 'ask':
      return '\u2753'; // question mark
    default:
      return '\u2022'; // bullet
  }
}

/**
 * Gets description for permission type
 */
function getPermissionTypeDescription(type: string): string {
  switch (type) {
    case 'allow':
      return 'Permitted operations';
    case 'deny':
      return 'Blocked operations';
    case 'ask':
      return 'Prompt for confirmation';
    default:
      return 'Other rules';
  }
}

/**
 * Generates the permissions section with counts and collapsible rules
 *
 * @example Output:
 * ## Permissions
 *
 * **Default Mode:** `default` | **Total Rules:** 8
 *
 * | Type | Count | Description |
 * |------|------:|-------------|
 * | Allow | 4 | Permitted operations |
 * | Deny | 2 | Blocked operations |
 * | Ask | 2 | Prompt for confirmation |
 */
export function formatPermissionsSection(
  permissions: PermissionSummary,
  options: FormatterOptions = {}
): string {
  const { compact = false, includeDetails = true } = options;
  const lines: string[] = [];

  const totalRules = permissions.allowCount + permissions.denyCount + permissions.askCount;
  const defaultMode = permissions.defaultMode ?? 'default';

  // Header with summary
  lines.push(`**Default Mode:** \`${sanitize(defaultMode)}\` | **Total Rules:** ${totalRules}`);
  lines.push('');

  // Summary table
  lines.push('| Type | Count | Description |');
  lines.push('|------|------:|-------------|');

  if (permissions.allowCount > 0) {
    lines.push(`| ${getPermissionTypeIcon('allow')} Allow | ${permissions.allowCount} | ${getPermissionTypeDescription('allow')} |`);
  }
  if (permissions.denyCount > 0) {
    lines.push(`| ${getPermissionTypeIcon('deny')} Deny | ${permissions.denyCount} | ${getPermissionTypeDescription('deny')} |`);
  }
  if (permissions.askCount > 0) {
    lines.push(`| ${getPermissionTypeIcon('ask')} Ask | ${permissions.askCount} | ${getPermissionTypeDescription('ask')} |`);
  }

  // Collapsible details section
  if (!compact && includeDetails && permissions.rules.length > 0) {
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>\u{1F510} Permission Rules</summary>');
    lines.push('');

    const groupedRules = groupPermissionsByType(permissions.rules);

    // Allow Rules
    const allowRules = groupedRules.get('allow') ?? [];
    if (allowRules.length > 0) {
      lines.push(`### Allow Rules (${allowRules.length})`);
      lines.push('');
      lines.push('| Pattern | Description |');
      lines.push('|---------|-------------|');
      for (const rule of allowRules) {
        const pattern = `\`${sanitize(rule.pattern)}\``;
        const description = escapeTableCell(sanitize(rule.description ?? '-'));
        lines.push(`| ${pattern} | ${description} |`);
      }
      lines.push('');
    }

    // Deny Rules
    const denyRules = groupedRules.get('deny') ?? [];
    if (denyRules.length > 0) {
      lines.push(`### Deny Rules (${denyRules.length})`);
      lines.push('');
      lines.push('| Pattern | Description |');
      lines.push('|---------|-------------|');
      for (const rule of denyRules) {
        const pattern = `\`${sanitize(rule.pattern)}\``;
        const description = escapeTableCell(sanitize(rule.description ?? '-'));
        lines.push(`| ${pattern} | ${description} |`);
      }
      lines.push('');
    }

    // Ask Rules
    const askRules = groupedRules.get('ask') ?? [];
    if (askRules.length > 0) {
      lines.push(`### Ask Rules (${askRules.length})`);
      lines.push('');
      lines.push('| Pattern | Description |');
      lines.push('|---------|-------------|');
      for (const rule of askRules) {
        const pattern = `\`${sanitize(rule.pattern)}\``;
        const description = escapeTableCell(sanitize(rule.description ?? '-'));
        lines.push(`| ${pattern} | ${description} |`);
      }
      lines.push('');
    }

    // Additional scoped directories
    if (permissions.additionalDirectories && permissions.additionalDirectories.length > 0) {
      lines.push('### Additional Scoped Directories');
      lines.push('');
      for (const dir of permissions.additionalDirectories) {
        lines.push(`- \`${sanitize(dir)}\``);
      }
      lines.push('');
    }

    lines.push('</details>');
  }

  return lines.join('\n');
}

// ============================================================================
// Agent Formatters (Enhanced)
// ============================================================================

/**
 * Agent type emoji mapping
 */
function getAgentTypeEmoji(type: string | undefined): string {
  switch (type) {
    case 'coordinator':
      return '\u{1F451}'; // crown
    case 'worker':
      return '\u{1F916}'; // robot
    case 'reviewer':
      return '\u{1F50D}'; // magnifying glass
    case 'specialist':
      return '\u{1F3AF}'; // target
    default:
      return '\u{1F916}'; // robot (default)
  }
}

/**
 * Generates the agents comparison table (dense format)
 *
 * @example Output:
 * | Agent | Cat | Type | Delegates To | Tools | Description |
 * |-------|-----|------|--------------|-------|-------------|
 * | pr-manager | github | coord | reviewer, coder | github | PR management |
 */
export function formatAgentsComparisonTable(
  agents: Agent[],
  options: FormatterOptions = {}
): string {
  if (agents.length === 0) {
    return '';
  }

  const lines: string[] = [];

  lines.push('| Agent | Cat | Type | Delegates To | Tools | Description |');
  lines.push('|-------|-----|------|--------------|-------|-------------|');

  for (const agent of agents) {
    const name = sanitize(agent.name);
    const category = getCategoryFromPath(agent.path);
    const typeEmoji = getAgentTypeEmoji(agent.type);
    const delegatesTo = agent.delegatesTo?.map(d => sanitize(d)).join(', ') || '-';
    const tools = agent.tools?.map(t => sanitize(t)).join(', ') || '-';
    const description = escapeTableCell(sanitize(truncate(agent.description ?? '-', 30)));

    lines.push(`| ${name} | ${category} | ${typeEmoji} | ${delegatesTo} | ${tools} | ${description} |`);
  }

  lines.push('');
  lines.push('**Legend:** \u{1F451} Coordinator | \u{1F916} Worker | \u{1F50D} Reviewer | \u{1F3AF} Specialist');

  return lines.join('\n');
}

/**
 * Extracts category from agent path
 */
function getCategoryFromPath(path: string): string {
  // Extract category from path like "categories/github.md" or similar
  const match = path.match(/categories\/([^/]+)/i);
  if (match) {
    return match[1].replace(/\.md$/i, '');
  }

  // Try to extract from common patterns
  if (path.includes('github')) return '\u{1F419}'; // octopus
  if (path.includes('security')) return '\u{1F512}'; // lock
  if (path.includes('dev')) return '\u{1F4BB}'; // laptop
  if (path.includes('test')) return '\u{1F9EA}'; // test tube

  return '-';
}

/**
 * Generates a capabilities matrix for agents
 *
 * @example Output:
 * | Agent | Writes Code | Reviews | Tests | Deploys | Security |
 * |-------|:-----------:|:-------:|:-----:|:-------:|:--------:|
 * | coder | check | | | | |
 */
export function formatAgentsCapabilitiesMatrix(
  agents: Agent[],
  capabilities: string[] = ['Writes Code', 'Reviews', 'Tests', 'Deploys', 'Security']
): string {
  if (agents.length === 0) {
    return '';
  }

  const lines: string[] = [];

  // Header
  const headers = ['Agent', ...capabilities];
  lines.push('| ' + headers.join(' | ') + ' |');
  lines.push('|' + headers.map((_, i) => i === 0 ? '-------' : ':-------:').join('|') + '|');

  for (const agent of agents) {
    const row: string[] = [sanitize(agent.name)];

    for (const cap of capabilities) {
      const hasCapability = inferCapabilityFromAgent(agent, cap);
      row.push(hasCapability ? '\u2713' : '');
    }

    lines.push('| ' + row.join(' | ') + ' |');
  }

  return lines.join('\n');
}

/**
 * Infers if an agent has a capability based on its properties
 */
function inferCapabilityFromAgent(agent: Agent, capability: string): boolean {
  const capLower = capability.toLowerCase();
  const nameLower = agent.name.toLowerCase();
  const descLower = (agent.description ?? '').toLowerCase();
  const toolsStr = (agent.tools ?? []).join(' ').toLowerCase();

  switch (capLower) {
    case 'writes code':
      return nameLower.includes('coder') ||
             nameLower.includes('backend') ||
             nameLower.includes('ml-dev') ||
             toolsStr.includes('filesystem') ||
             toolsStr.includes('write');
    case 'reviews':
      return nameLower.includes('review') ||
             nameLower.includes('pr-manager') ||
             descLower.includes('review');
    case 'tests':
      return nameLower.includes('test') ||
             nameLower.includes('validator') ||
             descLower.includes('test');
    case 'deploys':
      return nameLower.includes('deploy') ||
             nameLower.includes('release') ||
             nameLower.includes('pr-manager') ||
             descLower.includes('deploy');
    case 'security':
      return nameLower.includes('security') ||
             nameLower.includes('audit') ||
             descLower.includes('security');
    default:
      return false;
  }
}

// ============================================================================
// MCP Server Formatters (Enhanced)
// ============================================================================

/**
 * Generates the MCP servers section with enhanced formatting
 *
 * @example Output:
 * | Server | Status | Transport | Command | Tools Provided |
 * |--------|:------:|-----------|---------|----------------|
 * | claude-flow | green | stdio | `npx @claude-flow/cli` | swarm, memory, agents |
 */
export function formatMcpServersSection(
  servers: McpServer[],
  options: FormatterOptions = {}
): string {
  if (servers.length === 0) {
    return '';
  }

  const { compact = false, includeDetails = true } = options;
  const lines: string[] = [];

  // Summary table with Transport column matching example format
  lines.push('| Server | Status | Transport | Command | Tools Provided |');
  lines.push('|--------|:------:|-----------|---------|----------------|');

  for (const server of servers) {
    const statusIcon = getStatusIcon(!server.disabled);
    const transport = sanitize(server.type ?? 'stdio');
    const command = `\`${sanitize(truncate(server.command, 30))}\``;
    const tools = server.tools?.map(t => sanitize(t)).join(', ') || '-';

    lines.push(`| ${sanitize(server.name)} | ${statusIcon} | ${transport} | ${command} | ${tools} |`);
  }

  // Collapsible details section
  if (!compact && includeDetails && servers.length > 0) {
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>\u{1F50C} Server Details</summary>');
    lines.push('');

    for (const server of servers) {
      lines.push(`### ${sanitize(server.name)}`);
      lines.push('');

      const statusIcon = getStatusIcon(!server.disabled);
      lines.push(`**Status:** ${statusIcon} ${server.disabled ? 'Disabled' : 'Enabled'}`);
      lines.push(`**Type:** ${sanitize(server.type ?? 'stdio')}`);
      lines.push('');

      lines.push('**Command:**');
      lines.push('```bash');
      const fullCommand = server.args?.length
        ? `${server.command} ${server.args.join(' ')}`
        : server.command;
      lines.push(sanitize(fullCommand));
      lines.push('```');
      lines.push('');

      if (server.env && Object.keys(server.env).length > 0) {
        lines.push('**Environment Variables:**');
        for (const [key, value] of Object.entries(server.env)) {
          // Mask sensitive values
          const isSensitive = /key|secret|token|password|api/i.test(key);
          const displayValue = isSensitive ? '***masked***' : sanitize(value);
          lines.push(`- \`${sanitize(key)}\`: \`${displayValue}\``);
        }
        lines.push('');
      }

      if (server.tools && server.tools.length > 0) {
        lines.push('**Provides Tools:**');
        for (const tool of server.tools) {
          lines.push(`- \`${sanitize(tool)}\``);
        }
        lines.push('');
      }
    }

    lines.push('</details>');
  }

  return lines.join('\n');
}

// ============================================================================
// Skills Formatters (Enhanced)
// ============================================================================

/**
 * Generates the skills section with enhanced formatting
 *
 * @example Output:
 * | Skill | Category | Agents Using | Description |
 * |-------|----------|--------------|-------------|
 * | github-code-review | GitHub | reviewer | Code review automation |
 */
export function formatSkillsSection(
  skills: Skill[],
  agents: Agent[] = [],
  options: FormatterOptions = {}
): string {
  if (skills.length === 0) {
    return '';
  }

  const { compact = false, includeDetails = true } = options;
  const lines: string[] = [];

  // Build skill-to-agents mapping (simplified - would need real data)
  const skillToAgents = new Map<string, string[]>();

  // Summary table
  lines.push('| Skill | Category | Agents Using | Description |');
  lines.push('|-------|----------|--------------|-------------|');

  for (const skill of skills) {
    const category = inferSkillCategory(skill);
    const agentsUsing = skillToAgents.get(skill.name)?.join(', ') || '-';
    const description = escapeTableCell(sanitize(truncate(skill.description ?? '-', 40)));

    lines.push(`| ${sanitize(skill.name)} | ${category} | ${agentsUsing} | ${description} |`);
  }

  // Collapsible details section
  if (!compact && includeDetails && skills.length > 0) {
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>\u26A1 Skill Details</summary>');
    lines.push('');

    for (const skill of skills) {
      lines.push(`### ${sanitize(skill.name)}`);
      lines.push('');

      const statusIcon = getStatusIcon(skill.enabled);
      lines.push(`**Status:** ${statusIcon} ${skill.enabled === false ? 'Disabled' : 'Enabled'}`);
      lines.push(`**Path:** \`${sanitize(skill.path)}\``);
      lines.push('');

      if (skill.description) {
        lines.push(sanitizeMarkdown(skill.description));
        lines.push('');
      }

      if (skill.triggers && skill.triggers.length > 0) {
        lines.push('**Triggers:**');
        for (const trigger of skill.triggers) {
          lines.push(`- \`${sanitize(trigger)}\``);
        }
        lines.push('');
      }

      if (skill.dependencies && skill.dependencies.length > 0) {
        lines.push('**Dependencies:**');
        for (const dep of skill.dependencies) {
          lines.push(`- ${sanitize(dep)}`);
        }
        lines.push('');
      }
    }

    lines.push('</details>');
  }

  return lines.join('\n');
}

/**
 * Infers skill category from skill properties
 */
function inferSkillCategory(skill: Skill): string {
  const nameLower = skill.name.toLowerCase();

  if (nameLower.includes('github')) return 'GitHub';
  if (nameLower.includes('sparc')) return 'SPARC';
  if (nameLower.includes('pair') || nameLower.includes('dev')) return 'Development';
  if (nameLower.includes('test') || nameLower.includes('verif')) return 'Testing';
  if (nameLower.includes('browser') || nameLower.includes('automat')) return 'Automation';
  if (nameLower.includes('security')) return 'Security';

  return 'General';
}

// ============================================================================
// Quick Stats Formatter
// ============================================================================

export interface QuickStatsInput {
  agents: number;
  skills: number;
  mcpServers: number;
  hooks: number;
  commands: number;
  plugins: number;
  permissions: number;
}

/**
 * Generates the quick stats table for documentation header
 *
 * @example Output:
 * | Component | Count | Details |
 * |-----------|------:|---------|
 * | Agents | 14 | [View all ->#agents-comparison] |
 */
export function formatQuickStats(stats: QuickStatsInput): string {
  const lines: string[] = [];

  lines.push('| Component | Count | Details |');
  lines.push('|-----------|------:|---------|');

  if (stats.agents > 0) {
    lines.push(`| \u{1F916} Agents | ${stats.agents} | [View all \u2192](#agents-comparison) |`);
  }
  if (stats.skills > 0) {
    lines.push(`| \u26A1 Skills | ${stats.skills} | [View all \u2192](#skills) |`);
  }
  if (stats.mcpServers > 0) {
    lines.push(`| \u{1F50C} MCP Servers | ${stats.mcpServers} | [View all \u2192](#mcp-servers) |`);
  }
  if (stats.hooks > 0) {
    lines.push(`| \u{1FA9D} Hooks | ${stats.hooks} | [View all \u2192](#hooks) |`);
  }
  if (stats.commands > 0) {
    lines.push(`| \u2318 Commands | ${stats.commands} | [View all \u2192](#commands) |`);
  }
  if (stats.plugins > 0) {
    lines.push(`| \u{1F9E9} Plugins | ${stats.plugins} | [View all \u2192](#plugins) |`);
  }
  if (stats.permissions > 0) {
    lines.push(`| \u{1F510} Permissions | ${stats.permissions} | [View all \u2192](#permissions) |`);
  }

  return lines.join('\n');
}

// ============================================================================
// Delegation Hierarchy Formatter
// ============================================================================

/**
 * Generates a collapsible delegation hierarchy section with Mermaid diagram
 *
 * Shows only agents with delegations (not standalone agents)
 *
 * @example Output:
 * <details>
 * <summary>📊 Click to expand hierarchy</summary>
 *
 * ```mermaid
 * graph TB
 *   planner --> coder
 *   planner --> tester
 * ```
 * </details>
 */
export function generateDelegationHierarchy(agents: Agent[]): string {
  // Filter agents that have delegations or are delegated to
  const agentNames = new Set(agents.map(a => a.name));
  const delegatedToAgents = new Set<string>();

  agents.forEach(agent => {
    agent.delegatesTo?.forEach(target => {
      if (agentNames.has(target)) {
        delegatedToAgents.add(target);
      }
    });
  });

  const relevantAgents = agents.filter(
    agent => (agent.delegatesTo && agent.delegatesTo.length > 0) || delegatedToAgents.has(agent.name)
  );

  if (relevantAgents.length === 0) {
    return '';
  }

  const lines: string[] = [];

  lines.push('<details>');
  lines.push('<summary>\u{1F4CA} Click to expand delegation hierarchy</summary>');
  lines.push('');
  lines.push('```mermaid');
  lines.push('graph TB');

  // Generate delegation arrows
  const delegations: string[] = [];
  for (const agent of agents) {
    if (agent.delegatesTo && agent.delegatesTo.length > 0) {
      for (const target of agent.delegatesTo) {
        if (agentNames.has(target)) {
          const fromId = sanitize(agent.name).replace(/[^a-zA-Z0-9]/g, '_');
          const toId = sanitize(target).replace(/[^a-zA-Z0-9]/g, '_');
          delegations.push(`    ${fromId}["${sanitize(agent.name)}"] --> ${toId}["${sanitize(target)}"]`);
        }
      }
    }
  }

  lines.push(...delegations);
  lines.push('');

  // Add class definitions
  lines.push('    %% Styling');
  lines.push('    classDef coord fill:#e1f5fe,stroke:#01579b,color:#01579b,stroke-width:3px');
  lines.push('    classDef worker fill:#f3e5f5,stroke:#4a148c,color:#4a148c,stroke-width:2px');
  lines.push('    classDef specialist fill:#e8f5e9,stroke:#1b5e20,color:#1b5e20,stroke-width:2px');
  lines.push('    classDef reviewer fill:#fff3e0,stroke:#e65100,color:#e65100,stroke-width:2px');
  lines.push('');

  // Apply classes to agents
  const coordAgents = agents.filter(a => a.type === 'coordinator').map(a => sanitize(a.name).replace(/[^a-zA-Z0-9]/g, '_'));
  const workerAgents = agents.filter(a => a.type === 'worker').map(a => sanitize(a.name).replace(/[^a-zA-Z0-9]/g, '_'));
  const specialistAgents = agents.filter(a => a.type === 'specialist').map(a => sanitize(a.name).replace(/[^a-zA-Z0-9]/g, '_'));
  const reviewerAgents = agents.filter(a => a.type === 'reviewer').map(a => sanitize(a.name).replace(/[^a-zA-Z0-9]/g, '_'));

  if (coordAgents.length > 0) {
    lines.push(`    class ${coordAgents.join(',')} coord`);
  }
  if (workerAgents.length > 0) {
    lines.push(`    class ${workerAgents.join(',')} worker`);
  }
  if (specialistAgents.length > 0) {
    lines.push(`    class ${specialistAgents.join(',')} specialist`);
  }
  if (reviewerAgents.length > 0) {
    lines.push(`    class ${reviewerAgents.join(',')} reviewer`);
  }

  lines.push('```');
  lines.push('');

  // Add shared workers note if any agents are delegated to by multiple parents
  const sharedWorkers = findSharedWorkers(agents);
  if (sharedWorkers.length > 0) {
    const workerNames = sharedWorkers.map(w => `\`${sanitize(w.name)}\``).join(' and ');
    const parentNames = sharedWorkers
      .map(w => `\`${sanitize(w.name)}\` from ${w.parents.map(p => `\`${sanitize(p)}\``).join(', ')}`)
      .join('; ');
    lines.push(`**Shared workers:** ${workerNames} accept tasks from multiple coordinators.`);
    lines.push('');
  }

  lines.push('</details>');

  return lines.join('\n');
}

/**
 * Finds agents that are delegated to by multiple parents
 */
function findSharedWorkers(agents: Agent[]): Array<{ name: string; parents: string[] }> {
  const parentMap = new Map<string, string[]>();

  for (const agent of agents) {
    if (agent.delegatesTo) {
      for (const target of agent.delegatesTo) {
        if (!parentMap.has(target)) {
          parentMap.set(target, []);
        }
        parentMap.get(target)!.push(agent.name);
      }
    }
  }

  const shared: Array<{ name: string; parents: string[] }> = [];
  for (const [name, parents] of parentMap.entries()) {
    if (parents.length > 1) {
      shared.push({ name, parents });
    }
  }

  return shared;
}

// ============================================================================
// Exports
// ============================================================================

export {
  sanitize,
  truncate,
  escapeTableCell,
  getStatusIcon,
  formatTimeout,
  toAnchorId,
};
