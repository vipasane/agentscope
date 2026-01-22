/**
 * Unit tests for Settings Scanner
 * Tests parsing of .claude/settings.json and .claude/settings.local.json
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';

// Test fixtures paths
const FIXTURES_PATH = join(process.cwd(), 'tests', 'fixtures');
const TEMP_FIXTURE = join(FIXTURES_PATH, `temp-settings-scanner-${process.pid}`);

/**
 * Mock Settings Scanner interface for TDD
 * Implementation will follow these tests
 */
interface SettingsScanResult {
  hooks: ParsedHook[];
  permissions: ParsedPermissions;
  plugins: ParsedPlugin[];
  statusLine?: StatusLineConfig;
  customConfig: Record<string, unknown>;
  errors: ScanError[];
}

interface ParsedHook {
  event: string;
  matcher?: string;
  type: 'command' | 'prompt';
  command?: string;
  prompt?: string;
  timeout?: number;
  continueOnError?: boolean;
  workingDirectory?: string;
}

interface ParsedPermissions {
  allow: string[];
  deny: string[];
  defaultMode?: string;
  additionalDirectories?: string[];
}

interface ParsedPlugin {
  id: string;
  marketplace?: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

interface StatusLineConfig {
  type: 'command' | 'prompt';
  command?: string;
  prompt?: string;
  refreshMs?: number;
  enabled: boolean;
}

interface ScanError {
  severity: 'fatal' | 'warning' | 'info';
  code: string;
  message: string;
  file?: string;
}

// Mock scanner class for TDD - implementation will be created based on these tests
class SettingsScanner {
  constructor(private rootPath: string) {}

  async scan(): Promise<SettingsScanResult> {
    // This will be implemented to pass these tests
    throw new Error('Not implemented - TDD placeholder');
  }
}

describe('SettingsScanner', () => {
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

  describe('constructor', () => {
    it('should create scanner with root path', () => {
      const scanner = new SettingsScanner('/test/path');
      expect(scanner).toBeDefined();
    });
  });

  describe('scan() basic parsing', () => {
    it.skip('should parse empty settings file', async () => {
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), '{}');

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.hooks).toEqual([]);
      expect(result.permissions).toEqual({ allow: [], deny: [] });
      expect(result.plugins).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it.skip('should handle missing settings file gracefully', async () => {
      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.errors).toHaveLength(0); // Not an error, just optional
      expect(result.hooks).toEqual([]);
    });

    it.skip('should collect error for invalid JSON', async () => {
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), '{ invalid json }');

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('SETTINGS_PARSE_ERROR');
    });

