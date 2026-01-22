/**
 * Test Fixture Generator for AgentScope Benchmarks
 *
 * Generates sample agent configurations of various sizes for performance testing.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Agent, Skill, Hook, MCPServer, AgentScopeConfig } from '../../src/model/types.js';

export interface FixtureOptions {
  agentCount: number;
  skillCount: number;
  hookCount: number;
  mcpServerCount: number;
  toolsPerServer: number;
  skillsPerAgent: number;
}

export const FIXTURE_PRESETS = {
  minimal: {
    agentCount: 1,
    skillCount: 1,
    hookCount: 0,
    mcpServerCount: 1,
    toolsPerServer: 2,
    skillsPerAgent: 1,
  } as FixtureOptions,

  small: {
    agentCount: 5,
    skillCount: 3,
    hookCount: 2,
    mcpServerCount: 2,
    toolsPerServer: 5,
    skillsPerAgent: 2,
  } as FixtureOptions,

  typical: {
    agentCount: 10,
    skillCount: 8,
    hookCount: 5,
    mcpServerCount: 4,
    toolsPerServer: 10,
    skillsPerAgent: 3,
  } as FixtureOptions,

  large: {
    agentCount: 50,
    skillCount: 30,
    hookCount: 20,
    mcpServerCount: 10,
    toolsPerServer: 20,
    skillsPerAgent: 5,
  } as FixtureOptions,

  stress: {
    agentCount: 100,
    skillCount: 60,
    hookCount: 40,
    mcpServerCount: 20,
    toolsPerServer: 30,
    skillsPerAgent: 8,
  } as FixtureOptions,

  extreme: {
    agentCount: 200,
    skillCount: 100,
    hookCount: 80,
    mcpServerCount: 50,
    toolsPerServer: 50,
    skillsPerAgent: 10,
  } as FixtureOptions,
};

/**
 * Generates a complete AgentScope configuration fixture
 */
export function generateConfig(options: FixtureOptions): AgentScopeConfig {
  const skills = generateSkills(options.skillCount);
  const skillIds = skills.map(s => s.id);

  return {
    meta: {
      name: 'benchmark-fixture',
      version: '1.0.0',
      scanDate: new Date().toISOString(),
      projectPath: '/benchmark/fixture',
      componentCount:
        options.agentCount +
        options.skillCount +
        options.hookCount +
        options.mcpServerCount,
    },
    agents: generateAgents(options.agentCount, skillIds, options.skillsPerAgent),
    skills,
    hooks: generateHooks(options.hookCount),
    commands: [],
    mcpServers: generateMCPServers(options.mcpServerCount, options.toolsPerServer),
    settings: {
      projectSettings: {},
      userSettings: {},
    },
    errors: [],
  };
}

/**
 * Generates sample agents
 */
function generateAgents(count: number, skillIds: string[], skillsPerAgent: number): Agent[] {
  const agents: Agent[] = [];

  for (let i = 0; i < count; i++) {
    const agentSkills: string[] = [];
    for (let j = 0; j < Math.min(skillsPerAgent, skillIds.length); j++) {
      agentSkills.push(skillIds[(i + j) % skillIds.length]);
    }

    agents.push({
      id: `agent-${i}`,
      name: `Agent ${i}`,
      description: `Benchmark agent number ${i} for performance testing. This agent handles ${getAgentRole(i)} tasks and coordinates with other agents in the system.`,
      source: i % 3 === 0 ? 'user' : 'project',
      sourcePath: i % 3 === 0 ? `~/.claude/agents/agent-${i}.md` : `.claude/agents/agent-${i}.md`,
      allowedTools: generateToolsList(5 + (i % 10)),
      skills: agentSkills,
      configSnippet: generateAgentConfigSnippet(i),
    });
  }

  return agents;
}

/**
 * Generates sample skills
 */
