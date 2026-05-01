import { describe, it, expect } from 'vitest';
import {
  EmailAddress,
  InvalidEmailAddressError,
} from '../../../../src/domain/value-objects/EmailAddress.js';

describe('EmailAddress', () => {
  describe('create', () => {
    describe('valid emails', () => {
      it('should create a valid email address', () => {
        const email = EmailAddress.create('user@example.com');
        expect(email.value).toBe('user@example.com');
      });

      it('should trim whitespace from email', () => {
        const email = EmailAddress.create('  user@example.com  ');
        expect(email.value).toBe('user@example.com');
      });

      it('should accept email with subdomain', () => {
        const email = EmailAddress.create('user@mail.example.com');
        expect(email.value).toBe('user@mail.example.com');
      });

      it('should accept email with plus sign in local part', () => {
        const email = EmailAddress.create('user+tag@example.com');
        expect(email.value).toBe('user+tag@example.com');
      });

      it('should accept email with dots in local part', () => {
        const email = EmailAddress.create('first.last@example.com');
        expect(email.value).toBe('first.last@example.com');
      });
    });

    describe('invalid emails', () => {
      it('should throw InvalidEmailAddressError for empty string', () => {
        expect(() => EmailAddress.create('')).toThrow(InvalidEmailAddressError);
      });

      it('should throw InvalidEmailAddressError for whitespace-only string', () => {
        expect(() => EmailAddress.create('   ')).toThrow(
          InvalidEmailAddressError,
        );
      });

      it('should throw InvalidEmailAddressError for missing @ symbol', () => {
        expect(() => EmailAddress.create('userexample.com')).toThrow(
          InvalidEmailAddressError,
        );
      });

      it('should throw InvalidEmailAddressError for missing domain', () => {
        expect(() => EmailAddress.create('user@')).toThrow(
          InvalidEmailAddressError,
        );
      });

      it('should throw InvalidEmailAddressError for missing TLD', () => {
        expect(() => EmailAddress.create('user@example')).toThrow(
          InvalidEmailAddressError,
        );
      });

      it('should throw InvalidEmailAddressError for email with spaces', () => {
        expect(() => EmailAddress.create('user name@example.com')).toThrow(
          InvalidEmailAddressError,
        );
      });

      it('should throw InvalidEmailAddressError for double @ symbols', () => {
        expect(() => EmailAddress.create('user@@example.com')).toThrow(
          InvalidEmailAddressError,
        );
      });
    });
  });

  describe('fromPersistence', () => {
    it('should create EmailAddress from persistence without validation', () => {
      const email = EmailAddress.fromPersistence('any-value@stored.com');
      expect(email.value).toBe('any-value@stored.com');
    });
  });

  describe('isValid', () => {
    it('should return true for a valid email', () => {
      expect(EmailAddress.isValid('user@example.com')).toBe(true);
    });

    it('should return false for an email without @', () => {
      expect(EmailAddress.isValid('userexample.com')).toBe(false);
    });

    it('should return false for an email without TLD', () => {
      expect(EmailAddress.isValid('user@example')).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for two EmailAddress instances with same value', () => {
      const email1 = EmailAddress.create('user@example.com');
      const email2 = EmailAddress.create('user@example.com');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for two EmailAddress instances with different values', () => {
      const email1 = EmailAddress.create('user@example.com');
      const email2 = EmailAddress.create('other@example.com');
      expect(email1.equals(email2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be frozen (immutable)', () => {
      const email = EmailAddress.create('user@example.com');
      expect(Object.isFrozen(email)).toBe(true);
    });
  });
});
