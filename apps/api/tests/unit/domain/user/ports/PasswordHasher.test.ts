import { describe, it, expect, vi } from 'vitest';
import type { PasswordHasher } from '../../../../../src/domain/user/ports/PasswordHasher.js';

describe('PasswordHasher port', () => {
  it('should fulfil the contract with a mock implementation', async () => {
    const hasher: PasswordHasher = {
      hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
      verify: vi.fn().mockResolvedValue(true),
    };

    const hashed = await hasher.hash('plaintext');
    expect(hashed).toBe('$2b$10$hashedpassword');

    const isValid = await hasher.verify('plaintext', '$2b$10$hashedpassword');
    expect(isValid).toBe(true);
  });

  it('should return false when password does not match', async () => {
    const hasher: PasswordHasher = {
      hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
      verify: vi.fn().mockResolvedValue(false),
    };

    const isValid = await hasher.verify('wrongpassword', '$2b$10$hashedpassword');
    expect(isValid).toBe(false);
  });
});
