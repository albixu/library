import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service.js';
import { ApiService } from '../core/services/api.service.js';
import { provideZonelessChangeDetection } from '@angular/core';

describe('AuthService', () => {
  let service: AuthService;
  let apiServiceMock: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apiServiceMock = { post: vi.fn() };

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), AuthService, { provide: ApiService, useValue: apiServiceMock }],
    });

    service = TestBed.inject(AuthService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with currentUser as null', () => {
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('login()', () => {
    it('should call POST /auth/login with credentials', async () => {
      apiServiceMock.post.mockReturnValue(of(undefined));

      await firstValueFrom(service.login('user@example.com', 'secret'));

      expect(apiServiceMock.post).toHaveBeenCalledWith('/auth/login', {
        email: 'user@example.com',
        password: 'secret',
      });
    });

    it('should update currentUser signal on success', async () => {
      apiServiceMock.post.mockReturnValue(of(undefined));

      await firstValueFrom(service.login('user@example.com', 'secret'));

      expect(service.currentUser()).toEqual({ email: 'user@example.com' });
    });

    it('should NOT update currentUser signal on 401 error', async () => {
      const httpError = { status: 401, message: 'Unauthorized' };
      apiServiceMock.post.mockReturnValue(throwError(() => httpError));

      await expect(firstValueFrom(service.login('user@example.com', 'wrong'))).rejects.toEqual(
        httpError
      );

      expect(service.currentUser()).toBeNull();
    });

    it('should propagate errors to the caller', async () => {
      const httpError = { status: 500, message: 'Internal Server Error' };
      apiServiceMock.post.mockReturnValue(throwError(() => httpError));

      await expect(firstValueFrom(service.login('user@example.com', 'pass'))).rejects.toEqual(
        httpError
      );
    });
  });

  describe('logout()', () => {
    it('should call POST /auth/logout', async () => {
      apiServiceMock.post.mockReturnValue(of(undefined));
      // First log in
      apiServiceMock.post.mockReturnValueOnce(of(undefined)); // login
      await firstValueFrom(service.login('user@example.com', 'secret'));

      apiServiceMock.post.mockReturnValue(of(undefined)); // logout
      await firstValueFrom(service.logout());

      expect(apiServiceMock.post).toHaveBeenCalledWith('/auth/logout', {});
    });

    it('should clear currentUser signal on success', async () => {
      // First log in
      apiServiceMock.post.mockReturnValue(of(undefined));
      await firstValueFrom(service.login('user@example.com', 'secret'));
      expect(service.currentUser()).toEqual({ email: 'user@example.com' });

      // Then log out
      apiServiceMock.post.mockReturnValue(of(undefined));
      await firstValueFrom(service.logout());

      expect(service.currentUser()).toBeNull();
    });
  });

  describe('refreshToken()', () => {
    it('should call POST /auth/refresh', async () => {
      apiServiceMock.post.mockReturnValue(of(undefined));

      await firstValueFrom(service.refreshToken());

      expect(apiServiceMock.post).toHaveBeenCalledWith('/auth/refresh', {});
    });

    it('should return Observable<void>', async () => {
      apiServiceMock.post.mockReturnValue(of(undefined));

      const result = await firstValueFrom(service.refreshToken());

      expect(result).toBeUndefined();
    });
  });
});
