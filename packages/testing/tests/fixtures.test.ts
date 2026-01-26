/**
 * Tests for fixture utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FixtureLoader,
  FixtureBuilder,
  FixtureRepository,
  CommonFixtures,
  SnapshotManager
} from '../src/fixtures';

describe('Fixtures', () => {
  describe('Fixture Loader', () => {
    it('should load fixture', async () => {
      const loader = new FixtureLoader();
      const fixture = await loader.load('user');

      expect(fixture.name).toBe('user');
      expect(fixture.data).toBeDefined();
    });

    it('should cache fixtures', async () => {
      const loader = new FixtureLoader({ cache: true });
      const fixture1 = await loader.load('user');
      const fixture2 = await loader.load('user');

      expect(fixture1).toBe(fixture2);
    });

    it('should load multiple fixtures', async () => {
      const loader = new FixtureLoader();
      const fixtures = await loader.loadMany(['user', 'user']);

      expect(fixtures).toHaveLength(2);
    });

    it('should clear cache', async () => {
      const loader = new FixtureLoader({ cache: true });
      await loader.load('user');

      loader.clear();
      const cached = loader.getCached();

      expect(cached.size).toBe(0);
    });
  });

  describe('Fixture Builder', () => {
    it('should build fixture', () => {
      const fixture = new FixtureBuilder()
        .set('name', 'test')
        .set('value', 42)
        .build();

      expect(fixture.data).toHaveProperty('name', 'test');
      expect(fixture.data).toHaveProperty('value', 42);
    });

    it('should merge objects', () => {
      const fixture = new FixtureBuilder()
        .merge({ a: 1, b: 2 })
        .merge({ c: 3 })
        .build();

      const data = fixture.data as Record<string, unknown>;
      expect(data.a).toBe(1);
      expect(data.c).toBe(3);
    });

    it('should set arrays', () => {
      const fixture = new FixtureBuilder()
        .setArray('items', 3, (i) => ({ id: i }))
        .build();

      const data = fixture.data as Record<string, unknown>;
      expect((data.items as unknown[]).length).toBe(3);
    });

    it('should set nested values', () => {
      const fixture = new FixtureBuilder()
        .setNested('user.profile.age', 30)
        .build();

      const data = fixture.data as Record<string, unknown>;
      expect((((data.user as Record<string, unknown>).profile as Record<string, unknown>).age)).toBe(30);
    });

    it('should reset builder', () => {
      const builder = new FixtureBuilder();
      builder.set('key', 'value');
      builder.reset();

      const fixture = builder.build();
      const data = fixture.data as Record<string, unknown>;
      expect(data.key).toBeUndefined();
    });
  });

  describe('Fixture Repository', () => {
    let repo: FixtureRepository;

    beforeEach(() => {
      repo = new FixtureRepository();
    });

    it('should register and get fixture', () => {
      const fixture = CommonFixtures.user();
      repo.register('user', fixture);

      const retrieved = repo.get('user');
      expect(retrieved).toBe(fixture);
    });

    it('should get all fixtures', () => {
      repo.register('user', CommonFixtures.user());
      repo.register('agent', CommonFixtures.agent());

      const all = repo.getAll();
      expect(all).toHaveLength(2);
    });

    it('should query fixtures', () => {
      repo.register('user1', CommonFixtures.user());
      repo.register('user2', CommonFixtures.user());
      repo.register('agent', CommonFixtures.agent());

      const users = repo.query((f) => f.name === 'user');
      expect(users.length).toBeGreaterThanOrEqual(2);
    });

    it('should count fixtures', () => {
      repo.register('user', CommonFixtures.user());
      repo.register('agent', CommonFixtures.agent());

      expect(repo.count()).toBe(2);
    });
  });

  describe('Common Fixtures', () => {
    it('should create user fixture', () => {
      const fixture = CommonFixtures.user();
      const data = fixture.data as Record<string, unknown>;

      expect(data.id).toBeDefined();
      expect(data.email).toBe('test@example.com');
    });

    it('should create agent fixture', () => {
      const fixture = CommonFixtures.agent();
      const data = fixture.data as Record<string, unknown>;

      expect(data.id).toBeDefined();
      expect(data.type).toBe('coder');
    });

    it('should create task fixture', () => {
      const fixture = CommonFixtures.task();
      const data = fixture.data as Record<string, unknown>;

      expect(data.id).toBeDefined();
      expect(data.status).toBe('pending');
    });

    it('should create memory entry fixture', () => {
      const fixture = CommonFixtures.memoryEntry();
      const data = fixture.data as Record<string, unknown>;

      expect(data.key).toBeDefined();
      expect(data.namespace).toBe('default');
    });

    it('should create pattern fixture', () => {
      const fixture = CommonFixtures.pattern();
      const data = fixture.data as Record<string, unknown>;

      expect(data.id).toBeDefined();
      expect(data.type).toBe('authentication');
    });

    it('should merge overrides', () => {
      const fixture = CommonFixtures.user({ name: 'John' });
      const data = fixture.data as Record<string, unknown>;

      expect(data.name).toBe('John');
      expect(data.email).toBe('test@example.com');
    });
  });

  describe('Snapshot Manager', () => {
    let manager: SnapshotManager;

    beforeEach(() => {
      manager = new SnapshotManager();
    });

    it('should create snapshot', () => {
      const data = { id: 1, name: 'test' };
      const hash = manager.snapshot('test', data);

      expect(hash).toBeDefined();
    });

    it('should verify snapshot', () => {
      const data = { id: 1 };
      manager.snapshot('test', data);

      const verified = manager.verify('test', data);
      expect(verified).toBe(true);
    });

    it('should detect snapshot changes', () => {
      const data1 = { id: 1 };
      manager.snapshot('test', data1);

      const data2 = { id: 2 };
      const verified = manager.verify('test', data2);

      expect(verified).toBe(false);
    });

    it('should retrieve snapshot', () => {
      const data = { id: 1 };
      manager.snapshot('test', data);

      const retrieved = manager.get('test');
      expect(retrieved).toEqual(data);
    });

    it('should clear snapshots', () => {
      manager.snapshot('test', { id: 1 });
      manager.clear();

      const retrieved = manager.get('test');
      expect(retrieved).toBeUndefined();
    });
  });
});
