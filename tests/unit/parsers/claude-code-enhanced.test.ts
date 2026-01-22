import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeParser } from '../../../src/core/parsers/claude-code.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('ClaudeCodeParser Enhanced', () => {
  let testDir: string;
  let parser: ClaudeCodeParser;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = join(tmpdir(), `agentscope-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    parser = new ClaudeCodeParser(testDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('parseAgents - Hierarchical Coordinators', () => {
    it('should extract coordinator type from h3 heading', async () => {
      const content = `
# Sample Project

## Available Agents

### Coordinators

- \`planner\`: High-level planning and task decomposition
  - Delegates to: researcher, coder, tester
  - Tools: Read, Write
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();

      expect(result.agents).toHaveLength(1);
      const planner = result.agents[0];
      expect(planner.name).toBe('planner');
      expect(planner.type).toBe('coordinator');
      expect(planner.delegatesTo).toEqual(['researcher', 'coder', 'tester']);
      expect(planner.tools).toEqual(['Read', 'Write']);
    });

    it('should handle multiple heading levels and types', async () => {
      const content = `
## Available Agents

### Coordinators

- \`planner\`: Plans tasks

### Workers

- \`coder\`: Writes code
- \`tester\`: Tests code
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();

      expect(result.agents).toHaveLength(3);

      const planner = result.agents.find(a => a.name === 'planner');
      expect(planner?.type).toBe('coordinator');

      const coder = result.agents.find(a => a.name === 'coder');
      expect(coder?.type).toBe('worker');

      const tester = result.agents.find(a => a.name === 'tester');
      expect(tester?.type).toBe('worker');
    });
  });

  describe('parseAgents - Delegates To extraction', () => {
    it('should extract from "Delegates to:" format', async () => {
      const content = `
### Coordinators

- \`orchestrator\`: Main orchestrator
  - Delegates to: researcher, coder, tester
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();
      const orchestrator = result.agents[0];

      expect(orchestrator.delegatesTo).toEqual(['researcher', 'coder', 'tester']);
    });

    it('should handle backtick-wrapped names', async () => {
      const content = `
### Coordinators

- \`planner\`: Plans work
  - Delegates to: \`researcher\`, \`coder\`, \`tester\`
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();
      const planner = result.agents[0];

      expect(planner.delegatesTo).toEqual(['researcher', 'coder', 'tester']);
    });

    it('should handle bold format', async () => {
      const content = `
### Coordinators

- \`manager\`: Manages team
  - Delegates to: **researcher**, **coder**
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();
      const manager = result.agents[0];

      expect(manager.delegatesTo).toEqual(['researcher', 'coder']);
    });

    it('should return empty array when no delegates', async () => {
      const content = `
### Workers

- \`simple-agent\`: Does simple tasks
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();
      const agent = result.agents[0];

      expect(agent.delegatesTo).toEqual([]);
    });
  });

  describe('parseAgents - Tools extraction', () => {
    it('should extract from "Tools:" format', async () => {
      const content = `
### Workers

- \`coder\`: Writes code
  - Tools: Read, Write, Bash
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();
      const coder = result.agents[0];

      expect(coder.tools).toEqual(['Read', 'Write', 'Bash']);
    });

    it('should handle multiple comma-separated tools', async () => {
      const content = `
### Workers

- \`developer\`: Full stack developer
  - Tools: Edit, Glob, Grep, MultiEdit
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();
      const developer = result.agents[0];

      expect(developer.tools).toEqual(['Edit', 'Glob', 'Grep', 'MultiEdit']);
    });

    it('should handle backtick-wrapped tools', async () => {
      const content = `
### Workers

- \`tester\`: Runs tests
  - Tools: \`Read\`, \`Write\`, \`Bash\`
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();
      const tester = result.agents[0];

      expect(tester.tools).toEqual(['Read', 'Write', 'Bash']);
    });

    it('should return empty array when no tools', async () => {
      const content = `
### Workers

- \`simple-agent\`: Simple agent
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();
      const agent = result.agents[0];

      expect(agent.tools).toEqual([]);
    });
  });

  describe('parseAgents - Bullet list parsing', () => {
    it('should parse backtick agent with colon separator', async () => {
      const content = `
- \`coder\`: Implements features
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();

      expect(result.agents).toHaveLength(1);
      expect(result.agents[0]).toMatchObject({
        name: 'coder',
        description: 'Implements features'
      });
    });

    it('should parse bold agent with dash separator', async () => {
      const content = `
- **tester** - Writes tests
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();

      expect(result.agents).toHaveLength(1);
      expect(result.agents[0]).toMatchObject({
        name: 'tester',
        description: 'Writes tests'
      });
    });

    it('should handle multiple agents', async () => {
      const content = `
### Workers

- \`researcher\`: Analyzes requirements
- \`coder\`: Writes code
- \`tester\`: Tests code
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();

      expect(result.agents).toHaveLength(3);
      expect(result.agents.map(a => a.name)).toEqual(['researcher', 'coder', 'tester']);
    });
  });

  describe('parseAgents - Complete integration', () => {
    it('should parse sample-project CLAUDE.md correctly', async () => {
      const content = `
# Sample Project

## Available Agents

### Coordinators

- \`planner\`: High-level planning and task decomposition
  - Delegates to: researcher, coder, tester
  - Tools: Read, Write

### Workers

- \`coder\`: Implements features
  - Tools: Read, Write, Edit, Bash
- \`tester\`: Writes and runs tests
  - Tools: Read, Write, Bash
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();

      // Should have 3 agents (researcher is delegated but not defined, so not included)
      expect(result.agents).toHaveLength(3);

      // Check planner
      const planner = result.agents.find(a => a.name === 'planner');
      expect(planner).toBeDefined();
      expect(planner?.type).toBe('coordinator');
      expect(planner?.delegatesTo).toEqual(['researcher', 'coder', 'tester']);
      expect(planner?.tools).toEqual(['Read', 'Write']);

      // Check coder
      const coder = result.agents.find(a => a.name === 'coder');
      expect(coder).toBeDefined();
      expect(coder?.type).toBe('worker');
      expect(coder?.tools).toEqual(['Read', 'Write', 'Edit', 'Bash']);

      // Check tester
      const tester = result.agents.find(a => a.name === 'tester');
      expect(tester).toBeDefined();
      expect(tester?.type).toBe('worker');
      expect(tester?.tools).toEqual(['Read', 'Write', 'Bash']);
    });

    it('should handle empty content gracefully', async () => {
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, '');

      const result = await parser.parse();

      expect(result.agents).toEqual([]);
    });

    it('should handle content without agents', async () => {
      const content = `
# Some Document

This has no agents defined.
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();

      expect(result.agents).toEqual([]);
    });

    it('should default to worker type when no coordinator indicators', async () => {
      const content = `
- \`simple-agent\`: Does simple tasks
  - Tools: Read
`;
      const claudeMdPath = join(testDir, 'CLAUDE.md');
      await writeFile(claudeMdPath, content);

      const result = await parser.parse();

      expect(result.agents[0].type).toBe('worker');
    });
  });
});
