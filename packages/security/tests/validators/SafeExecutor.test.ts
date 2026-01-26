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
});
