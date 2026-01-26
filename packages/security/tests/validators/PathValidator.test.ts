import { describe, it, expect } from 'vitest';
import { PathValidator } from '../../src/validators/PathValidator';
import { resolve } from 'path';

describe('PathValidator', () => {
  describe('validate', () => {
    it('should validate safe paths', () => {
      const path = 'test/file.txt';
      const result = PathValidator.validate(path);
      expect(result).toBeTruthy();
      expect(result.endsWith('test/file.txt')).toBe(true);
    });

    it('should reject empty paths', () => {
      expect(() => PathValidator.validate('')).toThrow('Path cannot be empty');
      expect(() => PathValidator.validate('   ')).toThrow('Path cannot be empty');
    });

    it('should detect path traversal', () => {
      expect(() => PathValidator.validate('../etc/passwd')).toThrow('Path traversal detected');
      expect(() => PathValidator.validate('dir/../../etc/passwd')).toThrow('Path traversal detected');
    });

    it('should allow traversal when enabled', () => {
      const path = '../test/file.txt';
      const result = PathValidator.validate(path, { allowTraversal: true });
      expect(result).toBeTruthy();
    });

    it('should reject paths with null bytes', () => {
      expect(() => PathValidator.validate('test\x00file.txt')).toThrow('invalid characters');
    });

    it('should enforce allowed directories', () => {
      const cwd = process.cwd();
      const testDir = resolve(cwd, 'test');

      expect(() =>
        PathValidator.validate('/etc/passwd', { allowedDirectories: [testDir] })
      ).toThrow('outside allowed directories');
    });

    it('should enforce max depth', () => {
      const deepPath = 'a/b/c/d/e/f/g/h/i/j/k';
      expect(() =>
        PathValidator.validate(deepPath, { maxDepth: 5 })
      ).toThrow('exceeds maximum');
    });

    it('should reject absolute paths when not allowed', () => {
      expect(() =>
        PathValidator.validate('/absolute/path', { allowAbsolute: false })
      ).toThrow('Absolute paths not allowed');
    });
  });

  describe('isSafe', () => {
    it('should identify safe paths', () => {
      expect(PathValidator.isSafe('test/file.txt')).toBe(true);
      expect(PathValidator.isSafe('subdir/nested/file.txt')).toBe(true);
    });

    it('should identify unsafe paths', () => {
      expect(PathValidator.isSafe('../outside')).toBe(false);
      expect(PathValidator.isSafe('/etc/passwd')).toBe(false);
    });
  });

  describe('sanitize', () => {
    it('should remove dangerous patterns', () => {
      expect(PathValidator.sanitize('test/../file.txt')).not.toContain('..');
      expect(PathValidator.sanitize('~/file.txt')).not.toContain('~');
      expect(PathValidator.sanitize('test\x00file.txt')).not.toContain('\x00');
    });

    it('should normalize path separators', () => {
      const sanitized = PathValidator.sanitize('test/./file.txt');
      expect(sanitized).toBe('test/file.txt');
    });
  });

  describe('containsTraversal', () => {
    it('should detect traversal patterns', () => {
      expect(PathValidator.containsTraversal('../file.txt')).toBe(true);
      expect(PathValidator.containsTraversal('~/file.txt')).toBe(true);
      expect(PathValidator.containsTraversal('test/file.txt')).toBe(false);
    });
  });

  describe('getRelative', () => {
    it('should get relative path from base', () => {
      const base = process.cwd();
      const path = resolve(base, 'test/file.txt');
      const relative = PathValidator.getRelative(path, base);
      expect(relative).toBe('test/file.txt');
    });

    it('should throw if path is outside base', () => {
      const base = '/home/user/project';
      const path = '/etc/passwd';
      expect(() => PathValidator.getRelative(path, base)).toThrow('outside base directory');
    });
  });

  describe('performance', () => {
    it('should validate paths quickly', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        PathValidator.validate(`test/file${i}.txt`);
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // <50ms for 1000 validations
    });
  });
});
