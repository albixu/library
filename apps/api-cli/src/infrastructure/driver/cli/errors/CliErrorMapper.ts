/**
 * CLI Error Mapper
 *
 * Maps domain and application errors to CLI-friendly output format
 * with appropriate exit codes and user-friendly messages in Spanish.
 *
 * Exit codes:
 * - 0: Success
 * - 1: Error (validation, duplicate, service unavailable, etc.)
 */

import {
  DomainError,
  DuplicateISBNError,
  DuplicateBookError,
  RequiredFieldError,
  FieldTooLongError,
  TooManyItemsError,
  DuplicateItemError,
} from '../../../../domain/errors/DomainErrors.js';
import { InvalidISBNError } from '../../../../domain/value-objects/ISBN.js';
import { InvalidBookTypeError } from '../../../../domain/value-objects/BookType.js';
import { InvalidBookFormatError } from '../../../../domain/value-objects/BookFormat.js';
import {
  EmbeddingServiceUnavailableError,
  EmbeddingTextTooLongError,
} from '../../../../application/errors/ApplicationErrors.js';

/**
 * CLI error output structure
 */
export interface CliErrorOutput {
  exitCode: number;
  message: string;
}

/**
 * Error prefix for CLI error messages
 */
const ERROR_PREFIX = '✗ Error:';

/**
 * Maps an error to a CLI-friendly output with exit code and message
 *
 * @param error - The error to map
 * @returns CliErrorOutput with exit code and formatted message
 */
export function mapErrorToCliOutput(error: unknown): CliErrorOutput {
  // Duplicate ISBN
  if (error instanceof DuplicateISBNError) {
    const isbn = extractIsbnFromError(error);
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} ISBN ya registrado en el sistema\n  ISBN: ${isbn}`,
    };
  }

  // Duplicate book (triad)
  if (error instanceof DuplicateBookError) {
    const { author, title, format } = extractTriadFromError(error);
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} El libro ya existe en el catálogo\n  Autor: ${author}\n  Título: ${title}\n  Formato: ${format}`,
    };
  }

  // Required field
  if (error instanceof RequiredFieldError) {
    const field = extractFieldFromMessage(error.message);
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} El campo "${field}" es obligatorio`,
    };
  }

  // Field too long
  if (error instanceof FieldTooLongError) {
    const { field, maxLength } = extractFieldLengthFromMessage(error.message);
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} El campo "${field}" excede el máximo de ${maxLength} caracteres`,
    };
  }

  // Too many items
  if (error instanceof TooManyItemsError) {
    const { field, maxItems } = extractMaxItemsFromMessage(error.message);
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} El campo "${field}" excede el máximo de ${maxItems} elementos`,
    };
  }

  // Duplicate item
  if (error instanceof DuplicateItemError) {
    const { field, value } = extractDuplicateItemFromMessage(error.message);
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} Valor duplicado "${value}" en "${field}"`,
    };
  }

  // Invalid ISBN
  if (error instanceof InvalidISBNError) {
    const isbn = extractIsbnFromInvalidError(error);
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} ISBN inválido: "${isbn}"`,
    };
  }

  // Invalid book type
  if (error instanceof InvalidBookTypeError) {
    const type = extractTypeFromError(error);
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} Tipo de libro inválido: "${type}"\n  Valores válidos: technical, novel, essay, poetry, biography, reference, manual, other`,
    };
  }

  // Invalid book format
  if (error instanceof InvalidBookFormatError) {
    const format = extractFormatFromError(error);
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} Formato de libro inválido: "${format}"\n  Valores válidos: epub, pdf, mobi, azw3, djvu, cbz, cbr, txt, other`,
    };
  }

  // Embedding text too long
  if (error instanceof EmbeddingTextTooLongError) {
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} El texto es demasiado largo para generar embeddings`,
    };
  }

  // Embedding service unavailable
  if (error instanceof EmbeddingServiceUnavailableError) {
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} Servicio de embeddings no disponible\n  Intente de nuevo más tarde`,
    };
  }

  // Generic domain error
  if (error instanceof DomainError) {
    return {
      exitCode: 1,
      message: `${ERROR_PREFIX} ${error.message}`,
    };
  }

  // Unknown error
  return {
    exitCode: 1,
    message: `${ERROR_PREFIX} Error inesperado. Por favor, intente de nuevo.`,
  };
}

// ==================== Helper functions ====================

function extractIsbnFromError(error: DuplicateISBNError): string {
  const match = error.message.match(/ISBN "([^"]+)"/);
  return match?.[1] ?? 'desconocido';
}

function extractIsbnFromInvalidError(error: InvalidISBNError): string {
  const match = error.message.match(/"([^"]+)"/);
  return match?.[1] ?? 'desconocido';
}

function extractTriadFromError(error: DuplicateBookError): {
  author: string;
  title: string;
  format: string;
} {
  const match = error.message.match(/"([^"]+)" - "([^"]+)" \(([^)]+)\)/);
  return {
    author: match?.[1] ?? 'desconocido',
    title: match?.[2] ?? 'desconocido',
    format: match?.[3] ?? 'desconocido',
  };
}

function extractFieldFromMessage(message: string): string {
  const match = message.match(/"([^"]+)"/);
  return match?.[1] ?? 'campo';
}

function extractFieldLengthFromMessage(message: string): {
  field: string;
  maxLength: string;
} {
  const fieldMatch = message.match(/"([^"]+)"/);
  const lengthMatch = message.match(/(\d+)/);
  return {
    field: fieldMatch?.[1] ?? 'campo',
    maxLength: lengthMatch?.[1] ?? '0',
  };
}

function extractMaxItemsFromMessage(message: string): {
  field: string;
  maxItems: string;
} {
  const fieldMatch = message.match(/"([^"]+)"/);
  const itemsMatch = message.match(/(\d+)/);
  return {
    field: fieldMatch?.[1] ?? 'campo',
    maxItems: itemsMatch?.[1] ?? '0',
  };
}

function extractDuplicateItemFromMessage(message: string): {
  field: string;
  value: string;
} {
  const valueMatch = message.match(/value "([^"]+)"/);
  const fieldMatch = message.match(/in "([^"]+)"/);
  return {
    field: fieldMatch?.[1] ?? 'campo',
    value: valueMatch?.[1] ?? 'valor',
  };
}

function extractTypeFromError(error: InvalidBookTypeError): string {
  const match = error.message.match(/"([^"]+)"/);
  return match?.[1] ?? 'desconocido';
}

function extractFormatFromError(error: InvalidBookFormatError): string {
  const match = error.message.match(/"([^"]+)"/);
  return match?.[1] ?? 'desconocido';
}
