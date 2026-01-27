# DDD-007 UPDATE: CLI Framework Critical Gaps Domain Model

**Status:** Proposed
**Created:** 2026-01-27
**Author:** DDD Domain Expert Agent
**Domain:** CLI Framework - Critical Security, Plugin, and Learning Extensions
**Related:** DDD-007, ADR-025, CLI-FRAMEWORK-PACKAGE-REVIEW.md
**Package:** `@claude-flow/cli-framework`

---

## Executive Summary

This document extends DDD-007 with domain models for three critical gaps identified in the CLI Framework Package Review (Phase 3.2):

1. **Security Domain Integration** (~100 lines) - Automatic input validation, path sanitization, command injection prevention
2. **Plugin Sandbox Domain** (~450 lines) - Secure plugin execution with permission models and resource limits
3. **Learning Integration Domain** (~100 lines) - Command pattern storage, usage tracking, MoE routing

These extensions transform the CLI framework from a basic command executor into a secure, extensible, and intelligent system with automatic security validation, sandboxed plugins, and adaptive learning capabilities.

**Key Innovations**:
- **Security-by-default**: Every command input automatically validated via middleware
- **VM2-style sandboxing**: Plugins execute in isolated contexts with fine-grained permissions
- **Learning-enhanced UX**: Command suggestions, error pattern recognition, cost optimization via MoE routing

---

## Table of Contents

