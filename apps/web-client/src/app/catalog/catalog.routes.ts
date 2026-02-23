import { Routes } from '@angular/router';

/**
 * Catalog Feature Routes
 *
 * Handles all routes related to book catalog:
 * - /books - Book list/search (default)
 * - /books/:id - Book detail (future)
 */
export const catalogRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/book-list/book-list-page.component.js').then(
        (m) => m.BookListPageComponent
      ),
    title: 'Book Catalog',
  },
  // Future: Book detail route
  // {
  //   path: ':id',
  //   loadComponent: () =>
  //     import('./pages/book-detail/book-detail-page.component.js').then(
  //       (m) => m.BookDetailPageComponent
  //     ),
  //   title: 'Book Details',
  // },
];
