import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreateBookUseCase,
  type CreateBookInput,
  type CreateBookUseCaseDeps,
} from '../../../../src/application/use-cases/CreateBookUseCase.js';
import type { BookRepository, DuplicateCheckResult } from '../../../../src/application/ports/BookRepository.js';
import type { CategoryRepository } from '../../../../src/application/ports/CategoryRepository.js';
import type { EmbeddingService, EmbeddingResult } from '../../../../src/application/ports/EmbeddingService.js';
import { Category } from '../../../../src/domain/entities/Category.js';
import { Book } from '../../../../src/domain/entities/Book.js';
import { BookAlreadyExistsError, DuplicateISBNError, DuplicateBookError } from '../../../../src/domain/errors/DomainErrors.js';
import {
  EmbeddingTextTooLongError,
  EmbeddingServiceUnavailableError,
} from '../../../../src/application/errors/ApplicationErrors.js';

describe('CreateBookUseCase', () => {
  // Mock dependencies
  let mockBookRepository: BookRepository;
  let mockCategoryRepository: CategoryRepository;
  let mockEmbeddingService: EmbeddingService;
  let useCase: CreateBookUseCase;

  // Test data
  const validInput: CreateBookInput = {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    description: 'A handbook of agile software craftsmanship',
    type: 'technical',
    categoryNames: ['programming', 'software engineering'],
    format: 'pdf',
    isbn: '9780132350884',
    available: true,
    path: '/books/clean-code.pdf',
  };

  const mockCategories = [
    Category.create({ id: '110e8400-e29b-41d4-a716-446655440001', name: 'programming' }),
    Category.create({ id: '220e8400-e29b-41d4-a716-446655440002', name: 'software engineering' }),
  ];

  const mockEmbedding: number[] = new Array(768).fill(0.1);

  const mockEmbeddingResult: EmbeddingResult = {
    embedding: mockEmbedding,
    model: 'nomic-embed-text',
  };

  const noDuplicateResult: DuplicateCheckResult = {
    isDuplicate: false,
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockBookRepository = {
      findById: vi.fn(),
      findByIsbn: vi.fn(),
      existsByIsbn: vi.fn(),
      existsByTriad: vi.fn(),
      checkDuplicate: vi.fn().mockResolvedValue(noDuplicateResult),
      save: vi.fn().mockImplementation(async ({ book }) => book),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
    };

    mockCategoryRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByNames: vi.fn(),
      findOrCreate: vi.fn(),
      findOrCreateMany: vi.fn().mockResolvedValue(mockCategories),
      save: vi.fn(),
      findAll: vi.fn(),
    };

    mockEmbeddingService = {
      generateEmbedding: vi.fn().mockResolvedValue(mockEmbeddingResult),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const deps: CreateBookUseCaseDeps = {
      bookRepository: mockBookRepository,
      categoryRepository: mockCategoryRepository,
      embeddingService: mockEmbeddingService,
    };

    useCase = new CreateBookUseCase(deps);
  });

  describe('execute', () => {
    it('should create a book successfully with all fields', async () => {
      const result = await useCase.execute(validInput);

      expect(result.title).toBe('Clean Code');
      expect(result.author).toBe('Robert C. Martin');
      expect(result.description).toBe('A handbook of agile software craftsmanship');
      expect(result.type).toBe('technical');
      expect(result.format).toBe('pdf');
      expect(result.isbn).toBe('9780132350884');
      expect(result.available).toBe(true);
      expect(result.path).toBe('/books/clean-code.pdf');
      expect(result.categories).toHaveLength(2);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should resolve or create categories', async () => {
      await useCase.execute(validInput);

      expect(mockCategoryRepository.findOrCreateMany).toHaveBeenCalledWith([
        'programming',
        'software engineering',
      ]);
    });

    it('should check for duplicates before saving', async () => {
      await useCase.execute(validInput);

      // Note: UseCase passes trimmed values; normalization (lowercase) is done by repository
      expect(mockBookRepository.checkDuplicate).toHaveBeenCalledWith({
        isbn: '9780132350884',
        author: 'Robert C. Martin',
        title: 'Clean Code',
        format: 'pdf',
      });
    });

    it('should generate embedding from book text', async () => {
      await useCase.execute(validInput);

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalled();
      const callArg = (mockEmbeddingService.generateEmbedding as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg).toContain('Clean Code');
      expect(callArg).toContain('Robert C. Martin');
      expect(callArg).toContain('programming');
      expect(callArg).toContain('A handbook of agile software craftsmanship');
    });

    it('should save book with embedding', async () => {
      await useCase.execute(validInput);

      expect(mockBookRepository.save).toHaveBeenCalledWith({
        book: expect.any(Book),
        embedding: mockEmbedding,
      });
    });

    it('should throw DuplicateISBNError when ISBN duplicate found', async () => {
      const duplicateResult: DuplicateCheckResult = {
        isDuplicate: true,
        duplicateType: 'isbn',
        message: 'A book with ISBN "9780132350884" already exists',
      };
      (mockBookRepository.checkDuplicate as ReturnType<typeof vi.fn>).mockResolvedValue(duplicateResult);

      await expect(useCase.execute(validInput)).rejects.toThrow(DuplicateISBNError);
      await expect(useCase.execute(validInput)).rejects.toThrow('A book with ISBN "9780132350884" already exists');
    });

    it('should throw DuplicateBookError when triad duplicate found', async () => {
      const duplicateResult: DuplicateCheckResult = {
        isDuplicate: true,
        duplicateType: 'triad',
        message: 'A book with the same author, title, and format already exists',
      };
      (mockBookRepository.checkDuplicate as ReturnType<typeof vi.fn>).mockResolvedValue(duplicateResult);

      await expect(useCase.execute(validInput)).rejects.toThrow(DuplicateBookError);
      await expect(useCase.execute(validInput)).rejects.toThrow('A book with the same author, title, and format already exists');
    });

    it('should NOT create categories when duplicate is detected', async () => {
      const duplicateResult: DuplicateCheckResult = {
        isDuplicate: true,
        duplicateType: 'isbn',
        message: 'A book with ISBN "9780132350884" already exists',
      };
      (mockBookRepository.checkDuplicate as ReturnType<typeof vi.fn>).mockResolvedValue(duplicateResult);

      await expect(useCase.execute(validInput)).rejects.toThrow(DuplicateISBNError);

      // Verify categories were NOT created (findOrCreateMany should not be called)
      expect(mockCategoryRepository.findOrCreateMany).not.toHaveBeenCalled();
    });

    it('should throw EmbeddingTextTooLongError when text exceeds 7000 chars', async () => {
      // Current domain constraints limit embedding text to ~6812 chars, so we can't
      // naturally trigger the 7000-char guard. We simulate a future scenario where
      // domain constraints have been relaxed (e.g., longer description field) by
      // mocking Book.create() to return a Book-like object with getTextForEmbedding()
      // that returns text exceeding the limit.
      //
      // This tests the defense-in-depth guard that protects against future changes.

      const longText = 'X'.repeat(7001); // Just over the limit
      
      // Create a mock book that has all the required Book properties but returns long text
      const mockLongBook = {
        id: '550e8400-e29b-41d4-a716-446655440099',
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description',
        type: { value: 'technical' },
        format: { value: 'pdf' },
        isbn: null,
        available: false,
        path: null,
        categories: mockCategories,
        createdAt: new Date(),
        updatedAt: new Date(),
        getTextForEmbedding: () => longText, // This exceeds the limit
      };
      
      // Mock Book.create to return our special book
      const createSpy = vi.spyOn(Book, 'create').mockReturnValue(mockLongBook as unknown as Book);

      await expect(useCase.execute(validInput)).rejects.toThrow(EmbeddingTextTooLongError);
      
      createSpy.mockRestore();
    });

    it('should propagate EmbeddingServiceUnavailableError', async () => {
      (mockEmbeddingService.generateEmbedding as ReturnType<typeof vi.fn>).mockRejectedValue(
        new EmbeddingServiceUnavailableError('Connection refused')
      );

      await expect(useCase.execute(validInput)).rejects.toThrow(
        EmbeddingServiceUnavailableError
      );
    });

    it('should work without optional fields', async () => {
      const minimalInput: CreateBookInput = {
        title: 'Minimal Book',
        author: 'Unknown Author',
        description: 'A minimal book description',
        type: 'novel',
        categoryNames: ['fiction'],
        format: 'epub',
      };

      (mockCategoryRepository.findOrCreateMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        Category.create({ id: '330e8400-e29b-41d4-a716-446655440003', name: 'fiction' }),
      ]);

      const result = await useCase.execute(minimalInput);

      expect(result.isbn).toBeNull();
      expect(result.available).toBe(false);
      expect(result.path).toBeNull();
    });

    it('should handle null ISBN in duplicate check', async () => {
      const inputWithoutIsbn: CreateBookInput = {
        ...validInput,
        isbn: null,
      };

      await useCase.execute(inputWithoutIsbn);

      expect(mockBookRepository.checkDuplicate).toHaveBeenCalledWith({
        isbn: null,
        author: 'Robert C. Martin',
        title: 'Clean Code',
        format: 'pdf',
      });
    });
  });
});