1. [Security Domain Integration](#1-security-domain-integration)
2. [Plugin Sandbox Domain](#2-plugin-sandbox-domain)
3. [Learning Integration Domain](#3-learning-integration-domain)
4. [Integration Patterns](#4-integration-patterns)
5. [Event Catalog](#5-event-catalog)
6. [Implementation Guidelines](#6-implementation-guidelines)

---

## 1. Security Domain Integration

### 1.1 Strategic Context

**Domain Type**: Supporting
**Relationship**: CLIFramework → SecurityValidation (Customer-Supplier)
**Integration Pattern**: Middleware with automatic validation

**Purpose**: Protect all CLI commands from common vulnerabilities (path traversal, command injection, malicious input) via automatic validation middleware.

### 1.2 Aggregate Root: SecurityMiddleware

**Identity**: Unique per CommandRegistry
**Invariants**:
1. All file path arguments must be validated before command execution
2. String inputs must be sanitized for injection patterns
3. Dangerous operations require AIDefence scan approval
4. Security errors must return exit code 1 with clear messages

**Lifecycle**:
```
Created → Registered → Validating → Approved/Rejected → Completed
```

**Aggregate Definition**:

```typescript
/**
 * Aggregate Root: SecurityMiddleware
 *
 * Enforces security validation for all CLI commands via middleware pattern.
 * Integrates with @claude-flow/security package for input validation.
 *
 * @security
 * Prevents path traversal, command injection, and malicious input patterns.
 *
 * @performance
 * - Validation overhead: ~5-10ms per command
 * - Cached validation results for repeated inputs
 *
 * @terminal Example with security validation
 * ```bash
 * $ agentscope exec "rm -rf /"
 * ✗ Security Error: Command injection detected
 * Exit code: 1
 * ```
 */
interface SecurityMiddleware {
  // Identity
  readonly id: SecurityMiddlewareId;
  readonly registryId: RegistryId;

  // Configuration
  readonly config: SecurityConfig;
  readonly validator: InputValidator;
  readonly pathValidator: PathValidator;
  readonly safeExecutor: SafeExecutor;

  // Aggregate behavior
  middleware(): CommandMiddleware;
  validateInput(input: string, constraints: ValidationConstraints): ValidationResult;
  validatePath(path: string, options: PathValidationOptions): ValidationResult;
  sanitizeCommand(command: string): string;
  scanForThreats(context: CommandContext): Promise<SecurityScanResult>;

  // Event sourcing
  raiseEvent(event: SecurityDomainEvent): void;
}

/**
 * Security Configuration (Value Object)
 */
interface SecurityConfig {
  readonly enablePathValidation: boolean;
  readonly enableInjectionPrevention: boolean;
  readonly enableAIDefenceScanning: boolean;
  readonly scanDangerousOperations: boolean;
  readonly maxInputLength: number;
  readonly allowedPathPatterns: RegExp[];
  readonly blockedCommandPatterns: RegExp[];
}

/**
 * Implementation
 */
class SecurityMiddlewareImpl implements SecurityMiddleware {
  constructor(
    public readonly id: SecurityMiddlewareId,
    public readonly registryId: RegistryId,
    public readonly config: SecurityConfig,
    public readonly validator: InputValidator,
    public readonly pathValidator: PathValidator,
    public readonly safeExecutor: SafeExecutor
  ) {}

  middleware(): CommandMiddleware {
    return async (context: CommandContext, next: () => Promise<void>) => {
      const startTime = Date.now();

      try {
        // Step 1: Validate all file path arguments
        await this.validateFilePathArguments(context);

        // Step 2: Sanitize string inputs for injection patterns
        await this.sanitizeStringInputs(context);

        // Step 3: Scan dangerous operations via AIDefence
        if (context.command.security?.dangerousOperation) {
          await this.scanDangerousOperation(context);
        }

        // Step 4: Validate against custom security policies
        await this.applySecurityPolicies(context);

        const validationDuration = Date.now() - startTime;

        // Emit validation success event
        this.raiseEvent({
          type: 'SecurityValidationPassed',
          timestamp: new Date(),
          middlewareId: this.id,
          commandName: context.command.name,
          validationDuration
        });

        // Continue to command execution
        await next();

      } catch (error) {
        const validationDuration = Date.now() - startTime;

        // Emit validation failure event
        this.raiseEvent({
          type: 'SecurityValidationFailed',
          timestamp: new Date(),
          middlewareId: this.id,
          commandName: context.command.name,
          error: error.message,
          validationDuration
        });

        throw error;
      }
    };
  }

  validateInput(
    input: string,
    constraints: ValidationConstraints
  ): ValidationResult {
    // Delegate to InputValidator from @claude-flow/security
    return this.validator.sanitizeString(input, {
      maxLength: constraints.maxLength || this.config.maxInputLength,
      allowedPatterns: constraints.pattern,
      stripHtml: true,
      preventXSS: true
    });
  }

  validatePath(
    path: string,
    options: PathValidationOptions
  ): ValidationResult {
    // Delegate to PathValidator from @claude-flow/security
    return this.pathValidator.validatePath(path, {
      allowAbsolute: options.allowAbsolute ?? true,
      preventTraversal: options.preventTraversal ?? true,
      allowedExtensions: options.allowedExtensions,
      maxDepth: options.maxDepth
    });
  }

  sanitizeCommand(command: string): string {
    // Delegate to SafeExecutor from @claude-flow/security
    return this.safeExecutor.sanitizeCommand(command);
  }

  async scanForThreats(
    context: CommandContext
  ): Promise<SecurityScanResult> {
    // Scan command via AIDefence
    const scanResult = await execAsync(
      `npx @claude-flow/cli@latest aidefence scan \\
        --input "${context.command.name}" \\
        --context '${JSON.stringify(context.args)}' \\
        --quick true`
    );

    return {
      passed: scanResult.exitCode === 0,
      threats: scanResult.exitCode !== 0 ? [scanResult.stderr] : [],
      score: scanResult.exitCode === 0 ? 1.0 : 0.0
    };
  }

  private async validateFilePathArguments(
    context: CommandContext
  ): Promise<void> {
    if (!this.config.enablePathValidation) return;

    for (const [key, value] of Object.entries(context.args)) {
      const argDef = context.command.arguments.find(a => a.name === key);

      if (argDef?.type === 'path' && typeof value === 'string') {
        const result = this.pathValidator.validatePath(value, {
          allowAbsolute: true,
          preventTraversal: true
        });

        if (!result.valid) {
          throw new SecurityError(
            `Path traversal detected in argument '${key}': ${result.error}`,
            'PATH_TRAVERSAL'
          );
        }
      }
    }
  }

  private async sanitizeStringInputs(
    context: CommandContext
  ): Promise<void> {
    if (!this.config.enableInjectionPrevention) return;

    for (const [key, value] of Object.entries(context.args)) {
      if (typeof value === 'string') {
        const sanitized = this.validator.sanitizeString(value, {
          maxLength: this.config.maxInputLength,
          stripHtml: true,
          preventXSS: true
        });

        if (sanitized !== value) {
          console.warn(
            `[Security] Sanitized input for '${key}': potential injection attempt`
          );
          context.args[key] = sanitized;

          // Emit sanitization event
          this.raiseEvent({
            type: 'InputSanitized',
            timestamp: new Date(),
            middlewareId: this.id,
            field: key,
            original: value,
            sanitized
          });
        }
      }
    }
  }

  private async scanDangerousOperation(
    context: CommandContext
  ): Promise<void> {
    if (!this.config.enableAIDefenceScanning) return;

    const scanResult = await this.scanForThreats(context);

    if (!scanResult.passed) {
      throw new SecurityError(
        `Command '${context.command.name}' failed security scan: ${scanResult.threats.join(', ')}`,
        'AIDEFENCE_SCAN_FAILED'
      );
    }
  }

  private async applySecurityPolicies(
    context: CommandContext
  ): Promise<void> {
    // Check command-specific security policies
    if (context.command.security?.requireConfirmation) {
      // Interactive confirmation required for dangerous operations
      // Handled by InteractivePromptService
    }

    // Check rate limiting for API commands
    if (context.command.security?.rateLimit) {
      // Rate limiting handled by RateLimitMiddleware
    }
  }

  private raiseEvent(event: SecurityDomainEvent): void {
    // Event sourcing integration
    // Emit to event bus for learning and monitoring
  }
}
```

### 1.3 Value Objects

#### ValidationResult

```typescript
/**
 * Value Object: ValidationResult
 *
 * Immutable result of security validation.
 */
interface ValidationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly sanitized?: string;
  readonly confidence: number; // 0.0 to 1.0
}

/**
 * Factory for creating validation results
 */
class ValidationResultFactory {
  static success(original: string): ValidationResult {
    return {
      valid: true,
      confidence: 1.0
    };
  }

  static failure(error: string, confidence: number = 0.0): ValidationResult {
    return {
      valid: false,
      error,
      confidence
    };
  }

  static sanitized(
    original: string,
    sanitized: string,
    confidence: number = 0.9
  ): ValidationResult {
    return {
      valid: true,
      sanitized,
      confidence
    };
  }
}
```

#### CommandSecurityPolicy

```typescript
/**
 * Value Object: CommandSecurityPolicy
 *
 * Immutable security policy for a command.
 */
interface CommandSecurityPolicy {
  readonly dangerousOperation: boolean;
  readonly requireConfirmation: boolean;
  readonly requireAIDefenceScan: boolean;
  readonly rateLimit?: RateLimitConfig;
  readonly allowedPaths?: string[];
  readonly blockedPatterns?: RegExp[];
}

/**
 * Rate Limit Configuration
 */
interface RateLimitConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly blockDurationMs?: number;
}

/**
 * Factory for creating security policies
 */
class CommandSecurityPolicyFactory {
  static safe(): CommandSecurityPolicy {
    return {
      dangerousOperation: false,
      requireConfirmation: false,
      requireAIDefenceScan: false
    };
  }

  static dangerous(requireConfirmation: boolean = true): CommandSecurityPolicy {
    return {
      dangerousOperation: true,
      requireConfirmation,
      requireAIDefenceScan: true
    };
  }

  static rateLimited(
    maxRequests: number,
    windowMs: number
  ): CommandSecurityPolicy {
    return {
      dangerousOperation: false,
      requireConfirmation: false,
      requireAIDefenceScan: false,
      rateLimit: {
        maxRequests,
        windowMs
      }
    };
  }
}
```

### 1.4 Domain Events

```typescript
/**
 * Security Domain Events
 */
type SecurityDomainEvent =
  | SecurityValidationPassed
  | SecurityValidationFailed
  | InputSanitized
  | SecurityScanCompleted
  | SecurityViolationDetected;

/**
 * Event: SecurityValidationPassed
 */
interface SecurityValidationPassed {
  readonly type: 'SecurityValidationPassed';
  readonly timestamp: Date;
  readonly middlewareId: SecurityMiddlewareId;
  readonly commandName: string;
  readonly validationDuration: number;
}

/**
 * Event: SecurityValidationFailed
 */
interface SecurityValidationFailed {
  readonly type: 'SecurityValidationFailed';
  readonly timestamp: Date;
  readonly middlewareId: SecurityMiddlewareId;
  readonly commandName: string;
  readonly error: string;
  readonly validationDuration: number;
}

/**
 * Event: InputSanitized
 */
interface InputSanitized {
  readonly type: 'InputSanitized';
  readonly timestamp: Date;
  readonly middlewareId: SecurityMiddlewareId;
  readonly field: string;
  readonly original: string;
  readonly sanitized: string;
}

/**
 * Event: SecurityScanCompleted
 */
interface SecurityScanCompleted {
  readonly type: 'SecurityScanCompleted';
  readonly timestamp: Date;
  readonly middlewareId: SecurityMiddlewareId;
  readonly commandName: string;
  readonly passed: boolean;
  readonly threats: string[];
  readonly score: number;
}

/**
 * Event: SecurityViolationDetected
 */
interface SecurityViolationDetected {
  readonly type: 'SecurityViolationDetected';
  readonly timestamp: Date;
  readonly middlewareId: SecurityMiddlewareId;
  readonly commandName: string;
  readonly violationType: SecurityViolationType;
  readonly details: string;
}

type SecurityViolationType =
  | 'PATH_TRAVERSAL'
  | 'COMMAND_INJECTION'
  | 'XSS_ATTEMPT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AIDEFENCE_SCAN_FAILED';
```

### 1.5 Domain Service: SecurityValidationService

```typescript
/**
 * Domain Service: SecurityValidationService
 *
 * Coordinates security validation across multiple validators.
 */
interface SecurityValidationService {
  validateCommand(
    context: CommandContext,
    policies: CommandSecurityPolicy[]
  ): Promise<ValidationResult>;

  validateArgument(
    name: string,
    value: any,
    type: ArgumentType,
    constraints: ValidationConstraints
  ): ValidationResult;

  scanForVulnerabilities(
    command: CommandDefinition,
    args: Record<string, any>
  ): Promise<SecurityScanResult>;
}

/**
 * Implementation
 */
class SecurityValidationServiceImpl implements SecurityValidationService {
  constructor(
    private readonly validator: InputValidator,
    private readonly pathValidator: PathValidator,
    private readonly safeExecutor: SafeExecutor
  ) {}

  async validateCommand(
    context: CommandContext,
    policies: CommandSecurityPolicy[]
  ): Promise<ValidationResult> {
    // Aggregate validation results from all policies
    const results: ValidationResult[] = [];

    for (const policy of policies) {
      if (policy.dangerousOperation && policy.requireAIDefenceScan) {
        const scanResult = await this.scanForVulnerabilities(
          context.command,
          context.args
        );

        if (!scanResult.passed) {
          return ValidationResultFactory.failure(
            `Security scan failed: ${scanResult.threats.join(', ')}`,
            scanResult.score
          );
        }
      }

      if (policy.blockedPatterns) {
        for (const [key, value] of Object.entries(context.args)) {
          if (typeof value === 'string') {
            for (const pattern of policy.blockedPatterns) {
              if (pattern.test(value)) {
                return ValidationResultFactory.failure(
                  `Argument '${key}' matches blocked pattern: ${pattern}`,
                  0.0
                );
              }
            }
          }
        }
      }
    }

    return ValidationResultFactory.success('');
  }

  validateArgument(
    name: string,
    value: any,
    type: ArgumentType,
    constraints: ValidationConstraints
  ): ValidationResult {
    switch (type) {
      case 'path':
        return this.pathValidator.validatePath(value, {
          allowAbsolute: constraints.allowAbsolute ?? true,
          preventTraversal: constraints.preventTraversal ?? true,
          allowedExtensions: constraints.allowedExtensions
        });

      case 'string':
        return this.validator.sanitizeString(value, {
          maxLength: constraints.maxLength || 1000,
          allowedPatterns: constraints.pattern,
          stripHtml: true,
          preventXSS: true
        });

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return ValidationResultFactory.failure(
            `Argument '${name}' must be a number`,
            0.0
          );
        }

        if (constraints.min !== undefined && value < constraints.min) {
          return ValidationResultFactory.failure(
            `Argument '${name}' must be >= ${constraints.min}`,
            0.0
          );
        }

        if (constraints.max !== undefined && value > constraints.max) {
          return ValidationResultFactory.failure(
            `Argument '${name}' must be <= ${constraints.max}`,
            0.0
          );
        }

        return ValidationResultFactory.success('');

      default:
        return ValidationResultFactory.success('');
    }
  }

  async scanForVulnerabilities(
    command: CommandDefinition,
    args: Record<string, any>
  ): Promise<SecurityScanResult> {
    // Scan via AIDefence
    const scanResult = await execAsync(
      `npx @claude-flow/cli@latest aidefence scan \\
        --input "${command.name}" \\
        --context '${JSON.stringify(args)}' \\
        --quick true`
    );

    return {
      passed: scanResult.exitCode === 0,
      threats: scanResult.exitCode !== 0 ? [scanResult.stderr] : [],
      score: scanResult.exitCode === 0 ? 1.0 : 0.0
    };
  }
}
```

---

## 2. Plugin Sandbox Domain

### 2.1 Strategic Context

**Domain Type**: Core (differentiator for extensibility)
**Relationship**: CLIFramework → PluginSandbox (Aggregate)
**Integration Pattern**: VM2-style sandbox with permission model

**Purpose**: Enable secure third-party CLI plugins with fine-grained permissions, resource limits, and AIDefence validation.

### 2.2 Aggregate Root: SandboxedPlugin

**Identity**: Unique `PluginId`
**Invariants**:
1. Plugin code must pass AIDefence security scan before loading
2. Plugin execution must respect resource limits (CPU, memory, time)
3. Plugin permissions must be explicitly granted (no implicit access)
4. Plugin cannot access dangerous globals (eval, require, __dirname)
5. Plugin must declare all external dependencies

**Lifecycle**:
```
Discovered → Validated → Loaded → Executing → Completed/Failed → Unloaded
```

**Aggregate Definition**:

```typescript
/**
 * Aggregate Root: SandboxedPlugin
 *
 * Represents a CLI plugin executing in a sandboxed environment with permissions.
 *
 * @security
 * Executes in isolated VM context with no access to dangerous globals.
 * All file system, network, and process operations require explicit permissions.
 *
 * @performance
 * - Plugin loading: <100ms (includes security scan)
 * - Sandbox creation: ~10-20ms
 * - Execution overhead: ~5ms per command
 *
 * @terminal Example plugin installation
 * ```bash
 * $ agentscope plugin install my-plugin
 * Scanning plugin for security threats...
 * ✓ Security scan passed
 * ✓ Plugin installed: my-plugin@1.0.0
 *
 * $ agentscope my-plugin-command
 * Running in sandbox with permissions: filesystem:read, network:fetch
 * ✓ Command completed
 * ```
 */
interface SandboxedPlugin {
  // Identity
  readonly id: PluginId;
  readonly name: string;
  readonly version: string;

  // Aggregate state
  readonly metadata: PluginMetadata;
  readonly permissions: PluginPermission[];
  readonly resourceLimits: ResourceLimit;
  readonly code: string;
  readonly sandbox: PluginSandboxContext;
  readonly status: PluginStatus;

  // Aggregate behavior
  load(): Promise<void>;
  execute(args: Record<string, any>, opts: Record<string, any>): Promise<any>;
  unload(): void;
  validatePermission(action: string): boolean;
  checkResourceUsage(): ResourceUsage;

  // Event sourcing
  raiseEvent(event: PluginDomainEvent): void;
}

/**
 * Plugin Metadata (Value Object)
 */
interface PluginMetadata {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly license: string;
  readonly homepage?: string;
  readonly repository?: string;
  readonly keywords?: string[];
  readonly dependencies?: Record<string, string>;
  readonly codeHash: string; // SHA-256 hash for integrity
  readonly signature?: string; // Optional code signing
}

/**
 * Plugin Status
 */
type PluginStatus =
  | 'discovered'
  | 'validating'
  | 'validated'
  | 'loading'
  | 'loaded'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'unloaded';

/**
 * Implementation
 */
class SandboxedPluginImpl implements SandboxedPlugin {
  private sandbox?: PluginSandboxContext;
  private resourceMonitor?: ResourceMonitor;

  constructor(
    public readonly id: PluginId,
    public readonly name: string,
    public readonly version: string,
    public readonly metadata: PluginMetadata,
    public readonly permissions: PluginPermission[],
    public readonly resourceLimits: ResourceLimit,
    public readonly code: string,
    public status: PluginStatus = 'discovered'
  ) {}

  async load(): Promise<void> {
    const startTime = Date.now();

    try {
      // Step 1: Validate plugin code via AIDefence
      this.status = 'validating';
      await this.validateSecurity();

      // Step 2: Verify code integrity (hash check)
      await this.verifyIntegrity();

      // Step 3: Create sandbox context
      this.status = 'loading';
      this.sandbox = await this.createSandbox();

      // Step 4: Initialize resource monitor
      this.resourceMonitor = new ResourceMonitor(this.resourceLimits);

      this.status = 'loaded';

      const loadDuration = Date.now() - startTime;

      // Emit plugin loaded event
      this.raiseEvent({
        type: 'PluginLoaded',
        timestamp: new Date(),
        pluginId: this.id,
        pluginName: this.name,
        version: this.version,
        loadDuration
      });

    } catch (error) {
      this.status = 'failed';

      // Emit plugin load failed event
      this.raiseEvent({
        type: 'PluginLoadFailed',
        timestamp: new Date(),
        pluginId: this.id,
        pluginName: this.name,
        error: error.message
      });

      throw new PluginLoadError(`Failed to load plugin '${this.name}': ${error.message}`);
    }
  }

  async execute(
    args: Record<string, any>,
    opts: Record<string, any>
  ): Promise<any> {
    if (this.status !== 'loaded') {
      throw new PluginExecutionError(
        `Plugin '${this.name}' not loaded (status: ${this.status})`
      );
    }

    if (!this.sandbox) {
      throw new PluginExecutionError(`Sandbox not initialized for plugin '${this.name}'`);
    }

    this.status = 'executing';
    const startTime = Date.now();

    try {
      // Start resource monitoring
      this.resourceMonitor?.start();

      // Execute plugin in sandbox with timeout
      const timeout = setTimeout(() => {
        throw new PluginTimeoutError(
          `Plugin '${this.name}' exceeded time limit (${this.resourceLimits.maxExecutionTime}ms)`
        );
      }, this.resourceLimits.maxExecutionTime);

      const script = new vm.Script(this.code);
      const result = await script.runInContext(this.sandbox, {
        timeout: this.resourceLimits.maxExecutionTime
      });

      clearTimeout(timeout);

      // Stop resource monitoring
      const usage = this.resourceMonitor?.stop();

      // Check resource limits
      if (usage && usage.memoryUsed > this.resourceLimits.maxMemory) {
        throw new PluginResourceError(
          `Plugin '${this.name}' exceeded memory limit (${usage.memoryUsed} > ${this.resourceLimits.maxMemory})`
        );
      }

      this.status = 'completed';

      const executionDuration = Date.now() - startTime;

      // Emit plugin executed event
      this.raiseEvent({
        type: 'PluginExecuted',
        timestamp: new Date(),
        pluginId: this.id,
        pluginName: this.name,
        executionDuration,
        resourceUsage: usage
      });

      return result;

    } catch (error) {
      this.status = 'failed';

      // Emit plugin execution failed event
      this.raiseEvent({
        type: 'PluginExecutionFailed',
        timestamp: new Date(),
        pluginId: this.id,
        pluginName: this.name,
        error: error.message
      });

      throw error;
    }
  }

  unload(): void {
    if (this.sandbox) {
      // Clean up sandbox resources
      this.sandbox = undefined;
    }

    if (this.resourceMonitor) {
      this.resourceMonitor = undefined;
    }

    this.status = 'unloaded';

    // Emit plugin unloaded event
    this.raiseEvent({
      type: 'PluginUnloaded',
      timestamp: new Date(),
      pluginId: this.id,
      pluginName: this.name
    });
  }

  validatePermission(action: string): boolean {
    // Parse action: "domain:operation:resource"
    // Example: "filesystem:read:/path/to/file"
    const [domain, operation, resource] = action.split(':');

    // Find matching permission
    for (const permission of this.permissions) {
      if (permission.domain === domain) {
        // Check if operation is allowed
        if (!permission.operations.includes(operation)) {
          return false;
        }

        // Check if resource is allowed
        if (permission.resources) {
          const resourceAllowed = permission.resources.some(allowedResource => {
            if (typeof allowedResource === 'string') {
              return resource.startsWith(allowedResource);
            } else {
              return allowedResource.test(resource);
            }
          });

          if (!resourceAllowed) {
            return false;
          }
        }

        return true;
      }
    }

    return false;
  }

  checkResourceUsage(): ResourceUsage {
    return this.resourceMonitor?.getUsage() || {
      memoryUsed: 0,
      cpuTime: 0,
      executionTime: 0
    };
  }

  private async validateSecurity(): Promise<void> {
    // Scan plugin code via AIDefence
    const scanResult = await execAsync(
      `npx @claude-flow/cli@latest aidefence scan \\
        --input "${this.code}" \\
        --context "plugin:${this.name}@${this.version}"`
    );

    if (scanResult.exitCode !== 0) {
      throw new PluginSecurityError(
        `Plugin '${this.name}' failed security scan: ${scanResult.stderr}`
      );
    }
  }

  private async verifyIntegrity(): Promise<void> {
    // Calculate SHA-256 hash of code
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(this.code).digest('hex');

    if (hash !== this.metadata.codeHash) {
      throw new PluginIntegrityError(
        `Plugin '${this.name}' integrity check failed (hash mismatch)`
      );
    }

    // Verify signature if present
    if (this.metadata.signature) {
      // TODO: Implement signature verification
    }
  }

  private async createSandbox(): Promise<PluginSandboxContext> {
    // Create isolated sandbox with filtered globals
    const sandbox: PluginSandboxContext = {
      console: this.createFilteredConsole(),
      require: this.createFilteredRequire(),
      process: this.createFilteredProcess(),
      setTimeout: global.setTimeout,
      setInterval: global.setInterval,
      clearTimeout: global.clearTimeout,
      clearInterval: global.clearInterval,
      // NO ACCESS to: eval, Function, __dirname, __filename, require.cache
    };

    return vm.createContext(sandbox);
  }

  private createFilteredConsole(): Console {
    // Only allow safe console methods
    return {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      // NO ACCESS to: console.clear, console.trace
    } as Console;
  }

  private createFilteredRequire(): NodeRequire {
    return ((moduleName: string) => {
      // Check if module is in allowed dependencies
      if (!this.metadata.dependencies?.[moduleName]) {
        throw new PluginPermissionError(
          `Plugin '${this.name}' attempted to require unauthorized module: ${moduleName}`
        );
      }

      // Only allow safe built-in modules
      const safModules = ['path', 'url', 'querystring', 'util'];
      if (!safModules.includes(moduleName)) {
        throw new PluginPermissionError(
          `Plugin '${this.name}' attempted to require unsafe module: ${moduleName}`
        );
      }

      return require(moduleName);
    }) as NodeRequire;
  }

  private createFilteredProcess(): Partial<NodeJS.Process> {
    // Only expose safe process properties
    return {
      env: { ...process.env }, // Read-only copy
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      // NO ACCESS to: process.exit, process.kill, process.chdir
    };
  }

  private raiseEvent(event: PluginDomainEvent): void {
    // Event sourcing integration
  }
}
```

### 2.3 Value Objects

#### PluginPermission

```typescript
/**
 * Value Object: PluginPermission
 *
 * Immutable permission granted to a plugin.
 */
interface PluginPermission {
  readonly domain: PermissionDomain;
  readonly operations: string[];
  readonly resources?: Array<string | RegExp>;
}

type PermissionDomain =
  | 'filesystem'
  | 'network'
  | 'process'
  | 'cli'
  | 'environment';

/**
 * Factory for creating plugin permissions
 */
class PluginPermissionFactory {
  static filesystemRead(paths: string[]): PluginPermission {
    return {
      domain: 'filesystem',
      operations: ['read'],
      resources: paths
    };
  }

  static filesystemWrite(paths: string[]): PluginPermission {
    return {
      domain: 'filesystem',
      operations: ['write'],
      resources: paths
    };
  }

  static networkFetch(urls: Array<string | RegExp>): PluginPermission {
    return {
      domain: 'network',
      operations: ['fetch'],
      resources: urls
    };
  }

  static cliExecute(commands: string[]): PluginPermission {
    return {
      domain: 'cli',
      operations: ['execute'],
      resources: commands
    };
  }

  static environmentRead(variables: string[]): PluginPermission {
    return {
      domain: 'environment',
      operations: ['read'],
      resources: variables
    };
  }
}
```

#### ResourceLimit

```typescript
/**
 * Value Object: ResourceLimit
 *
 * Immutable resource limits for plugin execution.
 */
interface ResourceLimit {
  readonly maxMemory: number; // bytes
  readonly maxCpuTime: number; // milliseconds
  readonly maxExecutionTime: number; // milliseconds
  readonly maxFileSize: number; // bytes
  readonly maxNetworkRequests: number;
}

/**
 * Factory for creating resource limits
 */
class ResourceLimitFactory {
  static default(): ResourceLimit {
    return {
      maxMemory: 50 * 1024 * 1024, // 50 MB
      maxCpuTime: 5000, // 5 seconds
      maxExecutionTime: 10000, // 10 seconds
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      maxNetworkRequests: 10
    };
  }

  static strict(): ResourceLimit {
    return {
      maxMemory: 10 * 1024 * 1024, // 10 MB
      maxCpuTime: 1000, // 1 second
      maxExecutionTime: 2000, // 2 seconds
      maxFileSize: 1 * 1024 * 1024, // 1 MB
      maxNetworkRequests: 5
    };
  }

  static relaxed(): ResourceLimit {
    return {
      maxMemory: 200 * 1024 * 1024, // 200 MB
      maxCpuTime: 30000, // 30 seconds
      maxExecutionTime: 60000, // 1 minute
      maxFileSize: 100 * 1024 * 1024, // 100 MB
      maxNetworkRequests: 50
    };
  }
}
```

### 2.4 Domain Events

```typescript
/**
 * Plugin Domain Events
 */
type PluginDomainEvent =
  | PluginLoaded
  | PluginLoadFailed
  | PluginExecuted
  | PluginExecutionFailed
  | PluginUnloaded
  | SandboxViolation;

/**
 * Event: PluginLoaded
 */
interface PluginLoaded {
  readonly type: 'PluginLoaded';
  readonly timestamp: Date;
  readonly pluginId: PluginId;
  readonly pluginName: string;
  readonly version: string;
  readonly loadDuration: number;
}

/**
 * Event: PluginLoadFailed
 */
interface PluginLoadFailed {
  readonly type: 'PluginLoadFailed';
  readonly timestamp: Date;
  readonly pluginId: PluginId;
  readonly pluginName: string;
  readonly error: string;
}

/**
 * Event: PluginExecuted
 */
interface PluginExecuted {
  readonly type: 'PluginExecuted';
  readonly timestamp: Date;
  readonly pluginId: PluginId;
  readonly pluginName: string;
  readonly executionDuration: number;
  readonly resourceUsage?: ResourceUsage;
}

/**
 * Event: PluginExecutionFailed
 */
interface PluginExecutionFailed {
  readonly type: 'PluginExecutionFailed';
  readonly timestamp: Date;
  readonly pluginId: PluginId;
  readonly pluginName: string;
  readonly error: string;
}

/**
 * Event: PluginUnloaded
 */
interface PluginUnloaded {
  readonly type: 'PluginUnloaded';
  readonly timestamp: Date;
  readonly pluginId: PluginId;
  readonly pluginName: string;
}

/**
 * Event: SandboxViolation
 */
interface SandboxViolation {
  readonly type: 'SandboxViolation';
  readonly timestamp: Date;
  readonly pluginId: PluginId;
  readonly pluginName: string;
  readonly violationType: SandboxViolationType;
  readonly details: string;
}

type SandboxViolationType =
  | 'UNAUTHORIZED_MODULE'
  | 'PERMISSION_DENIED'
  | 'RESOURCE_LIMIT_EXCEEDED'
  | 'SECURITY_SCAN_FAILED'
  | 'INTEGRITY_CHECK_FAILED';
```

### 2.5 Domain Service: SandboxExecutionService

```typescript
/**
 * Domain Service: SandboxExecutionService
 *
 * Manages sandboxed execution of plugins with permission checks.
 */
interface SandboxExecutionService {
  executePlugin(
    plugin: SandboxedPlugin,
    context: PluginExecutionContext
  ): Promise<any>;

  validatePermissions(
    plugin: SandboxedPlugin,
    requestedActions: string[]
  ): PermissionValidationResult;

  monitorResourceUsage(
    plugin: SandboxedPlugin,
    callback: (usage: ResourceUsage) => void
  ): ResourceMonitorHandle;

  createSandbox(
    permissions: PluginPermission[],
    limits: ResourceLimit
  ): PluginSandboxContext;
}

/**
 * Plugin Execution Context
 */
interface PluginExecutionContext {
  readonly command: CommandDefinition;
  readonly args: Record<string, any>;
  readonly options: Record<string, any>;
  readonly environment: Record<string, string>;
}

/**
 * Permission Validation Result
 */
interface PermissionValidationResult {
  readonly allowed: boolean;
  readonly deniedActions: string[];
  readonly reason?: string;
}

/**
 * Resource Monitor Handle
 */
interface ResourceMonitorHandle {
  stop(): ResourceUsage;
  getUsage(): ResourceUsage;
}

/**
 * Resource Usage
 */
interface ResourceUsage {
  readonly memoryUsed: number; // bytes
  readonly cpuTime: number; // milliseconds
  readonly executionTime: number; // milliseconds
}

/**
 * Implementation
 */
class SandboxExecutionServiceImpl implements SandboxExecutionService {
  async executePlugin(
    plugin: SandboxedPlugin,
    context: PluginExecutionContext
  ): Promise<any> {
    // Ensure plugin is loaded
    if (plugin.status !== 'loaded' && plugin.status !== 'completed') {
      await plugin.load();
    }

    // Execute plugin
    return await plugin.execute(context.args, context.options);
  }

  validatePermissions(
    plugin: SandboxedPlugin,
    requestedActions: string[]
  ): PermissionValidationResult {
    const deniedActions: string[] = [];

    for (const action of requestedActions) {
      if (!plugin.validatePermission(action)) {
        deniedActions.push(action);
      }
    }

    return {
      allowed: deniedActions.length === 0,
      deniedActions,
      reason: deniedActions.length > 0
        ? `Plugin lacks permissions for: ${deniedActions.join(', ')}`
        : undefined
    };
  }

  monitorResourceUsage(
    plugin: SandboxedPlugin,
    callback: (usage: ResourceUsage) => void
  ): ResourceMonitorHandle {
    const monitor = new ResourceMonitor(plugin.resourceLimits);

    // Periodically check usage
    const interval = setInterval(() => {
      const usage = plugin.checkResourceUsage();
      callback(usage);
    }, 100); // Check every 100ms

    return {
      stop: () => {
        clearInterval(interval);
        return plugin.checkResourceUsage();
      },
      getUsage: () => plugin.checkResourceUsage()
    };
  }

  createSandbox(
    permissions: PluginPermission[],
    limits: ResourceLimit
  ): PluginSandboxContext {
    // Create VM context with filtered globals based on permissions
    const sandbox: any = {
      console: this.createFilteredConsole(),
      setTimeout: global.setTimeout,
      setInterval: global.setInterval,
      clearTimeout: global.clearTimeout,
      clearInterval: global.clearInterval
    };

    // Add require if permissions allow
    const hasModulePermission = permissions.some(
      p => p.domain === 'environment' && p.operations.includes('require')
    );

    if (hasModulePermission) {
      sandbox.require = this.createFilteredRequire(permissions);
    }

    return vm.createContext(sandbox);
  }

  private createFilteredConsole(): Console {
    return {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error
    } as Console;
  }

  private createFilteredRequire(permissions: PluginPermission[]): NodeRequire {
    return ((moduleName: string) => {
      // Check permissions
      const allowed = permissions.some(
        p =>
          p.domain === 'environment' &&
          p.operations.includes('require') &&
          (!p.resources ||
            p.resources.some(r =>
              typeof r === 'string' ? r === moduleName : r.test(moduleName)
            ))
      );

      if (!allowed) {
        throw new PluginPermissionError(
          `Permission denied: require('${moduleName}')`
        );
      }

      return require(moduleName);
    }) as NodeRequire;
  }
}
```

---

## 3. Learning Integration Domain

### 3.1 Strategic Context

**Domain Type**: Supporting
**Relationship**: CLIFramework → ReasoningBank (Customer-Supplier)
**Integration Pattern**: Middleware with pattern storage and retrieval

**Purpose**: Store command patterns, suggest frequently-used commands, recognize error patterns, and route AI-assisted commands via MoE for cost optimization.

### 3.2 Entity: CommandPattern

**Identity**: Unique `PatternId`
**Purpose**: Record successful command executions for learning and suggestions.

```typescript
/**
 * Entity: CommandPattern
 *
 * Represents a learned command execution pattern for suggestions.
 *
 * @performance
 * - Pattern storage: <10ms via AgentDB HNSW
 * - Pattern search: <10ms via HNSW indexing (150x faster)
 *
 * @terminal Example command suggestion
 * ```bash
 * $ agentscope suggest scan
 * Based on your usage patterns:
 *   $ agentscope scan --output ./docs --theme dark
 *   $ agentscope scan --format json
 * ```
 */
interface CommandPattern {
  // Identity
  readonly id: PatternId;

  // Attributes
  readonly command: string;
  readonly args: Record<string, any>;
  readonly options: Record<string, any>;
  readonly timestamp: Date;
  readonly duration: number;
  readonly success: boolean;
  readonly frequency: number; // How often this pattern is used

  // Behavior
  toString(): string;
  similarity(other: CommandPattern): number; // 0.0 to 1.0
}

/**
 * Implementation
 */
class CommandPatternImpl implements CommandPattern {
  constructor(
    public readonly id: PatternId,
    public readonly command: string,
    public readonly args: Record<string, any>,
    public readonly options: Record<string, any>,
    public readonly timestamp: Date,
    public readonly duration: number,
    public readonly success: boolean,
    public readonly frequency: number = 1
  ) {}

  toString(): string {
    const argString = Object.entries(this.args)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');

    const optString = Object.entries(this.options)
      .map(([k, v]) => `--${k}=${v}`)
      .join(' ');

    return `${this.command} ${argString} ${optString}`.trim();
  }

  similarity(other: CommandPattern): number {
    // Calculate similarity score based on:
    // 1. Command name match (50%)
    // 2. Argument similarity (25%)
    // 3. Option similarity (25%)

    let score = 0.0;

    // Command name match
    if (this.command === other.command) {
      score += 0.5;
    }

    // Argument similarity (Jaccard similarity)
    const thisArgs = new Set(Object.keys(this.args));
    const otherArgs = new Set(Object.keys(other.args));
    const argIntersection = new Set(
      [...thisArgs].filter(x => otherArgs.has(x))
    );
    const argUnion = new Set([...thisArgs, ...otherArgs]);

    if (argUnion.size > 0) {
      score += 0.25 * (argIntersection.size / argUnion.size);
    }

    // Option similarity
    const thisOpts = new Set(Object.keys(this.options));
    const otherOpts = new Set(Object.keys(other.options));
    const optIntersection = new Set(
      [...thisOpts].filter(x => otherOpts.has(x))
    );
    const optUnion = new Set([...thisOpts, ...otherOpts]);

    if (optUnion.size > 0) {
      score += 0.25 * (optIntersection.size / optUnion.size);
    }

    return score;
  }
}
```

### 3.3 Value Object: CommandSuggestion

```typescript
/**
 * Value Object: CommandSuggestion
 *
 * Immutable command suggestion based on learned patterns.
 */
interface CommandSuggestion {
  readonly pattern: CommandPattern;
  readonly confidence: number; // 0.0 to 1.0
  readonly reason: string;
}

/**
 * Factory for creating command suggestions
 */
class CommandSuggestionFactory {
  static fromPattern(
    pattern: CommandPattern,
    confidence: number,
    reason: string
  ): CommandSuggestion {
    return {
      pattern,
      confidence,
      reason
    };
  }

  static frequentlyUsed(pattern: CommandPattern): CommandSuggestion {
    return {
      pattern,
      confidence: Math.min(pattern.frequency / 10, 1.0),
      reason: `Used ${pattern.frequency} times`
    };
  }

  static recentSuccess(pattern: CommandPattern): CommandSuggestion {
    const hoursSince = (Date.now() - pattern.timestamp.getTime()) / (1000 * 60 * 60);
    const confidence = Math.max(1.0 - hoursSince / 24, 0.3);

    return {
      pattern,
      confidence,
      reason: `Succeeded ${Math.round(hoursSince)} hours ago`
    };
  }
}
```

### 3.4 Domain Events

```typescript
/**
 * Learning Domain Events
 */
type LearningDomainEvent =
  | PatternLearned
  | PatternRetrieved
  | CommandSuggested
  | ErrorPatternRecognized;

/**
 * Event: PatternLearned
 */
interface PatternLearned {
  readonly type: 'PatternLearned';
  readonly timestamp: Date;
  readonly patternId: PatternId;
  readonly command: string;
  readonly success: boolean;
}

/**
 * Event: PatternRetrieved
 */
interface PatternRetrieved {
  readonly type: 'PatternRetrieved';
  readonly timestamp: Date;
  readonly query: string;
  readonly patternsFound: number;
  readonly searchDuration: number;
}

/**
 * Event: CommandSuggested
 */
interface CommandSuggested {
  readonly type: 'CommandSuggested';
  readonly timestamp: Date;
  readonly query: string;
  readonly suggestions: CommandSuggestion[];
}

/**
 * Event: ErrorPatternRecognized
 */
interface ErrorPatternRecognized {
  readonly type: 'ErrorPatternRecognized';
  readonly timestamp: Date;
  readonly error: string;
  readonly suggestion?: string;
}
```

### 3.5 Domain Service: CommandPatternService

```typescript
/**
 * Domain Service: CommandPatternService
 *
 * Manages command pattern storage, retrieval, and suggestions.
 */
interface CommandPatternService {
  storePattern(pattern: CommandPattern): Promise<void>;
  searchPatterns(query: string, limit?: number): Promise<CommandPattern[]>;
  suggestCommands(query: string): Promise<CommandSuggestion[]>;
  recognizeError(error: string): Promise<string | null>;
  routeToOptimalModel(task: string): Promise<string>;
}

/**
 * Implementation
 */
class CommandPatternServiceImpl implements CommandPatternService {
  async storePattern(pattern: CommandPattern): Promise<void> {
    // Store in AgentDB via claude-flow hooks
    await execAsync(
      `npx @claude-flow/cli@latest memory store \\
        --key "command-pattern-${pattern.id}" \\
        --namespace command-patterns \\
        --value '${JSON.stringify({
          command: pattern.command,
          args: pattern.args,
          options: pattern.options,
          timestamp: pattern.timestamp.toISOString(),
          duration: pattern.duration,
          success: pattern.success,
          frequency: pattern.frequency
        })}'`
    );
  }

  async searchPatterns(
    query: string,
    limit: number = 5
  ): Promise<CommandPattern[]> {
    const startTime = Date.now();

    // Search via HNSW (<10ms)
    const result = await execAsync(
      `npx @claude-flow/cli@latest memory search \\
        --query "${query}" \\
        --namespace command-patterns \\
        --limit ${limit}`
    );

    const searchDuration = Date.now() - startTime;

    const patterns = JSON.parse(result.stdout || '[]').map((p: any) =>
      new CommandPatternImpl(
        p.id,
        p.command,
        p.args,
        p.options,
        new Date(p.timestamp),
        p.duration,
        p.success,
        p.frequency
      )
    );

    return patterns;
  }

  async suggestCommands(query: string): Promise<CommandSuggestion[]> {
    // Search for similar patterns
    const patterns = await this.searchPatterns(query, 10);

    // Convert to suggestions with confidence scores
    const suggestions = patterns.map(pattern => {
      // Higher confidence for frequently-used and recent successful patterns
      const frequencyScore = Math.min(pattern.frequency / 10, 0.5);
      const recencyScore = this.calculateRecencyScore(pattern.timestamp);
      const successScore = pattern.success ? 0.3 : 0.0;

      const confidence = frequencyScore + recencyScore + successScore;

      return CommandSuggestionFactory.fromPattern(
        pattern,
        Math.min(confidence, 1.0),
        this.generateReason(pattern)
      );
    });

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  async recognizeError(error: string): Promise<string | null> {
    // Search for similar error patterns
    const result = await execAsync(
      `npx @claude-flow/cli@latest memory search \\
        --query "${error}" \\
        --namespace error-patterns \\
        --limit 1`
    );

    const patterns = JSON.parse(result.stdout || '[]');

    if (patterns.length > 0 && patterns[0].suggestion) {
      return patterns[0].suggestion;
    }

    return null;
  }

  async routeToOptimalModel(task: string): Promise<string> {
    // Use MoE router for cost optimization (75% reduction)
    const result = await execAsync(
      `npx @claude-flow/cli@latest hooks route \\
        --task "${task}" \\
        --context "CLI command"`
    );

    // Returns: "haiku" (cheap, fast), "sonnet" (complex), or "opus" (critical)
    return result.stdout.trim();
  }

  private calculateRecencyScore(timestamp: Date): number {
    const hoursSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);

    if (hoursSince < 1) return 0.3;
    if (hoursSince < 24) return 0.2;
    if (hoursSince < 168) return 0.1; // 1 week
    return 0.0;
  }

  private generateReason(pattern: CommandPattern): string {
    const reasons: string[] = [];

    if (pattern.frequency > 5) {
      reasons.push(`Used ${pattern.frequency} times`);
    }

    const hoursSince = (Date.now() - pattern.timestamp.getTime()) / (1000 * 60 * 60);

    if (hoursSince < 24) {
      reasons.push(`Recent (${Math.round(hoursSince)}h ago)`);
    }

    if (pattern.success) {
      reasons.push('Succeeded');
    } else {
      reasons.push('Failed previously');
    }

    return reasons.join(', ');
  }
}
```

---

## 4. Integration Patterns

### 4.1 Middleware Chain

```typescript
/**
 * CLI Middleware Chain
 *
 * Middleware executes in order:
 * 1. SecurityMiddleware - Validate inputs
 * 2. PerformanceMiddleware - Track metrics
 * 3. LearningMiddleware - Store patterns
 * 4. Command execution
 */
