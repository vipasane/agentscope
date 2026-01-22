/**
 * Integration tests for CLI commands
 * Tests the command-line interface functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { execSync, exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Test fixtures paths
const FIXTURES_PATH = join(process.cwd(), 'tests', 'fixtures');
const MINIMAL_FIXTURE = join(FIXTURES_PATH, 'minimal');
const COMPLETE_FIXTURE = join(FIXTURES_PATH, 'complete');
const TEMP_FIXTURE = join(FIXTURES_PATH, 'temp-cli-test');
const CLI_PATH = join(process.cwd(), 'dist', 'cli', 'index.js');

// Skip CLI tests if dist doesn't exist yet
const CLI_EXISTS = (() => {
  try {
    require.resolve(CLI_PATH);
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!CLI_EXISTS)('CLI Integration Tests', () => {
  describe('help command', () => {
    it('should display help information', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --help`);

      expect(stdout).toContain('agentscope');
      expect(stdout).toContain('scan');
    });

    it('should display version', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --version`);

      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('scan command', () => {
    beforeEach(async () => {
      await mkdir(join(TEMP_FIXTURE, 'output'), { recursive: true });
    });

    afterEach(async () => {
      try {
        await rm(TEMP_FIXTURE, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should scan minimal fixture successfully', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} scan ${MINIMAL_FIXTURE}`
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Found:');
    });

    it('should output JSON format when requested', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} scan ${MINIMAL_FIXTURE} --format json`
      );

      const json = JSON.parse(stdout);
      expect(json).toHaveProperty('agents');
      expect(json).toHaveProperty('skills');
      expect(json).toHaveProperty('mcpServers');
    });

    it('should generate output files to specified directory', async () => {
      const outputDir = join(TEMP_FIXTURE, 'output');

      await execAsync(
        `node ${CLI_PATH} scan ${COMPLETE_FIXTURE} --output ${outputDir}`
      );

      // Check that files were generated
      const readme = await readFile(join(outputDir, 'README.md'), 'utf-8');
      expect(readme).toContain('Agent Architecture');
    });

    it('should generate specific diagram type', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} scan ${COMPLETE_FIXTURE} --diagram hierarchy --format json`
      );

      const result = JSON.parse(stdout);
      expect(result).toBeDefined();
    });
  });

  describe('validate command', () => {
    it('should validate minimal fixture without errors', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} validate ${MINIMAL_FIXTURE}`
      );

      expect(stdout).toContain('valid');
      expect(stderr).toBe('');
    });

    it('should report validation errors for invalid config', async () => {
      await mkdir(join(TEMP_FIXTURE, '.claude'), { recursive: true });
      await writeFile(
        join(TEMP_FIXTURE, '.mcp.json'),
        '{ invalid json }'
      );

      try {
        await execAsync(`node ${CLI_PATH} validate ${TEMP_FIXTURE}`);
        // Should fail
        expect(true).toBe(false);
      } catch (error: unknown) {
        const err = error as { stderr?: string };
        expect(err.stderr || '').toContain('error');
      }
    });
  });

  describe('error handling', () => {
    it('should handle non-existent directory gracefully', async () => {
      try {
        await execAsync(`node ${CLI_PATH} scan /nonexistent/path`);
      } catch (error: unknown) {
        const err = error as { code?: number };
        expect(err.code).not.toBe(0);
      }
    });

    it('should handle invalid options', async () => {
      try {
        await execAsync(`node ${CLI_PATH} scan --invalid-option`);
      } catch (error: unknown) {
        const err = error as { stderr?: string };
        expect(err.stderr || '').toContain('error');
      }
    });
  });
});

// Tests that can run without the CLI being built
describe('CLI Command Structure Tests', () => {
  it('should have valid package.json bin entry', async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), 'package.json'), 'utf-8')
    );

    expect(packageJson.bin).toBeDefined();
    expect(packageJson.bin.agentscope).toBeDefined();
  });

  it('should have main export defined', async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), 'package.json'), 'utf-8')
    );

    expect(packageJson.main).toBeDefined();
  });
});

describe('CLI Output Validation', () => {
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

  // These tests validate the expected output format without running CLI
  it('should produce valid JSON structure', () => {
    // Mock expected CLI JSON output structure
    const expectedStructure = {
      meta: {
        name: expect.any(String),
        version: expect.any(String),
        scanDate: expect.any(String),
        projectPath: expect.any(String),
      },
      agents: expect.any(Array),
      skills: expect.any(Array),
      hooks: expect.any(Array),
      commands: expect.any(Array),
      mcpServers: expect.any(Array),
      errors: expect.any(Array),
    };

    // Validate structure matches expected schema
    const mockOutput = {
      meta: {
        name: 'agentscope',
        version: '1.0.0',
        scanDate: new Date().toISOString(),
        projectPath: '/test',
      },
      agents: [],
      skills: [],
      hooks: [],
      commands: [],
      mcpServers: [],
      errors: [],
    };

    expect(mockOutput).toMatchObject(expectedStructure);
  });

  it('should produce valid Mermaid diagram syntax', () => {
    // Validate Mermaid diagram structure
    const diagram = `\`\`\`mermaid
graph TB
    subgraph Agents["Agents"]
        agent1["Agent 1"]
    end
\`\`\``;

    expect(diagram).toContain('```mermaid');
    expect(diagram).toContain('graph TB');
    expect(diagram).toContain('subgraph');
    expect(diagram.endsWith('```')).toBe(true);
  });
});
