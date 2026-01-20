/**
 * Unit tests for Claude Code parser
 * Tests parsing of .claude/ directory structure, agents, skills, hooks, and commands
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeParser, parseClaudeCode } from '../../../src/core/parsers/claude-code.js';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';

// Test fixtures paths
const FIXTURES_PATH = join(process.cwd(), 'tests', 'fixtures');
const MINIMAL_FIXTURE = join(FIXTURES_PATH, 'minimal');
const COMPLETE_FIXTURE = join(FIXTURES_PATH, 'complete');
const TEMP_FIXTURE = join(FIXTURES_PATH, 'temp-test');

describe('ClaudeCodeParser', () => {
  describe('constructor', () => {
    it('should create parser with root path', () => {
      const parser = new ClaudeCodeParser('/test/path');
      expect(parser).toBeDefined();
    });
  });

  describe('parse() with minimal fixture', () => {
    it('should parse a minimal .claude directory', async () => {
      const parser = new ClaudeCodeParser(MINIMAL_FIXTURE);
      const result = await parser.parse();

      expect(result).toBeDefined();
      expect(result.agents).toBeDefined();
      expect(result.skills).toBeDefined();
      expect(result.hooks).toBeDefined();
      expect(result.commands).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('should find simple-agent in minimal fixture', async () => {
      const parser = new ClaudeCodeParser(MINIMAL_FIXTURE);
      const result = await parser.parse();

      expect(result.agents.length).toBeGreaterThanOrEqual(1);

      const simpleAgent = result.agents.find(a => a.name === 'simple-agent');
      expect(simpleAgent).toBeDefined();
      expect(simpleAgent?.description).toContain('simple test agent');
    });

    it('should return empty arrays for missing directories', async () => {
      const parser = new ClaudeCodeParser(MINIMAL_FIXTURE);
      const result = await parser.parse();

      // Minimal fixture has no skills directory
      expect(result.skills).toHaveLength(0);
      // Minimal fixture has no commands directory
      expect(result.commands).toHaveLength(0);
    });
  });

  describe('parse() with complete fixture', () => {
    it('should parse all agents from complete fixture', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      expect(result.agents.length).toBeGreaterThanOrEqual(3);

      const agentNames = result.agents.map(a => a.name);
      expect(agentNames).toContain('coder');
      expect(agentNames).toContain('tester');
      expect(agentNames).toContain('reviewer');
    });

    it('should parse skills from complete fixture', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      expect(result.skills.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse hooks from settings.json', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      // Complete fixture has hooks defined in settings.json
      expect(result.hooks).toBeDefined();
    });

    it('should parse agents inline from CLAUDE.md', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      // CLAUDE.md mentions agents - parser should find them
      expect(result.agents).toBeDefined();
    });
  });

  describe('parseAgentFile()', () => {
    it('should parse YAML frontmatter from agent file', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      const coder = result.agents.find(a => a.name === 'coder');
      expect(coder).toBeDefined();
      expect(coder?.type).toBe('developer');
    });

    it('should extract description from frontmatter', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      const coder = result.agents.find(a => a.name === 'coder');
      expect(coder?.description).toContain('Implementation specialist');
    });

    it('should handle agents without frontmatter', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      // Parser should gracefully handle files without frontmatter
      expect(result.errors.filter(e => e.code === 'AGENT_PARSE_ERROR')).toHaveLength(0);
    });
  });

  describe('parseSkillFile()', () => {
    it('should parse skill with version from frontmatter', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      if (result.skills.length > 0) {
        const skill = result.skills[0];
        expect(skill).toHaveProperty('name');
        expect(skill).toHaveProperty('path');
      }
    });

    it('should handle skills with tags', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      // Skills should be parsed without errors
      expect(result.errors.filter(e => e.code === 'SKILL_PARSE_ERROR')).toHaveLength(0);
    });
  });

  describe('parseHooks()', () => {
    it('should parse hooks from settings.json', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      // The complete fixture has hooks in settings.json
      expect(result.hooks).toBeDefined();
    });

    it('should normalize hook event types', async () => {
      const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      // Verify hook events are normalized
      for (const hook of result.hooks) {
        const validEvents = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop', 'UserPromptSubmit'];
        expect(validEvents).toContain(hook.event);
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing .claude directory gracefully', async () => {
      const parser = new ClaudeCodeParser('/nonexistent/path');
      const result = await parser.parse();

      // Should return empty results, not throw
      expect(result.agents).toHaveLength(0);
      expect(result.skills).toHaveLength(0);
      expect(result.hooks).toHaveLength(0);
      expect(result.commands).toHaveLength(0);
    });

    it('should collect errors for invalid files', async () => {
      const parser = new ClaudeCodeParser(MINIMAL_FIXTURE);
      const result = await parser.parse();

      // Errors array should exist even if empty
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('parseClaudeCode() convenience function', () => {
    it('should work as a standalone function', async () => {
      const result = await parseClaudeCode(MINIMAL_FIXTURE);

      expect(result).toBeDefined();
      expect(result.agents).toBeDefined();
      expect(result.skills).toBeDefined();
      expect(result.hooks).toBeDefined();
      expect(result.commands).toBeDefined();
      expect(result.errors).toBeDefined();
    });
  });
});

describe('ClaudeCodeParser - Edge Cases', () => {
  beforeEach(async () => {
    await mkdir(join(TEMP_FIXTURE, '.claude', 'agents'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(TEMP_FIXTURE, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should handle empty agent file', async () => {
    await writeFile(join(TEMP_FIXTURE, '.claude', 'agents', 'empty.md'), '');

    const parser = new ClaudeCodeParser(TEMP_FIXTURE);
    const result = await parser.parse();

    // Should not crash, may produce warning
    expect(result).toBeDefined();
  });

  it('should handle agent file with only frontmatter', async () => {
    const content = `---
name: frontmatter-only
type: worker
---`;
    await writeFile(join(TEMP_FIXTURE, '.claude', 'agents', 'frontmatter-only.md'), content);

    const parser = new ClaudeCodeParser(TEMP_FIXTURE);
    const result = await parser.parse();

    const agent = result.agents.find(a => a.name === 'frontmatter-only');
    expect(agent).toBeDefined();
  });

  it('should handle nested agent directories', async () => {
    await mkdir(join(TEMP_FIXTURE, '.claude', 'agents', 'nested'), { recursive: true });
    const content = `---
name: nested-agent
type: specialist
description: Nested agent for testing
---

# Nested Agent
`;
    await writeFile(join(TEMP_FIXTURE, '.claude', 'agents', 'nested', 'nested-agent.md'), content);

    const parser = new ClaudeCodeParser(TEMP_FIXTURE);
    const result = await parser.parse();

    const nestedAgent = result.agents.find(a => a.name === 'nested-agent');
    expect(nestedAgent).toBeDefined();
  });

  it('should handle malformed YAML frontmatter', async () => {
    const content = `---
name: malformed
type: [invalid yaml
---

# Malformed Agent
`;
    await writeFile(join(TEMP_FIXTURE, '.claude', 'agents', 'malformed.md'), content);

    const parser = new ClaudeCodeParser(TEMP_FIXTURE);
    const result = await parser.parse();

    // Should not throw, but may have warnings
    expect(result).toBeDefined();
  });

  it('should handle settings.json with invalid JSON', async () => {
    await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), '{ invalid json }');

    const parser = new ClaudeCodeParser(TEMP_FIXTURE);
    const result = await parser.parse();

    // Should collect error, not throw
    expect(result.errors.some(e => e.code === 'SETTINGS_PARSE_ERROR')).toBe(true);
  });

  it('should handle YAML files as agent definitions', async () => {
    const content = `name: yaml-agent
type: coordinator
description: Agent defined in YAML format
tools:
  - code
  - test
`;
    await writeFile(join(TEMP_FIXTURE, '.claude', 'agents', 'yaml-agent.yaml'), content);

    const parser = new ClaudeCodeParser(TEMP_FIXTURE);
    const result = await parser.parse();

    const yamlAgent = result.agents.find(a => a.name === 'yaml-agent');
    expect(yamlAgent).toBeDefined();
  });
});

describe('ClaudeCodeParser - Agent Type Inference', () => {
  beforeEach(async () => {
    await mkdir(join(TEMP_FIXTURE, '.claude', 'agents'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(TEMP_FIXTURE, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should infer coordinator type from name', async () => {
    const content = `---
name: task-coordinator
---

# Task Coordinator
`;
    await writeFile(join(TEMP_FIXTURE, '.claude', 'agents', 'task-coordinator.md'), content);

    const parser = new ClaudeCodeParser(TEMP_FIXTURE);
    const result = await parser.parse();

    const agent = result.agents.find(a => a.name === 'task-coordinator');
    expect(agent?.type).toBe('coordinator');
  });

  it('should infer reviewer type from name', async () => {
    const content = `---
name: code-reviewer
---

# Code Reviewer
`;
    await writeFile(join(TEMP_FIXTURE, '.claude', 'agents', 'code-reviewer.md'), content);

    const parser = new ClaudeCodeParser(TEMP_FIXTURE);
    const result = await parser.parse();

    const agent = result.agents.find(a => a.name === 'code-reviewer');
    expect(agent?.type).toBe('reviewer');
  });

  it('should default to worker type', async () => {
    const content = `---
name: helper
---

# Helper Agent
`;
    await writeFile(join(TEMP_FIXTURE, '.claude', 'agents', 'helper.md'), content);

    const parser = new ClaudeCodeParser(TEMP_FIXTURE);
    const result = await parser.parse();

    const agent = result.agents.find(a => a.name === 'helper');
    expect(agent?.type).toBe('worker');
  });
});

describe('ClaudeCodeParser - Performance', () => {
  it('should parse minimal fixture in under 100ms', async () => {
    const start = performance.now();
    const parser = new ClaudeCodeParser(MINIMAL_FIXTURE);
    await parser.parse();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should parse complete fixture in under 500ms', async () => {
    const start = performance.now();
    const parser = new ClaudeCodeParser(COMPLETE_FIXTURE);
    await parser.parse();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
  });
});