class MiddlewareChain {
  private middlewares: CommandMiddleware[] = [];

  use(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware);
  }

  async execute(context: CommandContext): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(context, next);
      } else {
        // Execute actual command
        await context.command.action(context.args, context.options);
      }
    };

    await next();
  }
}

/**
 * Usage in CommandRegistry
 */
const registry = new CommandRegistry('agentscope', '1.2.0');

// Register middlewares
registry.use(securityMiddleware.middleware());
registry.use(performanceMiddleware.middleware());
registry.use(learningMiddleware.middleware());

// Commands now automatically get:
// - Security validation
// - Performance tracking
// - Pattern learning
```

### 4.2 Plugin Registration

```typescript
/**
 * Plugin Registry Integration
 *
 * Plugins register as commands with sandboxed execution.
 */
class PluginRegistry {
  private plugins: Map<string, SandboxedPlugin> = new Map();

  async registerPlugin(plugin: SandboxedPlugin): Promise<void> {
    // Load and validate plugin
    await plugin.load();

    // Register as CLI command
    registry.register({
      name: plugin.name,
      description: plugin.metadata.description,
      arguments: [], // Plugin defines args
      options: [], // Plugin defines opts
      action: async (args, opts) => {
        // Execute in sandbox
        const executor = new SandboxExecutionServiceImpl();
        return await executor.executePlugin(plugin, {
          command: { name: plugin.name } as CommandDefinition,
          args,
          options: opts,
          environment: process.env as Record<string, string>
        });
      }
    });

    this.plugins.set(plugin.name, plugin);
  }

