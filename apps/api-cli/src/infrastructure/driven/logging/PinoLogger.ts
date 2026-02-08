/**
 * PinoLogger Adapter
 *
 * Implements the Logger port using Pino, a fast JSON logger for Node.js.
 * This is a driven/output adapter in the hexagonal architecture.
 *
 * Features:
 * - JSON structured logging in production
 * - Pretty-printed logs in development
 * - Child logger support for component-specific context
 * - Configurable log levels
 */

import pino, { type Logger as PinoBaseLogger } from 'pino';
import type { Logger, LogContext, ChildLoggerOptions } from '../../../application/ports/Logger.js';

/**
 * Configuration options for PinoLogger
 */
export interface PinoLoggerConfig {
  /** Log level (trace, debug, info, warn, error, fatal) */
  level: string;
  /** Whether to use pretty printing (typically for development) */
  prettyPrint: boolean;
  /** Service name to include in logs */
  serviceName?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PinoLoggerConfig = {
  level: 'info',
  prettyPrint: false,
  serviceName: 'library-api',
};

/**
 * Creates a Pino logger instance with the given configuration
 */
function createPinoInstance(config: PinoLoggerConfig): PinoBaseLogger {
  const transport = config.prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  return pino({
    level: config.level,
    transport,
    base: {
      service: config.serviceName,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

/**
 * PinoLogger
 *
 * Adapter that implements the Logger port using Pino.
 */
export class PinoLogger implements Logger {
  private readonly pinoInstance: PinoBaseLogger;

  constructor(configOrInstance?: PinoLoggerConfig | PinoBaseLogger) {
    if (configOrInstance && 'info' in configOrInstance && typeof configOrInstance.info === 'function') {
      // It's already a Pino instance (used for child loggers)
      this.pinoInstance = configOrInstance as PinoBaseLogger;
    } else {
      // It's a config object or undefined
      const config = { ...DEFAULT_CONFIG, ...(configOrInstance as PinoLoggerConfig | undefined) };
      this.pinoInstance = createPinoInstance(config);
    }
  }

  trace(message: string, context?: LogContext): void {
    if (context) {
      this.pinoInstance.trace(context, message);
    } else {
      this.pinoInstance.trace(message);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (context) {
      this.pinoInstance.debug(context, message);
    } else {
      this.pinoInstance.debug(message);
    }
  }

  info(message: string, context?: LogContext): void {
    if (context) {
      this.pinoInstance.info(context, message);
    } else {
      this.pinoInstance.info(message);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (context) {
      this.pinoInstance.warn(context, message);
    } else {
      this.pinoInstance.warn(message);
    }
  }

  error(message: string, context?: LogContext): void {
    if (context) {
      this.pinoInstance.error(context, message);
    } else {
      this.pinoInstance.error(message);
    }
  }

  fatal(message: string, context?: LogContext): void {
    if (context) {
      this.pinoInstance.fatal(context, message);
    } else {
      this.pinoInstance.fatal(message);
    }
  }

  child(options: ChildLoggerOptions): Logger {
    const childBindings: Record<string, unknown> = {};
    
    if (options.name) {
      childBindings['component'] = options.name;
    }
    
    if (options.context) {
      Object.assign(childBindings, options.context);
    }

    const childPino = this.pinoInstance.child(childBindings);
    return new PinoLogger(childPino);
  }
}

/**
 * Creates a logger configured for the current environment
 */
export function createLogger(overrides?: Partial<PinoLoggerConfig>): Logger {
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';
  const logLevel = process.env['LOG_LEVEL'] ?? (nodeEnv === 'production' ? 'info' : 'debug');
  const isPretty = nodeEnv !== 'production' && nodeEnv !== 'test';

  const config: PinoLoggerConfig = {
    level: logLevel,
    prettyPrint: isPretty,
    serviceName: 'library-api',
    ...overrides,
  };

  return new PinoLogger(config);
}
