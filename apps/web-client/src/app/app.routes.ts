import { Routes } from '@angular/router';
import { MainLayoutComponent } from '@layout/main-layout/main-layout.component.js';
import { ResetPasswordPageComponent } from './auth/reset-password/index.js';

/**
 * Application Routes
 *
 * Main routing configuration with lazy loading for feature modules.
 * All routes are wrapped in MainLayoutComponent for consistent header/footer.
 */
export const routes: Routes = [
  // All routes wrapped in MainLayoutComponent
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // Redirect root to books
      {
        path: '',
        redirectTo: 'books',
        pathMatch: 'full',
      },
      // Catalog feature (lazy loaded)
      {
        path: 'books',
        loadChildren: () => import('./catalog/catalog.routes.js').then((m) => m.catalogRoutes),
      },
      // Password reset page
      {
        path: 'reset-password',
        component: ResetPasswordPageComponent,
      },
    ],
  },
  // Fallback: redirect unknown routes to books
  {
    path: '**',
    redirectTo: 'books',
  },
];