  unregisterPlugin(name: string): void {
    const plugin = this.plugins.get(name);

    if (plugin) {
      plugin.unload();
      this.plugins.delete(name);
      registry.unregister(name);
    }
  }
}
```

### 4.3 Learning-Enhanced Command Execution

```typescript
/**
 * Learning Middleware
 *
 * Automatically stores successful patterns and suggests commands.
 */
class LearningMiddleware {
  constructor(private patternService: CommandPatternService) {}

  middleware(): CommandMiddleware {
    return async (context: CommandContext, next: () => Promise<void>) => {
      const startTime = Date.now();

      try {
        // Execute command
        await next();

        const duration = Date.now() - startTime;

        // Store successful pattern
        const pattern = new CommandPatternImpl(
          uuidv4(),
          context.command.name,
          context.args,
          context.options,
          new Date(),
          duration,
          true,
          1
        );

        await this.patternService.storePattern(pattern);

      } catch (error) {
        // Store failure for error pattern recognition
        await this.patternService.storePattern(
          new CommandPatternImpl(
            uuidv4(),
            context.command.name,
            context.args,
            context.options,
            new Date(),
            Date.now() - startTime,
            false,
            1
          )
        );

        // Check for known error patterns
        const suggestion = await this.patternService.recognizeError(error.message);

        if (suggestion) {
          console.log(`\n💡 Suggestion: ${suggestion}`);
        }

        throw error;
      }
    };
  }
}
```

---

## 5. Event Catalog

### 5.1 Complete Event Type Hierarchy

```typescript
/**
 * All CLI Framework Domain Events
 */
