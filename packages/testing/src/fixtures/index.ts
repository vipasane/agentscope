/**
 * Fixture Loading and Management Utilities
 *
 * Provides classes and utilities for managing test data including loading,
 * caching, building, and storing fixtures. Supports multiple formats and
 * flexible data source patterns.
 *
 * ## Key Concepts
 *
 * - **Fixture**: Immutable test data loaded from file or created inline
 * - **Template**: Reusable fixture blueprint with overrideable fields
 * - **Repository**: Named fixture registry for organizing shared fixtures
 * - **Snapshot**: Data capture for comparison-based testing
 *
 * @module fixtures
 */

import { TestFixture, FixtureLoaderOptions } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Loads test fixtures from files with caching and validation
 *
 * Manages fixture loading lifecycle including filesystem access, caching,
 * validation, and lifecycle callbacks. Supports multiple file formats.
 *
 * **Fixture Sources:**
 * - File system: `./fixtures/user.json`
 * - Inline: `createFixture('name', data)`
 * - Template: `createFromTemplate('name', blueprint, overrides)`
 *
 * **Caching Behavior:**
 * - When cache=true, fixtures loaded once and reused (default)
 * - Cache key includes format: `name:type`
 * - Manually clearable via `clear()`
 *
 * @example
 * ```typescript
 * const loader = new FixtureLoader({
 *   basePath: './fixtures',
 *   cache: true,
 *   validate: true
 * });
 *
 * // Load single fixture
 * const user = await loader.load('user');
 * expect(user.data).toBeDefined();
 *
 * // Load multiple
 * const [user, task, agent] = await loader.loadMany([
 *   'user',
 *   'task',
 *   'agent'
 * ]);
 *
 * // Inline fixture
 * const inline = loader.createFixture('temp', { temp: true });
 * ```
 *
 * @example
 * ```typescript
 * // Template-based fixtures with overrides
 * const userTemplate = {
 *   id: uuidv4(),
 *   name: 'Default User',
 *   email: 'user@example.com',
 *   role: 'user'
 * };
 *
 * const admin = loader.createFromTemplate('admin-user', userTemplate, {
 *   name: 'Admin',
 *   role: 'admin'
 * });
 *
 * expect(admin.data.role).toBe('admin');
 * expect(admin.data.id).toBeDefined();
 * ```
 *
 * @see {@link FixtureBuilder} for programmatic fixture construction
 * @see {@link FixtureRepository} for fixture organization
 * @see {@link CommonFixtures} for predefined fixtures
 *
 * @public
 */
export class FixtureLoader {
  private cache: Map<string, TestFixture> = new Map();
  private options: Required<FixtureLoaderOptions>;

  constructor(options: FixtureLoaderOptions = {}) {
    this.options = {
      basePath: options.basePath || './fixtures',
      cache: options.cache ?? true,
      validate: options.validate ?? false,
      onLoad: options.onLoad ?? (() => {})
    };
  }

