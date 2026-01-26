/**
 * MemoryStore - Core CRUD operations for agent memory
 * Provides namespace isolation, TTL support, and tagging
 */

import type {
  MemoryEntry,
  StoreOptions,
  SearchOptions,
  MemoryNamespace,
  BatchResult
} from '../types.js';
import { ValidationError, StorageError } from '../types.js';

export class MemoryStore {
  private entries: Map<string, MemoryEntry> = new Map();
  private namespaces: Map<string, MemoryNamespace> = new Map();
  private expirationTimers: Map<string, NodeJS.Timeout> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> entry IDs

  constructor() {
    // Create default namespace
    this.createNamespace({ name: 'default' });
  }

  /**
   * Create a new namespace
   */
  createNamespace(namespace: MemoryNamespace): void {
    if (this.namespaces.has(namespace.name)) {
      throw new ValidationError(`Namespace '${namespace.name}' already exists`);
    }
    this.namespaces.set(namespace.name, namespace);
  }

  /**
   * Delete a namespace and all its entries
   */
  deleteNamespace(name: string): void {
    if (name === 'default') {
      throw new ValidationError('Cannot delete default namespace');
    }

    const namespace = this.namespaces.get(name);
    if (!namespace) {
      throw new ValidationError(`Namespace '${name}' not found`);
    }

    // Delete all entries in this namespace
    for (const [id, entry] of this.entries) {
      if (entry.namespace === name) {
        this.delete(id);
      }
    }

    this.namespaces.delete(name);
  }

  /**
   * List all namespaces
   */
  listNamespaces(): MemoryNamespace[] {
    return Array.from(this.namespaces.values());
  }

  /**
   * Store a vector with metadata
   */
  async store(
    id: string,
    vector: Float32Array,
    metadata: Record<string, unknown>,
    options: StoreOptions = {}
  ): Promise<void> {
    const namespace = options.namespace || 'default';

    // Validate namespace exists
    if (!this.namespaces.has(namespace)) {
      throw new ValidationError(`Namespace '${namespace}' not found`);
    }

    const now = Date.now();
    const ttl = options.ttl || this.namespaces.get(namespace)?.ttl;

    // Check namespace limits
    const namespaceConfig = this.namespaces.get(namespace);
    if (namespaceConfig?.maxEntries) {
      const entriesInNamespace = Array.from(this.entries.values()).filter(
        e => e.namespace === namespace
      ).length;

      if (entriesInNamespace >= namespaceConfig.maxEntries && !this.entries.has(id)) {
        throw new StorageError(
          `Namespace '${namespace}' has reached maximum entries (${namespaceConfig.maxEntries})`
        );
      }
    }

    // Create or update entry
    const entry: MemoryEntry = {
      id,
      namespace,
      vector,
      metadata,
      createdAt: this.entries.has(id) ? this.entries.get(id)!.createdAt : now,
      lastAccessedAt: now,
      ttl,
      tags: options.tags
    };

    this.entries.set(id, entry);

    // Update tag index
    if (options.tags) {
      for (const tag of options.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(id);
      }
    }

    // Set expiration timer if TTL is specified
    if (ttl) {
      this.setExpiration(id, ttl);
    }
  }

  /**
   * Retrieve a vector by ID
   */
  async retrieve(id: string): Promise<MemoryEntry | undefined> {
    const entry = this.entries.get(id);
    if (entry) {
      // Update last accessed timestamp
      entry.lastAccessedAt = Date.now();
    }
    return entry;
  }