type CLIFrameworkDomainEvent =
  | CLIDomainEvent // From DDD-007
  | SecurityDomainEvent
  | PluginDomainEvent
  | LearningDomainEvent;

/**
 * Event Bus Integration
 */
interface EventBus {
  publish(event: CLIFrameworkDomainEvent): void;
  subscribe(
    eventType: string,
    handler: (event: CLIFrameworkDomainEvent) => void
  ): void;
}

/**
 * Example: Security event triggers learning
 */
eventBus.subscribe('SecurityValidationFailed', (event) => {
  // Learn from security failures
  if (event.type === 'SecurityValidationFailed') {
    console.warn(`[Security] Command ${event.commandName} failed validation`);

    // Store error pattern for future suggestions
    patternService.storePattern({
      id: uuidv4(),
      command: event.commandName,
      args: {},
      options: {},
      timestamp: event.timestamp,
      duration: event.validationDuration,
      success: false,
      frequency: 1
    });
  }
});
```

---

## 6. Implementation Guidelines

### 6.1 Directory Structure

```
src/cli-framework/
  security/
    security-middleware.ts          # SecurityMiddleware aggregate
    security-validation-service.ts  # SecurityValidationService
    values/
      validation-result.ts
      command-security-policy.ts

  plugins/
    sandboxed-plugin.ts             # SandboxedPlugin aggregate
    sandbox-execution-service.ts    # SandboxExecutionService
    plugin-registry.ts              # Plugin management
    values/
      plugin-permission.ts
      resource-limit.ts

  learning/
    command-pattern.ts              # CommandPattern entity
    command-pattern-service.ts      # CommandPatternService
    learning-middleware.ts          # LearningMiddleware
    values/
      command-suggestion.ts

  middleware/
    middleware-chain.ts             # Middleware orchestration

  events/
    security-events.ts
    plugin-events.ts
    learning-events.ts
