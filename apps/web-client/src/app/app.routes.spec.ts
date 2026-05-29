import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { provideZonelessChangeDetection } from '@angular/core';

describe('Application Routes', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideAnimationsAsync(),
      ],
    }).compileComponents();
  });

  describe('Route configuration', () => {
    it('should have routes defined', () => {
      expect(routes.length).toBeGreaterThan(0);
    });

    it('should have a root route with MainLayoutComponent', () => {
      const rootRoute = routes.find((r) => r.path === '');
      expect(rootRoute).toBeTruthy();
      expect(rootRoute?.component).toBeDefined();
    });

    it('should have nested children routes inside layout', () => {
      const rootRoute = routes.find((r) => r.path === '');
      expect(rootRoute?.children).toBeDefined();
      expect(rootRoute?.children?.length).toBeGreaterThan(0);
    });

    it('should redirect empty child path to /books', () => {
      const rootRoute = routes.find((r) => r.path === '');
      const emptyChildRoute = rootRoute?.children?.find(
        (r) => r.path === '' && r.redirectTo === 'books'
      );
      expect(emptyChildRoute).toBeTruthy();
    });

    it('should have books route with lazy loading', () => {
      const rootRoute = routes.find((r) => r.path === '');
      const booksRoute = rootRoute?.children?.find((r) => r.path === 'books');
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
