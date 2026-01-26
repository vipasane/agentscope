import type { BaseError } from '../base/base-error.js';
import { ErrorSerializer } from '../serializer/error-serializer.js';
import type { SerializedError } from '../serializer/error-serializer.js';

/**
 * Error report
 */
export interface ErrorReport {
  id: string;
  timestamp: number;
  error: SerializedError;
  environment: string;
  version?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/**
 * Error reporter backend
 */
export interface ReporterBackend {
  report(report: ErrorReport): Promise<void>;
  health(): Promise<boolean>;
}

/**
 * No-op backend for development
 */
class NoOpBackend implements ReporterBackend {
  async report(): Promise<void> {}
  async health(): Promise<boolean> {
    return true;
  }
}

/**
 * Console reporter backend
 */
export class ConsoleReporterBackend implements ReporterBackend {
  async report(report: ErrorReport): Promise<void> {
    console.error('[Error Report]', JSON.stringify(report, null, 2));
  }

  async health(): Promise<boolean> {
    return true;
  }
}

/**
 * Batch reporter that accumulates errors
 */
export class BatchReporterBackend implements ReporterBackend {
  private queue: ErrorReport[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private flushFn: (reports: ErrorReport[]) => Promise<void>;
  private flushIntervalMs: number;
  private maxBatchSize: number;

  constructor(
    flushFn: (reports: ErrorReport[]) => Promise<void>,
    flushIntervalMs: number = 5000,
    maxBatchSize: number = 100
  ) {
    this.flushFn = flushFn;
    this.flushIntervalMs = flushIntervalMs;
    this.maxBatchSize = maxBatchSize;
    this.startInterval();
  }

  private startInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        console.error('Error flushing reports:', err);
      });
    }, this.flushIntervalMs);
  }

  async report(report: ErrorReport): Promise<void> {
    this.queue.push(report);

    if (this.queue.length >= this.maxBatchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const reports = this.queue.splice(0, this.maxBatchSize);
    try {
      await this.flushFn(reports);
    } catch (error) {
      // Re-queue on failure
      this.queue.unshift(...reports);
      throw error;
    }
  }

  async health(): Promise<boolean> {
    return true;
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

/**
 * Error reporter for sending errors to monitoring systems
 */
export class ErrorReporter {
  private backend: ReporterBackend;
  private serializer: ErrorSerializer;
  private environment: string;
  private version?: string;
  private tags: Map<string, string> = new Map();
  private idGenerator: () => string;

  constructor(
    backend: ReporterBackend = new NoOpBackend(),
    environment: string = 'development',
    version?: string
  ) {
    this.backend = backend;
    this.environment = environment;
    this.version = version;
    this.serializer = new ErrorSerializer(environment === 'production');
    this.idGenerator = this.createIdGenerator();
  }

  /**
   * Create ID generator
   */
  private createIdGenerator(): () => string {
    let counter = 0;
    const base = Date.now().toString(36);
    return () => {
      counter++;
      return `${base}-${counter}`;
    };
  }

  /**
   * Report error
   */
  async report(error: Error | BaseError, tags?: Record<string, string>, metadata?: Record<string, unknown>): Promise<string> {
    const id = this.idGenerator();
    const serialized = this.serializer.serialize(error as any);

    const report: ErrorReport = {
      id,
      timestamp: Date.now(),
      error: serialized,
      environment: this.environment,
      version: this.version,
      tags: this.mergeTags(tags),
      metadata,
    };

    await this.backend.report(report);
    return id;
  }

  /**
   * Merge tags with global tags
   */
  private mergeTags(tags?: Record<string, string>): Record<string, string> | undefined {
    if (this.tags.size === 0 && !tags) return undefined;

    const merged: Record<string, string> = {};
    for (const [key, value] of this.tags) {
      merged[key] = value;
    }

    if (tags) {
      Object.assign(merged, tags);
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  /**
   * Add global tag
   */
  addTag(key: string, value: string): this {
    this.tags.set(key, value);
    return this;
  }

  /**
   * Remove global tag
   */
  removeTag(key: string): this {
    this.tags.delete(key);
    return this;
  }

  /**
   * Clear global tags
   */
  clearTags(): this {
    this.tags.clear();
    return this;
  }

  /**
   * Check backend health
   */
  async health(): Promise<boolean> {
    try {
      return await this.backend.health();
    } catch {
      return false;
    }
  }

  /**
   * Set backend
   */
  setBackend(backend: ReporterBackend): this {
    this.backend = backend;
    return this;
  }

  /**
   * Enable PII redaction
   */
  setPiiRedaction(enabled: boolean): this {
    this.serializer.setPiiRedaction(enabled);
    return this;
  }
}
