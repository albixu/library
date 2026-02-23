import { catalogRoutes } from './catalog.routes';

describe('Catalog Routes', () => {
  describe('Route configuration', () => {
    it('should have routes defined', () => {
      expect(catalogRoutes.length).toBeGreaterThan(0);
    });

    it('should have default route for book list', () => {
      const defaultRoute = catalogRoutes.find((r) => r.path === '');
      expect(defaultRoute).toBeTruthy();
      expect(defaultRoute?.loadComponent).toBeDefined();
    });

    it('should have title for book list route', () => {
      const defaultRoute = catalogRoutes.find((r) => r.path === '');
      expect(defaultRoute?.title).toBe('Book Catalog');
    });

    it('should lazy load BookListPageComponent', async () => {
      const defaultRoute = catalogRoutes.find((r) => r.path === '');
      expect(defaultRoute?.loadComponent).toBeDefined();

      // Verify the import resolves correctly
      const module = await import('./pages/book-list/book-list-page.component.js');
      expect(module.BookListPageComponent).toBeDefined();
    });
  });
});