function generateSkills(count: number): Skill[] {
  const skills: Skill[] = [];

  for (let i = 0; i < count; i++) {
    skills.push({
      id: `skill-${i}`,
      name: `Skill ${i}`,
      description: `Benchmark skill number ${i} for performance testing. Provides ${getSkillCapability(i)} capabilities.`,
      source: i % 4 === 0 ? 'user' : 'project',
      sourcePath: i % 4 === 0 ? `~/.claude/skills/skill-${i}.md` : `.claude/skills/skill-${i}.md`,
      configSnippet: generateSkillConfigSnippet(i),
    });
  }

  return skills;
}

/**
 * Generates sample hooks
 */
function generateHooks(count: number): Hook[] {
  const hooks: Hook[] = [];
  const triggers = ['pre-commit', 'post-commit', 'pre-push', 'post-push', 'pre-task', 'post-task'];

  for (let i = 0; i < count; i++) {
    hooks.push({
      id: `hook-${i}`,
      name: `Hook ${i}`,
      trigger: triggers[i % triggers.length],
      description: `Benchmark hook number ${i} triggered on ${triggers[i % triggers.length]} events.`,
      source: 'project',
      sourcePath: `.claude/hooks/hook-${i}.js`,
      configSnippet: generateHookConfigSnippet(i, triggers[i % triggers.length]),
    });
  }

  return hooks;
}

/**
 * Generates sample MCP servers
 */
function generateMCPServers(count: number, toolsPerServer: number): MCPServer[] {
  const servers: MCPServer[] = [];
  const serverTypes = ['filesystem', 'github', 'database', 'api', 'cache', 'logging'];

  for (let i = 0; i < count; i++) {
    const serverType = serverTypes[i % serverTypes.length];
    servers.push({
      id: `mcp-${serverType}-${i}`,
      name: `${serverType}-mcp-${i}`,
      command: `npx`,
      args: ['-y', `@modelcontextprotocol/server-${serverType}`],
      env: {
        [`${serverType.toUpperCase()}_API_KEY`]: '${API_KEY}',
      },
      tools: generateMCPTools(toolsPerServer, serverType),
      source: '.mcp.json',
    });
  }

  return servers;
}

/**
 * Generates MCP tools for a server
 */
function generateMCPTools(count: number, serverType: string): Array<{ name: string; description?: string }> {
  const tools: Array<{ name: string; description?: string }> = [];

  for (let i = 0; i < count; i++) {
    tools.push({
      name: `${serverType}_tool_${i}`,
      description: `Tool ${i} for ${serverType} operations. Handles ${getToolAction(i)} functionality.`,
    });
  }

  return tools;
}

/**
 * Helper to generate a list of tool names
 */
function generateToolsList(count: number): string[] {
  const baseTools = [
    'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
    'WebFetch', 'WebSearch', 'Task', 'TodoWrite',
    'mcp__github__create_issue', 'mcp__github__create_pr',
    'mcp__filesystem__read_file', 'mcp__filesystem__write_file',
    'mcp__database__query', 'mcp__database__execute',
  ];

  return baseTools.slice(0, Math.min(count, baseTools.length));
}

/**
 * Generates realistic agent config snippet
 */
function generateAgentConfigSnippet(index: number): string {
  return `---
name: Agent ${index}
description: Benchmark agent for performance testing
model: claude-3-sonnet
temperature: 0.7
maxTokens: 4096
systemPrompt: |
  You are a helpful assistant specialized in ${getAgentRole(index)} tasks.
  Follow best practices and provide clear explanations.
---`;
}

/**
 * Generates realistic skill config snippet
 */
function generateSkillConfigSnippet(index: number): string {
  return `---
name: Skill ${index}
description: Provides ${getSkillCapability(index)} capabilities
trigger: /skill-${index}
---

## Instructions
This skill enables ${getSkillCapability(index)} functionality.
Use it when you need to ${getSkillAction(index)}.`;
}

/**
 * Generates realistic hook config snippet
 */
function generateHookConfigSnippet(index: number, trigger: string): string {
  return `module.exports = {
  name: 'hook-${index}',
  trigger: '${trigger}',
  handler: async (context) => {
    // Hook implementation for ${trigger}
    console.log('Hook ${index} triggered');
    return { success: true };
  }
};`;
}

/**
 * Helper functions for realistic content
 */