```

### 6.2 Testing Strategy

```typescript
describe('SecurityMiddleware', () => {
  it('should block path traversal attempts', async () => {
    const middleware = new SecurityMiddlewareImpl(/*...*/);

    const context: CommandContext = {
      command: { name: 'exec', /* ... */ } as CommandDefinition,
      args: { path: '../../../etc/passwd' },
      options: {}
    };

    await expect(
      middleware.middleware()(context, async () => {})
    ).rejects.toThrow(SecurityError);
  });

  it('should sanitize command injection', async () => {
    const middleware = new SecurityMiddlewareImpl(/*...*/);

    const context: CommandContext = {
      command: { name: 'exec', /* ... */ } as CommandDefinition,
      args: { command: 'ls; rm -rf /' },
      options: {}
    };

    let sanitized = false;
    await middleware.middleware()(context, async () => {
      sanitized = true;
    });

    expect(sanitized).toBe(true);
    expect(context.args.command).not.toContain('rm -rf');
  });
});

describe('SandboxedPlugin', () => {
  it('should execute plugin in isolated context', async () => {
    const plugin = new SandboxedPluginImpl(/*...*/);

    await plugin.load();

    const result = await plugin.execute({ arg1: 'value' }, {});

    expect(plugin.status).toBe('completed');
    expect(result).toBeDefined();
  });

  it('should enforce resource limits', async () => {
    const plugin = new SandboxedPluginImpl(
      'plugin-1',
      'test-plugin',
      '1.0.0',
      { /* metadata */ } as PluginMetadata,
      [],
      ResourceLimitFactory.strict(),
      'while(true) {}', // Infinite loop
      'loaded'
    );

    await expect(plugin.execute({}, {})).rejects.toThrow(PluginTimeoutError);
  });

  it('should deny unauthorized permissions', () => {
    const plugin = new SandboxedPluginImpl(
      'plugin-1',
      'test-plugin',
      '1.0.0',
      { /* metadata */ } as PluginMetadata,
      [PluginPermissionFactory.filesystemRead(['/tmp'])],
      ResourceLimitFactory.default(),
      '',
      'loaded'
    );

    expect(plugin.validatePermission('filesystem:read:/tmp/file.txt')).toBe(true);
    expect(plugin.validatePermission('filesystem:write:/tmp/file.txt')).toBe(false);
    expect(plugin.validatePermission('network:fetch:https://api.example.com')).toBe(false);
  });
});

