import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MainLayoutComponent } from '@layout/main-layout/main-layout.component.js';
import { ResetPasswordPageComponent } from './auth/reset-password/index.js';
import { AuthService } from './auth/auth.service.js';

/**
 * Guard: allows access only when the user is authenticated.
 * Redirects to /books if not logged in.
 */
const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.currentUser() !== null ? true : router.createUrlTree(['/books']);
};

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
      // Personalised recommendations (auth required)
      {
        path: 'recommendations',
        loadComponent: () =>
          import('./recommendations/feature/recommendations-page.component.js').then(
            (m) => m.RecommendationsPageComponent
          ),
        canActivate: [authGuard],
        title: 'Para ti',
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
