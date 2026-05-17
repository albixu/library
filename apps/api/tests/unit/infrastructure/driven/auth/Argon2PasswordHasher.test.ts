/**
 * Argon2PasswordHasher Unit Tests
 *
 * Tests the password hashing adapter.
 * Does NOT require a database — pure unit tests.
 *
 * Run with: npx vitest run tests/unit/infrastructure/driven/auth/Argon2PasswordHasher.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Argon2PasswordHasher } from '../../../../../src/infrastructure/driven/auth/Argon2PasswordHasher.js';

describe('Argon2PasswordHasher', () => {
  let hasher: Argon2PasswordHasher;

  beforeEach(() => {
    hasher = new Argon2PasswordHasher();
  });

  describe('hash', () => {
    it('should return a non-empty hash string', async () => {
      const hash = await hasher.hash('my-password-123');

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('should produce a different hash each time (salted)', async () => {
      const hash1 = await hasher.hash('same-password');
      const hash2 = await hasher.hash('same-password');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce an argon2 hash (starts with $argon2)', async () => {
      const hash = await hasher.hash('password');

      expect(hash).toMatch(/^\$argon2/);
    });
  });

  describe('verify', () => {
    it('should return true for a correct password', async () => {
      const password = 'correct-password!';
      const hash = await hasher.hash(password);

      const result = await hasher.verify(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for an incorrect password', async () => {
      const hash = await hasher.hash('correct-password');

      const result = await hasher.verify('wrong-password', hash);

      expect(result).toBe(false);
    });

    it('should return false for an empty password against a real hash', async () => {
      const hash = await hasher.hash('some-password');

      const result = await hasher.verify('', hash);

      expect(result).toBe(false);
    });
  });
});
