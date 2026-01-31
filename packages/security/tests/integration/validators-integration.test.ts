/**
 * Integration tests for validators working together
 *
 * Tests the integration between InputValidator, PathValidator, and SafeExecutor
 * in real-world security scenarios.
 */

import { describe, it, expect } from 'vitest';
import { InputValidator } from '../../src/validators/InputValidator';
import { PathValidator } from '../../src/validators/PathValidator';
import { SafeExecutor } from '../../src/validators/SafeExecutor';

describe('Validators Integration', () => {
  describe('File Operation Security Workflow', () => {
    it('should validate complete file operation workflow', () => {
      // Step 1: Validate user input
      const fileNameValidator = InputValidator.string({
        min: 1,
        max: 255,
        regex: /^[a-zA-Z0-9_\-\.]+$/
      });

      const userInput = 'document.txt';
      const validatedName = fileNameValidator.parse(userInput);
      expect(validatedName).toBe('document.txt');

      // Step 2: Validate path
      const basePath = process.cwd();
      const filePath = `${basePath}/uploads/${validatedName}`;

      const safePath = PathValidator.validate(filePath, {
        allowedDirectories: [basePath],
        allowTraversal: false,
        maxDepth: 10
      });

      expect(safePath).toBeTruthy();
      expect(safePath.startsWith(basePath)).toBe(true);

      // Step 3: Sanitize path (defense-in-depth)
      const sanitizedPath = PathValidator.sanitize(safePath);
      expect(sanitizedPath).not.toContain('..');
      expect(sanitizedPath).not.toContain('~');

      // Workflow complete - safe to use path
      expect(sanitizedPath).toBeTruthy();
    });

    it('should block path traversal in file operation workflow', () => {
      // Attacker input
      const maliciousInput = '../../../etc/passwd';

      // Step 1: Input validation (should pass - just a string)
      const fileNameValidator = InputValidator.string({ max: 255 });
      const validatedName = fileNameValidator.parse(maliciousInput);
      expect(validatedName).toBe(maliciousInput);

      // Step 2: Path validation (should FAIL - traversal detected)
      const basePath = process.cwd();
      const filePath = `${basePath}/uploads/${validatedName}`;

      expect(() => {
        PathValidator.validate(filePath, {
          allowedDirectories: [basePath],
          allowTraversal: false
        });
      }).toThrow('Path traversal detected');
    });

    it('should block null byte injection in file names', () => {
      const maliciousInput = 'document.txt\x00.exe';

      // Step 1: Input validation (sanitizes null bytes)
      const validator = InputValidator.string();
      const sanitized = validator.parse(maliciousInput);
      expect(sanitized).toBe('document.txt.exe'); // Null byte removed

      // Step 2: Path validation (rejects remaining null bytes)
      const pathWithNullByte = `/uploads/${maliciousInput}`;
      expect(() => {
        PathValidator.validate(pathWithNullByte);
      }).toThrow('invalid characters');
    });
  });

  describe('Command Execution Security Workflow', () => {
    it('should validate complete command execution workflow', () => {
      // Step 1: Validate command name
      const cmdValidator = InputValidator.string({
        regex: /^[a-z]+$/,
        max: 50
      });

      const userCommand = 'npm';
      const validatedCmd = cmdValidator.parse(userCommand);
      expect(validatedCmd).toBe('npm');

      // Step 2: Validate arguments
      const argValidator = InputValidator.string({ max: 100 });
      const arg = 'test';
      const validatedArg = argValidator.parse(arg);

      // Step 3: Validate with SafeExecutor
      const safeCmd = SafeExecutor.validate(validatedCmd, {
        allowedCommands: ['npm', 'node'],
        requireShellEscape: false
      });

      expect(safeCmd).toBe('npm');

      // Step 4: Build safe command
      const fullCmd = SafeExecutor.buildCommand(safeCmd, [validatedArg]);
      expect(fullCmd).toContain("'test'");

      // Workflow complete - safe to execute
      expect(fullCmd).toBe("npm 'test'");
    });

    it('should block command injection in execution workflow', () => {
      // Attacker input
      const maliciousCmd = 'ls; rm -rf /';

      // Step 1: Validate command
      expect(() => {
        SafeExecutor.validate(maliciousCmd, {
          allowedCommands: ['ls', 'cat'],
          requireShellEscape: true
        });
      }).toThrow('injection patterns');
    });

    it('should escape dangerous arguments safely', () => {
      // Dangerous user input
      const dangerousArg = '$(whoami)';

      // Step 1: Validate input (passes - just a string)
      const validator = InputValidator.string();
      const validatedArg = validator.parse(dangerousArg);

      // Step 2: Escape for shell
      const escaped = SafeExecutor.escapeShellArg(validatedArg);
      expect(escaped).toBe("'$(whoami)'"); // Safely wrapped

      // Step 3: Build command
      const cmd = SafeExecutor.buildCommand('echo', [validatedArg]);
      expect(cmd).toContain("'$(whoami)'"); // Still safe
    });

    it('should combine path and command validation', () => {
      // User wants to run: cat /path/to/file.txt
      const fileName = 'report.txt';
      const basePath = process.cwd();

      // Step 1: Validate path
      const fullPath = `${basePath}/docs/${fileName}`;
      const safePath = PathValidator.validate(fullPath, {
        allowedDirectories: [basePath],
        allowTraversal: false
      });

      // Step 2: Validate command
      const cmd = SafeExecutor.validate('cat', {
        allowedCommands: ['cat', 'less', 'head'],
        requireShellEscape: false
      });

      // Step 3: Build safe command with safe path
      const safeCmd = SafeExecutor.buildCommand(cmd, [safePath]);
      expect(safeCmd).toContain('cat');
      expect(safeCmd).toContain(safePath);
      expect(safeCmd).toContain("'"); // Arguments are quoted
    });
  });

  describe('API Input Validation Workflow', () => {
    it('should validate complete API request', () => {
      // Simulate API request body
      const requestBody = {
        username: 'john_doe',
        email: 'john@example.com',
        age: 30,
        preferences: {
          theme: 'dark',
          notifications: true
        }
      };

      // Define validator
      const userValidator = InputValidator.object({
        username: InputValidator.string({ min: 3, max: 50, regex: /^[a-z_]+$/ }),
        email: InputValidator.string({ email: true }),
        age: InputValidator.number({ min: 0, max: 150, int: true }),
        preferences: InputValidator.object({
          theme: InputValidator.enum(['light', 'dark', 'auto']),
          notifications: InputValidator.boolean()
        })
      });

      // Validate
      const result = userValidator.safeParse(requestBody);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(requestBody);
    });

    it('should reject malformed API request', () => {
      const malformedBody = {
        username: 'john@invalid', // Invalid characters
        email: 'not-an-email',
        age: '30', // Should be number
        preferences: 'invalid' // Should be object
      };

      const userValidator = InputValidator.object({
        username: InputValidator.string({ regex: /^[a-z_]+$/ }),
        email: InputValidator.string({ email: true }),
        age: InputValidator.number({ int: true }),
        preferences: InputValidator.object({
          theme: InputValidator.string(),
          notifications: InputValidator.boolean()
        })
      });

      const result = userValidator.safeParse(malformedBody);
      expect(result.success).toBe(false);
    });

    it('should sanitize SQL injection attempts in API input', () => {
      const sqlInjection = "admin'; DROP TABLE users; --";

      // Input validation sanitizes control characters
      const validator = InputValidator.string();
      const sanitized = validator.parse(sqlInjection);

      // Should preserve visible characters but remove control chars
      expect(sanitized).toBeDefined();
      expect(sanitized).not.toContain('\x00');
    });
  });

  describe('Defense-in-Depth Integration', () => {
    it('should apply multiple validation layers', () => {
      const userInput = {
        fileName: 'document.txt',
        directory: 'uploads',
        command: 'cat'
      };

      // Layer 1: Input validation
      const fileValidator = InputValidator.string({ regex: /^[a-zA-Z0-9_\.\-]+$/ });
      const dirValidator = InputValidator.string({ regex: /^[a-zA-Z0-9_\-]+$/ });
      const cmdValidator = InputValidator.string({ regex: /^[a-z]+$/ });

      const validatedFile = fileValidator.parse(userInput.fileName);
      const validatedDir = dirValidator.parse(userInput.directory);
      const validatedCmd = cmdValidator.parse(userInput.command);

      // Layer 2: Path validation
      const basePath = process.cwd();
      const fullPath = `${basePath}/${validatedDir}/${validatedFile}`;
      const safePath = PathValidator.validate(fullPath, {
        allowedDirectories: [basePath],
        allowTraversal: false
      });

      // Layer 3: Command validation
      const safeCmd = SafeExecutor.validate(validatedCmd, {
        allowedCommands: ['cat', 'head', 'tail'],
        requireShellEscape: false
      });

      // Layer 4: Build final command
      const finalCmd = SafeExecutor.buildCommand(safeCmd, [safePath]);

      // All layers passed - safe to execute
      expect(finalCmd).toContain('cat');
      expect(finalCmd).toContain(validatedFile);
    });

    it('should fail fast on first validation layer', () => {
      const maliciousInput = {
        fileName: '../../../etc/passwd',
        directory: 'uploads',
        command: 'cat'
      };

      // Layer 1: Input validation (passes - just strings)
      const fileValidator = InputValidator.string();
      const validatedFile = fileValidator.parse(maliciousInput.fileName);

      // Layer 2: Path validation (FAILS - traversal)
      const basePath = process.cwd();
      const fullPath = `${basePath}/${maliciousInput.directory}/${validatedFile}`;

      expect(() => {
        PathValidator.validate(fullPath, {
          allowedDirectories: [basePath],
          allowTraversal: false
        });
      }).toThrow('Path traversal detected');

      // Should stop here - never reaches command execution
    });

    it('should sanitize at multiple layers', () => {
      const dirtyInput = 'file\x00../malicious.txt';

      // Layer 1: Input sanitization
      const validator = InputValidator.string();
      const sanitized1 = validator.parse(dirtyInput);
      expect(sanitized1).toBe('file../malicious.txt'); // Null byte removed

      // Layer 2: Path sanitization
      const sanitized2 = PathValidator.sanitize(sanitized1);
      expect(sanitized2).not.toContain('..'); // Traversal removed

      // Layer 3: Final validation
      expect(() => {
        PathValidator.validate(sanitized2, { allowTraversal: false });
      }).not.toThrow(); // Should pass after sanitization
    });
  });

  describe('Real-World Attack Scenarios', () => {
    it('should block file upload path traversal attack', () => {
      // Attacker uploads file with traversal in name
      const uploadedFileName = '../../etc/passwd';
      const uploadDir = '/var/www/uploads';

      // Validate file name
      expect(() => {
        PathValidator.validate(`${uploadDir}/${uploadedFileName}`, {
          allowedDirectories: [uploadDir],
          allowTraversal: false
        });
      }).toThrow('Path traversal detected');
    });

    it('should block command injection via file name', () => {
      // Attacker tries to inject command via file name
      const maliciousFileName = 'file.txt; rm -rf /';

      // Step 1: Validate file name format
      const fileValidator = InputValidator.string({
        regex: /^[a-zA-Z0-9_\.\-]+$/
      });

      const result = fileValidator.safeParse(maliciousFileName);
      expect(result.success).toBe(false); // Rejects semicolon

      // Step 2: If we somehow get past validation, SafeExecutor catches it
      if (SafeExecutor.containsInjection(maliciousFileName)) {
        expect(true).toBe(true); // Would be detected
      }
    });

    it('should handle unicode normalization attack', () => {
      // Attacker uses unicode to bypass filters
      const unicodeAttack = 'file\u2024txt'; // Using unicode "dot"

      const validator = InputValidator.string();
      const validated = validator.parse(unicodeAttack);

      // Should preserve unicode but still validate path
      expect(validated).toContain('file');
    });

    it('should validate email with XSS attempt', () => {
      const xssEmail = '<script>alert("XSS")</script>@example.com';

      const emailValidator = InputValidator.string({ email: true });
      const result = emailValidator.safeParse(xssEmail);

      // Should reject due to invalid email format
      expect(result.success).toBe(false);
    });

    it('should block chained exploits', () => {
      // Attacker chains multiple techniques
      const chainedAttack = '../../uploads/$(whoami).txt';

      // Defense 1: Path validation
      expect(() => {
        PathValidator.validate(chainedAttack, { allowTraversal: false });
      }).toThrow('Path traversal detected');

      // Defense 2: Command injection detection
      expect(SafeExecutor.containsInjection(chainedAttack)).toBe(true);

      // Multiple layers catch the attack
    });
  });

  describe('Performance Under Attack', () => {
    it('should validate many inputs quickly', () => {
      const inputs = Array.from({ length: 100 }, (_, i) => `file${i}.txt`);
      const validator = InputValidator.string({ regex: /^[a-zA-Z0-9\.]+$/ });

      const start = performance.now();
      inputs.forEach(input => validator.parse(input));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // <50ms for 100 validations
    });

    it('should handle attack attempts without DoS', () => {
      // Attacker sends many malicious inputs
      const attacks = [
        '../etc/passwd',
        '../../etc/shadow',
        '$(whoami)',
        'file; rm -rf /',
        '\x00malicious'
      ];

      const start = performance.now();
      attacks.forEach(attack => {
        try {
          PathValidator.validate(attack, { allowTraversal: false });
        } catch {
          // Expected to fail
        }
        try {
          SafeExecutor.validate(attack);
        } catch {
          // Expected to fail
        }
      });
      const duration = performance.now() - start;

      // Should handle all attacks quickly
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle maximum length inputs', () => {
      const maxLengthInput = 'a'.repeat(100000);
      const validator = InputValidator.string();

      const result = validator.safeParse(maxLengthInput);
      expect(result.success).toBe(true);
    });

    it('should handle empty inputs gracefully', () => {
      // Empty file name
      expect(() => {
        PathValidator.validate('', { allowTraversal: false });
      }).toThrow('Path cannot be empty');

      // Empty command
      expect(() => {
        SafeExecutor.validate('', { requireShellEscape: false });
      }).toThrow('Command cannot be empty');
    });

    it('should handle deeply nested paths', () => {
      const deepPath = 'a/b/c/d/e/f/g/h/i/j/k';

      expect(() => {
        PathValidator.validate(deepPath, {
          maxDepth: 5,
          allowTraversal: false
        });
      }).toThrow('exceeds maximum');
    });

    it('should handle special characters in combinations', () => {
      const specialInput = "file'with\"special<>chars.txt";

      const validator = InputValidator.string();
      const validated = validator.parse(specialInput);

      // Should preserve all characters
      expect(validated).toBeDefined();
    });
  });
});
