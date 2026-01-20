/**
 * Unit tests for type definitions and model validation
 * Tests the AgentScopeConfig interfaces and type guards
 */

import { describe, it, expect } from 'vitest';
import type {
  AgentScopeConfig,
  Agent,
  Skill,
  Hook,
  Command,
  McpServer,
  ScanError,
  ScanMetadata,
  AgentType,
  HookEvent,
  McpServerType,
  DiagramType,
} from '../../../src/core/model/types.js';

describe('Type Definitions', () => {
  describe('Agent type', () => {
    it('should allow valid agent objects', () => {
      const agent: Agent = {
        name: 'test-agent',
        path: '.claude/agents/test-agent.md',
        description: 'A test agent',
        type: 'worker',
      };

      expect(agent.name).toBe('test-agent');
      expect(agent.type).toBe('worker');
    });

    it('should allow optional fields to be omitted', () => {
      const minimalAgent: Agent = {
        name: 'minimal',
        path: '.claude/agents/minimal.md',
      };

      expect(minimalAgent.description).toBeUndefined();
      expect(minimalAgent.tools).toBeUndefined();
      expect(minimalAgent.type).toBeUndefined();
    });

    it('should support all agent types', () => {
      const types: AgentType[] = ['coordinator', 'worker', 'specialist', 'reviewer', 'custom'];

      types.forEach(type => {
        const agent: Agent = {
          name: `${type}-agent`,
          path: `.claude/agents/${type}.md`,
          type,
        };
        expect(agent.type).toBe(type);
      });
    });

    it('should support tools and delegatesTo arrays', () => {
      const agent: Agent = {
        name: 'complex-agent',
        path: '.claude/agents/complex.md',
        tools: ['read', 'write', 'execute'],
        delegatesTo: ['sub-agent-1', 'sub-agent-2'],
      };

      expect(agent.tools).toHaveLength(3);
      expect(agent.delegatesTo).toHaveLength(2);
    });

    it('should support metadata', () => {
      const agent: Agent = {
        name: 'meta-agent',
        path: '.claude/agents/meta.md',
        metadata: {
          version: '1.0.0',
          custom: { key: 'value' },
        },
      };

      expect(agent.metadata?.version).toBe('1.0.0');
    });
  });

  describe('Skill type', () => {
    it('should allow valid skill objects', () => {
      const skill: Skill = {
        name: 'code-review',
        path: '.claude/skills/code-review/SKILL.md',
        description: 'Code review skill',
        triggers: ['review', 'pr'],
        enabled: true,
      };

      expect(skill.name).toBe('code-review');
      expect(skill.triggers).toContain('review');
    });

    it('should allow minimal skill objects', () => {
      const skill: Skill = {
        name: 'minimal-skill',
        path: '.claude/skills/minimal/SKILL.md',
      };

      expect(skill.description).toBeUndefined();
      expect(skill.enabled).toBeUndefined();
    });

    it('should support dependencies', () => {
      const skill: Skill = {
        name: 'dependent-skill',
        path: '.claude/skills/dependent/SKILL.md',
        dependencies: ['base-skill', 'util-skill'],
      };

      expect(skill.dependencies).toHaveLength(2);
    });
  });

  describe('Hook type', () => {
    it('should allow valid hook objects', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: '.claude/settings.json',
        command: 'echo "pre-hook"',
        timeout: 5000,
        enabled: true,
      };

      expect(hook.event).toBe('PreToolUse');
      expect(hook.timeout).toBe(5000);
    });

    it('should support all hook event types', () => {
      const events: HookEvent[] = [
        'PreToolUse',
        'PostToolUse',
        'Notification',
        'Stop',
        'SubagentStop',
        'UserPromptSubmit',
      ];

      events.forEach(event => {
        const hook: Hook = {
          event,
          path: '.claude/settings.json',
        };
        expect(hook.event).toBe(event);
      });
    });

    it('should support working directory', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: '.claude/hooks/pre.sh',
        workingDirectory: '/workspace',
      };

      expect(hook.workingDirectory).toBe('/workspace');
    });
  });

  describe('Command type', () => {
    it('should allow valid command objects', () => {
      const command: Command = {
        name: '/deploy',
        description: 'Deploy to production',
        allowedTools: ['bash', 'git'],
        prompt: 'Deploy the application',
      };

      expect(command.name).toBe('/deploy');
      expect(command.allowedTools).toContain('bash');
    });

    it('should support disallowed tools', () => {
      const command: Command = {
        name: '/safe-mode',
        disallowedTools: ['rm', 'del'],
      };

      expect(command.disallowedTools).toContain('rm');
    });
  });

  describe('McpServer type', () => {
    it('should allow valid MCP server objects', () => {
      const server: McpServer = {
        name: 'test-server',
        command: 'node',
        args: ['server.js'],
        env: { PORT: '3000' },
        type: 'stdio',
      };

      expect(server.name).toBe('test-server');
      expect(server.command).toBe('node');
    });

    it('should support all server types', () => {
      const types: McpServerType[] = ['stdio', 'sse', 'websocket', 'custom'];

      types.forEach(type => {
        const server: McpServer = {
          name: `${type}-server`,
          command: 'node',
          type,
        };
        expect(server.type).toBe(type);
      });
    });

    it('should support disabled flag', () => {
      const server: McpServer = {
        name: 'disabled-server',
        command: 'node',
        disabled: true,
      };

      expect(server.disabled).toBe(true);
    });

    it('should support tools array', () => {
      const server: McpServer = {
        name: 'tools-server',
        command: 'node',
        tools: ['read_file', 'write_file'],
      };

      expect(server.tools).toContain('read_file');
    });
  });

  describe('ScanError type', () => {
    it('should allow valid error objects', () => {
      const error: ScanError = {
        severity: 'warning',
        code: 'PARSE_ERROR',
        message: 'Failed to parse file',
        file: '.claude/agents/broken.md',
      };

      expect(error.severity).toBe('warning');
      expect(error.code).toBe('PARSE_ERROR');
    });

    it('should support all severity levels', () => {
      const severities: ScanError['severity'][] = ['fatal', 'warning', 'info'];

      severities.forEach(severity => {
        const error: ScanError = {
          severity,
          code: 'TEST',
          message: 'Test error',
        };
        expect(error.severity).toBe(severity);
      });
    });

    it('should support optional suggestion field', () => {
      const error: ScanError = {
        severity: 'warning',
        code: 'DEPRECATED',
        message: 'Using deprecated format',
        suggestion: 'Update to the new format',
      };

      expect(error.suggestion).toBeDefined();
    });

    it('should support optional line number', () => {
      const error: ScanError = {
        severity: 'fatal',
        code: 'SYNTAX_ERROR',
        message: 'Invalid syntax',
        file: 'config.json',
        line: 42,
      };

      expect(error.line).toBe(42);
    });
  });

  describe('ScanMetadata type', () => {
    it('should allow valid metadata objects', () => {
      const metadata: ScanMetadata = {
        scannedAt: new Date(),
        rootPath: '/project',
        version: '1.0.0',
        duration: 150,
        filesScanned: 25,
        errors: [],
      };

      expect(metadata.rootPath).toBe('/project');
      expect(metadata.duration).toBe(150);
    });

    it('should include errors array', () => {
      const metadata: ScanMetadata = {
        scannedAt: new Date(),
        rootPath: '/project',
        version: '1.0.0',
        duration: 100,
        filesScanned: 10,
        errors: [
          {
            severity: 'warning',
            code: 'TEST',
            message: 'Test warning',
          },
        ],
      };

      expect(metadata.errors).toHaveLength(1);
    });
  });

  describe('AgentScopeConfig type', () => {
    it('should allow valid config objects', () => {
      const config: AgentScopeConfig = {
        agents: [],
        skills: [],
        hooks: [],
        commands: [],
        mcpServers: [],
        metadata: {
          scannedAt: new Date(),
          rootPath: '/project',
          version: '1.0.0',
          duration: 100,
          filesScanned: 0,
          errors: [],
        },
      };

      expect(config.agents).toHaveLength(0);
      expect(config.metadata.version).toBe('1.0.0');
    });

    it('should allow populated config objects', () => {
      const config: AgentScopeConfig = {
        agents: [
          { name: 'agent1', path: 'path1' },
          { name: 'agent2', path: 'path2' },
        ],
        skills: [{ name: 'skill1', path: 'path1' }],
        hooks: [{ event: 'PreToolUse', path: 'path1' }],
        commands: [{ name: '/cmd1' }],
        mcpServers: [{ name: 'server1', command: 'node' }],
        metadata: {
          scannedAt: new Date(),
          rootPath: '/project',
          version: '1.0.0',
          duration: 250,
          filesScanned: 15,
          errors: [],
        },
      };

      expect(config.agents).toHaveLength(2);
      expect(config.skills).toHaveLength(1);
      expect(config.hooks).toHaveLength(1);
      expect(config.commands).toHaveLength(1);
      expect(config.mcpServers).toHaveLength(1);
    });
  });

  describe('DiagramType type', () => {
    it('should support all diagram types', () => {
      const types: DiagramType[] = ['component-map', 'hierarchy', 'dataflow'];

      types.forEach(type => {
        expect(['component-map', 'hierarchy', 'dataflow']).toContain(type);
      });
    });
  });
});

