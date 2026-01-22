/**
 * Integration tests for the full scan flow
 * Tests end-to-end scanning of directories and configuration parsing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { ClaudeCodeParser, parseClaudeCode } from '../../src/core/parsers/claude-code.js';
import { McpParser, parseMcp } from '../../src/core/parsers/mcp.js';
import { generateComponentMap } from '../../src/core/generators/diagrams/component-map.js';
import { generateHierarchy } from '../../src/core/generators/diagrams/hierarchy.js';
import { generateMarkdown } from '../../src/core/generators/docs/markdown.js';
import type { AgentScopeConfig } from '../../src/core/model/types.js';

// Test fixtures paths
const FIXTURES_PATH = join(process.cwd(), 'tests', 'fixtures');
const MINIMAL_FIXTURE = join(FIXTURES_PATH, 'minimal');
const COMPLETE_FIXTURE = join(FIXTURES_PATH, 'complete');
const TEMP_FIXTURE = join(FIXTURES_PATH, `temp-scan-test-${process.pid}`);

describe('Full Scan Integration', () => {
  describe('scan minimal fixture', () => {
    it('should scan minimal fixture and produce valid config', async () => {
      // Parse Claude Code configuration
      const claudeResult = await parseClaudeCode(MINIMAL_FIXTURE);

      // Parse MCP configuration
      const mcpResult = await parseMcp(MINIMAL_FIXTURE);

      // Combine into AgentScopeConfig
      const config: AgentScopeConfig = {
        agents: claudeResult.agents,
        skills: claudeResult.skills,
        hooks: claudeResult.hooks,
        commands: claudeResult.commands,
        mcpServers: mcpResult.servers,
        metadata: {
          scannedAt: new Date(),
          rootPath: MINIMAL_FIXTURE,
          version: '1.0.0',
          duration: 0,
          filesScanned: 0,
          errors: [...claudeResult.errors, ...mcpResult.errors],
        },
      };

      // Validate config structure
      expect(config.agents).toBeDefined();
      expect(config.mcpServers).toBeDefined();
      expect(config.metadata.rootPath).toBe(MINIMAL_FIXTURE);
    });

    it('should find expected components in minimal fixture', async () => {
      const claudeResult = await parseClaudeCode(MINIMAL_FIXTURE);
      const mcpResult = await parseMcp(MINIMAL_FIXTURE);

      // Check agents
      expect(claudeResult.agents.length).toBeGreaterThanOrEqual(1);
      expect(claudeResult.agents.some(a => a.name === 'simple-agent')).toBe(true);

      // Check MCP servers
      expect(mcpResult.servers.length).toBeGreaterThanOrEqual(1);
      expect(mcpResult.servers.some(s => s.name === 'test-server')).toBe(true);
    });
  });

  describe('scan complete fixture', () => {
    it('should scan complete fixture with all component types', async () => {
      const claudeResult = await parseClaudeCode(COMPLETE_FIXTURE);
      const mcpResult = await parseMcp(COMPLETE_FIXTURE);

      // Combine results
      const config: AgentScopeConfig = {
        agents: claudeResult.agents,
        skills: claudeResult.skills,
        hooks: claudeResult.hooks,
        commands: claudeResult.commands,
        mcpServers: mcpResult.servers,
        metadata: {
          scannedAt: new Date(),
          rootPath: COMPLETE_FIXTURE,
          version: '1.0.0',
          duration: 0,
          filesScanned: 0,
          errors: [...claudeResult.errors, ...mcpResult.errors],
        },
      };

      // Should have agents
      expect(config.agents.length).toBeGreaterThanOrEqual(3);

      // Should have MCP servers
      expect(config.mcpServers.length).toBeGreaterThanOrEqual(3);

      // Should have skills (if fixture includes them)
      expect(config.skills).toBeDefined();
    });

    it('should parse agent types correctly', async () => {
      const claudeResult = await parseClaudeCode(COMPLETE_FIXTURE);

      const coder = claudeResult.agents.find(a => a.name === 'coder');
      const tester = claudeResult.agents.find(a => a.name === 'tester');
      const reviewer = claudeResult.agents.find(a => a.name === 'reviewer');

      expect(coder).toBeDefined();
      expect(tester).toBeDefined();
      expect(reviewer).toBeDefined();
    });

    it('should parse MCP server details correctly', async () => {
      const mcpResult = await parseMcp(COMPLETE_FIXTURE);

      const githubServer = mcpResult.servers.find(s => s.name === 'github-server');
      expect(githubServer).toBeDefined();
      expect(githubServer?.command).toBe('npx');
      expect(githubServer?.env?.GITHUB_TOKEN).toBeDefined();
    });
  });

  describe('scan to diagram generation flow', () => {
    it('should produce valid component map from scan results', async () => {
      const claudeResult = await parseClaudeCode(COMPLETE_FIXTURE);
      const mcpResult = await parseMcp(COMPLETE_FIXTURE);

      const config: AgentScopeConfig = {
        agents: claudeResult.agents,
        skills: claudeResult.skills,
        hooks: claudeResult.hooks,
        commands: claudeResult.commands,
        mcpServers: mcpResult.servers,
        metadata: {
          scannedAt: new Date(),
          rootPath: COMPLETE_FIXTURE,
          version: '1.0.0',
          duration: 0,
          filesScanned: 0,
          errors: [],
        },
      };

      const diagram = generateComponentMap(config);

      expect(diagram).toContain('```mermaid');
      expect(diagram).toContain('graph TB');

      // Should include agent subgraphs (now uses category-based grouping)
      if (config.agents.length > 0) {
        expect(diagram).toContain('subgraph');
      }

      // Should include MCP servers
      if (config.mcpServers.length > 0) {
        expect(diagram).toContain('subgraph MCP');
      }
    });

    it('should produce valid hierarchy diagram from scan results', async () => {
      const claudeResult = await parseClaudeCode(COMPLETE_FIXTURE);

      const config: AgentScopeConfig = {
        agents: claudeResult.agents,
        skills: claudeResult.skills,
        hooks: claudeResult.hooks,
        commands: claudeResult.commands,
        mcpServers: [],
        metadata: {
          scannedAt: new Date(),
          rootPath: COMPLETE_FIXTURE,
          version: '1.0.0',
          duration: 0,
          filesScanned: 0,
          errors: [],
        },
      };

      const diagram = generateHierarchy(config);

      expect(diagram).toContain('```mermaid');
      expect(diagram).toContain('graph TB');
    });

    it('should produce valid markdown documentation from scan results', async () => {
      const claudeResult = await parseClaudeCode(COMPLETE_FIXTURE);
      const mcpResult = await parseMcp(COMPLETE_FIXTURE);

      const config: AgentScopeConfig = {
        agents: claudeResult.agents,
        skills: claudeResult.skills,
        hooks: claudeResult.hooks,
        commands: claudeResult.commands,
        mcpServers: mcpResult.servers,
        metadata: {
          scannedAt: new Date(),
          rootPath: COMPLETE_FIXTURE,
          version: '1.0.0',
          duration: 150,
          filesScanned: 10,
          errors: [],
        },
      };

      const markdown = generateMarkdown(config);

      expect(markdown).toContain('# Agent Architecture Documentation');
      expect(markdown).toContain('## Overview');

      // Should include agents section if we have agents
      if (config.agents.length > 0) {
        expect(markdown).toContain('## Agents');
      }
    });
  });

  describe('error handling during scan', () => {
    beforeEach(async () => {
      await mkdir(TEMP_FIXTURE, { recursive: true });
    });

    afterEach(async () => {
      try {
        await rm(TEMP_FIXTURE, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should collect errors for invalid configurations', async () => {
      // Create invalid .mcp.json
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), '{ invalid json }');

      const mcpResult = await parseMcp(TEMP_FIXTURE);

      expect(mcpResult.errors.length).toBeGreaterThan(0);
      expect(mcpResult.errors.some(e => e.severity === 'fatal')).toBe(true);
    });

    it('should continue scanning despite partial errors', async () => {
      // Create valid .claude directory structure
      await mkdir(join(TEMP_FIXTURE, '.claude', 'agents'), { recursive: true });
      await writeFile(
        join(TEMP_FIXTURE, '.claude', 'agents', 'valid-agent.md'),
        `---
name: valid-agent
type: worker
---

# Valid Agent
`
      );

      // Create invalid settings.json
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), '{ invalid }');

      const claudeResult = await parseClaudeCode(TEMP_FIXTURE);

      // Should still find the valid agent
      expect(claudeResult.agents.some(a => a.name === 'valid-agent')).toBe(true);

      // Should have error for invalid settings
      expect(claudeResult.errors.length).toBeGreaterThan(0);
    });

    it('should handle missing directories gracefully', async () => {
      // Empty temp fixture with no .claude directory
      const claudeResult = await parseClaudeCode(TEMP_FIXTURE);
      const mcpResult = await parseMcp(TEMP_FIXTURE);

      expect(claudeResult.agents).toHaveLength(0);
      expect(claudeResult.skills).toHaveLength(0);
      expect(mcpResult.servers).toHaveLength(0);

      // Should not produce fatal errors for missing optional directories
      const fatalErrors = [...claudeResult.errors, ...mcpResult.errors].filter(
        e => e.severity === 'fatal'
      );
      expect(fatalErrors).toHaveLength(0);
    });
  });

  describe('scan performance', () => {
    it('should scan minimal fixture in under 500ms', async () => {
      const start = performance.now();

      await parseClaudeCode(MINIMAL_FIXTURE);
      await parseMcp(MINIMAL_FIXTURE);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should scan complete fixture in under 1000ms', async () => {
      const start = performance.now();

      await parseClaudeCode(COMPLETE_FIXTURE);
      await parseMcp(COMPLETE_FIXTURE);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('should generate all outputs in under 2000ms', async () => {
      const start = performance.now();

      const claudeResult = await parseClaudeCode(COMPLETE_FIXTURE);
      const mcpResult = await parseMcp(COMPLETE_FIXTURE);

      const config: AgentScopeConfig = {
        agents: claudeResult.agents,
        skills: claudeResult.skills,
        hooks: claudeResult.hooks,
        commands: claudeResult.commands,
        mcpServers: mcpResult.servers,
        metadata: {
          scannedAt: new Date(),
          rootPath: COMPLETE_FIXTURE,
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
      expect(duration).toBeLessThan(2000);
    });
  });
});

describe('Scan Configuration Variations', () => {
  beforeEach(async () => {
    await mkdir(join(TEMP_FIXTURE, '.claude', 'agents'), { recursive: true });
    await mkdir(join(TEMP_FIXTURE, '.claude', 'skills'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(TEMP_FIXTURE, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should handle deeply nested agent directories', async () => {
    const deepPath = join(TEMP_FIXTURE, '.claude', 'agents', 'level1', 'level2', 'level3');
    await mkdir(deepPath, { recursive: true });
    await writeFile(
      join(deepPath, 'deep-agent.md'),
      `---
name: deep-agent
---

# Deep Agent
`
    );

    const claudeResult = await parseClaudeCode(TEMP_FIXTURE);

    expect(claudeResult.agents.some(a => a.name === 'deep-agent')).toBe(true);
  });

  it('should handle multiple file formats', async () => {
    // Markdown agent
    await writeFile(
      join(TEMP_FIXTURE, '.claude', 'agents', 'md-agent.md'),
      `---
name: md-agent
---
`
    );

    // YAML agent
    await writeFile(
      join(TEMP_FIXTURE, '.claude', 'agents', 'yaml-agent.yaml'),
      `name: yaml-agent
type: worker
`
    );

    // YML agent
    await writeFile(
      join(TEMP_FIXTURE, '.claude', 'agents', 'yml-agent.yml'),
      `name: yml-agent
type: specialist
`
    );

    const claudeResult = await parseClaudeCode(TEMP_FIXTURE);

    expect(claudeResult.agents.some(a => a.name === 'md-agent')).toBe(true);
    expect(claudeResult.agents.some(a => a.name === 'yaml-agent')).toBe(true);
    expect(claudeResult.agents.some(a => a.name === 'yml-agent')).toBe(true);
  });

  it('should handle SKILL.md files in skill directories', async () => {
    const skillDir = join(TEMP_FIXTURE, '.claude', 'skills', 'test-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---
name: test-skill
description: A test skill
---

# Test Skill
`
    );

    const claudeResult = await parseClaudeCode(TEMP_FIXTURE);

    expect(claudeResult.skills.some(s => s.name === 'test-skill')).toBe(true);
  });
});
