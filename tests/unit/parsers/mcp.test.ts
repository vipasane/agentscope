/**
 * Unit tests for MCP parser
 * Tests parsing of .mcp.json and MCP server configurations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpParser, parseMcp } from '../../../src/core/parsers/mcp.js';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';

// Test fixtures paths
const FIXTURES_PATH = join(process.cwd(), 'tests', 'fixtures');
const MINIMAL_FIXTURE = join(FIXTURES_PATH, 'minimal');
const COMPLETE_FIXTURE = join(FIXTURES_PATH, 'complete');
const TEMP_FIXTURE = join(FIXTURES_PATH, `temp-mcp-test-${process.pid}`);

describe('McpParser', () => {
  describe('constructor', () => {
    it('should create parser with root path', () => {
      const parser = new McpParser('/test/path');
      expect(parser).toBeDefined();
    });
  });

  describe('parse() with minimal fixture', () => {
    it('should parse a minimal .mcp.json file', async () => {
      const parser = new McpParser(MINIMAL_FIXTURE);
      const result = await parser.parse();

      expect(result).toBeDefined();
      expect(result.servers).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('should find test-server in minimal fixture', async () => {
      const parser = new McpParser(MINIMAL_FIXTURE);
      const result = await parser.parse();

      expect(result.servers.length).toBeGreaterThanOrEqual(1);

      const testServer = result.servers.find(s => s.name === 'test-server');
      expect(testServer).toBeDefined();
      expect(testServer?.command).toBe('node');
    });
  });

  describe('parse() with complete fixture', () => {
    it('should parse all MCP servers from complete fixture', async () => {
      const parser = new McpParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      expect(result.servers.length).toBeGreaterThanOrEqual(3);

      const serverNames = result.servers.map(s => s.name);
      expect(serverNames).toContain('github-server');
      expect(serverNames).toContain('filesystem-server');
      expect(serverNames).toContain('database-server');
    });

    it('should parse server command correctly', async () => {
      const parser = new McpParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      const githubServer = result.servers.find(s => s.name === 'github-server');
      expect(githubServer?.command).toBe('npx');
      expect(githubServer?.args).toContain('@github/mcp-server');
    });

    it('should parse server environment variables', async () => {
      const parser = new McpParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      const githubServer = result.servers.find(s => s.name === 'github-server');
      expect(githubServer?.env).toBeDefined();
      expect(githubServer?.env?.GITHUB_TOKEN).toBe('${GITHUB_TOKEN}');
    });

    it('should parse server args as array', async () => {
      const parser = new McpParser(COMPLETE_FIXTURE);
      const result = await parser.parse();

      const dbServer = result.servers.find(s => s.name === 'database-server');
      expect(dbServer?.args).toBeInstanceOf(Array);
      expect(dbServer?.args).toContain('-m');
      expect(dbServer?.args).toContain('db_server');
    });
  });

  describe('server type inference', () => {
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

    it('should default to stdio type for standard servers', async () => {
      const config = {
        mcpServers: {
          'stdio-server': {
            command: 'node',
            args: ['server.js'],
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(config, null, 2));

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      const server = result.servers.find(s => s.name === 'stdio-server');
      expect(server?.type).toBe('stdio');
    });

    it('should detect SSE transport type', async () => {
      const config = {
        mcpServers: {
          'sse-server': {
            command: 'node',
            args: ['server.js', '--transport=sse'],
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(config, null, 2));

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      const server = result.servers.find(s => s.name === 'sse-server');
      expect(server?.type).toBe('sse');
    });

    it('should detect WebSocket transport type', async () => {
      const config = {
        mcpServers: {
          'ws-server': {
            command: 'node',
            args: ['server.js', '--transport=websocket'],
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(config, null, 2));

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      const server = result.servers.find(s => s.name === 'ws-server');
      expect(server?.type).toBe('websocket');
    });
  });

  describe('error handling', () => {
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

    it('should handle missing .mcp.json gracefully', async () => {
      const parser = new McpParser('/nonexistent/path');
      const result = await parser.parse();

      expect(result.servers).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for invalid JSON', async () => {
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), '{ invalid json }');

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'MCP_JSON_SYNTAX_ERROR')).toBe(true);
    });

    it('should report warning for server missing command', async () => {
      const config = {
        mcpServers: {
          'invalid-server': {
            args: ['server.js'],
            // Missing required 'command' field
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(config, null, 2));

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      expect(result.errors.some(e => e.code === 'MCP_MISSING_COMMAND')).toBe(true);
      // Server should not be added without command
      expect(result.servers.find(s => s.name === 'invalid-server')).toBeUndefined();
    });

    it('should handle empty mcpServers object', async () => {
      const config = {
        mcpServers: {},
      };
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(config, null, 2));

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      expect(result.servers).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle config without mcpServers key', async () => {
      const config = {
        otherConfig: true,
      };
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(config, null, 2));

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      expect(result.servers).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('deduplication', () => {
    beforeEach(async () => {
      await mkdir(join(TEMP_FIXTURE, '.claude'), { recursive: true });
    });

    afterEach(async () => {
      try {
        await rm(TEMP_FIXTURE, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should deduplicate servers by name', async () => {
      // Create .mcp.json with a server
      const mcpConfig = {
        mcpServers: {
          'duplicate-server': {
            command: 'node',
            args: ['v1.js'],
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(mcpConfig, null, 2));

      // Create settings.json with same server name
      const settingsConfig = {
        mcpServers: {
          'duplicate-server': {
            command: 'node',
            args: ['v2.js'],
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settingsConfig, null, 2));

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      // Should only have one entry
      const duplicateServers = result.servers.filter(s => s.name === 'duplicate-server');
      expect(duplicateServers).toHaveLength(1);
    });

    it('should prefer enabled servers over disabled ones', async () => {
      // Create .mcp.json with disabled server
      const mcpConfig = {
        mcpServers: {
          'pref-server': {
            command: 'node',
            args: ['disabled.js'],
            disabled: true,
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(mcpConfig, null, 2));

      // Create settings.json with enabled version
      const settingsConfig = {
        mcpServers: {
          'pref-server': {
            command: 'node',
            args: ['enabled.js'],
            disabled: false,
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settingsConfig, null, 2));

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      const server = result.servers.find(s => s.name === 'pref-server');
      expect(server?.disabled).toBe(false);
    });
  });

  describe('tools extraction', () => {
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

    it('should extract tools from alwaysAllow field', async () => {
      const config = {
        mcpServers: {
          'tools-server': {
            command: 'node',
            args: ['server.js'],
            alwaysAllow: ['read', 'write', 'execute'],
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(config, null, 2));

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      const server = result.servers.find(s => s.name === 'tools-server');
      expect(server?.tools).toContain('read');
      expect(server?.tools).toContain('write');
      expect(server?.tools).toContain('execute');
    });

    it('should return empty tools array when not specified', async () => {
      const config = {
        mcpServers: {
          'no-tools-server': {
            command: 'node',
            args: ['server.js'],
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(config, null, 2));

      const parser = new McpParser(TEMP_FIXTURE);
      const result = await parser.parse();

      const server = result.servers.find(s => s.name === 'no-tools-server');
      expect(server?.tools).toEqual([]);
    });
  });

  describe('parseMcp() convenience function', () => {
    it('should work as a standalone function', async () => {
      const result = await parseMcp(MINIMAL_FIXTURE);

      expect(result).toBeDefined();
      expect(result.servers).toBeDefined();
      expect(result.errors).toBeDefined();
    });
  });
});

describe('McpParser - Performance', () => {
  it('should parse minimal fixture in under 50ms', async () => {
    const start = performance.now();
    const parser = new McpParser(MINIMAL_FIXTURE);
    await parser.parse();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });

  it('should parse complete fixture in under 100ms', async () => {
    const start = performance.now();
    const parser = new McpParser(COMPLETE_FIXTURE);
    await parser.parse();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});

describe('McpParser - Real World Scenarios', () => {
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

  it('should handle claude-flow MCP server config', async () => {
    const config = {
      mcpServers: {
        'claude-flow': {
          command: 'npx',
          args: ['@claude-flow/cli@latest', 'mcp', 'start'],
          env: {
            CLAUDE_FLOW_MODE: 'v3',
            CLAUDE_FLOW_HOOKS_ENABLED: 'true',
          },
          autoStart: false,
        },
      },
    };
    await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(config, null, 2));

    const parser = new McpParser(TEMP_FIXTURE);
    const result = await parser.parse();

    const server = result.servers.find(s => s.name === 'claude-flow');
    expect(server).toBeDefined();
    expect(server?.command).toBe('npx');
    expect(server?.args).toContain('@claude-flow/cli@latest');
    expect(server?.env?.CLAUDE_FLOW_MODE).toBe('v3');
  });

  it('should handle multiple diverse servers', async () => {
    const config = {
      mcpServers: {
        python: {
          command: 'python',
          args: ['-m', 'mcp_server'],
        },
        node: {
          command: 'node',
          args: ['./server/index.js'],
        },
        docker: {
          command: 'docker',
          args: ['run', '-i', 'mcp-image'],
        },
        npx: {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-server'],
        },
      },
    };
    await writeFile(join(TEMP_FIXTURE, '.mcp.json'), JSON.stringify(config, null, 2));

    const parser = new McpParser(TEMP_FIXTURE);
    const result = await parser.parse();

    expect(result.servers).toHaveLength(4);
    expect(result.servers.map(s => s.name)).toEqual(['python', 'node', 'docker', 'npx']);
  });
});
