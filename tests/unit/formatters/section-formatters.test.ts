/**
 * Tests for Section Formatters
 *
 * Verifies the markdown output generation for all 7 entity types:
 * - Hooks
 * - Commands
 * - Plugins
 * - Permissions
 * - Agents (comparison table, capabilities matrix)
 * - MCP Servers
 * - Skills
 */

import { describe, it, expect } from 'vitest';
import {
  formatHooksSection,
  formatCommandsSection,
  formatPluginsSection,
  formatPermissionsSection,
  formatAgentsComparisonTable,
  formatAgentsCapabilitiesMatrix,
  formatMcpServersSection,
  formatSkillsSection,
  formatQuickStats,
} from '../../../src/core/formatters/output/section-formatters.js';
import type {
  Hook,
  Command,
  Plugin,
  PermissionSummary,
  Agent,
  McpServer,
  Skill,
} from '../../../src/core/model/types.js';

describe('formatHooksSection', () => {
  it('should format hooks with summary table', () => {
    const hooks: Hook[] = [
      {
        event: 'PreToolUse',
        path: './hooks/pre-tool.sh',
        command: 'node validate.js',
        timeout: 10000,
        enabled: true,
      },
      {
        event: 'PostToolUse',
        path: './hooks/post-tool.sh',
        command: 'node log.js',
        enabled: false,
      },
    ];

    const result = formatHooksSection(hooks);

    expect(result).toContain('| Event | Matcher | Type | Timeout | Status |');
    expect(result).toContain('PreToolUse');
    expect(result).toContain('PostToolUse');
    expect(result).toContain('10s');
    expect(result).toContain('\u{1F7E2}'); // green circle for enabled
    expect(result).toContain('\u{1F534}'); // red circle for disabled
  });

  it('should include collapsible details when not compact', () => {
    const hooks: Hook[] = [
      {
        event: 'PreToolUse',
        path: './hooks/pre-tool.sh',
        command: 'node validate.js',
      },
    ];

    const result = formatHooksSection(hooks, { compact: false, includeDetails: true });

    expect(result).toContain('<details>');
    expect(result).toContain('</details>');
    expect(result).toContain('Hook Details');
  });

  it('should not include details when compact', () => {
    const hooks: Hook[] = [
      {
        event: 'PreToolUse',
        path: './hooks/pre-tool.sh',
      },
    ];

    const result = formatHooksSection(hooks, { compact: true });

    expect(result).not.toContain('<details>');
  });

  it('should return empty string for empty hooks array', () => {
    const result = formatHooksSection([]);
    expect(result).toBe('');
  });
});

describe('formatCommandsSection', () => {
  it('should format commands with tool permissions', () => {
    const commands: Command[] = [
      {
        name: '/commit',
        description: 'Create git commit with AI message',
        allowedTools: ['Bash', 'Read'],
        disallowedTools: ['Write', 'Edit'],
      },
      {
        name: '/review-pr',
        description: 'Review pull request changes',
        allowedTools: ['Read', 'Grep', 'Glob'],
        disallowedTools: ['Bash'],
      },
    ];

    const result = formatCommandsSection(commands);

    expect(result).toContain('| Command | Description | Allowed Tools | Disallowed Tools |');
    expect(result).toContain('/commit');
    expect(result).toContain('/review-pr');
    expect(result).toContain('Bash, Read');
    expect(result).toContain('Write, Edit');
  });

  it('should include collapsible details', () => {
    const commands: Command[] = [
      {
        name: '/test',
        description: 'Run tests',
      },
    ];

    const result = formatCommandsSection(commands, { includeDetails: true });

    expect(result).toContain('<details>');
    expect(result).toContain('Command Details');
  });

  it('should return empty string for empty commands array', () => {
    const result = formatCommandsSection([]);
    expect(result).toBe('');
  });
});

describe('formatPluginsSection', () => {
  it('should format plugins with marketplace info', () => {
    const plugins: Plugin[] = [
      {
        id: 'sparc-modes@anthropic',
        name: 'sparc-modes',
        marketplace: 'anthropic',
        enabled: true,
        version: '1.2.0',
        description: 'SPARC methodology modes',
      },
      {
        id: 'github-enhanced@community',
        name: 'github-enhanced',
        marketplace: 'community',
        enabled: true,
        version: '2.0.1',
        description: 'Enhanced GitHub integration',
      },
    ];

    const result = formatPluginsSection(plugins);

    expect(result).toContain('| Plugin | Marketplace | Status | Version | Description |');
    expect(result).toContain('sparc-modes');
    expect(result).toContain('anthropic');
    expect(result).toContain('1.2.0');
    expect(result).toContain('\u{1F7E2}'); // green circle for enabled
  });

  it('should show disabled status', () => {
    const plugins: Plugin[] = [
      {
        id: 'disabled-plugin',
        name: 'disabled-plugin',
        enabled: false,
      },
    ];

    const result = formatPluginsSection(plugins);

    expect(result).toContain('\u{1F534}'); // red circle for disabled
  });

  it('should return empty string for empty plugins array', () => {
    const result = formatPluginsSection([]);
    expect(result).toBe('');
  });
});

