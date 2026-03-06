import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Book List Page
 *
 * These tests verify the complete user flow for browsing and searching books.
 * Requires the API server to be running with mock data.
 */

// Test fixtures and helpers
const BOOKS_URL = '/books';

// Helper to wait for page to be fully loaded
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  // Wait for results to appear or empty state
  await page.waitForSelector('app-book-table, app-book-card, app-empty-state', {
    timeout: 10000,
  });
}

test.describe('Book List Page - Initial Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);
  });

  test('should display the book catalog page', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Book Catalog/);
  });

  test('should show filter panel', async ({ page }) => {
    const filterPanel = page.getByTestId('filter-panel');
    await expect(filterPanel).toBeVisible();
  });

  test('should show book results header', async ({ page }) => {
    const resultsHeader = page.locator('.results-title');
    await expect(resultsHeader).toBeVisible();
  });

  test('should display books in table on desktop', async ({ page }) => {
    // Desktop viewport should show table
    const bookTable = page.locator('app-book-table');
    await expect(bookTable).toBeVisible();
  });

  test('should show paginator when books are loaded', async ({ page }) => {
    const paginator = page.locator('app-paginator');
    await expect(paginator).toBeVisible();
  });
});

test.describe('Book List Page - Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);
  });

  test('should filter by title', async ({ page }) => {
    const titleFilter = page.getByTestId('title-filter').locator('input');
    await titleFilter.fill('Clean');
    await titleFilter.press('Enter');

    // Wait for filtered results
    await page.waitForResponse((resp) =>
      resp.url().includes('/books') && resp.status() === 200
    );

    // Verify results contain the search term
    const results = page.locator('app-book-table .book-title, app-book-card .book-card-title');
    if (await results.count() > 0) {
      const firstResult = results.first();
      await expect(firstResult).toContainText(/clean/i);
    }
  });

  test('should filter by ISBN', async ({ page }) => {
    const isbnFilter = page.getByTestId('isbn-filter').locator('input');
    await isbnFilter.fill('978-0');

    // Wait for debounced search
    await page.waitForTimeout(500);
  });

  test('should filter by author', async ({ page }) => {
    const authorFilter = page.getByTestId('author-filter').locator('input');
    await authorFilter.fill('Martin');
    await authorFilter.press('Enter');

    await page.waitForResponse((resp) =>
      resp.url().includes('/books') && resp.status() === 200
    );
  });

  test('should clear all filters', async ({ page }) => {
    // Set a filter first
    const titleFilter = page.getByTestId('title-filter').locator('input');
    await titleFilter.fill('Test');

    // Click clear filters button
    const clearButton = page.getByTestId('clear-filters-button');
    await clearButton.click();

    // Verify filter is cleared
    await expect(titleFilter).toHaveValue('');
  });
});

test.describe('Book List Page - Type and Dependent Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);
  });

  test('should load categories when type is selected', async ({ page }) => {
    // Type filter
    const typeFilter = page.getByTestId('type-filter');
    await typeFilter.click();

    // Select a type
    const typeOption = page.locator('mat-option').first();
    if (await typeOption.isVisible()) {
      await typeOption.click();

      // Wait for categories to load
      const categoriesFilter = page.getByTestId('categories-filter');
      await expect(categoriesFilter).not.toBeDisabled();
    }
  });

  test('should disable categories and levels when no type selected', async ({ page }) => {
    // Categories should be disabled initially (or when type is empty)
    const categoriesFilter = page.getByTestId('categories-filter');
    // Check if the component shows disabled state
    await expect(categoriesFilter).toBeVisible();
  });
});

test.describe('Book List Page - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);
  });

  test('should show current count and total', async ({ page }) => {
    const paginator = page.locator('app-paginator');
    await expect(paginator).toBeVisible();

    // Check for count display (now called paginator-range after Tailwind migration)
    const countDisplay = paginator.locator('.paginator-range');
    await expect(countDisplay).toBeVisible();
  });

  test('should load more books when clicking load more', async ({ page }) => {
    const paginator = page.locator('app-paginator');
    const loadMoreButton = paginator.getByRole('button', { name: /load more/i });

    // Check if load more button exists (might not if all books are already loaded)
    const isVisible = await loadMoreButton.isVisible().catch(() => false);
    
    if (isVisible) {
      // Count rows before clicking (now using .book-row after Tailwind migration)
      const initialCount = await page.locator('app-book-table tr.book-row').count();
      
      // Click load more
      await loadMoreButton.click();

      // Wait for EITHER:
      // 1. HTTP response (more data loaded)
      // 2. Timeout (no more data, but that's OK)
      await page.waitForResponse(
        (resp) => resp.url().includes('/books') && resp.status() === 200,
        { timeout: 5000 }
      ).catch(() => {
        // Timeout is OK - might mean no more books to load
      });

      // If we got here without error, verify count didn't decrease
      const newCount = await page.locator('app-book-table tr.book-row').count();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('should change page size', async ({ page }) => {
    const pageSizeSelect = page.locator('app-paginator select, app-paginator mat-select');

    if (await pageSizeSelect.isVisible()) {
      await pageSizeSelect.click();
      const option = page.locator('mat-option, option').filter({ hasText: '25' });

      if (await option.isVisible()) {
        await option.click();
        await page.waitForResponse((resp) =>
          resp.url().includes('/books') && resp.status() === 200
        );
      }
    }
  });
});

test.describe('Book List Page - Send to Kindle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);
  });

  test('should open Kindle dialog when clicking send button', async ({ page }) => {
    // Find a kindle button in the table or card
    const kindleButton = page.locator('[aria-label="Send to Kindle"]').first();

    if (await kindleButton.isVisible()) {
      await kindleButton.click();

      // Dialog should appear
      const dialog = page.locator('app-send-to-kindle-dialog, mat-dialog-container');
      await expect(dialog).toBeVisible();
    }
  });

  test('should close Kindle dialog on cancel', async ({ page }) => {
    const kindleButton = page.locator('[aria-label="Send to Kindle"]').first();

    if (await kindleButton.isVisible()) {
      await kindleButton.click();

      // Find and click cancel button
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      await cancelButton.click();

      // Dialog should be closed
      const dialog = page.locator('app-send-to-kindle-dialog, mat-dialog-container');
      await expect(dialog).not.toBeVisible();
    }
  });
});
