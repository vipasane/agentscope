/**
 * Sandboxed Plugin Module
 *
 * Wraps plugin execution with isolated-vm sandbox.
 * Tracks resource usage and enforces security policies.
 *
 * Based on ADR-025-UPDATE Plugin Sandbox architecture.
 */

import {
  PluginDescriptor,
  PluginContext,
  SandboxConfig,
  ResourceUsage,
  SandboxTelemetry,
  SandboxError,
  PluginModule,
} from './types';
import { SandboxEngine } from './SandboxEngine';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Plugin interface for execution
 */
export interface Plugin {
  /**
   * Execute the plugin
   */
  execute(context: PluginContext): Promise<unknown>;

  /**
   * Get resource usage statistics
   */
  getResourceUsage(): ResourceUsage;

  /**
   * Get sandbox telemetry
   */
  getTelemetry(): SandboxTelemetry;

  /**
   * Dispose of plugin resources
   */
  dispose(): Promise<void>;
}

/**
 * Sandboxed plugin wrapper
 * Executes untrusted plugin code in isolated-vm sandbox
 */
export class SandboxedPlugin implements Plugin {
  private sandbox: SandboxEngine;
  private descriptor: PluginDescriptor;
  private resourceUsage: ResourceUsage;
  private pluginCode: string;
  private disposed: boolean = false;

  /**
   * Create a sandboxed plugin instance
   *
   * @param descriptor - Plugin descriptor with metadata
   * @param config - Sandbox configuration
   * @throws SandboxError if plugin loading fails
   */
  constructor(descriptor: PluginDescriptor, config: SandboxConfig) {
    this.descriptor = descriptor;
    this.sandbox = new SandboxEngine(config);

    // Initialize resource tracking
    this.resourceUsage = {
      memoryMB: 0,
      cpuTimeMs: 0,
      executions: 0,
      networkRequests: 0,
      filesAccessed: 0,
    };

    // Load and validate plugin code
    this.pluginCode = this.loadPluginCode();

    // Verify code integrity if hash provided (ADR-025 Q30)
    if (descriptor.codeHash) {
      this.verifyCodeIntegrity(this.pluginCode, descriptor.codeHash);
    }
  }

  /**
   * Load plugin code from entry point
   *
   * @returns Plugin code as string
   * @throws SandboxError if loading fails
   */
  private loadPluginCode(): string {
    try {
      const entryPath = path.resolve(this.descriptor.directory, this.descriptor.path);

      if (!fs.existsSync(entryPath)) {
        throw new SandboxError(
          `Plugin entry point not found: ${entryPath}`,
          'PLUGIN_NOT_FOUND',
          { entryPath }
        );
      }

      const code = fs.readFileSync(entryPath, 'utf-8');

      if (!code || code.trim().length === 0) {
        throw new SandboxError(
          `Plugin code is empty: ${entryPath}`,
          'EMPTY_PLUGIN',
          { entryPath }
        );
      }

      return code;
    } catch (error) {
      if (error instanceof SandboxError) {
        throw error;
      }

      throw new SandboxError(
        `Failed to load plugin code: ${(error as Error).message}`,
        'LOAD_FAILED',
        { error }
      );
    }
  }

  /**
   * Verify plugin code integrity using SHA-256 hash
   *
   * @param code - Plugin code
   * @param expectedHash - Expected SHA-256 hash
   * @throws SandboxError if integrity check fails
   */
  private verifyCodeIntegrity(code: string, expectedHash: string): void {
    const actualHash = crypto
      .createHash('sha256')
      .update(code, 'utf-8')
      .digest('hex');

    if (actualHash !== expectedHash) {
      throw new SandboxError(
        'Plugin code integrity check failed: Hash mismatch',
        'INTEGRITY_VIOLATION',
        {
          expected: expectedHash,
          actual: actualHash,
          plugin: this.descriptor.manifest.name,
        }
      );
    }
  }

  /**
   * Execute the plugin in sandbox
   *
   * @param context - Plugin execution context
   * @returns Execution result
   * @throws SandboxError if execution fails
   */
  async execute(context: PluginContext): Promise<unknown> {
    if (this.disposed) {
      throw new SandboxError(
        'Cannot execute disposed plugin',
        'PLUGIN_DISPOSED',
        { plugin: this.descriptor.manifest.name }
      );
    }

    const startTime = Date.now();

    try {
      // Track execution start
      this.resourceUsage.executions++;

      // Wrap plugin code with context injection
      const wrappedCode = this.wrapPluginCode(context);

      // Execute in sandbox
      const result = await this.sandbox.execute(wrappedCode, context.args);

      // Update resource usage
      this.updateResourceUsage();

      return result;
    } catch (error) {
      // Record execution failure
      console.error(`Plugin execution failed: ${this.descriptor.manifest.name}`, error);

      throw new SandboxError(
        `Plugin execution failed: ${(error as Error).message}`,
        'EXECUTION_FAILED',
        {
          plugin: this.descriptor.manifest.name,
          error: (error as Error).message,
          duration: Date.now() - startTime,
        }
      );
    }
  }

  /**
   * Wrap plugin code with context and safety checks
   *
   * @param context - Plugin execution context
   * @returns Wrapped code ready for execution
   */
  private wrapPluginCode(context: PluginContext): string {
    // Create safe context object for plugin
    const safeContext = {
      args: context.args,
      env: { ...context.env }, // Read-only copy (ADR-025 Q27)
      cwd: context.cwd,
      config: context.config,
      manifest: this.descriptor.manifest,
    };

    // Wrap code with IIFE to create isolated scope
    return `
(async function() {
  // Inject context
  const context = ${JSON.stringify(safeContext)};

  // Plugin code
  ${this.pluginCode}

  // Call register function if it exists
  if (typeof register === 'function') {
    return await register(context);
  }

  // Call default export if it exists
  if (typeof exports !== 'undefined' && exports.register) {
    return await exports.register(context);
  }

  throw new Error('Plugin must export a register function');
})();
    `.trim();
  }

  /**
   * Update resource usage from sandbox
   */
  private updateResourceUsage(): void {
    const sandboxUsage = this.sandbox.getResourceUsage();
    this.resourceUsage.memoryMB = Math.max(this.resourceUsage.memoryMB, sandboxUsage.memoryMB);
    this.resourceUsage.cpuTimeMs += sandboxUsage.cpuTimeMs;
    this.resourceUsage.networkRequests += sandboxUsage.networkRequests;
    this.resourceUsage.filesAccessed += sandboxUsage.filesAccessed;
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
  getTelemetry(): SandboxTelemetry {
    return this.sandbox.getTelemetry(this.descriptor.manifest.name);
  }

  /**
   * Get plugin descriptor
   */
  getDescriptor(): PluginDescriptor {
    return this.descriptor;
  }

  /**
   * Dispose of plugin and release resources
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    try {
      this.sandbox.dispose();
      this.disposed = true;
    } catch (error) {
      console.warn(`Error disposing plugin ${this.descriptor.manifest.name}:`, error);
    }
  }

  /**
   * Check if plugin has been disposed
   */
  isDisposed(): boolean {
    return this.disposed;
  }
}

/**
 * Create a sandboxed plugin instance
 *
 * @param descriptor - Plugin descriptor
 * @param config - Sandbox configuration
 * @returns Sandboxed plugin instance
 */
export function createSandboxedPlugin(
  descriptor: PluginDescriptor,
  config: SandboxConfig
): SandboxedPlugin {
  return new SandboxedPlugin(descriptor, config);
}
