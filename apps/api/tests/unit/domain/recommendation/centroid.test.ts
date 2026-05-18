import { describe, it, expect } from 'vitest';
import { computeCentroid } from '../../../../src/domain/recommendation/centroid.js';

describe('computeCentroid', () => {
  it('should compute the average of a single embedding', () => {
    const result = computeCentroid([[1, 2, 3]]);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should compute the element-wise average of multiple embeddings', () => {
    const result = computeCentroid([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(result[0]).toBeCloseTo(1 / 3);
    expect(result[1]).toBeCloseTo(1 / 3);
    expect(result[2]).toBeCloseTo(1 / 3);
  });

  it('should handle negative values', () => {
    const result = computeCentroid([
      [2, -2],
      [-2, 2],
    ]);
    expect(result).toEqual([0, 0]);
  });

  it('should throw DomainError when embeddings array is empty', () => {
    expect(() => computeCentroid([])).toThrow('embeddings cannot be empty');
  });

  it('should return an array of the same length as the input embeddings', () => {
    const dims = 1536;
    const emb = Array.from({ length: dims }, () => Math.random());
    const result = computeCentroid([emb, emb]);
    expect(result).toHaveLength(dims);
  });
});
