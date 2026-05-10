import { describe, it, expect } from 'vitest';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  PasswordResetTokenExpiredError,
  PasswordResetTokenInvalidError,
} from '../../../../../src/domain/user/errors/UserErrors.js';
import { DomainError } from '../../../../../src/domain/errors/DomainErrors.js';

describe('UserErrors', () => {
  describe('InvalidCredentialsError', () => {
    it('should extend DomainError', () => {
      const error = new InvalidCredentialsError();
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should have the correct name', () => {
      const error = new InvalidCredentialsError();
      expect(error.name).toBe('InvalidCredentialsError');
    });

    it('should have an informative message', () => {
      const error = new InvalidCredentialsError();
      expect(error.message).toBeTruthy();
      expect(error.message.length).toBeGreaterThan(0);
    });
  });

  describe('UserAlreadyExistsError', () => {
    it('should extend DomainError', () => {
      const error = new UserAlreadyExistsError('user@example.com');
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should have the correct name', () => {
      const error = new UserAlreadyExistsError('user@example.com');
      expect(error.name).toBe('UserAlreadyExistsError');
    });

    it('should include the email in the message', () => {
      const email = 'user@example.com';
      const error = new UserAlreadyExistsError(email);
      expect(error.message).toContain(email);
    });
  });

  describe('PasswordResetTokenExpiredError', () => {
    it('should extend DomainError', () => {
      const error = new PasswordResetTokenExpiredError();
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should have the correct name', () => {
      const error = new PasswordResetTokenExpiredError();
      expect(error.name).toBe('PasswordResetTokenExpiredError');
    });

    it('should have an informative message', () => {
      const error = new PasswordResetTokenExpiredError();
      expect(error.message).toBeTruthy();
      expect(error.message.length).toBeGreaterThan(0);
    });
  });

  describe('PasswordResetTokenInvalidError', () => {
    it('should extend DomainError', () => {
      const error = new PasswordResetTokenInvalidError();
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should have the correct name', () => {
      const error = new PasswordResetTokenInvalidError();
      expect(error.name).toBe('PasswordResetTokenInvalidError');
    });

    it('should have an informative message', () => {
      const error = new PasswordResetTokenInvalidError();
      expect(error.message).toBeTruthy();
      expect(error.message.length).toBeGreaterThan(0);
    });
  });
});
