/**
 * Fixture loading and management utilities
 */

import { TestFixture, FixtureLoaderOptions } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fixture loader for managing test data
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
 * Fixture builder for creating test data
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
 * Fixture repository for predefined fixtures
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
 * Create common test fixtures
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
 * Snapshot manager for test snapshots
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
