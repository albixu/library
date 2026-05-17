import { describe, it, expect } from 'vitest';
import {
  BookFileNotFoundError,
  EmailSendError,
} from '../../../../src/domain/errors/DomainErrors.js';

describe('BookFileNotFoundError', () => {
  it('should create error with correct message', () => {
    const error = new BookFileNotFoundError('book-123');
    expect(error.message).toContain('book-123');
    expect(error.message).toContain('file not found');
  });

  it('should have the correct name', () => {
    const error = new BookFileNotFoundError('book-123');
    expect(error.name).toBe('BookFileNotFoundError');
  });

  it('should be an instance of Error', () => {
    const error = new BookFileNotFoundError('book-123');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('EmailSendError', () => {
  it('should create error with recipient and no reason', () => {
    const error = new EmailSendError('user@example.com');
    expect(error.message).toContain('user@example.com');
  });

  it('should create error with recipient and reason', () => {
    const error = new EmailSendError('user@example.com', 'connection refused');
    expect(error.message).toContain('user@example.com');
    expect(error.message).toContain('connection refused');
  });

  it('should have the correct name', () => {
    const error = new EmailSendError('user@example.com');
    expect(error.name).toBe('EmailSendError');
  });

  it('should be an instance of Error', () => {
    const error = new EmailSendError('user@example.com');
    expect(error).toBeInstanceOf(Error);
  });
});