describe('formatPermissionsSection', () => {
  it('should format permissions with counts', () => {
    const permissions: PermissionSummary = {
      allowCount: 4,
      denyCount: 2,
      askCount: 2,
      defaultMode: 'default',
      rules: [
        { pattern: 'Bash(npm run:*)', type: 'allow', description: 'Allow npm scripts' },
        { pattern: 'Bash(git *)', type: 'allow', description: 'Allow git commands' },
        { pattern: 'Read(./.env)', type: 'deny', description: 'Block reading env secrets' },
        { pattern: 'Bash(rm *)', type: 'ask', description: 'Confirm file deletions' },
      ],
    };

    const result = formatPermissionsSection(permissions);

    expect(result).toContain('**Default Mode:** `default`');
    expect(result).toContain('**Total Rules:** 8');
    expect(result).toContain('| Type | Count | Description |');
    expect(result).toContain('\u2705 Allow'); // checkmark
    expect(result).toContain('\u274C Deny'); // red X
    expect(result).toContain('\u2753 Ask'); // question mark
  });

  it('should include collapsible rules', () => {
    const permissions: PermissionSummary = {
      allowCount: 1,
      denyCount: 0,
      askCount: 0,
      rules: [
        { pattern: 'Bash(*)', type: 'allow', description: 'Allow all bash' },
      ],
    };

    const result = formatPermissionsSection(permissions, { includeDetails: true });

    expect(result).toContain('<details>');
    expect(result).toContain('Permission Rules');
    expect(result).toContain('Allow Rules (1)');
  });

  it('should include additional directories when rules exist', () => {
    const permissions: PermissionSummary = {
      allowCount: 1,
      denyCount: 0,
      askCount: 0,
      rules: [
        { pattern: 'Bash(*)', type: 'allow', description: 'Allow all bash' },
      ],
      additionalDirectories: ['./scripts', './docs'],
    };

    const result = formatPermissionsSection(permissions, { includeDetails: true });

    expect(result).toContain('Additional Scoped Directories');
    expect(result).toContain('./scripts');
    expect(result).toContain('./docs');
  });
});

describe('formatAgentsComparisonTable', () => {
  it('should format agents in dense table', () => {
    const agents: Agent[] = [
      {
        name: 'pr-manager',
        path: './categories/github.md',
        type: 'coordinator',
        tools: ['github'],
        delegatesTo: ['reviewer', 'coder'],
        description: 'PR lifecycle management',
      },
      {
        name: 'coder',
        path: './categories/development.md',
        type: 'worker',
        tools: ['filesystem'],
        description: 'Code implementation',
      },
    ];

    const result = formatAgentsComparisonTable(agents);

    expect(result).toContain('| Agent | Cat | Type | Delegates To | Tools | Description |');
    expect(result).toContain('pr-manager');
    expect(result).toContain('coder');
    expect(result).toContain('\u{1F451}'); // crown for coordinator
    expect(result).toContain('\u{1F916}'); // robot for worker
    expect(result).toContain('reviewer, coder');
    expect(result).toContain('**Legend:**');
  });

  it('should return empty string for empty agents array', () => {
    const result = formatAgentsComparisonTable([]);
    expect(result).toBe('');
  });
});

describe('formatAgentsCapabilitiesMatrix', () => {
  it('should create capabilities matrix', () => {
    const agents: Agent[] = [
      {
        name: 'coder',
        path: './coder.md',
        type: 'worker',
        description: 'Writes and implements code',
      },
      {
        name: 'reviewer',
        path: './reviewer.md',
        type: 'reviewer',
        description: 'Reviews code changes',
      },
      {
        name: 'tester',
        path: './tester.md',
        type: 'worker',
        description: 'Writes tests',
      },
    ];

    const result = formatAgentsCapabilitiesMatrix(agents);

    expect(result).toContain('| Agent | Writes Code | Reviews | Tests | Deploys | Security |');
    expect(result).toContain('coder');
    expect(result).toContain('reviewer');
    expect(result).toContain('tester');
    expect(result).toContain('\u2713'); // checkmark for capabilities
  });

  it('should return empty string for empty agents array', () => {
    const result = formatAgentsCapabilitiesMatrix([]);
    expect(result).toBe('');
  });
});

