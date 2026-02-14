/**
 * PostgresAuthorRepository Integration Tests
 *
 * Tests the AuthorRepository adapter against a real PostgreSQL database.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { PostgresAuthorRepository } from '../../../../src/infrastructure/driven/persistence/PostgresAuthorRepository.js';
import { Author } from '../../../../src/domain/entities/Author.js';
import { AuthorAlreadyExistsError } from '../../../../src/domain/errors/DomainErrors.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';
import { generateUUID } from '../../../../src/shared/utils/uuid.js';

const { Pool } = pg;
const { authors, bookAuthors, books, bookCategories, categories } = schema;

describe('PostgresAuthorRepository Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresAuthorRepository;

  beforeAll(async () => {
    const databaseUrl = process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';
    
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    // Verify connection
    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PostgresAuthorRepository(db as any);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test (order matters due to FK constraints)
    await db.delete(bookCategories);
    await db.delete(bookAuthors);
    await db.delete(books);
    await db.delete(categories);
    await db.delete(authors);
  });

  describe('save', () => {
    it('should save a new author', async () => {
      const author = Author.create({
        id: generateUUID(),
        name: 'Robert C. Martin',
      });

      const saved = await repository.save(author);

      expect(saved.id).toBe(author.id);
      expect(saved.name).toBe('Robert C. Martin');
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw AuthorAlreadyExistsError for duplicate name', async () => {
      const author1 = Author.create({
        id: generateUUID(),
        name: 'Duplicate Author',
      });

      await repository.save(author1);

      const author2 = Author.create({
        id: generateUUID(),
        name: 'Duplicate Author', // Same name
      });

      await expect(repository.save(author2))
        .rejects
        .toThrow(AuthorAlreadyExistsError);
    });
  });

  describe('findById', () => {
    it('should find an existing author by ID', async () => {
      const author = Author.create({
        id: generateUUID(),
        name: 'Martin Fowler',
      });
      await repository.save(author);

      const found = await repository.findById(author.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(author.id);
      expect(found!.name).toBe('Martin Fowler');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById(generateUUID());
      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find author by exact name', async () => {
      const author = Author.create({
        id: generateUUID(),
        name: 'Kent Beck',
      });
      await repository.save(author);

      const found = await repository.findByName('Kent Beck');

      expect(found).not.toBeNull();
      expect(found!.name).toBe('Kent Beck');
    });

    it('should not find author with different case (case-sensitive)', async () => {
      const author = Author.create({
        id: generateUUID(),
        name: 'Kent Beck',
      });
      await repository.save(author);

      // Authors use exact matching (case-sensitive) unlike categories
      const found = await repository.findByName('KENT BECK');
      expect(found).toBeNull();
    });

    it('should return null for non-existent name', async () => {
      const found = await repository.findByName('Non-existent Author');
      expect(found).toBeNull();
    });
  });

  describe('findByNames', () => {
    it('should find multiple authors by names', async () => {
      await repository.save(Author.create({ id: generateUUID(), name: 'Author A' }));
      await repository.save(Author.create({ id: generateUUID(), name: 'Author B' }));
      await repository.save(Author.create({ id: generateUUID(), name: 'Author C' }));

      const found = await repository.findByNames(['Author A', 'Author C']);

      expect(found).toHaveLength(2);
      const names = found.map((a) => a.name);
      expect(names).toContain('Author A');
      expect(names).toContain('Author C');
    });

    it('should return empty array for empty input', async () => {
      const found = await repository.findByNames([]);
      expect(found).toEqual([]);
    });

    it('should return only existing authors', async () => {
      await repository.save(Author.create({ id: generateUUID(), name: 'Exists' }));

      const found = await repository.findByNames(['Exists', 'Does Not Exist']);

      expect(found).toHaveLength(1);
      expect(found[0]!.name).toBe('Exists');
    });
  });

  describe('findOrCreate', () => {
    it('should return existing author if found', async () => {
      const existing = await repository.save(
        Author.create({ id: generateUUID(), name: 'Existing Author' })
      );

      const result = await repository.findOrCreate('Existing Author');

      expect(result.id).toBe(existing.id);
      expect(result.name).toBe('Existing Author');
    });

    it('should create new author if not found', async () => {
      const result = await repository.findOrCreate('Brand New Author');

      expect(result.name).toBe('Brand New Author');
      expect(result.id).toBeDefined();

      // Verify it was persisted
      const verified = await repository.findByName('Brand New Author');
      expect(verified).not.toBeNull();
      expect(verified!.id).toBe(result.id);
    });
  });

  describe('findOrCreateMany', () => {
    it('should find existing and create new authors', async () => {
      // Create one existing author
      await repository.save(
        Author.create({ id: generateUUID(), name: 'Existing' })
      );

      const result = await repository.findOrCreateMany(['Existing', 'New One', 'New Two']);

      expect(result).toHaveLength(3);
      expect(result[0]!.name).toBe('Existing');
      expect(result[1]!.name).toBe('New One');
      expect(result[2]!.name).toBe('New Two');
    });

    it('should maintain input order in results', async () => {
      await repository.save(Author.create({ id: generateUUID(), name: 'Zebra' }));
      await repository.save(Author.create({ id: generateUUID(), name: 'Apple' }));

      const result = await repository.findOrCreateMany(['Apple', 'Zebra', 'Mango']);

      expect(result[0]!.name).toBe('Apple');
      expect(result[1]!.name).toBe('Zebra');
      expect(result[2]!.name).toBe('Mango');
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.findOrCreateMany([]);
      expect(result).toEqual([]);
    });

    it('should handle duplicates in input', async () => {
      const result = await repository.findOrCreateMany(['Same', 'Same', 'Same']);

      // Should return 3 items, all pointing to the same author
      expect(result).toHaveLength(3);
      expect(result[0]!.id).toBe(result[1]!.id);
      expect(result[1]!.id).toBe(result[2]!.id);
    });
  });

  describe('findAll', () => {
    it('should return all authors', async () => {
      await repository.save(Author.create({ id: generateUUID(), name: 'First' }));
      await repository.save(Author.create({ id: generateUUID(), name: 'Second' }));

      const all = await repository.findAll();

      expect(all).toHaveLength(2);
    });

    it('should return empty array when no authors exist', async () => {
      const all = await repository.findAll();
      expect(all).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return the correct count of authors', async () => {
      await repository.save(Author.create({ id: generateUUID(), name: 'Author 1' }));
      await repository.save(Author.create({ id: generateUUID(), name: 'Author 2' }));
      await repository.save(Author.create({ id: generateUUID(), name: 'Author 3' }));

      const count = await repository.count();

      expect(count).toBe(3);
    });

    it('should return 0 when no authors exist', async () => {
      const count = await repository.count();
      expect(count).toBe(0);
    });
  });
});
