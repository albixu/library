/**
 * Add Book Command
 *
 * CLI command to add a new book to the catalog.
 * Uses Commander.js for argument parsing and CreateBookUseCase for business logic.
 *
 * Usage:
 *   library add --title "Clean Code" --author "Robert C. Martin" \
 *     --description "A handbook..." --type technical --format pdf \
 *     --categories "programming,software engineering" \
 *     --isbn 9780132350884 --path /books/clean-code.pdf
 */

import { Command } from 'commander';
import type { CreateBookUseCase } from '../../../../application/use-cases/CreateBookUseCase.js';
import type { Logger } from '../../../../application/ports/Logger.js';
import { noopLogger } from '../../../../application/ports/Logger.js';
import { mapErrorToCliOutput } from '../errors/CliErrorMapper.js';
import { formatBookCreated } from '../formatters/BookFormatter.js';

/**
 * Options parsed from CLI arguments
 */
export interface AddCommandOptions {
  title: string;
  author: string;
  description: string;
  type: string;
  format: string;
  categories: string;
  isbn?: string;
  path?: string;
  available?: boolean;
}

/**
 * Dependencies required by the add command
 */
export interface AddCommandDeps {
  createBookUseCase: CreateBookUseCase;
  logger?: Logger;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
  exit?: (code: number) => void;
}

/**
 * Creates the 'add' command for the CLI
 *
 * @param deps - Command dependencies (use case, logger, streams)
 * @returns Configured Commander.js Command
 */
export function createAddCommand(deps: AddCommandDeps): Command {
  const {
    createBookUseCase,
    logger = noopLogger,
    stdout = process.stdout,
    stderr = process.stderr,
    exit = process.exit,
  } = deps;

  const log = logger.child({ name: 'AddCommand' });

  const command = new Command('add')
    .description('Add a new book to the catalog')
    .requiredOption('-t, --title <title>', 'Book title')
    .requiredOption('-a, --author <author>', 'Book author')
    .requiredOption('-d, --description <description>', 'Book description')
    .requiredOption(
      '-T, --type <type>',
      'Book type (technical, novel, essay, poetry, biography, reference, manual, other)'
    )
    .requiredOption(
      '-f, --format <format>',
      'Book format (epub, pdf, mobi, azw3, djvu, cbz, cbr, txt, other)'
    )
    .requiredOption(
      '-c, --categories <categories>',
      'Categories (comma-separated)'
    )
    .option('--isbn <isbn>', 'Book ISBN (10 or 13 digits)')
    .option('-p, --path <path>', 'File path')
    .option('--available', 'Mark as available', true)
    .action(async (options: AddCommandOptions) => {
      log.debug('Add command invoked', {
        title: options.title,
        author: options.author,
        type: options.type,
        format: options.format,
      });

      try {
        // Parse categories from comma-separated string
        const categoryNames = options.categories
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        // Execute use case
        const result = await createBookUseCase.execute({
          title: options.title,
          author: options.author,
          description: options.description,
          type: options.type,
          format: options.format,
          categoryNames,
          isbn: options.isbn,
          path: options.path,
          available: options.available,
        });

        // Format and display success output
        const output = formatBookCreated(result);
        stdout.write(output);

        log.info('Book added successfully', {
          bookId: result.id,
          title: result.title,
        });

        exit(0);
      } catch (error) {
        // Map error to CLI-friendly output
        const errorOutput = mapErrorToCliOutput(error);

        log.error('Failed to add book', {
          error: error instanceof Error ? error.message : String(error),
        });

        stderr.write(errorOutput.message + '\n');
        exit(errorOutput.exitCode);
      }
    });

  return command;
}

/**
 * Factory function to create the add command handler
 * for use with dependency injection
 *
 * @param createBookUseCase - The use case for creating books
 * @param logger - Optional logger
 * @returns The action handler function
 */
export function createAddCommandHandler(deps: AddCommandDeps) {
  const command = createAddCommand(deps);
  return command;
}
