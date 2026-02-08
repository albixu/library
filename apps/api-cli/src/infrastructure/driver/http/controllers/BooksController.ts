/**
 * Books Controller
 *
 * HTTP request handlers for book-related endpoints.
 * Follows the thin controller pattern - delegates business logic to use cases.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateBookUseCase } from '../../../../application/use-cases/CreateBookUseCase.js';
import type { Logger } from '../../../../application/ports/Logger.js';
import { noopLogger } from '../../../../application/ports/Logger.js';
import { createBookSchema } from '../schemas/book.schemas.js';
import { mapErrorToHttpResponse } from '../errors/HttpErrorMapper.js';

/**
 * Dependencies required by BooksController
 */
export interface BooksControllerDeps {
  createBookUseCase: CreateBookUseCase;
  logger?: Logger;
}

/**
 * BooksController
 *
 * Handles HTTP requests for book operations.
 * Responsibilities:
 * - Parse and validate request body (Zod)
 * - Call appropriate use case
 * - Map responses to HTTP format
 * - Handle errors with appropriate status codes
 */
export class BooksController {
  private readonly createBookUseCase: CreateBookUseCase;
  private readonly logger: Logger;

  constructor(deps: BooksControllerDeps) {
    this.createBookUseCase = deps.createBookUseCase;
    this.logger = deps.logger?.child({ name: 'BooksController' }) ?? noopLogger;
  }

  /**
   * POST /api/books
   *
   * Creates a new book in the catalog.
   *
   * @returns 201 Created with book data (without embedding)
   * @returns 400 Bad Request for validation errors
   * @returns 409 Conflict for duplicate ISBN or book
   * @returns 503 Service Unavailable if embedding service is down
   */
  async create(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    this.logger.debug('Received create book request', {
      contentType: request.headers['content-type'],
    });

    try {
      // 1. Parse and validate request body
      const parseResult = createBookSchema.safeParse(request.body);

      if (!parseResult.success) {
        const errorResponse = mapErrorToHttpResponse(parseResult.error);
        this.logger.debug('Request validation failed', {
          errors: parseResult.error.errors.map((e) => e.message),
        });
        return reply.status(errorResponse.statusCode).send(errorResponse.body);
      }

      const input = parseResult.data;

      // 2. Execute use case
      const result = await this.createBookUseCase.execute({
        title: input.title,
        author: input.author,
        description: input.description,
        type: input.type,
        format: input.format,
        categoryNames: input.categories,
        isbn: input.isbn,
        available: input.available,
        path: input.path,
      });

      // 3. Return created book (with dates as ISO strings)
      this.logger.info('Book created via API', {
        bookId: result.id,
        title: result.title,
      });

      return reply.status(201).send({
        id: result.id,
        title: result.title,
        author: result.author,
        description: result.description,
        type: result.type,
        format: result.format,
        categories: result.categories,
        isbn: result.isbn,
        available: result.available,
        path: result.path,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      });
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);

      if (errorResponse.statusCode >= 500) {
        this.logger.error('Unexpected error creating book', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } else {
        this.logger.debug('Book creation rejected', {
          statusCode: errorResponse.statusCode,
          error: errorResponse.body.error,
        });
      }

      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }
}
