# AGENTS.md - AI Coding Agent Guidelines

This document provides guidelines for AI coding agents working in this repository.

## Project Overview

**Library** is a personal digital library management system built with TypeScript, using:
- **Runtime**: Node.js 20+ with ES Modules (`"type": "module"`)
- **Framework**: Fastify (HTTP API) + Commander.js (CLI)
- **Database**: PostgreSQL 16 + pgvector (semantic search)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Testing**: Vitest
- **Architecture**: Hexagonal (Ports & Adapters)

## Build/Lint/Test Commands

All commands run from `apps/api-cli/`:

```bash
# Development
npm run dev              # Start server with hot reload (tsx watch)
npm run dev:cli          # Run CLI in dev mode

# Build
npm run build            # Compile TypeScript
npm run typecheck        # Type-check without emitting

# Testing
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run with coverage report
npm run test:ui          # Open Vitest UI in browser

# Run a single test file
npx vitest run tests/unit/domain/entities/Book.test.ts

# Run tests matching a pattern
npx vitest run -t "should create a valid ISBN"

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix

# Database (Drizzle)
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio
```

### Docker Commands

```bash
docker-compose up -d                          # Start dev services
docker exec -it library-api-dev npm test      # Run tests in container
```

## Project Structure

```
apps/api-cli/
├── src/
│   ├── domain/              # Core business logic (NO external dependencies)
│   │   ├── entities/        # Domain entities (Book.ts)
│   │   ├── value-objects/   # Value objects (ISBN, BookType, BookFormat)
│   │   ├── errors/          # Domain-specific errors
│   │   └── index.ts         # Barrel export
│   └── shared/
│       └── utils/           # Shared utilities
├── tests/
│   └── unit/
│       └── domain/          # Mirrors src/domain structure
└── docker/
```

## Code Style Guidelines

### Imports

- **Always use `.js` extension** for local imports (ESM requirement)
- Use **relative imports** within the module
- Use `type` keyword for type-only imports
- Group imports: external packages first, then local imports

```typescript
// External packages (no extension)
import { describe, it, expect } from 'vitest';

// Local imports (always .js extension)
import { BookType, type BookTypeValue } from '../value-objects/BookType.js';
import { RequiredFieldError } from '../errors/DomainErrors.js';
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (classes) | PascalCase | `Book.ts`, `ISBN.ts` |
| Files (utils) | camelCase | `uuid.ts` |
| Test files | `{Name}.test.ts` | `Book.test.ts` |
| Classes | PascalCase | `Book`, `BookType` |
| Error classes | PascalCase + Error | `InvalidISBNError` |
| Interfaces | PascalCase | `CreateBookProps` |
| Type aliases | PascalCase + Value | `BookTypeValue` |
| Constants | SCREAMING_SNAKE | `EMBEDDING_DIMENSIONS` |
| Functions | camelCase, verb-first | `validateTitle`, `generateUUID` |
| Boolean methods | `is`/`has` prefix | `isValid`, `hasEmbedding` |

### TypeScript Configuration

Strict mode is enabled with these additional checks:
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noUncheckedIndexedAccess`
- `noImplicitOverride`

### Types and Interfaces

```typescript
// Use 'as const' for enum-like arrays
export const BOOK_FORMATS = ['epub', 'pdf', 'mobi'] as const;
export type BookFormatValue = (typeof BOOK_FORMATS)[number];

// Use readonly for immutable properties
public readonly value: string;
public readonly embedding: readonly number[] | null;

// Separate interfaces for different use cases
interface CreateBookProps { ... }      // User input (optional fields with ?)
interface BookPersistenceProps { ... } // Database (all required, validated types)
interface UpdateBookProps { ... }      // Partial updates
```

### Error Handling

- Create domain-specific error classes extending `DomainError`
- Throw errors early during validation in factory methods
- Include descriptive error messages with the invalid value
- Document thrown errors with `@throws` in JSDoc

```typescript
export class InvalidISBNError extends DomainError {
  constructor(value: string) {
    super(`Invalid ISBN format: "${value}"`);
  }
}

/**
 * Creates a new ISBN instance
 * @throws InvalidISBNError if the value is not a valid ISBN
 */
static create(value: string): ISBN { ... }
```

### Immutability Pattern

Domain objects must be immutable:
- Use `private constructor` + static factory methods
- Use `Object.freeze(this)` in constructor
- All properties must be `readonly`
- "Mutations" return new instances

```typescript
export class Book {
  private constructor(public readonly id: string, ...) {
    Object.freeze(this);
  }

  static create(props: CreateBookProps): Book { ... }
  static fromPersistence(props: BookPersistenceProps): Book { ... }
  
  update(props: UpdateBookProps): Book {
    return new Book(...); // Returns new instance
  }
}
```

### Documentation

- Add file-level JSDoc explaining purpose and design principles
- Document methods with `@throws` annotations
- Use section separators for large classes: `// ===== Private Validators =====`
- Prefer self-documenting names over inline comments

### Testing Patterns

```typescript
describe('ISBN', () => {
  // Constants at the top
  const VALID_ISBN_13 = '9780306406157';

  describe('create', () => {
    it('should create a valid ISBN-13', () => { ... });
    it('should throw InvalidISBNError for invalid format', () => { ... });
  });
});

// Factory functions for test data
const createValidBookProps = (overrides?: Partial<CreateBookProps>) => ({
  id: validUUID,
  title: 'Clean Code',
  ...overrides,
});

// Test naming: "should {expected behavior}"
it('should return true for ISBNs with same value', () => { ... });

// Explicit error type checking
expect(() => ISBN.create('invalid')).toThrow(InvalidISBNError);
```

## Domain-Driven Design Rules

1. **Domain layer has NO external dependencies** - only pure TypeScript
2. **Value Objects** are immutable, self-validating, compared by value
3. **Entities** are identified by ID, compared by ID
4. **Use `create()` for user input** (validates) and `fromPersistence()` for database (trusts data)
5. **Errors propagate up** - no try/catch in business logic
