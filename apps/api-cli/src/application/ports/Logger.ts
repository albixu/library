/**
 * Logger Port (Driven/Output Port)
 *
 * Defines the contract for logging operations.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., PinoLogger) will be an adapter in the infrastructure layer.
 *
 * The logger follows standard log levels (trace, debug, info, warn, error, fatal)
 * and supports structured logging with additional context data.
 */

/**
 * Log context - additional structured data to include with log messages
 */
export type LogContext = Record<string, unknown>;

/**
 * Child logger options
 */
export interface ChildLoggerOptions {
  /** Name for the child logger (e.g., component name) */
  name?: string;
  /** Additional context to include in all log messages */
  context?: LogContext;
}

/**
 * Logger Port Interface
 *
 * Provides standard logging operations with support for structured logging.
 * All methods accept an optional context object for additional metadata.
 */
export interface Logger {
  /**
   * Logs a trace-level message (most verbose)
   * Use for detailed debugging information
   */
  trace(message: string, context?: LogContext): void;

  /**
   * Logs a debug-level message
   * Use for debugging information during development
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Logs an info-level message
   * Use for general operational information
   */
  info(message: string, context?: LogContext): void;

  /**
   * Logs a warn-level message
   * Use for potentially harmful situations
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Logs an error-level message
   * Use for error events that might still allow the application to continue
   */
  error(message: string, context?: LogContext): void;

  /**
   * Logs a fatal-level message
   * Use for severe error events that will likely cause the application to abort
   */
  fatal(message: string, context?: LogContext): void;

  /**
   * Creates a child logger with additional context
   * Useful for adding component-specific context to all log messages
   */
  child(options: ChildLoggerOptions): Logger;
}

/**
 * No-op logger implementation for testing or when logging is disabled
 */
export const noopLogger: Logger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => noopLogger,
};
