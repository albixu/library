/**
 * CLI Infrastructure Exports
 *
 * Public API for CLI infrastructure components.
 */

// Commands
export { createAddCommand, createAddCommandHandler } from './commands/add.js';
export type { AddCommandOptions, AddCommandDeps } from './commands/add.js';

// Error Mapping
export { mapErrorToCliOutput } from './errors/CliErrorMapper.js';
export type { CliErrorOutput } from './errors/CliErrorMapper.js';

// Formatters
export { formatBookCreated } from './formatters/BookFormatter.js';
export type { BookFormatInput } from './formatters/BookFormatter.js';
