/**
 * @file Optimized CLI Entry Point
 * @description Minimal bootstrap code for fast CLI startup
 *
 * Implements lazy loading architecture to reduce startup time:
 * - Minimal initial imports
 * - Lazy command loading
 * - Fast help/version display
 * - Progress indicator during load
 *
 * Target: <800ms cold start (Phase 1)
 *
 * @module cli-startup-optimizer/cli-entry
 */

import { performance } from 'perf_hooks';
import { LazyModuleRegistry } from './lazy-loader.js';

/**
 * CLI Entry Point
 *
 * Minimal bootstrap that defers heavy imports until needed.
 */
export class CLIEntryPoint {
  private registry: LazyModuleRegistry;
  private startTime: number;
  private showProgress: boolean;

  constructor(showProgress = false) {
    this.registry = new LazyModuleRegistry();
    this.startTime = performance.now();
    this.showProgress = showProgress;
  }

  /**
   * Main CLI execution
   *
   * Fast path for common operations, lazy load for everything else.
   *
   * @param args - Command-line arguments
   * @returns Exit code
   */
  async execute(args: string[]): Promise<number> {
    try {
      // Fast path: --version (no module loading)
      if (args.includes('--version') || args.includes('-v')) {
        return this.handleVersion();
      }

      // Fast path: --help (no module loading)
      if (args.includes('--help') || args.includes('-h') || args.length === 0) {
        return this.handleHelp(args);
      }

      // Extract command name
      const commandName = this.extractCommand(args);

      if (!commandName) {
        return this.handleHelp(args);
      }

      // Show progress indicator for slow operations
      if (this.showProgress) {
        this.showProgressIndicator('Loading command...');
      }

      // Lazy load command handler
      const commandModule = await this.loadCommand(commandName);

      if (this.showProgress) {
        this.clearProgressIndicator();
      }

      // Execute command
      const exitCode = await commandModule.execute(args);

      // Log performance metrics in debug mode
      if (process.env.CLI_DEBUG === 'true') {
        this.logPerformanceMetrics();
      }

      return exitCode;
    } catch (error) {
      return this.handleError(error as Error);
    }
  }

  /**
   * Handle --version flag
   *
   * Fast path: no module loading required.
   */
  private handleVersion(): number {
    // Version hardcoded for speed
    const version = this.getVersion();
    console.log(version);

    this.logStartupTime('version');
    return 0;
  }

  /**
   * Handle --help flag
   *
   * Fast path: minimal module loading for help text.
   */
  private async handleHelp(args: string[]): Promise<number> {
    const commandName = this.extractCommand(args);

    if (commandName) {
      // Command-specific help - lazy load command
      try {
        const commandModule = await this.loadCommand(commandName);
        commandModule.showHelp?.();
      } catch {
        console.error(`Unknown command: ${commandName}`);
        this.showGeneralHelp();
        return 1;
      }
    } else {
      // General help - no lazy loading needed
      this.showGeneralHelp();
    }

    this.logStartupTime('help');
    return 0;
  }

  /**
   * Show general help text
   *
   * Hardcoded for speed, no module loading.
   */
  private showGeneralHelp(): void {
    const help = `
AgentScope CLI - AI Agent Orchestration

USAGE:
  agentscope <command> [options]

COMMANDS:
  agent       Manage agents (spawn, list, status, stop)
  swarm       Multi-agent swarm coordination
  memory      AgentDB memory operations
  config      Configuration management
  status      System status and health
  workflow    Workflow execution
  hooks       Self-learning hooks system

OPTIONS:
  -h, --help     Show help
  -v, --version  Show version
  --debug        Enable debug logging

EXAMPLES:
  agentscope agent spawn -t coder --name my-agent
  agentscope swarm init --topology hierarchical
  agentscope memory search --query "patterns"

For command-specific help:
  agentscope <command> --help

Documentation: https://github.com/agentscope/agentscope
    `.trim();

    console.log(help);
  }

  /**
   * Extract command name from arguments
   */
  private extractCommand(args: string[]): string | null {
    // Skip flags
    const commandArg = args.find(arg => !arg.startsWith('-'));
    return commandArg || null;
  }

