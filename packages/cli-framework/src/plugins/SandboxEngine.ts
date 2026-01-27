/**
 * Sandbox Engine Module
 *
 * Provides isolated V8 execution environment for untrusted plugin code.
 * Uses isolated-vm for true V8 isolate security (not VM2 - deprecated).
 *
 * Based on ADR-025-UPDATE Plugin Sandbox architecture:
 * - Q16: Use isolated-vm (NOT VM2)
 * - Q18: 128MB memory limit default
 * - Q19: 5000ms timeout default
 * - Q20: Kill and throw error on resource limit
 * - Q22: <50ms sandbox creation target
 * - Q25: Always collect telemetry
 */

import ivm from 'isolated-vm';
import * as fs from 'fs';
import {
  SandboxConfig,
  PluginPermissions,
  SandboxTelemetry,
  ResourceUsage,
  PermissionViolation,
  PluginTimeoutError,
  ResourceLimitError,
  SandboxError,
  DEFAULT_SANDBOX_CONFIG,
} from './types';
import { PermissionChecker } from './PermissionChecker';

/**
 * Sandbox engine using isolated-vm
 * Provides secure isolated execution environment for plugins
 */
export class SandboxEngine {
  private isolate: ivm.Isolate;
  private context: ivm.Context;
  private config: SandboxConfig;
  private startTime: number = 0;
  private resourceUsage: ResourceUsage;
  private permissionViolations: PermissionViolation[] = [];
  private disposed: boolean = false;

