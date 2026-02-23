import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreateBookUseCase,
  type CreateBookInput,
  type CreateBookUseCaseDeps,
} from '../../../../src/application/use-cases/CreateBookUseCase.js';
import type { BookRepository, DuplicateCheckResult } from '../../../../src/application/ports/BookRepository.js';
import type { CategoryRepository } from '../../../../src/application/ports/CategoryRepository.js';
import type { TypeRepository } from '../../../../src/application/ports/TypeRepository.js';
import type { AuthorRepository } from '../../../../src/application/ports/AuthorRepository.js';
import type { LevelRepository } from '../../../../src/application/ports/LevelRepository.js';
import type { EmbeddingService, EmbeddingResult } from '../../../../src/application/ports/EmbeddingService.js';
import type { TranslationService, TranslationResult } from '../../../../src/application/ports/TranslationService.js';
import { Category } from '../../../../src/domain/entities/Category.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import { Author } from '../../../../src/domain/entities/Author.js';
import { Level } from '../../../../src/domain/entities/Level.js';
import { Book } from '../../../../src/domain/entities/Book.js';
import {
  DuplicateISBNError,
  InvalidBookTypeError,
  LevelTypeMismatchError,
} from '../../../../src/domain/errors/DomainErrors.js';
import {
  EmbeddingTextTooLongError,
  EmbeddingServiceUnavailableError,
  TranslationServiceUnavailableError,
} from '../../../../src/application/errors/ApplicationErrors.js';