describe('formatMcpServersSection', () => {
  it('should format MCP servers with status and transport column', () => {
    const servers: McpServer[] = [
      {
        name: 'claude-flow',
        command: 'npx @claude-flow/cli',
        type: 'stdio',
        disabled: false,
        tools: ['swarm', 'memory', 'agents'],
      },
      {
        name: 'github',
        command: 'npx @github/mcp',
        type: 'stdio',
        disabled: true,
        tools: ['issues', 'prs', 'repos'],
      },
    ];

    const result = formatMcpServersSection(servers);

    expect(result).toContain('| Server | Status | Transport | Command | Tools Provided |');
    expect(result).toContain('claude-flow');
    expect(result).toContain('github');
    expect(result).toContain('\u{1F7E2}'); // green circle for enabled
    expect(result).toContain('\u{1F534}'); // red circle for disabled
    expect(result).toContain('swarm, memory, agents');
    expect(result).toContain('stdio');
  });

  it('should default transport to stdio when type not specified', () => {
    const servers: McpServer[] = [
      {
        name: 'test-server',
        command: 'npx test',
      },
    ];

    const result = formatMcpServersSection(servers);

    expect(result).toContain('stdio');
  });

  it('should include collapsible details with environment variables', () => {
    const servers: McpServer[] = [
      {
        name: 'test-server',
        command: 'npx test',
        env: {
          NORMAL_VAR: 'visible',
        },
      },
    ];

    const result = formatMcpServersSection(servers, { includeDetails: true });

    expect(result).toContain('<details>');
    expect(result).toContain('Server Details');
  });

  it('should mask sensitive environment variables in details', () => {
    const servers: McpServer[] = [
      {
        name: 'test-server',
        command: 'npx test',
        env: {
          API_KEY: 'secret-key-value',
          NORMAL_VAR: 'visible-value',
        },
      },
    ];

    const result = formatMcpServersSection(servers, { includeDetails: true });

    expect(result).toContain('***masked***');
    expect(result).not.toContain('secret-key-value');
    expect(result).toContain('visible-value');
  });

  it('should return empty string for empty servers array', () => {
    const result = formatMcpServersSection([]);
    expect(result).toBe('');
  });
});

describe('formatSkillsSection', () => {
  it('should format skills with category info', () => {
    const skills: Skill[] = [
      {
        name: 'github-code-review',
        path: './skills/github-review.md',
        description: 'Code review automation',
        triggers: ['/review'],
        enabled: true,
      },
      {
        name: 'pair-programming',
        path: './skills/pair.md',
        description: 'Collaborative coding',
        enabled: false,
      },
    ];

    const result = formatSkillsSection(skills);

    expect(result).toContain('| Skill | Category | Agents Using | Description |');
    expect(result).toContain('github-code-review');
    expect(result).toContain('pair-programming');
    expect(result).toContain('GitHub'); // inferred category
    expect(result).toContain('Development'); // inferred category
  });

  it('should include collapsible details', () => {
    const skills: Skill[] = [
      {
        name: 'test-skill',
        path: './test.md',
      },
    ];

    const result = formatSkillsSection(skills, [], { includeDetails: true });

    expect(result).toContain('<details>');
    expect(result).toContain('Skill Details');
  });

  it('should return empty string for empty skills array', () => {
    const result = formatSkillsSection([]);
    expect(result).toBe('');
  });
});

describe('formatQuickStats', () => {
  it('should format quick stats table', () => {
    const result = formatQuickStats({
      agents: 14,
      skills: 5,
      mcpServers: 2,
      hooks: 4,
      commands: 3,
      plugins: 2,
      permissions: 8,
    });

    expect(result).toContain('| Component | Count | Details |');
    expect(result).toContain('\u{1F916} Agents | 14');
    expect(result).toContain('\u26A1 Skills | 5');
    expect(result).toContain('\u{1F50C} MCP Servers | 2');
    expect(result).toContain('\u{1FA9D} Hooks | 4');
    expect(result).toContain('\u2318 Commands | 3');
    expect(result).toContain('\u{1F9E9} Plugins | 2');
    expect(result).toContain('\u{1F510} Permissions | 8');
  });

  it('should skip zero-count items', () => {
    const result = formatQuickStats({
      agents: 5,
      skills: 0,
      mcpServers: 0,
      hooks: 2,
      commands: 0,
      plugins: 0,
      permissions: 0,
    });

    expect(result).toContain('\u{1F916} Agents | 5');
    expect(result).toContain('\u{1FA9D} Hooks | 2');
    expect(result).not.toContain('Skills |');
    expect(result).not.toContain('MCP Servers |');
    expect(result).not.toContain('Commands |');
    expect(result).not.toContain('Plugins |');
    expect(result).not.toContain('Permissions |');
  });
});