  /**
   * Create a new sandbox engine
   *
   * @param config - Sandbox configuration
   * @throws SandboxError if sandbox creation fails
   */
  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };

    // Validate configuration
    if (this.config.memory < 8 || this.config.memory > 1024) {
      throw new SandboxError(
        'Memory limit must be between 8MB and 1024MB',
        'INVALID_CONFIG',
        { memory: this.config.memory }
      );
    }

    if (this.config.timeout < 100 || this.config.timeout > 60000) {
      throw new SandboxError(
        'Timeout must be between 100ms and 60000ms',
        'INVALID_CONFIG',
        { timeout: this.config.timeout }
      );
    }

    // Initialize resource tracking
    this.resourceUsage = {
      memoryMB: 0,
      cpuTimeMs: 0,
      executions: 0,
      networkRequests: 0,
      filesAccessed: 0,
    };

    try {
      // Create V8 isolate with memory limit
      this.isolate = new ivm.Isolate({
        memoryLimit: this.config.memory,
      });

      // Create execution context
      this.context = this.isolate.createContextSync();

      // Inject safe globals
      this.injectGlobals();
    } catch (error) {
      throw new SandboxError(
        `Failed to create sandbox: ${(error as Error).message}`,
        'SANDBOX_CREATION_FAILED',
        { error }
      );
    }
  }

  /**
   * Execute plugin code in the sandbox
   *
   * @param code - JavaScript code to execute
   * @param args - Arguments to pass to the code
   * @returns Execution result
   * @throws PluginTimeoutError if execution exceeds timeout
   * @throws ResourceLimitError if resource limit exceeded
   * @throws SandboxError for other execution errors
   */
  async execute(code: string, args: unknown[] = []): Promise<unknown> {
    if (this.disposed) {
      throw new SandboxError('Sandbox has been disposed', 'SANDBOX_DISPOSED');
    }

    this.startTime = Date.now();
    this.resourceUsage.executions++;

    try {
      // Compile the script
      const script = await this.isolate.compileScript(code);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new PluginTimeoutError(
              `Plugin execution exceeded timeout of ${this.config.timeout}ms`,
              this.config.timeout
            )
          );
        }, this.config.timeout);
      });

      // Execute script with timeout
      const executionPromise = script.run(this.context, {
        timeout: this.config.timeout,
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Update resource usage
      this.updateResourceUsage();

      return result;
    } catch (error) {
      // Handle different error types
      if (error instanceof PluginTimeoutError) {
        // Kill the isolate on timeout (ADR-025 Q20)
        this.dispose();
        throw error;
      }

      if ((error as Error).message?.includes('memory limit')) {
        const memError = new ResourceLimitError(
          'Plugin exceeded memory limit',
          'memory',
          { limit: this.config.memory }
        );
        // Kill the isolate on memory limit (ADR-025 Q20)
        this.dispose();
        throw memError;
      }

      throw new SandboxError(
        `Plugin execution failed: ${(error as Error).message}`,
        'EXECUTION_FAILED',
        { error }
      );
    }
  }

  /**
   * Inject safe global objects into the sandbox
   * Based on permissions, inject limited API surface
   */
  private injectGlobals(): void {
    const jail = this.context.global;

    // Always inject console (safe logging)
    jail.setSync('console', new ivm.ExternalCopy({
      log: this.createLogFunction('log'),
      info: this.createLogFunction('info'),
      warn: this.createLogFunction('warn'),
      error: this.createLogFunction('error'),
      debug: this.createLogFunction('debug'),
    }).copyInto());

    // Inject setTimeout/setInterval (with resource limits)
    jail.setSync('setTimeout', new ivm.Reference(this.createSetTimeout.bind(this)));
    jail.setSync('setInterval', new ivm.Reference(this.createSetInterval.bind(this)));

    // Inject fs wrapper if filesystem permission enabled
    if (this.config.permissions.filesystem?.read || this.config.permissions.filesystem?.write) {
      jail.setSync('fs', this.createFsWrapper());
    }

    // Inject fetch wrapper if network permission enabled
    if (this.config.permissions.network?.hosts) {
      jail.setSync('fetch', new ivm.Reference(this.createFetchWrapper.bind(this)));
    }

    // Inject process wrapper if process permission enabled
    if (this.config.permissions.process?.spawn) {
      jail.setSync('process', this.createProcessWrapper());
    }

    // Inject basic utilities
    jail.setSync('JSON', new ivm.ExternalCopy(JSON).copyInto());
    jail.setSync('Math', new ivm.ExternalCopy(Math).copyInto());
    jail.setSync('Date', new ivm.ExternalCopy(Date).copyInto());
  }

  /**
   * Create safe console.log function
   */
  private createLogFunction(level: string) {
    return (...args: unknown[]) => {
      // Safe logging through host console
      console[level as keyof Console]('[Plugin]', ...args);
    };
  }

  /**
   * Create safe setTimeout
   */
  private createSetTimeout(callback: () => void, delay: number) {
    // Enforce maximum delay
    const maxDelay = Math.min(delay, this.config.timeout);
    return setTimeout(callback, maxDelay);
  }

  /**
   * Create safe setInterval
   */
  private createSetInterval(callback: () => void, delay: number) {
    // Enforce minimum interval (prevent tight loops)
    const minDelay = Math.max(delay, 10);
    return setInterval(callback, minDelay);
  }

  /**
   * Create filesystem wrapper with permission checks
   */
  private createFsWrapper() {
    const fsWrapper = {
      readFile: (path: string, options?: unknown) => {
        try {
          PermissionChecker.checkFileAccess(path, this.config.permissions, 'read');
          this.resourceUsage.filesAccessed++;
          return fs.readFileSync(path, options as any);
        } catch (error) {
          this.recordPermissionViolation('filesystem', 'readFile', path, (error as Error).message);
          throw error;
        }
      },
      writeFile: (path: string, data: string | Buffer, options?: unknown) => {
        try {
          PermissionChecker.checkFileAccess(path, this.config.permissions, 'write');
          this.resourceUsage.filesAccessed++;
          return fs.writeFileSync(path, data, options as any);
        } catch (error) {
          this.recordPermissionViolation('filesystem', 'writeFile', path, (error as Error).message);
          throw error;
        }
      },
      readdir: (path: string, options?: unknown) => {
        try {
          PermissionChecker.checkFileAccess(path, this.config.permissions, 'read');
          this.resourceUsage.filesAccessed++;
          return fs.readdirSync(path, options as any);
        } catch (error) {
          this.recordPermissionViolation('filesystem', 'readdir', path, (error as Error).message);
          throw error;
        }
      },
      exists: (path: string) => {
        try {
          PermissionChecker.checkFileAccess(path, this.config.permissions, 'read');
          return fs.existsSync(path);
        } catch (error) {
          this.recordPermissionViolation('filesystem', 'exists', path, (error as Error).message);
          throw error;
        }
      },
    };

    return new ivm.ExternalCopy(fsWrapper).copyInto();
  }

  /**
   * Create fetch wrapper with permission checks
   */
  private async createFetchWrapper(url: string, options?: unknown) {
    try {
      PermissionChecker.checkNetworkAccess(url, this.config.permissions);
      this.resourceUsage.networkRequests++;

      // Use native fetch if available, otherwise require node-fetch
      const fetch = globalThis.fetch || (await import('node-fetch')).default;
      return fetch(url, options as any);
    } catch (error) {
      this.recordPermissionViolation('network', 'fetch', url, (error as Error).message);
      throw error;
    }
  }

  /**
   * Create process wrapper with permission checks
   */
  private createProcessWrapper() {
    const processWrapper = {
      env: this.config.permissions.process?.spawn
        ? new ivm.ExternalCopy({ ...process.env }).copyInto({ transferIn: true })
        : undefined,
      cwd: () => process.cwd(),
      platform: process.platform,
      arch: process.arch,
    };

    return new ivm.ExternalCopy(processWrapper).copyInto();
  }

  /**
   * Check if permission is granted
   *
   * @param permission - Permission type
   * @returns true if granted
   */
  checkPermission(permission: 'filesystem' | 'network' | 'process' | 'cli'): boolean {
    const perms = this.config.permissions;

    switch (permission) {
      case 'filesystem':
        return !!(perms.filesystem?.read || perms.filesystem?.write);
      case 'network':
        return !!perms.network?.hosts;
      case 'process':
        return !!perms.process?.spawn;
      case 'cli':
        return !!perms.cli?.registerCommands;
      default:
        return false;
    }
  }

  /**
   * Record permission violation for telemetry
   */
  private recordPermissionViolation(
    permissionType: 'filesystem' | 'network' | 'process' | 'cli',
    operation: string,
    resource: string,
    details: string
  ): void {
    if (this.config.telemetry) {
      this.permissionViolations.push({
        timestamp: Date.now(),
        permissionType,
        operation,
        resource,
        details,
      });
    }
  }

  /**
   * Update resource usage metrics
   */
  private updateResourceUsage(): void {
    if (this.config.telemetry) {
      const heapStats = this.isolate.getHeapStatisticsSync();
      this.resourceUsage.memoryMB = heapStats.used_heap_size / (1024 * 1024);
      this.resourceUsage.cpuTimeMs = Date.now() - this.startTime;
    }
  }

  /**
   * Get current resource usage
   */
  getResourceUsage(): ResourceUsage {
    this.updateResourceUsage();
    return { ...this.resourceUsage };
  }

  /**
   * Get sandbox telemetry data
   */
  getTelemetry(pluginId: string): SandboxTelemetry {
    return {
      pluginId,
      startTime: this.startTime,
      endTime: Date.now(),
      resourceUsage: this.getResourceUsage(),
      errors: [],
      permissionViolations: [...this.permissionViolations],
    };
  }

  /**
   * Dispose of the sandbox and release resources
   * Called when plugin completes, times out, or exceeds limits
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    try {
      this.context.release();
      this.isolate.dispose();
      this.disposed = true;
    } catch (error) {
      // Ignore disposal errors
      console.warn('Error disposing sandbox:', error);
    }
  }

  /**
   * Check if sandbox has been disposed
   */
  isDisposed(): boolean {
    return this.disposed;
  }
}
