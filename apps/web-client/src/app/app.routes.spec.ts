import { TestBed } from '@angular/core/testing';
import { RouterModule, Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { routes } from './app.routes';

// Dummy component for testing
@Component({ template: '' })
class DummyComponent {}

describe('Application Routes', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  describe('Route configuration', () => {
    it('should have routes defined', () => {
      expect(routes.length).toBeGreaterThan(0);
    });

    it('should redirect root path to /books', () => {
      const rootRoute = routes.find((r) => r.path === '' && r.redirectTo);
      expect(rootRoute).toBeTruthy();
      expect(rootRoute?.redirectTo).toBe('books');
    });

    it('should have books route with lazy loading', () => {
      const booksRoute = routes.find((r) => r.path === 'books');
      expect(booksRoute).toBeTruthy();
      expect(booksRoute?.loadChildren).toBeDefined();
    });

    it('should have wildcard route for unknown paths', () => {
      const wildcardRoute = routes.find((r) => r.path === '**');
      expect(wildcardRoute).toBeTruthy();
      expect(wildcardRoute?.redirectTo).toBe('books');
    });
  });
});
