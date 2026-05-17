import { describe, it, expect, vi, beforeEach } from 'vitest';
import { User } from '../../../../src/domain/user/User.js';
import { UserId } from '../../../../src/domain/user/value-objects/UserId.js';
import { EmailAddress } from '../../../../src/domain/value-objects/EmailAddress.js';

describe('User', () => {
  describe('create', () => {
    it('should create a User with the given email and passwordHash', () => {
      const user = User.create({
        email: 'user@example.com',
        passwordHash: 'hashed_password_123',
      });

      expect(user.email.value).toBe('user@example.com');
      expect(user.passwordHash).toBe('hashed_password_123');
    });

    it('should generate a new UUID for id', () => {
      const user = User.create({
        email: 'user@example.com',
        passwordHash: 'hashed_password_123',
      });

      expect(user.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should set createdAt to current date', () => {
      const before = new Date();
      const user = User.create({
        email: 'user@example.com',
        passwordHash: 'hashed_password_123',
      });
      const after = new Date();

      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should generate unique ids for different users', () => {
      const user1 = User.create({ email: 'user1@example.com', passwordHash: 'hash1' });
      const user2 = User.create({ email: 'user2@example.com', passwordHash: 'hash2' });

      expect(user1.id.value).not.toBe(user2.id.value);
    });

    it('should throw InvalidEmailAddressError for invalid email', () => {
      expect(() =>
        User.create({ email: 'not-an-email', passwordHash: 'hash' }),
      ).toThrow();
    });
  });

  describe('fromPersistence', () => {
    it('should reconstruct a User from persistence data', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const createdAt = new Date('2024-01-01T00:00:00Z');

      const user = User.fromPersistence({
        id,
        email: 'user@example.com',
        passwordHash: 'stored_hash',
        createdAt,
      });

      expect(user.id.value).toBe(id);
      expect(user.email.value).toBe('user@example.com');
      expect(user.passwordHash).toBe('stored_hash');
      expect(user.createdAt).toBe(createdAt);
    });

    it('should use the exact provided id without generating a new one', () => {
      const specificId = '123e4567-e89b-42d3-a456-426614174000';

      const user = User.fromPersistence({
        id: specificId,
        email: 'user@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
      });

      expect(user.id.value).toBe(specificId);
    });
  });

  describe('immutability', () => {
    it('should be frozen (immutable)', () => {
      const user = User.create({ email: 'user@example.com', passwordHash: 'hash' });
      expect(Object.isFrozen(user)).toBe(true);
    });

    it('should have a readonly id', () => {
      const user = User.create({ email: 'user@example.com', passwordHash: 'hash' });
      expect(() => {
        // @ts-expect-error testing immutability
        user.id = UserId.generate();
      }).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true for two users with the same id', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const user1 = User.fromPersistence({ id, email: 'a@example.com', passwordHash: 'h', createdAt: new Date() });
      const user2 = User.fromPersistence({ id, email: 'b@example.com', passwordHash: 'h2', createdAt: new Date() });

      expect(user1.equals(user2)).toBe(true);
    });

    it('should return false for two users with different ids', () => {
      const user1 = User.create({ email: 'user1@example.com', passwordHash: 'hash1' });
      const user2 = User.create({ email: 'user2@example.com', passwordHash: 'hash2' });

      expect(user1.equals(user2)).toBe(false);
    });
  });
});
