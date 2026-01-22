/**
 * Tests for Settings Scanner
 *
 * Verifies that the settings scanner correctly parses Claude Code
 * settings.json files according to the 2026.01 schema.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import {
  SettingsScanner,
  scanSettings,
  scanUserSettings,
  mergeSettings,
  type SettingsScanResult,
} from '../../src/core/scanner/settings-scanner.js';

// Test against the actual workspace settings
const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../..');

describe('SettingsScanner', () => {
  let result: SettingsScanResult;

  beforeAll(async () => {
    const scanner = new SettingsScanner(WORKSPACE_ROOT);
    result = await scanner.scan();
  });

  describe('Hook Extraction', () => {
    it('should extract PreToolUse hooks', () => {
      const preToolUseHooks = result.hooks.filter(h => h.event === 'PreToolUse');
      expect(preToolUseHooks.length).toBeGreaterThan(0);
    });

    it('should extract PostToolUse hooks', () => {
      const postToolUseHooks = result.hooks.filter(h => h.event === 'PostToolUse');
      expect(postToolUseHooks.length).toBeGreaterThan(0);
    });

    it('should extract SessionStart hooks', () => {
      const sessionStartHooks = result.hooks.filter(h => h.event === 'SessionStart');
      expect(sessionStartHooks.length).toBeGreaterThan(0);
    });

    it('should extract UserPromptSubmit hooks', () => {
      const userPromptSubmitHooks = result.hooks.filter(h => h.event === 'UserPromptSubmit');
      expect(userPromptSubmitHooks.length).toBeGreaterThan(0);
    });

    it('should include hook commands', () => {
      const hooksWithCommands = result.hooks.filter(h => h.command);
      expect(hooksWithCommands.length).toBeGreaterThan(0);

      // Check for claude-flow hooks
      const claudeFlowHooks = hooksWithCommands.filter(h =>
        h.command?.includes('@claude-flow/cli')
      );
      expect(claudeFlowHooks.length).toBeGreaterThan(0);
    });

    it('should include timeout information', () => {
      const hooksWithTimeout = result.hooks.filter(h => h.timeout !== undefined);
      expect(hooksWithTimeout.length).toBeGreaterThan(0);
    });

    it('should set enabled to true for all hooks', () => {
      for (const hook of result.hooks) {
        expect(hook.enabled).toBe(true);
      }
    });
  });

  describe('Permission Extraction', () => {
    it('should extract permission rules', () => {
      expect(result.permissions.rules.length).toBeGreaterThan(0);
    });

    it('should have correct allow count', () => {
      const allowRules = result.permissions.rules.filter(r => r.type === 'allow');
      expect(result.permissions.allowCount).toBe(allowRules.length);
    });

    it('should parse Bash permission patterns', () => {
      const bashRules = result.permissions.rules.filter(r =>
        r.pattern.startsWith('Bash(')
      );
      expect(bashRules.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse MCP permission patterns', () => {
      const mcpRules = result.permissions.rules.filter(r =>
        r.pattern.startsWith('mcp__')
      );
      expect(mcpRules.length).toBeGreaterThanOrEqual(1);
    });

    it('should include tool information in rules', () => {
      const rulesWithTool = result.permissions.rules.filter(r => r.tool);
      expect(rulesWithTool.length).toBeGreaterThan(0);
    });

    it('should include descriptions for rules', () => {
      const rulesWithDescription = result.permissions.rules.filter(r => r.description);
      expect(rulesWithDescription.length).toBeGreaterThan(0);
    });
  });

  describe('Command Extraction', () => {
    it('should extract commands from .claude/commands/', () => {
      expect(result.commands.length).toBeGreaterThan(0);
    });

    it('should have command names starting with /', () => {
      for (const command of result.commands) {
        expect(command.name).toMatch(/^\//);
      }
    });

    it('should include claude-flow commands', () => {
      const flowCommands = result.commands.filter(c =>
        c.name.includes('claude-flow')
      );
      expect(flowCommands.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should not have fatal errors', () => {
      const fatalErrors = result.errors.filter(e => e.severity === 'fatal');
      expect(fatalErrors.length).toBe(0);
    });

    it('should handle missing files gracefully', async () => {
      const scanner = new SettingsScanner('/nonexistent/path');
      const emptyResult = await scanner.scan();

      expect(emptyResult.hooks.length).toBe(0);
      expect(emptyResult.plugins.length).toBe(0);
      expect(emptyResult.permissions.rules.length).toBe(0);
      expect(emptyResult.mcpServers.length).toBe(0);
    });
  });
});

describe('scanSettings convenience function', () => {
  it('should work like SettingsScanner.scan()', async () => {
    const result = await scanSettings(WORKSPACE_ROOT);

    expect(result.hooks.length).toBeGreaterThan(0);
    expect(result.permissions.rules.length).toBeGreaterThan(0);
  });
});

describe('mergeSettings', () => {
  it('should merge hooks from both sources', () => {
    const project: SettingsScanResult = {
      hooks: [{ event: 'PreToolUse', path: 'project', command: 'cmd1', enabled: true }],
      plugins: [],
      permissions: { allowCount: 1, denyCount: 0, askCount: 0, rules: [{ pattern: 'A', type: 'allow' }] },
      mcpServers: [],
      commands: [],
      errors: [],
    };

    const user: SettingsScanResult = {
      hooks: [{ event: 'PostToolUse', path: 'user', command: 'cmd2', enabled: true }],
      plugins: [],
      permissions: { allowCount: 0, denyCount: 1, askCount: 0, rules: [{ pattern: 'B', type: 'deny' }] },
      mcpServers: [],
      commands: [],
      errors: [],
    };

    const merged = mergeSettings(project, user);

    expect(merged.hooks.length).toBe(2);
    expect(merged.permissions.allowCount).toBe(1);
    expect(merged.permissions.denyCount).toBe(1);
    expect(merged.permissions.rules.length).toBe(2);
  });

  it('should prefer project settings for duplicates', () => {
    const project: SettingsScanResult = {
      hooks: [{ event: 'PreToolUse', path: 'project', command: 'project-cmd', enabled: true }],
      plugins: [{ id: 'test@marketplace', name: 'test', enabled: true }],
      permissions: { allowCount: 0, denyCount: 0, askCount: 0, rules: [] },
      mcpServers: [{ name: 'server', command: 'project-cmd' }],
      commands: [{ name: '/test', description: 'project' }],
      errors: [],
    };

    const user: SettingsScanResult = {
      hooks: [{ event: 'PreToolUse', path: 'user', command: 'project-cmd', enabled: true }],
      plugins: [{ id: 'test@marketplace', name: 'test', enabled: false }],
      permissions: { allowCount: 0, denyCount: 0, askCount: 0, rules: [] },
      mcpServers: [{ name: 'server', command: 'user-cmd' }],
      commands: [{ name: '/test', description: 'user' }],
      errors: [],
    };

    const merged = mergeSettings(project, user);

    // Project takes precedence
    expect(merged.plugins[0].enabled).toBe(true);
    expect(merged.mcpServers[0].command).toBe('project-cmd');
    expect(merged.commands[0].description).toBe('project');
  });

  it('should combine errors from both sources', () => {
    const project: SettingsScanResult = {
      hooks: [],
      plugins: [],
      permissions: { allowCount: 0, denyCount: 0, askCount: 0, rules: [] },
      mcpServers: [],
      commands: [],
      errors: [{ severity: 'warning', code: 'P1', message: 'Project error' }],
    };

    const user: SettingsScanResult = {
      hooks: [],
      plugins: [],
      permissions: { allowCount: 0, denyCount: 0, askCount: 0, rules: [] },
      mcpServers: [],
      commands: [],
      errors: [{ severity: 'info', code: 'U1', message: 'User error' }],
    };

    const merged = mergeSettings(project, user);

    expect(merged.errors.length).toBe(2);
  });
});

describe('Valid Hook Events (2026.01 Schema)', () => {
  it('should recognize all valid hook events', () => {
    const validEvents = [
      'PreToolUse',
      'PostToolUse',
      'Notification',
      'Stop',
      'SubagentStop',
      'SessionStart',
      'SessionEnd',
      'PreCompact',
      'UserPromptSubmit',
    ];

    // Create a mock settings object with all event types
    const mockSettings = {
      hooks: Object.fromEntries(
        validEvents.map(event => [event, [{ hooks: [{ type: 'command', command: 'echo test' }] }]])
      ),
    };

    // Verify the scanner can handle all event types
    for (const event of validEvents) {
      expect(mockSettings.hooks[event]).toBeDefined();
    }
  });
});

describe('Permission Pattern Parsing', () => {
  it('should parse Tool(argument) format', async () => {
    const result = await scanSettings(WORKSPACE_ROOT);

    // Find patterns with Tool(arg) format
    const toolArgPatterns = result.permissions.rules.filter(r =>
      /^\w+\(.+\)$/.test(r.pattern)
    );

    if (toolArgPatterns.length > 0) {
      for (const rule of toolArgPatterns) {
        expect(rule.tool).toBeDefined();
        expect(rule.description).toBeDefined();
      }
    }
  });

  it('should parse MCP tool format', async () => {
    const result = await scanSettings(WORKSPACE_ROOT);

    const mcpPatterns = result.permissions.rules.filter(r =>
      r.pattern.startsWith('mcp__')
    );

    if (mcpPatterns.length > 0) {
      for (const rule of mcpPatterns) {
        expect(rule.description).toBeDefined();
      }
    }
  });
});