  /**
   * Load command module dynamically
   *
   * Maps command names to module paths and loads on-demand.
   */
  private async loadCommand(commandName: string): Promise<any> {
    // Command module mapping (update as commands are added)
    const commandModules: Record<string, string> = {
      agent: './commands/agent.js',
      swarm: './commands/swarm.js',
      memory: './commands/memory.js',
      config: './commands/config.js',
      status: './commands/status.js',
      workflow: './commands/workflow.js',
      hooks: './commands/hooks.js',
      task: './commands/task.js',
      session: './commands/session.js',
      neural: './commands/neural.js',
      security: './commands/security.js',
      performance: './commands/performance.js',
      providers: './commands/providers.js',
      plugins: './commands/plugins.js',
      deployment: './commands/deployment.js',
      embeddings: './commands/embeddings.js',
      claims: './commands/claims.js',
      migrate: './commands/migrate.js',
      doctor: './commands/doctor.js',
      completions: './commands/completions.js'
    };

    const modulePath = commandModules[commandName];

    if (!modulePath) {
      throw new Error(`Unknown command: ${commandName}`);
    }

    // Lazy load command module
    return await this.registry.load(modulePath, {
      timeout: 5000,
      retry: 1
    });
  }

  /**
   * Handle errors gracefully
   */
  private handleError(error: Error): number {
    console.error(`Error: ${error.message}`);

    if (process.env.CLI_DEBUG === 'true') {
      console.error(error.stack);
      this.logPerformanceMetrics();
    }

    return 1;
  }

  /**
   * Get version string
   *
   * Hardcoded for speed - no package.json read.
   */
  private getVersion(): string {
    // Version from package.json at build time
    return process.env.CLI_VERSION || '1.0.0-alpha.1';
  }

  /**
   * Show progress indicator
   */
  private showProgressIndicator(message: string): void {
    if (process.stdout.isTTY) {
      process.stdout.write(`${message}\r`);
    }
  }

  /**
   * Clear progress indicator
   */
  private clearProgressIndicator(): void {
    if (process.stdout.isTTY) {
      process.stdout.write('\r\x1b[K'); // Clear line
    }
  }

  /**
   * Log startup time metrics
   */
  private logStartupTime(operation: string): void {
    if (process.env.CLI_DEBUG === 'true') {
      const duration = performance.now() - this.startTime;
      console.error(`[DEBUG] ${operation} completed in ${duration.toFixed(1)}ms`);
    }
  }

  /**
   * Log detailed performance metrics
   */
  private logPerformanceMetrics(): void {
    const duration = performance.now() - this.startTime;
    const stats = this.registry.getStats();

    console.error('\n[PERFORMANCE METRICS]');
    console.error(`Total time: ${duration.toFixed(1)}ms`);
    console.error(`Module loads: ${stats.totalLoads}`);
    console.error(`Cache hits: ${stats.cacheHits}`);
    console.error(`Avg load time: ${stats.averageLoadTime.toFixed(1)}ms`);

    if (stats.slowestModule) {
      console.error(`Slowest module: ${stats.slowestModule.path} (${stats.slowestModule.time.toFixed(1)}ms)`);
    }

    console.error(`Cache hit rate: ${(this.registry.getCacheHitRate() * 100).toFixed(1)}%\n`);
  }

  /**
   * Export statistics for monitoring
   */
  exportStats(): {
    totalTime: number;
    moduleStats: ReturnType<LazyModuleRegistry['exportStats']>;
  } {
    return {
      totalTime: performance.now() - this.startTime,
      moduleStats: this.registry.exportStats()
    };
  }
}

/**
 * Create and execute CLI entry point
 *
 * @param args - Command-line arguments
 * @returns Exit code
 */
export async function executeCLI(args: string[] = process.argv.slice(2)): Promise<number> {
  const showProgress = process.env.CLI_PROGRESS === 'true';
  const entryPoint = new CLIEntryPoint(showProgress);

  return await entryPoint.execute(args);
}

/**
 * Main entry point for CLI
 *
 * Only executes if run directly (not imported).
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  executeCLI()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