describe('CreateBookUseCase', () => {
  // Mock dependencies
  let mockBookRepository: BookRepository;
  let mockCategoryRepository: CategoryRepository;
  let mockTypeRepository: TypeRepository;
  let mockAuthorRepository: AuthorRepository;
  let mockLevelRepository: LevelRepository;
  let mockEmbeddingService: EmbeddingService;
  let mockTranslationService: TranslationService;
  let useCase: CreateBookUseCase;

  // Test data - IDs
  const TECHNICAL_TYPE_ID = '550e8400-e29b-41d4-a716-446655440010';
  const NOVEL_TYPE_ID = '550e8400-e29b-41d4-a716-446655440011';
  const CATEGORY_1_ID = '110e8400-e29b-41d4-a716-446655440001';
  const CATEGORY_2_ID = '220e8400-e29b-41d4-a716-446655440002';
  const AUTHOR_ID = '550e8400-e29b-41d4-a716-446655440020';
  const LEVEL_ID = '660e8400-e29b-41d4-a716-446655440001';

  const validInput: CreateBookInput = {
    title: 'Clean Code',
    authors: ['Robert C. Martin'],
    description: 'A handbook of agile software craftsmanship',
    language: 'en', // HU-013: ISO 639-1 code (required)
    type: 'technical',
    categoryNames: ['programming', 'software engineering'],
    format: 'pdf',
    isbn: '9780132350884',
    level: 'Intermediate',
    available: true,
    path: '/books/clean-code.pdf',
  };

  // HU-008: Categories now have typeId
  const mockCategories = [
    Category.create({ id: CATEGORY_1_ID, name: 'programming', typeId: TECHNICAL_TYPE_ID }),
    Category.create({ id: CATEGORY_2_ID, name: 'software engineering', typeId: TECHNICAL_TYPE_ID }),
  ];

  // HU-008: BookType now has levelIds
  const mockTechnicalType = BookType.create({
    id: TECHNICAL_TYPE_ID,
    name: 'technical',
    levelIds: [LEVEL_ID],
  });

  const mockNovelType = BookType.create({
    id: NOVEL_TYPE_ID,
    name: 'novel',
    levelIds: [],
  });

  const mockAuthor = Author.create({
    id: AUTHOR_ID,
    name: 'Robert C. Martin',
  });

  // HU-008: Level is now a dynamic entity
  const mockLevel = Level.create({
    id: LEVEL_ID,
    name: 'Intermediate',
  });

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
      checkDuplicate: vi.fn().mockResolvedValue(noDuplicateResult),
      save: vi.fn().mockImplementation(async ({ book }) => book),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
    };

    // HU-008: findOrCreateMany now requires typeId
    mockCategoryRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByNameAndTypeId: vi.fn(),
      findByNames: vi.fn(),
      findByTypeId: vi.fn(),
      findOrCreate: vi.fn(),
      findOrCreateMany: vi.fn().mockResolvedValue(mockCategories),
      save: vi.fn(),
      saveMany: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
    };

    mockTypeRepository = {
      findById: vi.fn(),
      findByName: vi.fn().mockImplementation(async (name: string) => {
        if (name === 'technical') return mockTechnicalType;
        if (name === 'novel') return mockNovelType;
        return null;
      }),
      findAll: vi.fn().mockResolvedValue([mockTechnicalType, mockNovelType]),
      count: vi.fn().mockResolvedValue(2),
    };

    mockAuthorRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByNames: vi.fn(),
      findOrCreate: vi.fn(),
      findOrCreateMany: vi.fn().mockResolvedValue([mockAuthor]),
      save: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
    };

    // HU-008: New LevelRepository mock
    mockLevelRepository = {
      findById: vi.fn(),
      findByName: vi.fn().mockResolvedValue(mockLevel),
      save: vi.fn(),
      existsForType: vi.fn().mockResolvedValue(true),
      addToType: vi.fn(),
      findAll: vi.fn(),
      findByTypeId: vi.fn(),
      count: vi.fn(),
    };

    mockEmbeddingService = {
      generateEmbedding: vi.fn().mockResolvedValue(mockEmbeddingResult),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    // HU-013: Translation service mock
    mockTranslationService = {
      translate: vi.fn().mockImplementation(async (text: string): Promise<TranslationResult> => ({
        translatedText: `[Translated] ${text}`,
        targetLanguage: 'es',
        model: 'qwen2.5:3b',
      })),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const deps: CreateBookUseCaseDeps = {
      bookRepository: mockBookRepository,
      categoryRepository: mockCategoryRepository,
      typeRepository: mockTypeRepository,
      authorRepository: mockAuthorRepository,
      levelRepository: mockLevelRepository,
      embeddingService: mockEmbeddingService,
      translationService: mockTranslationService,
    };

    useCase = new CreateBookUseCase(deps);
  });

  describe('execute', () => {
    describe('successful book creation', () => {
      it('should create a book successfully with all fields', async () => {
        const result = await useCase.execute(validInput);

        expect(result.title).toBe('Clean Code');
        expect(result.authors).toHaveLength(1);
        expect(result.authors[0]).toMatchObject({
          id: mockAuthor.id,
          name: 'Robert C. Martin',
        });
        // HU-013: originalDescription contains the input, description contains translated text
        expect(result.originalDescription).toBe('A handbook of agile software craftsmanship');
        expect(result.description).toBe('[Translated] A handbook of agile software craftsmanship');
        expect(result.language).toBe('en');
        expect(result.type).toBe('technical');
        expect(result.format).toBe('pdf');
        expect(result.isbn).toBe('9780132350884');
        expect(result.level).toBe('Intermediate');
        expect(result.available).toBe(true);
        expect(result.path).toBe('/books/clean-code.pdf');
        expect(result.categories).toHaveLength(2);
        expect(result.id).toBeDefined();
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });

      it('should work without optional fields', async () => {
        const minimalInput: CreateBookInput = {
          title: 'Minimal Book',
          authors: ['Unknown Author'],
          description: 'A minimal book description',
          language: 'en', // HU-013: ISO 639-1 code (required)
          type: 'novel',
          categoryNames: ['fiction'],
          format: 'epub',
        };

        const unknownAuthor = Author.create({
          id: '550e8400-e29b-41d4-a716-446655440021',
          name: 'Unknown Author',
        });

        const fictionCategory = Category.create({
          id: '330e8400-e29b-41d4-a716-446655440003',
          name: 'fiction',
          typeId: NOVEL_TYPE_ID,
        });

        (mockAuthorRepository.findOrCreateMany as ReturnType<typeof vi.fn>).mockResolvedValue([unknownAuthor]);
        (mockCategoryRepository.findOrCreateMany as ReturnType<typeof vi.fn>).mockResolvedValue([fictionCategory]);

        const result = await useCase.execute(minimalInput);

        expect(result.isbn).toBeNull();
        expect(result.level).toBeNull();
        expect(result.available).toBe(false);
        expect(result.path).toBeNull();
      });
    });

    describe('type validation', () => {
      it('should validate type exists in database', async () => {
        await useCase.execute(validInput);

        expect(mockTypeRepository.findByName).toHaveBeenCalledWith('technical');
      });

      it('should throw InvalidBookTypeError for non-existent type', async () => {
        const invalidInput = { ...validInput, type: 'nonexistent' };

        await expect(useCase.execute(invalidInput)).rejects.toThrow(InvalidBookTypeError);
      });
    });

    describe('author handling', () => {
      it('should resolve or create authors', async () => {
        await useCase.execute(validInput);

        expect(mockAuthorRepository.findOrCreateMany).toHaveBeenCalledWith(['Robert C. Martin']);
      });

      it('should resolve or create multiple authors', async () => {
        const multiAuthorInput: CreateBookInput = {
          ...validInput,
          authors: ['Author One', 'Author Two', 'Author Three'],
        };

        const mockAuthors = [
          Author.create({ id: '550e8400-e29b-41d4-a716-446655440030', name: 'Author One' }),
          Author.create({ id: '550e8400-e29b-41d4-a716-446655440031', name: 'Author Two' }),
          Author.create({ id: '550e8400-e29b-41d4-a716-446655440032', name: 'Author Three' }),
        ];

        (mockAuthorRepository.findOrCreateMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthors);

        const result = await useCase.execute(multiAuthorInput);

        expect(mockAuthorRepository.findOrCreateMany).toHaveBeenCalledWith([
          'Author One',
          'Author Two',
          'Author Three',
        ]);
        expect(result.authors).toHaveLength(3);
        expect(result.authors.map((a) => a.name)).toEqual(['Author One', 'Author Two', 'Author Three']);
      });
    });

    describe('category handling (HU-008)', () => {
      it('should resolve or create categories with typeId', async () => {
        await useCase.execute(validInput);

        // HU-008: Categories are now scoped to the book's type
        expect(mockCategoryRepository.findOrCreateMany).toHaveBeenCalledWith(
          ['programming', 'software engineering'],
          TECHNICAL_TYPE_ID,
        );
      });

      it('should create categories for different type', async () => {
        const novelInput: CreateBookInput = {
          ...validInput,
          type: 'novel',
          categoryNames: ['fiction', 'adventure'],
        };

        const novelCategories = [
          Category.create({ id: '440e8400-e29b-41d4-a716-446655440001', name: 'fiction', typeId: NOVEL_TYPE_ID }),
          Category.create({ id: '440e8400-e29b-41d4-a716-446655440002', name: 'adventure', typeId: NOVEL_TYPE_ID }),
        ];

        (mockCategoryRepository.findOrCreateMany as ReturnType<typeof vi.fn>).mockResolvedValue(novelCategories);

        await useCase.execute(novelInput);

        expect(mockCategoryRepository.findOrCreateMany).toHaveBeenCalledWith(
          ['fiction', 'adventure'],
          NOVEL_TYPE_ID,
        );
      });
    });

    describe('level handling (HU-008)', () => {
      it('should create book with existing level that is valid for type', async () => {
        const result = await useCase.execute(validInput);

        expect(mockLevelRepository.findByName).toHaveBeenCalledWith('Intermediate');
        expect(mockLevelRepository.existsForType).toHaveBeenCalledWith(LEVEL_ID, TECHNICAL_TYPE_ID);
        expect(result.level).toBe('Intermediate');
      });

      it('should create book without level (null)', async () => {
        const inputWithoutLevel: CreateBookInput = {
          ...validInput,
          level: null,
        };

        const result = await useCase.execute(inputWithoutLevel);

        expect(mockLevelRepository.findByName).not.toHaveBeenCalled();
        expect(result.level).toBeNull();
      });

      it('should create book without level (undefined)', async () => {
        const inputWithoutLevel: CreateBookInput = {
          title: 'Test Book',
          authors: ['Test Author'],
          description: 'Test Description',
          language: 'en', // HU-013
          type: 'technical',
          categoryNames: ['test'],
          format: 'pdf',
          // level not specified
        };

        const result = await useCase.execute(inputWithoutLevel);

        expect(mockLevelRepository.findByName).not.toHaveBeenCalled();
        expect(result.level).toBeNull();
      });

      it('should throw LevelTypeMismatchError when level exists but not valid for type', async () => {
        const existingLevel = Level.create({
          id: '770e8400-e29b-41d4-a716-446655440001',
          name: 'Expert',
        });

        (mockLevelRepository.findByName as ReturnType<typeof vi.fn>).mockResolvedValue(existingLevel);
        (mockLevelRepository.existsForType as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        const inputWithInvalidLevel: CreateBookInput = {
          ...validInput,
          level: 'Expert',
        };

        await expect(useCase.execute(inputWithInvalidLevel)).rejects.toThrow(LevelTypeMismatchError);
        await expect(useCase.execute(inputWithInvalidLevel)).rejects.toThrow(
          'Level "Expert" is not valid for type "technical"'
        );
      });

      it('should create new level and associate with type when level does not exist', async () => {
        (mockLevelRepository.findByName as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const inputWithNewLevel: CreateBookInput = {
          ...validInput,
          level: 'Beginner',
        };

        const result = await useCase.execute(inputWithNewLevel);

        expect(mockLevelRepository.findByName).toHaveBeenCalledWith('Beginner');
        expect(mockLevelRepository.save).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Beginner',
        }));
        expect(mockLevelRepository.addToType).toHaveBeenCalledWith(
          expect.any(String), // new level ID
          TECHNICAL_TYPE_ID,
        );
        expect(result.level).toBe('Beginner');
      });

      it('should create book with compound level', async () => {
        const compoundLevel = Level.create({
          id: '880e8400-e29b-41d4-a716-446655440001',
          name: 'Beginner to Intermediate',
        });

        (mockLevelRepository.findByName as ReturnType<typeof vi.fn>).mockResolvedValue(compoundLevel);
        (mockLevelRepository.existsForType as ReturnType<typeof vi.fn>).mockResolvedValue(true);

        const inputWithCompoundLevel: CreateBookInput = {
          ...validInput,
          level: 'Beginner to Intermediate',
        };

        const result = await useCase.execute(inputWithCompoundLevel);

        expect(result.level).toBe('Beginner to Intermediate');
      });
    });

    describe('duplicate detection', () => {
      it('should check for ISBN duplicates before saving', async () => {
        await useCase.execute(validInput);

        expect(mockBookRepository.checkDuplicate).toHaveBeenCalledWith({
          isbn: '9780132350884',
        });
      });

      it('should throw DuplicateISBNError when ISBN duplicate found', async () => {
        const duplicateResult: DuplicateCheckResult = {
          isDuplicate: true,
          duplicateType: 'isbn',
          message: 'A book with ISBN "9780132350884" already exists',
        };
        (mockBookRepository.checkDuplicate as ReturnType<typeof vi.fn>).mockResolvedValue(duplicateResult);

        await expect(useCase.execute(validInput)).rejects.toThrow(
          new DuplicateISBNError('9780132350884')
        );
      });

      it('should NOT create categories when duplicate is detected', async () => {
        const duplicateResult: DuplicateCheckResult = {
          isDuplicate: true,
          duplicateType: 'isbn',
          message: 'A book with ISBN "9780132350884" already exists',
        };
        (mockBookRepository.checkDuplicate as ReturnType<typeof vi.fn>).mockResolvedValue(duplicateResult);

        await expect(useCase.execute(validInput)).rejects.toThrow(DuplicateISBNError);

        expect(mockCategoryRepository.findOrCreateMany).not.toHaveBeenCalled();
      });

      it('should NOT resolve level when duplicate is detected', async () => {
        const duplicateResult: DuplicateCheckResult = {
          isDuplicate: true,
          duplicateType: 'isbn',
          message: 'A book with ISBN "9780132350884" already exists',
        };
        (mockBookRepository.checkDuplicate as ReturnType<typeof vi.fn>).mockResolvedValue(duplicateResult);

        await expect(useCase.execute(validInput)).rejects.toThrow(DuplicateISBNError);

        expect(mockLevelRepository.findByName).not.toHaveBeenCalled();
      });

      it('should handle null ISBN in duplicate check', async () => {
        const inputWithoutIsbn: CreateBookInput = {
          ...validInput,
          isbn: null,
        };

        await useCase.execute(inputWithoutIsbn);

        expect(mockBookRepository.checkDuplicate).toHaveBeenCalledWith({
          isbn: null,
        });
      });
    });

    describe('embedding generation', () => {
      it('should generate embedding from book text', async () => {
        await useCase.execute(validInput);

        expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalled();
        const callArg = (mockEmbeddingService.generateEmbedding as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(callArg).toContain('Clean Code');
        expect(callArg).toContain('Robert C. Martin');
        expect(callArg).toContain('technical');
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

      it('should throw EmbeddingTextTooLongError when text exceeds 7000 chars', async () => {
        const longText = 'X'.repeat(7001);
        
        const mockLongBook = {
          id: '550e8400-e29b-41d4-a716-446655440099',
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          type: { value: 'technical', name: 'technical' },
          format: { value: 'pdf' },
          isbn: null,
          levelId: null,
          available: false,
          path: null,
          categories: mockCategories,
          authors: [mockAuthor],
          createdAt: new Date(),
          updatedAt: new Date(),
          getTextForEmbedding: () => longText,
        };
        
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
    });

    describe('translation handling (HU-013)', () => {
      it('should translate description when language is not Spanish', async () => {
        await useCase.execute(validInput);

        expect(mockTranslationService.translate).toHaveBeenCalledWith(
          'A handbook of agile software craftsmanship',
          'es',
        );
      });

      it('should skip translation when language is Spanish', async () => {
        const spanishInput: CreateBookInput = { ...validInput, language: 'es' };
        
        const result = await useCase.execute(spanishInput);

        expect(mockTranslationService.translate).not.toHaveBeenCalled();
        expect(result.description).toBe(result.originalDescription);
        expect(result.description).toBe('A handbook of agile software craftsmanship');
      });

      it('should propagate TranslationServiceUnavailableError when translation fails', async () => {
        (mockTranslationService.translate as ReturnType<typeof vi.fn>).mockRejectedValue(
          new TranslationServiceUnavailableError('Connection refused'),
        );

        await expect(useCase.execute(validInput)).rejects.toThrow(
          TranslationServiceUnavailableError,
        );
      });

      it('should use translated description for embedding generation', async () => {
        await useCase.execute(validInput);

        const embeddingCallArg = (mockEmbeddingService.generateEmbedding as ReturnType<typeof vi.fn>).mock.calls[0][0];
        // The embedding should use the TRANSLATED description (in Spanish)
        expect(embeddingCallArg).toContain('[Translated] A handbook of agile software craftsmanship');
      });

      it('should store original description separately from translated description', async () => {
        const result = await useCase.execute(validInput);

        // originalDescription = input description (English)
        expect(result.originalDescription).toBe('A handbook of agile software craftsmanship');
        // description = translated description (Spanish)
        expect(result.description).toBe('[Translated] A handbook of agile software craftsmanship');
        // They should be different for non-Spanish books
        expect(result.description).not.toBe(result.originalDescription);
      });
    });

    describe('pre-translated description handling (HU-011)', () => {
      it('should use pre-provided translatedDescription instead of calling translation service', async () => {
        const inputWithPreTranslation: CreateBookInput = {
          ...validInput,
          translatedDescription: 'Un manual de artesanía ágil de software',
        };

        const result = await useCase.execute(inputWithPreTranslation);

        // Should NOT call translation service
        expect(mockTranslationService.translate).not.toHaveBeenCalled();
        // Should use the pre-provided translation
        expect(result.description).toBe('Un manual de artesanía ágil de software');
        expect(result.originalDescription).toBe('A handbook of agile software craftsmanship');
      });

      it('should use pre-provided translatedDescription even when language is Spanish', async () => {
        const inputWithPreTranslation: CreateBookInput = {
          ...validInput,
          language: 'es',
          description: 'Descripción original',
          translatedDescription: 'Descripción pre-traducida',
        };

        const result = await useCase.execute(inputWithPreTranslation);

        expect(mockTranslationService.translate).not.toHaveBeenCalled();
        expect(result.description).toBe('Descripción pre-traducida');
        expect(result.originalDescription).toBe('Descripción original');
      });

      it('should work without translationService when translatedDescription is provided', async () => {
        // Create use case WITHOUT translation service
        const depsWithoutTranslation: CreateBookUseCaseDeps = {
          bookRepository: mockBookRepository,
          categoryRepository: mockCategoryRepository,
          typeRepository: mockTypeRepository,
          authorRepository: mockAuthorRepository,
          levelRepository: mockLevelRepository,
          embeddingService: mockEmbeddingService,
          // translationService is NOT provided
        };

        const useCaseWithoutTranslation = new CreateBookUseCase(depsWithoutTranslation);

        const inputWithPreTranslation: CreateBookInput = {
          ...validInput,
          translatedDescription: 'Traducción pre-proporcionada',
        };

        const result = await useCaseWithoutTranslation.execute(inputWithPreTranslation);

        expect(result.description).toBe('Traducción pre-proporcionada');
        expect(result.originalDescription).toBe('A handbook of agile software craftsmanship');
      });

      it('should fall back to original description when no translationService and no translatedDescription', async () => {
        // Create use case WITHOUT translation service
        const depsWithoutTranslation: CreateBookUseCaseDeps = {
          bookRepository: mockBookRepository,
          categoryRepository: mockCategoryRepository,
          typeRepository: mockTypeRepository,
          authorRepository: mockAuthorRepository,
          levelRepository: mockLevelRepository,
          embeddingService: mockEmbeddingService,
          // translationService is NOT provided
        };

        const useCaseWithoutTranslation = new CreateBookUseCase(depsWithoutTranslation);

        // Input WITHOUT translatedDescription
        const result = await useCaseWithoutTranslation.execute(validInput);

        // Should use original description as fallback
        expect(result.description).toBe('A handbook of agile software craftsmanship');
        expect(result.originalDescription).toBe('A handbook of agile software craftsmanship');
      });

      it('should use pre-translated description for embedding generation', async () => {
        const inputWithPreTranslation: CreateBookInput = {
          ...validInput,
          translatedDescription: 'Descripción en español para embedding',
        };

        await useCase.execute(inputWithPreTranslation);

        const embeddingCallArg = (mockEmbeddingService.generateEmbedding as ReturnType<typeof vi.fn>).mock.calls[0][0];
        // The embedding should use the PRE-PROVIDED translated description
        expect(embeddingCallArg).toContain('Descripción en español para embedding');
        expect(embeddingCallArg).not.toContain('[Translated]');
      });
    });

    describe('execution order', () => {
      it('should validate type before checking duplicates', async () => {
        const invalidInput = { ...validInput, type: 'nonexistent' };

        await expect(useCase.execute(invalidInput)).rejects.toThrow(InvalidBookTypeError);

        // Type validation happens before duplicate check
        expect(mockTypeRepository.findByName).toHaveBeenCalled();
        expect(mockBookRepository.checkDuplicate).not.toHaveBeenCalled();
      });

      it('should check duplicates before creating categories', async () => {
        const duplicateResult: DuplicateCheckResult = {
          isDuplicate: true,
          duplicateType: 'isbn',
          message: 'Duplicate ISBN',
        };
        (mockBookRepository.checkDuplicate as ReturnType<typeof vi.fn>).mockResolvedValue(duplicateResult);

        await expect(useCase.execute(validInput)).rejects.toThrow(DuplicateISBNError);

        expect(mockBookRepository.checkDuplicate).toHaveBeenCalled();
        expect(mockCategoryRepository.findOrCreateMany).not.toHaveBeenCalled();
        expect(mockLevelRepository.findByName).not.toHaveBeenCalled();
      });

      it('should resolve categories and level before creating book entity', async () => {
        await useCase.execute(validInput);

        // Verify order: type -> duplicate check -> categories -> level -> authors -> book
        const typeCallOrder = (mockTypeRepository.findByName as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
        const duplicateCallOrder = (mockBookRepository.checkDuplicate as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
        const categoryCallOrder = (mockCategoryRepository.findOrCreateMany as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
        const levelCallOrder = (mockLevelRepository.findByName as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
        const authorCallOrder = (mockAuthorRepository.findOrCreateMany as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
        const saveCallOrder = (mockBookRepository.save as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];

        expect(typeCallOrder).toBeLessThan(duplicateCallOrder);
        expect(duplicateCallOrder).toBeLessThan(categoryCallOrder);
        expect(categoryCallOrder).toBeLessThan(levelCallOrder);
        expect(levelCallOrder).toBeLessThan(authorCallOrder);
        expect(authorCallOrder).toBeLessThan(saveCallOrder);
      });
    });
  });
});