  /**
   * Delete a vector by ID
   */
  async delete(id: string): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) {
      return false;
    }

    // Clear expiration timer
    const timer = this.expirationTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.expirationTimers.delete(id);
    }

    // Remove from tag index
    if (entry.tags) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(id);
        if (this.tagIndex.get(tag)?.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    return this.entries.delete(id);
  }

  /**
   * Search entries by criteria
   */
  async search(options: SearchOptions = {}): Promise<MemoryEntry[]> {
    let results = Array.from(this.entries.values());

    // Filter by namespace
    if (options.namespace) {
      results = results.filter(e => e.namespace === options.namespace);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      const taggedIds = new Set<string>();
      for (const tag of options.tags) {
        const ids = this.tagIndex.get(tag);
        if (ids) {
          ids.forEach(id => taggedIds.add(id));
        }
      }
      results = results.filter(e => taggedIds.has(e.id));
    }

    // Filter by metadata
    if (options.filter) {
      results = results.filter(e => options.filter!(e.metadata));
    }

    // Limit results
    if (options.k && options.k > 0) {
      results = results.slice(0, options.k);
    }

    return results;
  }

  /**
   * List all entries in a namespace
   */
  async list(namespace?: string): Promise<MemoryEntry[]> {
    const entries = Array.from(this.entries.values());
    if (namespace) {
      return entries.filter(e => e.namespace === namespace);
    }
    return entries;
  }

  /**
   * Batch insert operations
   */
  async batchStore(
    items: Array<{
      id: string;
      vector: Float32Array;
      metadata: Record<string, unknown>;
      options?: StoreOptions;
    }>
  ): Promise<BatchResult> {
    const startTime = Date.now();
    let success = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const item of items) {
      try {
        await this.store(item.id, item.vector, item.metadata, item.options);
        success++;
      } catch (error) {
        failed++;
        errors.push({
          id: item.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      timeMs: Date.now() - startTime
    };
  }

  /**
   * Batch delete operations
   */
  async batchDelete(ids: string[]): Promise<BatchResult> {
    const startTime = Date.now();
    let success = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        const deleted = await this.delete(id);
        if (deleted) {
          success++;
        } else {
          failed++;
          errors.push({ id, error: 'Entry not found' });
        }
      } catch (error) {
        failed++;
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      timeMs: Date.now() - startTime
    };
  }

  /**
   * Clear all entries in a namespace
   */
  async clear(namespace?: string): Promise<number> {
    const entriesToDelete = namespace
      ? Array.from(this.entries.values()).filter(e => e.namespace === namespace)
      : Array.from(this.entries.values());

    for (const entry of entriesToDelete) {
      await this.delete(entry.id);
    }

    return entriesToDelete.length;
  }

  /**
   * Get total entry count
   */
  size(namespace?: string): number {
    if (namespace) {
      return Array.from(this.entries.values()).filter(
        e => e.namespace === namespace
      ).length;
    }
    return this.entries.size;
  }

  /**
   * Get all unique tags
   */
  getTags(): string[] {
    return Array.from(this.tagIndex.keys());
  }

  /**
   * Get entries by tag
   */
  getByTag(tag: string): MemoryEntry[] {
    const ids = this.tagIndex.get(tag);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map(id => this.entries.get(id))
      .filter((e): e is MemoryEntry => e !== undefined);
  }

  /**
   * Set expiration for an entry
   */
  private setExpiration(id: string, ttl: number): void {
    // Clear existing timer
    const existingTimer = this.expirationTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      await this.delete(id);
      this.expirationTimers.delete(id);
    }, ttl);

    this.expirationTimers.set(id, timer);
  }

  /**
   * Cleanup expired entries (manual trigger)
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, entry] of this.entries) {
      if (entry.ttl && entry.createdAt + entry.ttl < now) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      await this.delete(id);
    }

    return expiredIds.length;
  }

  /**
   * Export all entries
   */
  async export(): Promise<MemoryEntry[]> {
    return Array.from(this.entries.values());
  }

  /**
   * Import entries
   */
  async import(entries: MemoryEntry[]): Promise<BatchResult> {
    const items = entries.map(entry => ({
      id: entry.id,
      vector: entry.vector,
      metadata: entry.metadata,
      options: {
        namespace: entry.namespace,
        ttl: entry.ttl,
        tags: entry.tags
      }
    }));

    return this.batchStore(items);
  }

  /**
   * Destroy the store and cleanup
   */
  destroy(): void {
    // Clear all timers
    for (const timer of this.expirationTimers.values()) {
      clearTimeout(timer);
    }
    this.expirationTimers.clear();

    // Clear all data
    this.entries.clear();
    this.tagIndex.clear();
    this.namespaces.clear();
  }
}
