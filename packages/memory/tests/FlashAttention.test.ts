import { describe, it, expect } from 'vitest';
import { FlashAttention } from '../src/vector/FlashAttention.js';

describe('FlashAttention', () => {
  const dimension = 64;

  it('should compute attention correctly', async () => {
    const attention = new FlashAttention();

    const query = new Float32Array(dimension).fill(0.5);
    const keys = [
      new Float32Array(dimension).fill(0.4),
      new Float32Array(dimension).fill(0.6)
    ];
    const values = keys;

    const result = await attention.compute(query, keys, values);

    expect(result.output).toBeInstanceOf(Float32Array);
    expect(result.output.length).toBe(dimension);
    expect(result.executionTimeMs).toBeGreaterThan(0);
  });

  it('should handle larger sequences', async () => {
    const attention = new FlashAttention({ blockSize: 32 });

    const query = new Float32Array(dimension).fill(0.5);
    const seqLen = 128;
    const keys = Array.from({ length: seqLen }, () =>
      new Float32Array(dimension).fill(Math.random())
    );
    const values = keys;

    const result = await attention.compute(query, keys, values);

    expect(result.output).toBeInstanceOf(Float32Array);
    expect(result.memorySaved).toBeGreaterThan(0);
  });

  it('should support causal masking', async () => {
    const attention = new FlashAttention({ causal: true });

    const query = new Float32Array(dimension).fill(0.5);
    const keys = [
      new Float32Array(dimension).fill(0.4),
      new Float32Array(dimension).fill(0.6),
      new Float32Array(dimension).fill(0.7)
    ];
    const values = keys;

    const result = await attention.compute(query, keys, values);

    expect(result.output).toBeInstanceOf(Float32Array);
  });

  it('should throw on dimension mismatch', async () => {
    const attention = new FlashAttention();

    const query = new Float32Array(dimension).fill(0.5);
    const keys = [new Float32Array(dimension * 2).fill(0.4)];
    const values = keys;

    await expect(attention.compute(query, keys, values)).rejects.toThrow();
  });
});