describe('CommandPatternService', () => {
  it('should store and retrieve patterns', async () => {
    const service = new CommandPatternServiceImpl();

    const pattern = new CommandPatternImpl(
      'pattern-1',
      'scan',
      { path: '.' },
      { output: './docs' },
      new Date(),
      1500,
      true,
      5
    );

    await service.storePattern(pattern);

    const results = await service.searchPatterns('scan output docs');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].command).toBe('scan');
  });

  it('should suggest frequently-used commands', async () => {
    const service = new CommandPatternServiceImpl();

    const suggestions = await service.suggestCommands('scan');

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].confidence).toBeGreaterThan(0.5);
  });
});
```

---

## Appendix A: Type Definitions

```typescript
// Security types
type SecurityMiddlewareId = string;

interface ValidationConstraints {
  readonly maxLength?: number;
  readonly pattern?: RegExp;
  readonly allowAbsolute?: boolean;
  readonly preventTraversal?: boolean;
  readonly allowedExtensions?: string[];
  readonly min?: number;
  readonly max?: number;
}

interface PathValidationOptions {
  readonly allowAbsolute?: boolean;
  readonly preventTraversal?: boolean;
  readonly allowedExtensions?: string[];
  readonly maxDepth?: number;
}

interface SecurityScanResult {
  readonly passed: boolean;
  readonly threats: string[];
  readonly score: number;
}

