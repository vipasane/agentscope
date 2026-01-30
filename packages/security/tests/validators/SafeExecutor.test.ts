import { describe, it, expect } from 'vitest';
import { SafeExecutor } from '../../src/validators/SafeExecutor';

describe('SafeExecutor', () => {
  describe('validate', () => {
    it('should validate safe commands', () => {
      const cmd = 'npm test';
      const result = SafeExecutor.validate(cmd, { requireShellEscape: false });
      expect(result).toBe(cmd);
    });

    it('should reject empty commands', () => {
      expect(() => SafeExecutor.validate('')).toThrow('Command cannot be empty');
      expect(() => SafeExecutor.validate('   ')).toThrow('Command cannot be empty');
    });

    it('should detect command injection', () => {
      expect(() => SafeExecutor.validate('ls; rm -rf /')).toThrow('injection patterns');
      expect(() => SafeExecutor.validate('ls && cat /etc/passwd')).toThrow('injection patterns');
      expect(() => SafeExecutor.validate('echo `whoami`')).toThrow('injection patterns');
      expect(() => SafeExecutor.validate('ls | grep test')).toThrow('injection patterns');
    });

    it('should block dangerous commands', () => {
      expect(() => SafeExecutor.validate('rm -rf /')).toThrow('Dangerous command blocked');
      expect(() => SafeExecutor.validate('sudo apt-get install')).toThrow('Dangerous command blocked');
      expect(() => SafeExecutor.validate('eval "malicious code"')).toThrow('Dangerous command blocked');
    });

    it('should enforce allowlist', () => {
      const options = { allowedCommands: ['npm', 'git'], requireShellEscape: false };
      expect(SafeExecutor.validate('npm test', options)).toBe('npm test');
      expect(() => SafeExecutor.validate('ls -la', options)).toThrow('not in allowlist');
    });

    it('should respect custom blocklist', () => {
      const options = { blockedCommands: ['custom-cmd'], requireShellEscape: false };
      expect(() => SafeExecutor.validate('custom-cmd arg', options)).toThrow('Dangerous command blocked');
    });
  });

  describe('containsInjection', () => {
    it('should detect injection patterns', () => {
      expect(SafeExecutor.containsInjection('ls; rm')).toBe(true);
      expect(SafeExecutor.containsInjection('echo $(whoami)')).toBe(true);
      expect(SafeExecutor.containsInjection('cat file | grep test')).toBe(true);
      expect(SafeExecutor.containsInjection('ls && pwd')).toBe(true);
    });

    it('should not flag safe commands', () => {
      expect(SafeExecutor.containsInjection('npm test')).toBe(false);
      expect(SafeExecutor.containsInjection('git status')).toBe(false);
    });
  });

  describe('escapeShellArg', () => {
    it('should escape arguments safely', () => {
      expect(SafeExecutor.escapeShellArg('hello')).toBe("'hello'");
      expect(SafeExecutor.escapeShellArg("it's")).toBe("'it'\\''s'");
      expect(SafeExecutor.escapeShellArg('a b c')).toBe("'a b c'");
    });

    it('should handle special characters', () => {
      const escaped = SafeExecutor.escapeShellArg('$(whoami)');
      expect(escaped).toBe("'$(whoami)'");
    });
  });

  describe('buildCommand', () => {
    it('should build safe commands', () => {
      const cmd = SafeExecutor.buildCommand('echo', ['hello', 'world']);
      expect(cmd).toBe("echo 'hello' 'world'");
    });

    it('should escape arguments', () => {
      const cmd = SafeExecutor.buildCommand('git', ['commit', '-m', 'message with spaces']);
      expect(cmd).toContain("'message with spaces'");
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple commands', () => {
      const commands = ['npm test', 'npm run build'];
      const options = { requireShellEscape: false };
      const results = SafeExecutor.validateBatch(commands, options);
      expect(results).toEqual(commands);
    });

    it('should throw on first invalid command', () => {
      const commands = ['npm test', 'rm -rf /', 'npm run build'];
      expect(() => SafeExecutor.validateBatch(commands)).toThrow();
    });
  });

  describe('sanitize', () => {
    it('should remove dangerous patterns', () => {
      const sanitized = SafeExecutor.sanitize('ls; rm -rf /');
      expect(sanitized).not.toContain(';');
      expect(sanitized).toBe('ls rm -rf /'); // / is kept, only metacharacters removed
    });

    it('should remove shell metacharacters', () => {
      const sanitized = SafeExecutor.sanitize('echo $(whoami) && pwd');
      expect(sanitized).not.toContain('$');
      expect(sanitized).not.toContain('(');
      expect(sanitized).not.toContain('&');
    });
  });

  describe('performance', () => {
    it('should validate commands quickly', () => {
      const start = performance.now();
      const options = { requireShellEscape: false };
      for (let i = 0; i < 1000; i++) {
        SafeExecutor.validate('npm test', options);
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // <50ms for 1000 validations
    });
  });

  describe('edge cases - command parsing', () => {
    it('should extract correct base command with multiple spaces', () => {
      const cmd = 'npm   install   package';
      expect(() => SafeExecutor.validate(cmd, { allowedCommands: ['npm'], requireShellEscape: false })).not.toThrow();
    });

    it('should handle tabs as whitespace', () => {
      const cmd = 'npm\tinstall\tpackage';
      expect(() => SafeExecutor.validate(cmd, { allowedCommands: ['npm'], requireShellEscape: false })).not.toThrow();
    });

    it('should handle leading/trailing whitespace', () => {
      const cmd = '  npm install  ';
      expect(() => SafeExecutor.validate(cmd, { allowedCommands: ['npm'], requireShellEscape: false })).not.toThrow();
    });
  });

  describe('edge cases - injection patterns', () => {
    it('should detect semicolon injection', () => {
      expect(SafeExecutor.containsInjection('npm test; rm -rf')).toBe(true);
    });

    it('should detect double ampersand injection', () => {
      expect(SafeExecutor.containsInjection('npm test && cat /etc/passwd')).toBe(true);
    });

    it('should detect pipe injection', () => {
      expect(SafeExecutor.containsInjection('npm test | grep error')).toBe(true);
    });

    it('should detect backtick command substitution', () => {
      expect(SafeExecutor.containsInjection('echo `whoami`')).toBe(true);
    });

    it('should detect dollar-paren command substitution', () => {
      expect(SafeExecutor.containsInjection('echo $(whoami)')).toBe(true);
    });

    it('should detect output redirection', () => {
      expect(SafeExecutor.containsInjection('npm test > /tmp/output')).toBe(true);
    });

    it('should detect input redirection', () => {
      expect(SafeExecutor.containsInjection('cat < /etc/passwd')).toBe(true);
    });

    it('should detect newline injection', () => {
      expect(SafeExecutor.containsInjection('npm test\nrm -rf /')).toBe(true);
    });

    it('should detect carriage return injection', () => {
      expect(SafeExecutor.containsInjection('npm test\rrm -rf /')).toBe(true);
    });

    it('should detect parentheses', () => {
      expect(SafeExecutor.containsInjection('(npm test)')).toBe(true);
    });

    it('should detect curly braces', () => {
      expect(SafeExecutor.containsInjection('{ npm test; }')).toBe(true);
    });

    it('should detect square brackets', () => {
      expect(SafeExecutor.containsInjection('npm [[ test ]]')).toBe(true);
    });
  });

  describe('edge cases - allowlist enforcement', () => {
    it('should reject commands not in allowlist', () => {
      const options = { allowedCommands: ['npm', 'node'], requireShellEscape: false };
      expect(() => SafeExecutor.validate('git status', options)).toThrow('not in allowlist');
    });

    it('should accept commands in allowlist', () => {
      const options = { allowedCommands: ['npm', 'node'], requireShellEscape: false };
      expect(() => SafeExecutor.validate('npm test', options)).not.toThrow();
    });

    it('should be case-sensitive for command matching', () => {
      const options = { allowedCommands: ['npm'], requireShellEscape: false };
      expect(() => SafeExecutor.validate('NPM test', options)).toThrow();
    });

    it('should not require allowlist when empty', () => {
      const options = { allowedCommands: [], requireShellEscape: false };
      expect(() => SafeExecutor.validate('npm test', options)).not.toThrow();
    });
  });

  describe('edge cases - blocklist enforcement', () => {
    it('should block commands in blocklist', () => {
      expect(() => SafeExecutor.validate('rm -rf /', { requireShellEscape: false })).toThrow('Dangerous command blocked');
    });

    it('should support custom blocklist', () => {
      const options = {
        blockedCommands: ['custom-dangerous-cmd'],
        requireShellEscape: false
      };
      expect(() => SafeExecutor.validate('custom-dangerous-cmd arg', options)).toThrow();
    });

    it('should allow non-dangerous commands by default', () => {
      const options = { requireShellEscape: false };
      expect(() => SafeExecutor.validate('echo test', options)).not.toThrow();
    });
  });

  describe('edge cases - shell escaping', () => {
    it('should handle single quotes in arguments', () => {
      const escaped = SafeExecutor.escapeShellArg("it's");
      expect(escaped).toContain('\\');
    });

    it('should handle multiple quotes', () => {
      const escaped = SafeExecutor.escapeShellArg("it's'quote");
      expect(escaped).toContain('\\');
    });

    it('should handle empty string', () => {
      const escaped = SafeExecutor.escapeShellArg('');
      expect(escaped).toBe("''");
    });

    it('should handle special shell characters', () => {
      const special = '$()[]{}|;&<>!#~';
      const escaped = SafeExecutor.escapeShellArg(special);
      expect(escaped.charAt(0)).toBe("'");
      expect(escaped.charAt(escaped.length - 1)).toBe("'");
    });

    it('should handle whitespace', () => {
      const escaped = SafeExecutor.escapeShellArg('hello world\t\ntest');
      expect(escaped.charAt(0)).toBe("'");
    });
  });

  describe('edge cases - batch validation', () => {
    it('should validate all commands in batch', () => {
      const commands = ['npm test', 'npm run build', 'npm run lint'];
      const results = SafeExecutor.validateBatch(commands, { requireShellEscape: false });
      expect(results.length).toBe(3);
    });

    it('should throw on first invalid command in batch', () => {
      const commands = ['npm test', 'rm -rf /', 'npm run build'];
      expect(() => SafeExecutor.validateBatch(commands)).toThrow();
    });

    it('should handle empty batch', () => {
      const results = SafeExecutor.validateBatch([]);
      expect(results.length).toBe(0);
    });

    it('should preserve command order', () => {
      const commands = ['cmd1', 'cmd2', 'cmd3'];
      const options = {
        allowedCommands: ['cmd1', 'cmd2', 'cmd3'],
        requireShellEscape: false
      };
      const results = SafeExecutor.validateBatch(commands, options);
      expect(results).toEqual(commands);
    });
  });

  describe('edge cases - sanitization', () => {
    it('should remove all dangerous patterns', () => {
      const input = 'npm; rm -rf / && cat /etc/passwd || echo test | grep x';
      const sanitized = SafeExecutor.sanitize(input);
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('&&');
      expect(sanitized).not.toContain('||');
      expect(sanitized).not.toContain('|');
    });

    it('should preserve safe characters', () => {
      const input = 'npm install package-name@1.2.3';
      const sanitized = SafeExecutor.sanitize(input);
      expect(sanitized).toContain('package-name');
      expect(sanitized).toContain('@');
    });

    it('should handle multiple consecutive metacharacters', () => {
      const input = 'npm;;;test&&&pwd';
      const sanitized = SafeExecutor.sanitize(input);
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('&');
    });
  });

  describe('security - dangerous commands', () => {
    it('should block rm command', () => {
      expect(() => SafeExecutor.validate('rm file.txt')).toThrow('Dangerous command blocked');
    });

    it('should block rmdir command', () => {
      expect(() => SafeExecutor.validate('rmdir dir')).toThrow('Dangerous command blocked');
    });

    it('should block format command', () => {
      expect(() => SafeExecutor.validate('format C:')).toThrow('Dangerous command blocked');
    });

    it('should block mkfs command', () => {
      expect(() => SafeExecutor.validate('mkfs /dev/sda')).toThrow('Dangerous command blocked');
    });

    it('should block eval command', () => {
      expect(() => SafeExecutor.validate('eval "code"')).toThrow('Dangerous command blocked');
    });

    it('should block exec command', () => {
      expect(() => SafeExecutor.validate('exec /bin/bash')).toThrow('Dangerous command blocked');
    });

    it('should block chmod command', () => {
      expect(() => SafeExecutor.validate('chmod 777 file')).toThrow('Dangerous command blocked');
    });

    it('should block chown command', () => {
      expect(() => SafeExecutor.validate('chown user file')).toThrow('Dangerous command blocked');
    });

    it('should block sudo command', () => {
      expect(() => SafeExecutor.validate('sudo apt-get install')).toThrow('Dangerous command blocked');
    });

    it('should block su command', () => {
      expect(() => SafeExecutor.validate('su - user')).toThrow('Dangerous command blocked');
    });

    it('should block curl command', () => {
      expect(() => SafeExecutor.validate('curl https://example.com')).toThrow('Dangerous command blocked');
    });

    it('should block wget command', () => {
      expect(() => SafeExecutor.validate('wget https://example.com')).toThrow('Dangerous command blocked');
    });

    it('should block nc command', () => {
      expect(() => SafeExecutor.validate('nc localhost 8080')).toThrow('Dangerous command blocked');
    });

    it('should block telnet command', () => {
      expect(() => SafeExecutor.validate('telnet example.com')).toThrow('Dangerous command blocked');
    });
  });

  describe('integration - full command workflows', () => {
    it('should build and validate npm install command', () => {
      const cmd = SafeExecutor.buildCommand('npm', ['install', 'package@1.0.0']);
      const options = { allowedCommands: ['npm'], requireShellEscape: false };
      expect(() => SafeExecutor.validate(cmd, options)).not.toThrow();
    });

    it('should build and validate git commit command', () => {
      const cmd = SafeExecutor.buildCommand('git', ['commit', '-m', 'fix: issue']);
      const options = { allowedCommands: ['git'], requireShellEscape: false };
      expect(() => SafeExecutor.validate(cmd, options)).not.toThrow();
    });

    it('should handle complex git command with message containing spaces', () => {
      const cmd = SafeExecutor.buildCommand('git', ['commit', '-m', 'fix: issue with spaces']);
      expect(cmd).toContain("'fix: issue with spaces'");
    });

    it('should prevent command injection in buildCommand arguments', () => {
      const cmd = SafeExecutor.buildCommand('echo', ['$(rm -rf /)']);
      // Should have escaped the dangerous content
      expect(cmd).toContain("'$(rm -rf /)'");
      // When validated with requireShellEscape disabled, should not throw
      expect(() => SafeExecutor.validate(cmd, { requireShellEscape: false })).not.toThrow();
    });
  });
});