    it.skip('should merge settings.json and settings.local.json', async () => {
      await writeFile(
        join(TEMP_FIXTURE, '.claude', 'settings.json'),
        JSON.stringify({
          permissions: { allow: ['Read(*)'] },
          customConfig: { global: true },
        })
      );
      await writeFile(
        join(TEMP_FIXTURE, '.claude', 'settings.local.json'),
        JSON.stringify({
          permissions: { allow: ['Write(*)'] },
          customConfig: { local: true },
        })
      );

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      // Local should override global
      expect(result.permissions.allow).toContain('Write(*)');
      expect(result.customConfig).toHaveProperty('local', true);
    });
  });

  describe('hooks parsing', () => {
    it.skip('should parse new format hooks (event-keyed object)', async () => {
      const settings = {
        hooks: {
          PreToolUse: [
            {
              matcher: '^Write$',
              hooks: [
                {
                  type: 'command',
                  command: 'echo pre-write',
                  timeout: 5000,
                },
              ],
            },
          ],
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.hooks).toHaveLength(1);
      expect(result.hooks[0].event).toBe('PreToolUse');
      expect(result.hooks[0].matcher).toBe('^Write$');
      expect(result.hooks[0].type).toBe('command');
      expect(result.hooks[0].command).toBe('echo pre-write');
      expect(result.hooks[0].timeout).toBe(5000);
    });

    it.skip('should parse all valid hook events', async () => {
      const validEvents = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop', 'UserPromptSubmit'];

      for (const event of validEvents) {
        const settings = {
          hooks: {
            [event]: [
              {
                hooks: [{ type: 'command', command: 'echo test' }],
              },
            ],
          },
        };
        await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

        const scanner = new SettingsScanner(TEMP_FIXTURE);
        const result = await scanner.scan();

        expect(result.hooks[0].event).toBe(event);
      }
    });

    it.skip('should handle prompt type hooks', async () => {
      const settings = {
        hooks: {
          PreToolUse: [
            {
              hooks: [
                {
                  type: 'prompt',
                  prompt: 'Review this change carefully',
                },
              ],
            },
          ],
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.hooks[0].type).toBe('prompt');
      expect(result.hooks[0].prompt).toBe('Review this change carefully');
    });

    it.skip('should reject invalid event names', async () => {
      const settings = {
        hooks: {
          InvalidEvent: [
            {
              hooks: [{ type: 'command', command: 'echo test' }],
            },
          ],
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.hooks).toHaveLength(0);
      expect(result.errors.some(e => e.code === 'INVALID_HOOK_EVENT')).toBe(true);
    });

    it.skip('should parse hooks with workingDirectory', async () => {
      const settings = {
        hooks: {
          PreToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'npm test',
                  workingDirectory: '/project/root',
                },
              ],
            },
          ],
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.hooks[0].workingDirectory).toBe('/project/root');
    });

    it.skip('should handle continueOnError flag', async () => {
      const settings = {
        hooks: {
          PostToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'lint',
                  continueOnError: true,
                },
              ],
            },
          ],
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.hooks[0].continueOnError).toBe(true);
    });

    it.skip('should handle malformed hooks gracefully', async () => {
      const settings = {
        hooks: {
          PreToolUse: 'not-an-array', // Invalid
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.errors.some(e => e.code === 'HOOK_PARSE_ERROR')).toBe(true);
    });

    it.skip('should handle multiple hooks per event', async () => {
      const settings = {
        hooks: {
          PreToolUse: [
            {
              matcher: '^Write$',
              hooks: [
                { type: 'command', command: 'echo hook1' },
                { type: 'command', command: 'echo hook2' },
              ],
            },
            {
              matcher: '^Edit$',
              hooks: [{ type: 'command', command: 'echo hook3' }],
            },
          ],
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.hooks).toHaveLength(3);
    });
  });

  describe('permissions parsing', () => {
    it.skip('should parse allow rules', async () => {
      const settings = {
        permissions: {
          allow: ['Bash(npm:*)', 'Read(./*)', 'Write(./src/*)'],
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.permissions.allow).toHaveLength(3);
      expect(result.permissions.allow).toContain('Bash(npm:*)');
    });

    it.skip('should parse deny rules', async () => {
      const settings = {
        permissions: {
          deny: ['Bash(rm -rf /*)', 'Write(./.env)'],
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.permissions.deny).toHaveLength(2);
      expect(result.permissions.deny).toContain('Bash(rm -rf /*)');
    });

    it.skip('should parse defaultMode', async () => {
      const settings = {
        permissions: {
          defaultMode: 'acceptEdits',
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.permissions.defaultMode).toBe('acceptEdits');
    });

    it.skip('should parse additionalDirectories', async () => {
      const settings = {
        permissions: {
          additionalDirectories: ['/home/user/shared', '/tmp/workspace'],
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.permissions.additionalDirectories).toHaveLength(2);
    });
  });

  describe('plugins parsing', () => {
    it.skip('should parse plugin boolean format', async () => {
      const settings = {
        plugins: {
          'my-plugin@marketplace': true,
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].id).toBe('my-plugin');
      expect(result.plugins[0].marketplace).toBe('marketplace');
      expect(result.plugins[0].enabled).toBe(true);
    });

    it.skip('should parse plugin object format', async () => {
      const settings = {
        plugins: {
          'advanced-plugin@custom-marketplace': {
            enabled: true,
            config: { setting1: 'value1' },
          },
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.plugins[0].id).toBe('advanced-plugin');
      expect(result.plugins[0].marketplace).toBe('custom-marketplace');
      expect(result.plugins[0].config).toEqual({ setting1: 'value1' });
    });

    it.skip('should handle disabled plugins', async () => {
      const settings = {
        plugins: {
          'disabled-plugin@marketplace': false,
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.plugins[0].enabled).toBe(false);
    });
  });

  describe('statusLine parsing', () => {
    it.skip('should parse command-type statusLine', async () => {
      const settings = {
        statusLine: {
          type: 'command',
          command: 'git status --short',
          refreshMs: 10000,
          enabled: true,
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.statusLine).toBeDefined();
      expect(result.statusLine?.type).toBe('command');
      expect(result.statusLine?.command).toBe('git status --short');
      expect(result.statusLine?.refreshMs).toBe(10000);
    });

    it.skip('should parse prompt-type statusLine', async () => {
      const settings = {
        statusLine: {
          type: 'prompt',
          prompt: 'Show current status',
          enabled: true,
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.statusLine?.type).toBe('prompt');
      expect(result.statusLine?.prompt).toBe('Show current status');
    });
  });

  describe('custom config preservation', () => {
    it.skip('should preserve unknown config keys', async () => {
      const settings = {
        customField1: { nested: 'value' },
        customField2: [1, 2, 3],
        customField3: 'string value',
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);
      const result = await scanner.scan();

      expect(result.customConfig.customField1).toEqual({ nested: 'value' });
      expect(result.customConfig.customField2).toEqual([1, 2, 3]);
      expect(result.customConfig.customField3).toBe('string value');
    });
  });

  describe('performance', () => {
    it.skip('should parse settings in under 50ms', async () => {
      const settings = {
        hooks: {
          PreToolUse: Array(10)
            .fill(null)
            .map((_, i) => ({
              matcher: `^Tool${i}$`,
              hooks: [{ type: 'command', command: `echo ${i}` }],
            })),
        },
        permissions: {
          allow: Array(20)
            .fill(null)
            .map((_, i) => `Tool${i}(*)`),
        },
      };
      await writeFile(join(TEMP_FIXTURE, '.claude', 'settings.json'), JSON.stringify(settings));

      const scanner = new SettingsScanner(TEMP_FIXTURE);

      const start = performance.now();
      await scanner.scan();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});
