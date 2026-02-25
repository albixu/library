import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Responsive Behavior
 *
 * Tests the responsive layout of the book list page across different viewports.
 */

const BOOKS_URL = '/books';

async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('app-book-table, app-book-card, app-empty-state', {
    timeout: 10000,
  });
}

test.describe('Responsive Layout - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('should show sidebar filter panel', async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);

    const filterPanel = page.getByTestId('filter-panel');
    await expect(filterPanel).toBeVisible();

    // Sidebar should be open by default on desktop (now using aside.filter-sidenav, not mat-sidenav)
    const sidenav = page.getByTestId('filter-sidenav');
    await expect(sidenav).toBeVisible();
    await expect(sidenav).toHaveClass(/open/); // Should have 'open' class
  });

  test('should show books in table view', async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);

    const bookTable = page.locator('app-book-table');
    await expect(bookTable).toBeVisible();

    // Cards should not be visible on desktop
    const cardsContainer = page.locator('.cards-container');
    await expect(cardsContainer).not.toBeVisible();
  });

  test('should not show mobile filter toggle', async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);

    const mobileToggle = page.getByTestId('mobile-filter-toggle');
    await expect(mobileToggle).not.toBeVisible();
  });
});

test.describe('Responsive Layout - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should show mobile filter toggle button', async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);

    const mobileToggle = page.getByTestId('mobile-filter-toggle');
    await expect(mobileToggle).toBeVisible();
  });

  test('should show books in card view', async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);

    const cardsContainer = page.locator('.cards-container');
    await expect(cardsContainer).toBeVisible();

    // Table should not be visible on mobile
    const bookTable = page.locator('app-book-table');
    await expect(bookTable).not.toBeVisible();
  });

  test('should hide filter panel initially', async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);

    // On mobile, filter panel should NOT have 'open' class initially (hidden)
    const sidenav = page.getByTestId('filter-sidenav');
    await expect(sidenav).toBeVisible(); // Element exists in DOM
    
    // But should NOT have 'open' class (visually hidden via CSS transform)
    const classes = await sidenav.getAttribute('class');
    expect(classes).not.toContain('open');
  });

  test('should open filter drawer when toggle is clicked', async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);

    const mobileToggle = page.getByTestId('mobile-filter-toggle');
    await mobileToggle.click();

    // Filter panel should now be visible
    const filterPanel = page.getByTestId('filter-panel');
    await expect(filterPanel).toBeVisible();
  });

  test('should show filter badge when filters are active', async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);

    // Open filter panel
    const mobileToggle = page.getByTestId('mobile-filter-toggle');
    await mobileToggle.click();

    // Set a filter
    const titleFilter = page.getByTestId('title-filter').locator('input');
    await titleFilter.fill('Test');

    // Close the drawer by clicking outside or pressing escape
    await page.keyboard.press('Escape');

    // Check for filter badge
    const filterBadge = page.locator('.filter-badge');
    await expect(filterBadge).toBeVisible();
    await expect(filterBadge).toHaveText('1');
  });
});

test.describe('Responsive Layout - Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('should adapt layout for tablet viewport', async ({ page }) => {
    await page.goto(BOOKS_URL);
    await waitForPageLoad(page);

    // Tablet might show either layout depending on breakpoint
    // Check that the page is functional
    const resultsHeader = page.locator('.results-title');
    await expect(resultsHeader).toBeVisible();
  });
});
