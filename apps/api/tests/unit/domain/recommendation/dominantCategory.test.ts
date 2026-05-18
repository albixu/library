import { describe, it, expect } from 'vitest';
import { getDominantCategory } from '../../../../src/domain/recommendation/dominantCategory.js';

describe('getDominantCategory', () => {
  it('should return the most frequent category', () => {
    const result = getDominantCategory([
      'Programming',
      'Programming',
      'Design',
    ]);
    expect(result).toBe('Programming');
  });

  it('should return the first-appearing on tie', () => {
    const result = getDominantCategory(['Design', 'Programming', 'Design', 'Programming']);
    expect(result).toBe('Design');
  });

  it('should return the only category if there is just one', () => {
    const result = getDominantCategory(['Mathematics']);
    expect(result).toBe('Mathematics');
  });

  it('should return "General" when the array is empty', () => {
    const result = getDominantCategory([]);
    expect(result).toBe('General');
  });

  it('should handle a tie where first appearance wins', () => {
    const result = getDominantCategory(['A', 'B', 'A', 'B', 'C']);
    expect(result).toBe('A');
  });
});
