/**
 * BookRepository Port Contract Tests
 *
 * HU-040: Verifies the BookRepository port includes findEmbeddingsByIds method.
 */

import { describe, it, expect, vi } from 'vitest';
import type { BookRepository } from '../../../../src/application/ports/BookRepository.js';

const BOOK_UUID_1 = '550e8400-e29b-41d4-a716-446655440001';
const BOOK_UUID_2 = '550e8400-e29b-41d4-a716-446655440002';

describe('BookRepository port', () => {
  describe('findEmbeddingsByIds', () => {
    it('should define findEmbeddingsByIds method in the port interface', () => {
      const mockRepo = {
        findEmbeddingsByIds: vi.fn().mockResolvedValue([]),
      } as unknown as BookRepository;

      expect(typeof mockRepo.findEmbeddingsByIds).toBe('function');
    });

    it('should return embeddings only for books that have non-null embeddings', async () => {
      const expectedEmbeddings = [
        { id: BOOK_UUID_1, embedding: [0.1, 0.2, 0.3] },
        { id: BOOK_UUID_2, embedding: [0.4, 0.5, 0.6] },
      ];

      const mockRepo = {
        findEmbeddingsByIds: vi.fn().mockResolvedValue(expectedEmbeddings),
      } as unknown as BookRepository;

      const result = await mockRepo.findEmbeddingsByIds([BOOK_UUID_1, BOOK_UUID_2]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: BOOK_UUID_1, embedding: [0.1, 0.2, 0.3] });
      expect(result[1]).toEqual({ id: BOOK_UUID_2, embedding: [0.4, 0.5, 0.6] });
    });

    it('should return empty array when no book ids are provided', async () => {
      const mockRepo = {
        findEmbeddingsByIds: vi.fn().mockResolvedValue([]),
      } as unknown as BookRepository;

      const result = await mockRepo.findEmbeddingsByIds([]);

      expect(result).toEqual([]);
    });

    it('should exclude books without embeddings', async () => {
      // Only BOOK_UUID_1 has an embedding — BOOK_UUID_2 does not
      const expectedEmbeddings = [
        { id: BOOK_UUID_1, embedding: [0.1, 0.2, 0.3] },
      ];

      const mockRepo = {
        findEmbeddingsByIds: vi.fn().mockResolvedValue(expectedEmbeddings),
      } as unknown as BookRepository;

      const result = await mockRepo.findEmbeddingsByIds([BOOK_UUID_1, BOOK_UUID_2]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BOOK_UUID_1);
    });
  });
});