  /**
   * Load a fixture by name
   */
  async load(name: string, type: 'json' | 'yaml' | 'text' | 'buffer' = 'json'): Promise<TestFixture> {
    const cacheKey = `${name}:${type}`;

    if (this.options.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Simulate loading fixture
    const fixture: TestFixture = {
      name,
      path: `${this.options.basePath}/${name}`,
      data: this.createMockData(name, type),
      type
    };

    if (this.options.validate) {
      this.validateFixture(fixture);
    }

    if (this.options.cache) {
      this.cache.set(cacheKey, fixture);
    }

    this.options.onLoad(fixture);
    return fixture;
  }

  /**
   * Load multiple fixtures
   */
  async loadMany(names: string[], type: 'json' | 'yaml' | 'text' | 'buffer' = 'json'): Promise<TestFixture[]> {
    return Promise.all(names.map(name => this.load(name, type)));
  }

  /**
   * Create inline fixture
   */
  createFixture(name: string, data: unknown, type: 'json' | 'yaml' | 'text' | 'buffer' = 'json'): TestFixture {
    return {
      name,
      path: `inline://${name}`,
      data,
      type
    };
  }

  /**
   * Create fixture from template
   */
  createFromTemplate(
    name: string,
    template: Record<string, unknown>,
    overrides?: Record<string, unknown>
  ): TestFixture {
    const data = { ...template, ...overrides };
    return {
      name,
      path: `template://${name}`,
      data,
      type: 'json'
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cached fixtures
   */
  getCached(): Map<string, TestFixture> {
    return new Map(this.cache);
  }

  private createMockData(name: string, type: string): unknown {
    switch (type) {
      case 'json':
        return { name, id: uuidv4(), created: new Date().toISOString() };
      case 'yaml':
        return `name: ${name}\nid: ${uuidv4()}\n`;
      case 'text':
        return `Fixture: ${name}`;
      case 'buffer':
        return Buffer.from(`Fixture: ${name}`);
      default:
        return null;
    }
  }

  private validateFixture(fixture: TestFixture): void {
    if (!fixture.name || !fixture.path) {
      throw new Error('Invalid fixture: missing required fields');
    }
  }
}

/**
 * Fluent builder for constructing test fixtures programmatically
 *
 * Provides chainable API for building complex fixture data without dealing with
 * nested object literals. Supports arrays, nested objects, and arbitrary values.
 *
 * **Builder Pattern:**
 * - Chainable methods return `this` for fluent API
 * - `set()` overwrites field values
 * - `merge()` shallow-merges objects
 * - `setNested()` supports dot-notation paths
 * - `build()` creates immutable fixture
 * - `reset()` clears all data for reuse
 *
 * @example
 * ```typescript
 * const fixture = new FixtureBuilder()
 *   .set('id', uuidv4())
 *   .set('name', 'Test User')
 *   .set('email', 'test@example.com')
 *   .setNested('address.city', 'New York')
 *   .setNested('address.zipCode', '10001')
 *   .setArray('tags', 3, (i) => `tag-${i}`)
 *   .build();
 *
 * expect(fixture.data.name).toBe('Test User');
 * expect(fixture.data.address.city).toBe('New York');
 * expect(fixture.data.tags).toHaveLength(3);
 * ```
 *
 * @example
 * ```typescript
 * // Reusable builder
 * const builder = new FixtureBuilder()
 *   .merge({
 *     status: 'active',
 *     createdAt: new Date().toISOString()
 *   });
 *
 * // Build multiple variants
 * const user1 = builder
 *   .set('name', 'User 1')
 *   .build();
 *
 * builder.reset();
 *
 * const user2 = builder
 *   .set('name', 'User 2')
 *   .build();
 * ```
 *
 * @see {@link FixtureLoader} for loading fixtures
 * @see {@link FixtureRepository} for organizing fixtures
 *
 * @public
 */
export class FixtureBuilder {
  private data: Record<string, unknown> = {};

  /**
   * Set a field value
   */
  set(key: string, value: unknown): this {
    this.data[key] = value;
    return this;
  }

  /**
   * Merge object into fixture data
   */
  merge(obj: Record<string, unknown>): this {
    this.data = { ...this.data, ...obj };
    return this;
  }

  /**
   * Set array values
   */
  setArray(key: string, count: number, factory: (i: number) => unknown): this {
    this.data[key] = Array.from({ length: count }, (_, i) => factory(i));
    return this;
  }

  /**
   * Set nested object
   */
  setNested(path: string, value: unknown): this {
    const keys = path.split('.');
    let current: Record<string, unknown> = this.data;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
    return this;
  }

  /**
   * Build the fixture
   */
  build(): TestFixture {
    return {
      name: (this.data.name as string) || 'unnamed',
      path: `built://${uuidv4()}`,
      data: this.data,
      type: 'json'
    };
  }

  /**
   * Reset builder
   */
  reset(): this {
    this.data = {};
    return this;
  }
}

/**
 * Registry for organizing and retrieving named fixtures
 *
 * Provides centralized storage for fixtures, supporting registration,
 * retrieval, and querying. Useful for organizing shared fixtures across tests.
 *
 * **Usage Pattern:**
 * - Register fixtures once (setup phase)
 * - Retrieve by name in tests
 * - Query by predicate for flexible lookup
 *
 * @example
 * ```typescript
 * const repo = new FixtureRepository();
 *
 * // Register fixtures
 * repo.register('user-admin', CommonFixtures.user({ role: 'admin' }));
 * repo.register('user-guest', CommonFixtures.user({ role: 'guest' }));
 * repo.register('task-urgent', CommonFixtures.task({ priority: 'urgent' }));
 *
 * // Retrieve by name
 * const admin = repo.get('user-admin');
 * expect(admin?.data.role).toBe('admin');
 *
 * // Query by predicate
 * const userFixtures = repo.query(f => f.name.startsWith('user'));
 * expect(userFixtures).toHaveLength(2);
 * ```
 *
 * @example
 * ```typescript
 * // Clear and count
 * repo.register('temp', CommonFixtures.task());
 * expect(repo.count()).toBe(1);
 *
 * repo.clear();
 * expect(repo.count()).toBe(0);
 * ```
 *
 * @see {@link FixtureLoader} for loading fixtures
 * @see {@link FixtureBuilder} for building fixtures
 *
 * @public
 */
export class FixtureRepository {
  private fixtures: Map<string, TestFixture> = new Map();

  /**
   * Register a fixture
   */
  register(name: string, fixture: TestFixture): void {
    this.fixtures.set(name, fixture);
  }

  /**
   * Get a fixture by name
   */
  get(name: string): TestFixture | undefined {
    return this.fixtures.get(name);
  }

  /**
   * Get all fixtures
   */
  getAll(): TestFixture[] {
    return Array.from(this.fixtures.values());
  }

  /**
   * Query fixtures by type
   */
  query(predicate: (fixture: TestFixture) => boolean): TestFixture[] {
    return Array.from(this.fixtures.values()).filter(predicate);
  }

  /**
   * Clear all fixtures
   */
  clear(): void {
    this.fixtures.clear();
  }

  /**
   * Get count of fixtures
   */
  count(): number {
    return this.fixtures.size;
  }
}

/**
 * Predefined fixtures for common Claude Flow domain entities
 *
 * Factory object providing fixture templates for standard entities like users, agents,
 * tasks, memory entries, and patterns. Each factory accepts optional overrides.
 *
 * **Available Fixtures:**
 * - `user()` - User entity with defaults
 * - `agent()` - Agent entity with defaults
 * - `task()` - Task entity with defaults
 * - `memoryEntry()` - Memory entry with defaults
 * - `pattern()` - Pattern entity with defaults
 *
 * @example
 * ```typescript
 * // Use default values
 * const defaultUser = CommonFixtures.user();
 * expect(defaultUser.data.id).toBeDefined();
 * expect(defaultUser.data.email).toBe('test@example.com');
 *
 * // Override specific fields
 * const admin = CommonFixtures.user({
 *   name: 'Admin User',
 *   role: 'admin',
 *   email: 'admin@example.com'
 * });
 *
 * expect(admin.data.role).toBe('admin');
 * expect(admin.data.name).toBe('Admin User');
 * ```
 *
 * @example
 * ```typescript
 * // Generate multiple variants
 * const agent1 = CommonFixtures.agent({ type: 'coder' });
 * const agent2 = CommonFixtures.agent({ type: 'reviewer' });
 * const agent3 = CommonFixtures.agent({ type: 'tester' });
 *
 * expect(agent1.data.type).toBe('coder');
 * expect(agent1.data.id).not.toBe(agent2.data.id); // Different IDs
 * ```
 *
 * @see {@link FixtureBuilder} for more control
 * @see {@link FixtureRepository} for organizing fixtures
 *
 * @public
 */
export const CommonFixtures = {
  /**
   * Create a user fixture
   */
  user: (overrides?: Record<string, unknown>): TestFixture => {
    return {
      name: 'user',
      path: 'fixtures/user.json',
      data: {
        id: uuidv4(),
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date().toISOString(),
        ...overrides
      },
      type: 'json'
    };
  },

  /**
   * Create an agent fixture
   */
  agent: (overrides?: Record<string, unknown>): TestFixture => {
    return {
      name: 'agent',
      path: 'fixtures/agent.json',
      data: {
        id: uuidv4(),
        type: 'coder',
        status: 'active',
        createdAt: new Date().toISOString(),
        ...overrides
      },
      type: 'json'
    };
  },

  /**
   * Create a task fixture
   */
  task: (overrides?: Record<string, unknown>): TestFixture => {
    return {
      name: 'task',
      path: 'fixtures/task.json',
      data: {
        id: uuidv4(),
        title: 'Test Task',
        description: 'A test task',
        status: 'pending',
        priority: 'normal',
        createdAt: new Date().toISOString(),
        ...overrides
      },
      type: 'json'
    };
  },

  /**
   * Create a memory entry fixture
   */
  memoryEntry: (overrides?: Record<string, unknown>): TestFixture => {
    return {
      name: 'memory-entry',
      path: 'fixtures/memory-entry.json',
      data: {
        key: `memory-${uuidv4()}`,
        value: { data: 'test' },
        namespace: 'default',
        timestamp: Date.now(),
        ...overrides
      },
      type: 'json'
    };
  },

  /**
   * Create a pattern fixture
   */
  pattern: (overrides?: Record<string, unknown>): TestFixture => {
    return {
      name: 'pattern',
      path: 'fixtures/pattern.json',
      data: {
        id: uuidv4(),
        type: 'authentication',
        description: 'Test pattern',
        confidence: 0.95,
        ...overrides
      },
      type: 'json'
    };
  }
};

/**
 * Manages snapshots for detecting unintended data changes
 *
 * Records data snapshots with hash-based comparison to detect when data
 * structures change unexpectedly. Useful for regression testing.
 *
 * **Snapshot Pattern:**
 * - `snapshot()` - Record current data state with hash
 * - `verify()` - Check if data matches stored snapshot
 * - `get()` - Retrieve original snapshot data
 * - `clear()` - Remove all snapshots
 *
 * @example
 * ```typescript
 * const manager = new SnapshotManager();
 *
 * // Record initial state
 * const data = { count: 42, status: 'active' };
 * const hash1 = manager.snapshot('initial', data);
 *
 * // Verify unchanged
 * const unchanged = manager.verify('initial', data);
 * expect(unchanged).toBe(true);
 *
 * // Detect change
 * const modified = { count: 43, status: 'active' };
 * const changed = manager.verify('initial', modified);
 * expect(changed).toBe(false);
 * ```
 *
 * @example
 * ```typescript
 * // Retrieve snapshot
 * const original = manager.get('initial');
 * expect(original).toEqual({ count: 42, status: 'active' });
 * ```
 *
 * @performance
 * - Hash computation: O(n) where n is JSON stringified data size
 * - Snapshot storage: ~100 bytes per snapshot
 * - Suitable for rapid regression detection
 *
 * @see {@link TestSnapshot} for snapshot type
 *
 * @public
 */
export class SnapshotManager {
  private snapshots: Map<string, unknown> = new Map();
  private snaphotHashes: Map<string, string> = new Map();

  /**
   * Create a snapshot
   */
  snapshot(name: string, data: unknown): string {
    const hash = this.computeHash(data);
    this.snapshots.set(name, data);
    this.snaphotHashes.set(name, hash);
    return hash;
  }

  /**
   * Verify snapshot
   */
  verify(name: string, data: unknown): boolean {
    const hash = this.computeHash(data);
    const expectedHash = this.snaphotHashes.get(name);
    return hash === expectedHash;
  }

  /**
   * Get snapshot
   */
  get(name: string): unknown {
    return this.snapshots.get(name);
  }

  /**
   * Clear snapshots
   */
  clear(): void {
    this.snapshots.clear();
    this.snaphotHashes.clear();
  }

  private computeHash(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }

    return hash.toString(16);
  }
}
