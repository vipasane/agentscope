/**
 * Core functionality tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scan, validate, generate } from '../src/core/index.js';

const TEST_DIR = join(process.cwd(), `.test-project-${process.pid}`);

describe('AgentScope Core', () => {
  beforeEach(async () => {
    // Clean up any existing test directory first
    await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    // Create test project structure
    await mkdir(TEST_DIR, { recursive: true });
    await mkdir(join(TEST_DIR, '.claude', 'agents'), { recursive: true });
    await mkdir(join(TEST_DIR, '.claude', 'skills'), { recursive: true });
    await mkdir(join(TEST_DIR, '.claude', 'commands'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  describe('scan()', () => {
    it('should scan empty project without errors', async () => {
      // Note: "empty" means no agent/skill files, the directories exist
      const config = await scan({ rootPath: TEST_DIR });

      // Empty directories = no discovered components
      expect(config.agents).toHaveLength(0);
      expect(config.skills).toHaveLength(0);
      expect(config.hooks).toHaveLength(0);
      expect(config.commands).toHaveLength(0);
      expect(config.mcpServers).toHaveLength(0);
      expect(config.metadata.rootPath).toBe(TEST_DIR);
    });

    it('should discover agents from .claude/agents/', async () => {
      // Create test agent file
      const agentContent = `---
name: test-agent
description: A test agent
type: worker
tools:
  - read
  - write
---

This is a test agent for unit testing.
`;
      await writeFile(join(TEST_DIR, '.claude', 'agents', 'test-agent.md'), agentContent);

      const config = await scan({ rootPath: TEST_DIR });

      expect(config.agents).toHaveLength(1);
      expect(config.agents[0]?.name).toBe('test-agent');
      expect(config.agents[0]?.description).toBe('A test agent');
      expect(config.agents[0]?.type).toBe('worker');
    });

    it('should discover skills from .claude/skills/', async () => {
      const skillContent = `---
name: code-review
description: Code review skill
triggers:
  - /review
  - /cr
---

Performs code review.
`;
      await writeFile(join(TEST_DIR, '.claude', 'skills', 'code-review.md'), skillContent);

      const config = await scan({ rootPath: TEST_DIR });

      expect(config.skills).toHaveLength(1);
      expect(config.skills[0]?.name).toBe('code-review');
      expect(config.skills[0]?.description).toBe('Code review skill');
    });

    it('should discover commands from .claude/commands/', async () => {
      const commandContent = `---
description: Run tests
allowed_tools:
  - Bash
---

Run the project tests.
`;
      await writeFile(join(TEST_DIR, '.claude', 'commands', 'test.md'), commandContent);

      const config = await scan({ rootPath: TEST_DIR });

      expect(config.commands).toHaveLength(1);
      expect(config.commands[0]?.name).toBe('/test');
      expect(config.commands[0]?.description).toBe('Run tests');
    });

    it('should parse MCP servers from .mcp.json', async () => {
      const mcpConfig = {
        mcpServers: {
          'test-server': {
            command: 'npx',
            args: ['-y', 'test-mcp-server'],
          },
        },
      };
      await writeFile(join(TEST_DIR, '.mcp.json'), JSON.stringify(mcpConfig));

      const config = await scan({ rootPath: TEST_DIR });

      expect(config.mcpServers).toHaveLength(1);
      expect(config.mcpServers[0]?.name).toBe('test-server');
      expect(config.mcpServers[0]?.command).toBe('npx');
    });
  });

  describe('validate()', () => {
    it('should return valid for empty project', async () => {
      const result = await validate({ rootPath: TEST_DIR });

      // Empty project with valid directory structure should be valid
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid MCP config', async () => {
      await writeFile(join(TEST_DIR, '.mcp.json'), 'not valid json');

      const result = await validate({ rootPath: TEST_DIR });

      expect(result.errors.some(e => e.code === 'MCP_JSON_SYNTAX_ERROR')).toBe(true);
    });
  });

  describe('generate()', () => {
    it('should generate output files', async () => {
      const outputDir = join(TEST_DIR, 'output');
      const config = await scan({ rootPath: TEST_DIR });

      const outputs = await generate(config, { outputDir });

      expect(outputs.length).toBeGreaterThan(0);
      expect(outputs.some(o => o.type === 'documentation')).toBe(true);
      expect(outputs.some(o => o.type === 'diagram')).toBe(true);
      expect(outputs.some(o => o.type === 'json')).toBe(true);
    });
  });
});
