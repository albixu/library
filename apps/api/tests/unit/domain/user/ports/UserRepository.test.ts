import { describe, it, expect, vi } from 'vitest';
import type { UserRepository } from '../../../../../src/domain/user/ports/UserRepository.js';
import type { User } from '../../../../../src/domain/user/User.js';

describe('UserRepository port', () => {
  it('should fulfil the contract with a mock implementation', async () => {
    const mockUser = {
      id: { value: '550e8400-e29b-41d4-a716-446655440000' },
      email: { value: 'user@example.com' },
      passwordHash: 'hashed',
      createdAt: new Date(),
    } as unknown as User;

    const repo: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(mockUser),
      findById: vi.fn().mockResolvedValue(mockUser),
      save: vi.fn().mockResolvedValue(undefined),
      updatePassword: vi.fn().mockResolvedValue(undefined),
    };

    const byEmail = await repo.findByEmail('user@example.com');
    expect(byEmail).toBe(mockUser);

    const byId = await repo.findById('550e8400-e29b-41d4-a716-446655440000');
    expect(byId).toBe(mockUser);

    await expect(repo.save(mockUser)).resolves.toBeUndefined();
    await expect(repo.updatePassword('550e8400-e29b-41d4-a716-446655440000', 'newHash')).resolves.toBeUndefined();
  });

  it('should return null when user is not found', async () => {
    const repo: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      updatePassword: vi.fn().mockResolvedValue(undefined),
    };

    expect(await repo.findByEmail('nonexistent@example.com')).toBeNull();
    expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});
