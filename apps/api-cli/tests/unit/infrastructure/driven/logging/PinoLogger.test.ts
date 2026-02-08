import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PinoLogger, createLogger } from '../../../../../src/infrastructure/driven/logging/PinoLogger.js';
import type { Logger } from '../../../../../src/application/ports/Logger.js';
import { noopLogger } from '../../../../../src/application/ports/Logger.js';

describe('PinoLogger', () => {
  describe('noopLogger', () => {
    it('should not throw on any log method', () => {
      expect(() => noopLogger.trace('test')).not.toThrow();
      expect(() => noopLogger.debug('test')).not.toThrow();
      expect(() => noopLogger.info('test')).not.toThrow();
      expect(() => noopLogger.warn('test')).not.toThrow();
      expect(() => noopLogger.error('test')).not.toThrow();
      expect(() => noopLogger.fatal('test')).not.toThrow();
    });

    it('should return itself from child', () => {
      const child = noopLogger.child({ name: 'test' });
      expect(child).toBe(noopLogger);
    });
  });

  describe('PinoLogger', () => {
    let logger: Logger;
    let mockPinoInstance: {
      trace: ReturnType<typeof vi.fn>;
      debug: ReturnType<typeof vi.fn>;
      info: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
      fatal: ReturnType<typeof vi.fn>;
      child: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockPinoInstance = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
      };

      // Create a logger with the mock pino instance
      logger = new PinoLogger(mockPinoInstance as unknown as PinoLogger['pinoInstance']);
    });

    it('should log trace messages', () => {
      logger.trace('test message');
      expect(mockPinoInstance.trace).toHaveBeenCalledWith('test message');
    });

    it('should log trace messages with context', () => {
      logger.trace('test message', { key: 'value' });
      expect(mockPinoInstance.trace).toHaveBeenCalledWith({ key: 'value' }, 'test message');
    });

    it('should log debug messages', () => {
      logger.debug('test message');
      expect(mockPinoInstance.debug).toHaveBeenCalledWith('test message');
    });

    it('should log debug messages with context', () => {
      logger.debug('test message', { key: 'value' });
      expect(mockPinoInstance.debug).toHaveBeenCalledWith({ key: 'value' }, 'test message');
    });

    it('should log info messages', () => {
      logger.info('test message');
      expect(mockPinoInstance.info).toHaveBeenCalledWith('test message');
    });

    it('should log info messages with context', () => {
      logger.info('test message', { key: 'value' });
      expect(mockPinoInstance.info).toHaveBeenCalledWith({ key: 'value' }, 'test message');
    });

    it('should log warn messages', () => {
      logger.warn('test message');
      expect(mockPinoInstance.warn).toHaveBeenCalledWith('test message');
    });

    it('should log warn messages with context', () => {
      logger.warn('test message', { key: 'value' });
      expect(mockPinoInstance.warn).toHaveBeenCalledWith({ key: 'value' }, 'test message');
    });

    it('should log error messages', () => {
      logger.error('test message');
      expect(mockPinoInstance.error).toHaveBeenCalledWith('test message');
    });

    it('should log error messages with context', () => {
      logger.error('test message', { key: 'value' });
      expect(mockPinoInstance.error).toHaveBeenCalledWith({ key: 'value' }, 'test message');
    });

    it('should log fatal messages', () => {
      logger.fatal('test message');
      expect(mockPinoInstance.fatal).toHaveBeenCalledWith('test message');
    });

    it('should log fatal messages with context', () => {
      logger.fatal('test message', { key: 'value' });
      expect(mockPinoInstance.fatal).toHaveBeenCalledWith({ key: 'value' }, 'test message');
    });

    it('should create child logger with component name', () => {
      const childMock = { ...mockPinoInstance };
      mockPinoInstance.child.mockReturnValue(childMock);

      logger.child({ name: 'TestComponent' });

      expect(mockPinoInstance.child).toHaveBeenCalledWith({ component: 'TestComponent' });
    });

    it('should create child logger with additional context', () => {
      const childMock = { ...mockPinoInstance };
      mockPinoInstance.child.mockReturnValue(childMock);

      logger.child({ name: 'TestComponent', context: { requestId: '123' } });

      expect(mockPinoInstance.child).toHaveBeenCalledWith({
        component: 'TestComponent',
        requestId: '123',
      });
    });
  });

  describe('createLogger', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create a logger with default config', () => {
      process.env['NODE_ENV'] = 'test';
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
    });

    it('should respect config overrides', () => {
      process.env['NODE_ENV'] = 'test';
      const logger = createLogger({ level: 'error' });
      expect(logger).toBeDefined();
    });
  });
});