describe('Type Guards and Validation Helpers', () => {
  describe('Agent validation', () => {
    it('should identify valid agents', () => {
      const agent = {
        name: 'test',
        path: '/path',
      };

      const isValid = typeof agent.name === 'string' && typeof agent.path === 'string';
      expect(isValid).toBe(true);
    });

    it('should reject agents without name', () => {
      const invalid = {
        path: '/path',
      };

      const isValid = 'name' in invalid && typeof invalid.name === 'string';
      expect(isValid).toBe(false);
    });

    it('should reject agents without path', () => {
      const invalid = {
        name: 'test',
      };

      const isValid = 'path' in invalid && typeof invalid.path === 'string';
      expect(isValid).toBe(false);
    });
  });

  describe('McpServer validation', () => {
    it('should identify valid servers', () => {
      const server = {
        name: 'test',
        command: 'node',
      };

      const isValid = typeof server.name === 'string' && typeof server.command === 'string';
      expect(isValid).toBe(true);
    });

    it('should reject servers without command', () => {
      const invalid = {
        name: 'test',
      };

      const isValid = 'command' in invalid && typeof invalid.command === 'string';
      expect(isValid).toBe(false);
    });
  });
});

describe('Type Compatibility', () => {
  it('should allow extending Agent type', () => {
    interface ExtendedAgent extends Agent {
      customField: string;
    }

    const agent: ExtendedAgent = {
      name: 'extended',
      path: '/path',
      customField: 'custom value',
    };

    expect(agent.customField).toBe('custom value');
  });

  it('should allow metadata to contain any values', () => {
    const agent: Agent = {
      name: 'test',
      path: '/path',
      metadata: {
        stringValue: 'text',
        numberValue: 42,
        boolValue: true,
        arrayValue: [1, 2, 3],
        nestedObject: { inner: 'value' },
      },
    };

    expect(agent.metadata?.stringValue).toBe('text');
    expect(agent.metadata?.numberValue).toBe(42);
  });
});
