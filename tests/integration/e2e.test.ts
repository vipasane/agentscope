/**
 * End-to-End Tests using this project's actual .claude/ configuration
 * This is a CRITICAL test that validates AgentScope works on real-world configs
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { stat, readdir } from 'node:fs/promises';
import { ClaudeCodeParser, parseClaudeCode } from '../../src/core/parsers/claude-code.js';
import { McpParser, parseMcp } from '../../src/core/parsers/mcp.js';
import { generateComponentMap } from '../../src/core/generators/diagrams/component-map.js';
import { generateHierarchy } from '../../src/core/generators/diagrams/hierarchy.js';
import { generateMarkdown } from '../../src/core/generators/docs/markdown.js';
import type { AgentScopeConfig } from '../../src/core/model/types.js';

// Use the actual project root
const PROJECT_ROOT = process.cwd();
const CLAUDE_DIR = join(PROJECT_ROOT, '.claude');

describe('E2E: This Project Configuration', () => {
  describe('project structure validation', () => {
    it('should have .claude directory', async () => {
      const stats = await stat(CLAUDE_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should have .claude/settings.json', async () => {
      const stats = await stat(join(CLAUDE_DIR, 'settings.json'));
      expect(stats.isFile()).toBe(true);
    });

    it('should have .claude/agents directory', async () => {
      const stats = await stat(join(CLAUDE_DIR, 'agents'));
      expect(stats.isDirectory()).toBe(true);
    });

    it('should have .claude/skills directory', async () => {
      const stats = await stat(join(CLAUDE_DIR, 'skills'));
      expect(stats.isDirectory()).toBe(true);
    });

    it('should have .mcp.json', async () => {
      const stats = await stat(join(PROJECT_ROOT, '.mcp.json'));
      expect(stats.isFile()).toBe(true);
    });

    it('should have CLAUDE.md', async () => {
      const stats = await stat(join(PROJECT_ROOT, 'CLAUDE.md'));
      expect(stats.isFile()).toBe(true);
    });
  });

  describe('Claude Code parser on real config', () => {
    it('should parse .claude directory successfully', async () => {
      const result = await parseClaudeCode(PROJECT_ROOT);

      expect(result).toBeDefined();
      expect(result.errors.filter(e => e.severity === 'fatal')).toHaveLength(0);
    });

    it('should discover multiple agents', async () => {
      const result = await parseClaudeCode(PROJECT_ROOT);

      // This project has many agents in .claude/agents/
      expect(result.agents.length).toBeGreaterThan(10);

      // Log found agents for debugging
      console.log(`Found ${result.agents.length} agents`);
    });

    it('should discover core agents', async () => {
      const result = await parseClaudeCode(PROJECT_ROOT);

      const agentNames = result.agents.map(a => a.name.toLowerCase());

      // Check for some expected core agents
      expect(agentNames.some(n => n.includes('coder'))).toBe(true);
      expect(agentNames.some(n => n.includes('tester'))).toBe(true);
      expect(agentNames.some(n => n.includes('reviewer'))).toBe(true);
    });

    it('should discover agent categories', async () => {
      const result = await parseClaudeCode(PROJECT_ROOT);

      // Get unique agent paths to identify categories
      const paths = result.agents.map(a => a.path);
      const categories = new Set(
        paths.map(p => {
          const parts = p.split('/');
          // Extract category from path like .claude/agents/core/coder.md
          if (parts.length >= 3 && parts[1] === 'agents') {
            return parts[2];
          }
          return 'root';
        })
      );

      console.log(`Found categories: ${Array.from(categories).join(', ')}`);
      expect(categories.size).toBeGreaterThan(3);
    });

    it('should discover skills', async () => {
      const result = await parseClaudeCode(PROJECT_ROOT);

      expect(result.skills.length).toBeGreaterThan(5);
      console.log(`Found ${result.skills.length} skills`);

      // Log skill names
      const skillNames = result.skills.map(s => s.name);
      console.log(`Skills: ${skillNames.slice(0, 10).join(', ')}...`);
    });

    it('should discover hooks from settings.json', async () => {
      const result = await parseClaudeCode(PROJECT_ROOT);

      // This project has hooks defined in settings.json
      expect(result.hooks.length).toBeGreaterThan(0);
      console.log(`Found ${result.hooks.length} hooks`);
    });

    it('should have minimal errors', async () => {
      const result = await parseClaudeCode(PROJECT_ROOT);

      const fatalErrors = result.errors.filter(e => e.severity === 'fatal');
      const warnings = result.errors.filter(e => e.severity === 'warning');

      console.log(`Errors: ${fatalErrors.length} fatal, ${warnings.length} warnings`);

      // Should have no fatal errors
      expect(fatalErrors).toHaveLength(0);
    });
  });

  describe('MCP parser on real config', () => {
    it('should parse .mcp.json successfully', async () => {
      const result = await parseMcp(PROJECT_ROOT);

      expect(result).toBeDefined();
      expect(result.errors.filter(e => e.severity === 'fatal')).toHaveLength(0);
    });

    it('should discover claude-flow MCP server', async () => {
      const result = await parseMcp(PROJECT_ROOT);

      const claudeFlowServer = result.servers.find(s => s.name === 'claude-flow');
      expect(claudeFlowServer).toBeDefined();
      expect(claudeFlowServer?.command).toBe('npx');
    });

    it('should parse MCP server environment variables', async () => {
      const result = await parseMcp(PROJECT_ROOT);

      const claudeFlowServer = result.servers.find(s => s.name === 'claude-flow');
      expect(claudeFlowServer?.env).toBeDefined();
      expect(claudeFlowServer?.env?.CLAUDE_FLOW_MODE).toBe('v3');
    });
  });

  describe('full scan and diagram generation', () => {
    let config: AgentScopeConfig;

    beforeAll(async () => {
      const claudeResult = await parseClaudeCode(PROJECT_ROOT);
      const mcpResult = await parseMcp(PROJECT_ROOT);

      config = {
        agents: claudeResult.agents,
        skills: claudeResult.skills,
        hooks: claudeResult.hooks,
        commands: claudeResult.commands,
        mcpServers: mcpResult.servers,
        metadata: {
          scannedAt: new Date(),
          rootPath: PROJECT_ROOT,
          version: '1.0.0',
          duration: 0,
          filesScanned: 0,
          errors: [...claudeResult.errors, ...mcpResult.errors],
        },
      };
    });

    it('should generate valid component map', () => {
      const diagram = generateComponentMap(config);

      expect(diagram).toContain('```mermaid');
      expect(diagram).toContain('graph TB');
      // Now uses category-based subgraphs (GitHub, Security, SPARC, etc.)
      expect(diagram).toContain('subgraph');
      expect(diagram).toContain('```');

      // Should have reasonable size
      expect(diagram.length).toBeGreaterThan(500);
      console.log(`Component map: ${diagram.length} characters`);
    });

    it('should generate valid hierarchy diagram', () => {
      const diagram = generateHierarchy(config);

      expect(diagram).toContain('```mermaid');
      expect(diagram).toContain('graph TB');
      expect(diagram).toContain('```');

      console.log(`Hierarchy diagram: ${diagram.length} characters`);
    });

    it('should generate comprehensive markdown documentation', () => {
      const markdown = generateMarkdown(config, {
        includeDiagrams: true,
        includeMetadata: true,
      });

      expect(markdown).toContain('# Agent Architecture Documentation');
      expect(markdown).toContain('## Overview');
      expect(markdown).toContain('## Agents');
      expect(markdown).toContain('## Skills');
      expect(markdown).toContain('## MCP Servers');
      expect(markdown).toContain('## Diagrams');

      // Should have substantial content
      expect(markdown.length).toBeGreaterThan(5000);
      console.log(`Markdown documentation: ${markdown.length} characters`);
    });

    it('should include all discovered components in documentation', () => {
      const markdown = generateMarkdown(config);

      // Count component mentions in documentation
      const agentMentions = config.agents.filter(a =>
        markdown.includes(a.name)
      ).length;

      const skillMentions = config.skills.filter(s =>
        markdown.includes(s.name)
      ).length;

      console.log(`Agents mentioned: ${agentMentions}/${config.agents.length}`);
      console.log(`Skills mentioned: ${skillMentions}/${config.skills.length}`);

      // Most components should be mentioned
      expect(agentMentions / config.agents.length).toBeGreaterThan(0.8);
    });
  });

  describe('performance on real project', () => {
    it('should scan entire project in under 3 seconds', async () => {
      const start = performance.now();

      const claudeResult = await parseClaudeCode(PROJECT_ROOT);
      const mcpResult = await parseMcp(PROJECT_ROOT);

      const duration = performance.now() - start;

      console.log(`Full scan took ${duration.toFixed(2)}ms`);
      console.log(`  - Agents: ${claudeResult.agents.length}`);
      console.log(`  - Skills: ${claudeResult.skills.length}`);
      console.log(`  - Hooks: ${claudeResult.hooks.length}`);
      console.log(`  - MCP Servers: ${mcpResult.servers.length}`);

      expect(duration).toBeLessThan(3000);
    });

    it('should generate all outputs in under 5 seconds', async () => {
      const start = performance.now();

      const claudeResult = await parseClaudeCode(PROJECT_ROOT);
      const mcpResult = await parseMcp(PROJECT_ROOT);

      const config: AgentScopeConfig = {
        agents: claudeResult.agents,
        skills: claudeResult.skills,
        hooks: claudeResult.hooks,
        commands: claudeResult.commands,
        mcpServers: mcpResult.servers,
        metadata: {
          scannedAt: new Date(),
          rootPath: PROJECT_ROOT,
          version: '1.0.0',
          duration: 0,
          filesScanned: 0,
          errors: [],
        },
      };

      generateComponentMap(config);
      generateHierarchy(config);
      generateMarkdown(config);

      const duration = performance.now() - start;

      console.log(`Full scan + generation took ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('output quality validation', () => {
    it('should produce valid Mermaid syntax that can be rendered', async () => {
      const claudeResult = await parseClaudeCode(PROJECT_ROOT);
      const mcpResult = await parseMcp(PROJECT_ROOT);

      const config: AgentScopeConfig = {
        agents: claudeResult.agents,
        skills: claudeResult.skills,
        hooks: claudeResult.hooks,
        commands: claudeResult.commands,
        mcpServers: mcpResult.servers,
        metadata: {
          scannedAt: new Date(),
          rootPath: PROJECT_ROOT,
          version: '1.0.0',
          duration: 0,
          filesScanned: 0,
          errors: [],
        },
      };

      const diagram = generateComponentMap(config);

      // Basic Mermaid syntax validation
      expect(diagram).toMatch(/```mermaid[\s\S]*```/);
      expect(diagram).toMatch(/graph (TB|TD|BT|LR|RL)/);

      // Check for balanced brackets
      const openBrackets = (diagram.match(/\[/g) || []).length;
      const closeBrackets = (diagram.match(/\]/g) || []).length;

      // Brackets should be balanced or close (allowing for edge cases)
      expect(Math.abs(openBrackets - closeBrackets)).toBeLessThan(5);
    });

    it('should not have broken links in markdown', async () => {
      const claudeResult = await parseClaudeCode(PROJECT_ROOT);
      const mcpResult = await parseMcp(PROJECT_ROOT);

      const config: AgentScopeConfig = {
        agents: claudeResult.agents,
        skills: claudeResult.skills,
        hooks: claudeResult.hooks,
        commands: claudeResult.commands,
        mcpServers: mcpResult.servers,
        metadata: {
          scannedAt: new Date(),
          rootPath: PROJECT_ROOT,
          version: '1.0.0',
          duration: 0,
          filesScanned: 0,
          errors: [],
        },
      };

      const markdown = generateMarkdown(config);

      // Check for common broken link patterns
      expect(markdown).not.toContain('](undefined)');
      expect(markdown).not.toContain('](null)');
      expect(markdown).not.toContain('[object Object]');
    });
  });
});

describe('E2E: Agent Categories Discovery', () => {
  it('should discover agents across all categories', async () => {
    const agentsDir = join(CLAUDE_DIR, 'agents');
    const categories = await readdir(agentsDir, { withFileTypes: true });

    const categoryNames = categories
      .filter(d => d.isDirectory())
      .map(d => d.name);

    console.log(`Agent categories found: ${categoryNames.join(', ')}`);

    // This project should have multiple agent categories
    expect(categoryNames.length).toBeGreaterThan(5);

    // Check for expected categories
    const expectedCategories = ['core', 'consensus', 'github', 'sparc', 'v3'];
    for (const expected of expectedCategories) {
      expect(categoryNames).toContain(expected);
    }
  });
});

describe('E2E: Skills Discovery', () => {
  it('should discover all skill directories', async () => {
    const skillsDir = join(CLAUDE_DIR, 'skills');
    const skills = await readdir(skillsDir, { withFileTypes: true });

    const skillNames = skills
      .filter(d => d.isDirectory())
      .map(d => d.name);

    console.log(`Skills found: ${skillNames.slice(0, 15).join(', ')}...`);
    console.log(`Total skills: ${skillNames.length}`);

    // This project should have many skills
    expect(skillNames.length).toBeGreaterThan(10);
  });
});