class SecurityError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

// Plugin types
type PluginId = string;
type PatternId = string;
type PluginSandboxContext = vm.Context;

class PluginLoadError extends Error {}
class PluginExecutionError extends Error {}
class PluginTimeoutError extends Error {}
class PluginResourceError extends Error {}
class PluginSecurityError extends Error {}
class PluginIntegrityError extends Error {}
class PluginPermissionError extends Error {}

// Learning types
// (Already defined above)

// Middleware type
type CommandMiddleware = (
  context: CommandContext,
  next: () => Promise<void>
) => Promise<void>;

interface CommandContext {
  readonly command: CommandDefinition;
  readonly args: Record<string, any>;
  readonly options: Record<string, any>;
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-27 | Initial domain model for critical gaps |

---

## References

- **DDD-007**: CLI Framework Domain Model (base specification)
- **ADR-025**: CLI Framework Package Architecture
- **CLI-FRAMEWORK-PACKAGE-REVIEW.md**: Phase 3.2 review with 10 questions
- **@claude-flow/security**: Input validation, path validation, safe execution
- **AgentDB**: HNSW vector search for pattern matching
- **ReasoningBank**: Command pattern storage and learning

---

**Document Owner:** DDD Domain Expert Agent
**Review Schedule:** After each major implementation phase
**Last Reviewed:** 2026-01-27

---

DDD-007 update complete (822 lines)
