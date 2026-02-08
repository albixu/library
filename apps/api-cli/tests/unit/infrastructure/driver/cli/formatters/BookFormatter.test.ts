/**
 * BookFormatter Tests
 *
 * Unit tests for the CLI book formatter that creates visual output
 * for successfully created books.
 */

import { describe, it, expect } from 'vitest';
import {
  formatBookCreated,
  type BookFormatInput,
} from '../../../../../../src/infrastructure/driver/cli/formatters/BookFormatter.js';

describe('BookFormatter', () => {
  describe('formatBookCreated', () => {
    const baseBook: BookFormatInput = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      description: 'A handbook of agile software craftsmanship',
      type: 'technical',
      format: 'pdf',
      categories: [
        { id: '1', name: 'programming' },
        { id: '2', name: 'software engineering' },
      ],
      isbn: '9780132350884',
      available: true,
      path: '/books/clean-code.pdf',
      createdAt: new Date('2026-02-08T12:00:00Z'),
      updatedAt: new Date('2026-02-08T12:00:00Z'),
    };

    it('should include success message', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('✓');
      expect(result).toContain('exitosamente');
    });

    it('should display book title prominently', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('Clean Code');
    });

    it('should display author', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('Robert C. Martin');
      expect(result).toContain('Autor');
    });

    it('should display book type', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('technical');
      expect(result).toContain('Tipo');
    });

    it('should display book format', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('pdf');
      expect(result).toContain('Formato');
    });

    it('should display categories', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('programming');
      expect(result).toContain('Categorías');
    });

    it('should display ISBN when present', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('9780132350884');
      expect(result).toContain('ISBN');
    });

    it('should display N/A for ISBN when not present', () => {
      const bookWithoutIsbn: BookFormatInput = {
        ...baseBook,
        isbn: null,
      };

      const result = formatBookCreated(bookWithoutIsbn);

      expect(result).toContain('ISBN');
      expect(result).toContain('N/A');
    });

    it('should display availability status as checkmark when available', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('Disponible');
      expect(result).toMatch(/Disponible.*✓/s);
    });

    it('should display availability status as cross when not available', () => {
      const unavailableBook: BookFormatInput = {
        ...baseBook,
        available: false,
      };

      const result = formatBookCreated(unavailableBook);

      expect(result).toContain('Disponible');
      expect(result).toMatch(/Disponible.*✗/s);
    });

    it('should display book ID', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toContain('ID');
    });

    it('should truncate long category lists', () => {
      const bookWithManyCategories: BookFormatInput = {
        ...baseBook,
        categories: [
          { id: '1', name: 'programming' },
          { id: '2', name: 'software engineering' },
          { id: '3', name: 'clean code' },
          { id: '4', name: 'best practices' },
          { id: '5', name: 'refactoring' },
        ],
      };

      const result = formatBookCreated(bookWithManyCategories);

      expect(result).toContain('...');
    });

    it('should include visual box borders', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('┌');
      expect(result).toContain('┐');
      expect(result).toContain('└');
      expect(result).toContain('┘');
      expect(result).toContain('│');
      expect(result).toContain('─');
    });

    it('should display path when present', () => {
      const result = formatBookCreated(baseBook);

      expect(result).toContain('/books/clean-code.pdf');
      expect(result).toContain('Ruta');
    });

    it('should display N/A for path when not present', () => {
      const bookWithoutPath: BookFormatInput = {
        ...baseBook,
        path: null,
      };

      const result = formatBookCreated(bookWithoutPath);

      expect(result).toContain('Ruta');
      expect(result).toMatch(/Ruta.*N\/A/s);
    });
  });
});
