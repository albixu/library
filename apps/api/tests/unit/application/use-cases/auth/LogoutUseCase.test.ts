/**
 * Unit Tests: LogoutUseCase
 *
 * Tests for the stateless logout use case.
 * HU-038: JWT-based authentication.
 */

import { describe, it, expect } from 'vitest';
import { LogoutUseCase } from '../../../../../src/application/use-cases/auth/LogoutUseCase.js';

describe('LogoutUseCase', () => {
  describe('execute — happy path', () => {
    it('should resolve without error', async () => {
      const useCase = new LogoutUseCase();

      await expect(useCase.execute()).resolves.toBeUndefined();
    });

    it('should return void (undefined)', async () => {
      const useCase = new LogoutUseCase();

      const result = await useCase.execute();

      expect(result).toBeUndefined();
    });
  });

  describe('constructor', () => {
    it('should instantiate without any dependencies', () => {
      const useCase = new LogoutUseCase();

      expect(useCase).toBeInstanceOf(LogoutUseCase);
    });
  });
});
