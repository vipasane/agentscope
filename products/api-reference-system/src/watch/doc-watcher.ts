/**
 * Documentation watcher
 * Monitors file changes and triggers regeneration
 */

import chokidar from 'chokidar';
import { DocumentationGenerator } from '../generator/documentation-generator.js';

export interface WatchConfig {
  inputDir: string;
  outputDir: string;
  format: string;
  packageName: string;
  version: string;
  debounce?: number;
}

export class DocWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private generator: DocumentationGenerator;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isGenerating: boolean = false;

  constructor(private config: WatchConfig) {
    this.generator = new DocumentationGenerator({
      validateExamples: true,
      checkSecrets: true,
    });
  }

  /**
   * Start watching for changes
   */
  async start(): Promise<void> {
    // Initial generation
    await this.regenerate();

    // Watch for changes
    this.watcher = chokidar.watch('**/*.ts', {
      cwd: this.config.inputDir,
      ignored: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('change', (path) => {
      console.log(`\nFile changed: ${path}`);
      this.scheduleRegeneration();
    });

    this.watcher.on('add', (path) => {
      console.log(`\nFile added: ${path}`);
      this.scheduleRegeneration();
    });

    this.watcher.on('unlink', (path) => {
      console.log(`\nFile deleted: ${path}`);
      this.scheduleRegeneration();
    });

    this.watcher.on('error', (error) => {
      console.error('Watcher error:', error);
    });
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Schedule regeneration with debounce
   */
  private scheduleRegeneration(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const debounce = this.config.debounce || 1000;

    this.debounceTimer = setTimeout(() => {
      this.regenerate();
    }, debounce);
  }

  /**
   * Regenerate documentation
   */
  private async regenerate(): Promise<void> {
    if (this.isGenerating) {
      console.log('Generation already in progress, skipping...');
      return;
    }

    this.isGenerating = true;

    try {
      console.log('\nRegenerating documentation...');

      const result = await this.generator.generateFromDirectory(
        this.config.inputDir,
        this.config.packageName,
        this.config.version,
        this.config.format,
        this.config.outputDir
      );

      console.log(`\n✓ Documentation updated!`);
      console.log(`  Symbols: ${result.symbolsDocumented}`);
      console.log(`  Coverage: ${(result.coverage * 100).toFixed(1)}%`);

      if (result.validationErrors > 0) {
        console.warn(`  ⚠ ${result.validationErrors} validation errors`);
      }
    } catch (error) {
      console.error('Error regenerating documentation:', error);
    } finally {
      this.isGenerating = false;
    }
  }
}
