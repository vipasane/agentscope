import { describe, it, expect, beforeEach } from 'vitest';
import { HNSWIndex } from '../src/vector/HNSWIndex.js';

describe('HNSWIndex', () => {
  let index: HNSWIndex;
  const dimension = 128;

  beforeEach(() => {
    index = new HNSWIndex({
      enabled: true,
      m: 16,
      efConstruction: 200,
      efSearch: 100
    });
  });

  it('should insert and search vectors', async () => {
    const vector1 = new Float32Array(dimension).fill(0.5);
    const vector2 = new Float32Array(dimension).fill(0.6);
    const vector3 = new Float32Array(dimension).fill(0.1);

    await index.insert('vec-1', vector1, { type: 'A' });
    await index.insert('vec-2', vector2, { type: 'A' });
    await index.insert('vec-3', vector3, { type: 'B' });

    const query = new Float32Array(dimension).fill(0.55);
    const results = await index.search(query, 2);

    expect(results).toHaveLength(2);
    expect(results[0].distance).toBeLessThan(results[1].distance);
  });

  it('should build index incrementally', async () => {
    for (let i = 0; i < 10; i++) {
      const vector = new Float32Array(dimension).fill(i / 10);
      await index.insert(`vec-${i}`, vector);
    }

    const stats = index.getStats();
    expect(stats.vectorCount).toBe(10);
    expect(stats.avgDegree).toBeGreaterThan(0);
  });

  it('should delete vectors', async () => {
    const vector = new Float32Array(dimension).fill(0.5);
    await index.insert('vec-1', vector);

    const deleted = await index.delete('vec-1');
    expect(deleted).toBe(true);
    expect(index.has('vec-1')).toBe(false);
  });

  it('should filter search results', async () => {
    const vector1 = new Float32Array(dimension).fill(0.5);
    const vector2 = new Float32Array(dimension).fill(0.6);

    await index.insert('vec-1', vector1, { include: true });
    await index.insert('vec-2', vector2, { include: false });

    const query = new Float32Array(dimension).fill(0.55);
    const results = await index.search(query, 10, (metadata) => metadata.include === true);

    expect(results.every(r => r.metadata.include === true)).toBe(true);
  });

  it('should track search performance', async () => {
    for (let i = 0; i < 100; i++) {
      const vector = new Float32Array(dimension).fill(Math.random());
      await index.insert(`vec-${i}`, vector);
    }

    const query = new Float32Array(dimension).fill(0.5);
    await index.search(query, 10);

    const stats = index.getStats();
    expect(stats.searchTimeP50).toBeGreaterThan(0);
  });
});