function getAgentRole(index: number): string {
  const roles = [
    'code review', 'testing', 'documentation', 'refactoring',
    'security analysis', 'performance optimization', 'debugging',
    'API design', 'database management', 'DevOps',
  ];
  return roles[index % roles.length];
}

function getSkillCapability(index: number): string {
  const capabilities = [
    'code generation', 'test automation', 'documentation writing',
    'code analysis', 'security scanning', 'performance profiling',
    'error handling', 'API integration', 'data transformation',
  ];
  return capabilities[index % capabilities.length];
}

function getSkillAction(index: number): string {
  const actions = [
    'generate boilerplate code', 'create comprehensive tests',
    'write technical documentation', 'analyze code quality',
    'scan for vulnerabilities', 'profile application performance',
  ];
  return actions[index % actions.length];
}

function getToolAction(index: number): string {
  const actions = [
    'read', 'write', 'update', 'delete', 'query',
    'analyze', 'transform', 'validate', 'sync', 'export',
  ];
  return actions[index % actions.length];
}

/**
 * Writes fixture files to disk for realistic scanning benchmarks
 */
export async function writeFixtureToDisk(
  basePath: string,
  options: FixtureOptions
): Promise<void> {
  const config = generateConfig(options);

  // Create directories
  const dirs = [
    path.join(basePath, '.claude', 'agents'),
    path.join(basePath, '.claude', 'skills'),
    path.join(basePath, '.claude', 'hooks'),
  ];

  for (const dir of dirs) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  // Write agent files
  for (const agent of config.agents) {
    if (agent.source === 'project') {
      const agentPath = path.join(basePath, agent.sourcePath);
      await fs.promises.writeFile(agentPath, agent.configSnippet);
    }
  }

  // Write skill files
  for (const skill of config.skills) {
    if (skill.source === 'project') {
      const skillPath = path.join(basePath, skill.sourcePath);
      await fs.promises.writeFile(skillPath, skill.configSnippet);
    }
  }

  // Write hook files
  for (const hook of config.hooks) {
    const hookPath = path.join(basePath, hook.sourcePath);
    await fs.promises.writeFile(hookPath, hook.configSnippet);
  }

  // Write MCP config
  const mcpConfig = {
    mcpServers: Object.fromEntries(
      config.mcpServers.map(server => [
        server.name,
        {
          command: server.command,
          args: server.args,
          env: server.env,
        },
      ])
    ),
  };
  await fs.promises.writeFile(
    path.join(basePath, '.mcp.json'),
    JSON.stringify(mcpConfig, null, 2)
  );

  // Write CLAUDE.md
  const claudeMd = generateClaudeMd(config);
  await fs.promises.writeFile(path.join(basePath, 'CLAUDE.md'), claudeMd);
}

/**
 * Generates a CLAUDE.md file content
 */
function generateClaudeMd(config: AgentScopeConfig): string {
  return `# Claude Code Configuration

## Agents
${config.agents.map(a => `- ${a.name}: ${a.description.slice(0, 50)}...`).join('\n')}

## Skills
${config.skills.map(s => `- ${s.name}: ${s.description.slice(0, 50)}...`).join('\n')}

## Hooks
${config.hooks.map(h => `- ${h.name} (${h.trigger})`).join('\n')}

## MCP Servers
${config.mcpServers.map(m => `- ${m.name}: ${m.tools.length} tools`).join('\n')}

## Statistics
- Total Agents: ${config.agents.length}
- Total Skills: ${config.skills.length}
- Total Hooks: ${config.hooks.length}
- Total MCP Servers: ${config.mcpServers.length}
- Total Components: ${config.meta.componentCount}
`;
}

/**
 * Cleans up fixture directory
 */
export async function cleanupFixture(basePath: string): Promise<void> {
  await fs.promises.rm(basePath, { recursive: true, force: true });
}

/**
 * Gets the total component count for a fixture
 */
export function getComponentCount(options: FixtureOptions): number {
  return (
    options.agentCount +
    options.skillCount +
    options.hookCount +
    options.mcpServerCount
  );
}
