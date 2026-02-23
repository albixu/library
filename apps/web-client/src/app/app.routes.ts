import { Routes } from '@angular/router';

/**
 * Application Routes
 *
 * Main routing configuration with lazy loading for feature modules.
 */
export const routes: Routes = [
  // Redirect root to books
  {
    path: '',
    redirectTo: 'books',
    pathMatch: 'full',
  },
  // Catalog feature (lazy loaded)
  {
    path: 'books',
    loadChildren: () =>
      import('./catalog/catalog.routes.js').then((m) => m.catalogRoutes),
  },
  // Fallback: redirect unknown routes to books
  {
    path: '**',
    redirectTo: 'books',
  },
];
