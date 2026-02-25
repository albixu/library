import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Layout and Theme
 *
 * These tests verify the layout components (header, footer) and theme switching functionality.
 */

// Helper to wait for page to be fully loaded
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

test.describe('Layout - Header', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('should display header with logo', async ({ page }) => {
    const header = page.locator('app-header header');
    await expect(header).toBeVisible();

    // Check logo icon (now using material-symbols-outlined, not mat-icon)
    const logoIcon = header.locator('.header__logo .material-symbols-outlined');
    await expect(logoIcon).toBeVisible();
    await expect(logoIcon).toHaveText('auto_stories');
  });

  test('should display "BiblioManager" title', async ({ page }) => {
    const title = page.locator('.header__title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('BiblioManager');
  });

  test('should have theme toggle button', async ({ page }) => {
    const themeToggle = page.locator('app-theme-toggle button');
    await expect(themeToggle).toBeVisible();
  });

  test('should be sticky at top of page', async ({ page }) => {
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));

    // Header should still be visible
    const header = page.locator('app-header header');
    await expect(header).toBeVisible();
    await expect(header).toBeInViewport();
  });
});

test.describe('Layout - Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('should display footer', async ({ page }) => {
    const footer = page.locator('app-footer footer');
    await expect(footer).toBeVisible();
  });

  test('should show copyright text', async ({ page }) => {
    const copyright = page.locator('.footer__copyright');
    await expect(copyright).toBeVisible();
    await expect(copyright).toHaveText('© 2025 Library');
  });

  test('should have GitHub link with correct URL', async ({ page }) => {
    const githubLink = page.locator('app-footer a');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveText('GitHub');
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/albixu/library');
  });

  test('should open GitHub link in new tab', async ({ page }) => {
    const githubLink = page.locator('app-footer a');
    await expect(githubLink).toHaveAttribute('target', '_blank');
    await expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForPageLoad(page);
  });

  test('should default to dark theme', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('should toggle to light theme when clicking toggle', async ({ page }) => {
    const themeToggle = page.locator('app-theme-toggle button');
    await themeToggle.click();

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('should toggle back to dark theme on second click', async ({ page }) => {
    const themeToggle = page.locator('app-theme-toggle button');

    // First click: dark -> light
    await themeToggle.click();
    let html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Second click: light -> dark
    await themeToggle.click();
    html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('should persist theme choice in localStorage', async ({ page }) => {
    const themeToggle = page.locator('app-theme-toggle button');
    await themeToggle.click(); // Switch to light
    
    // Wait for theme to change
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Check localStorage
    const storedTheme = await page.evaluate(() => localStorage.getItem('library-theme'));
    expect(storedTheme).toBe('light');
  });

  test('should restore theme from localStorage on page reload', async ({ page }) => {
    // Set theme to light
    const themeToggle = page.locator('app-theme-toggle button');
    await themeToggle.click();
    
    // Wait for theme to change and be persisted
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    
    // Verify localStorage before reload
    const storedBeforeReload = await page.evaluate(() => localStorage.getItem('library-theme'));
    expect(storedBeforeReload).toBe('light');

    // Reload page
    await page.reload();
    await waitForPageLoad(page);

    // Theme should still be light after reload
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('should show correct icon for dark theme', async ({ page }) => {
    // In dark mode, should show sun icon (to switch to light)
    const themeIcon = page.locator('app-theme-toggle .material-symbols-outlined');
    await expect(themeIcon).toHaveText('light_mode');
  });

  test('should show correct icon for light theme', async ({ page }) => {
    const themeToggle = page.locator('app-theme-toggle button');
    await themeToggle.click(); // Switch to light

    // In light mode, should show moon icon (to switch to dark)
    const themeIcon = page.locator('app-theme-toggle .material-symbols-outlined');
    await expect(themeIcon).toHaveText('dark_mode');
  });

  test('should have accessible aria-label', async ({ page }) => {
    const themeToggle = page.locator('app-theme-toggle button');
    await expect(themeToggle).toHaveAttribute('aria-label', 'Switch to light mode');

    // After toggle
    await themeToggle.click();
    await expect(themeToggle).toHaveAttribute('aria-label', 'Switch to dark mode');
  });
});

test.describe('Layout - Responsive', () => {
  test('should display same header on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForPageLoad(page);

    // Header elements should still be visible
    const logo = page.locator('.header__logo');
    const title = page.locator('.header__title');
    const themeToggle = page.locator('app-theme-toggle');

    await expect(logo).toBeVisible();
    await expect(title).toBeVisible();
    await expect(themeToggle).toBeVisible();
  });

  test('should display footer on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForPageLoad(page);

    const footer = page.locator('app-footer footer');
    await expect(footer).toBeVisible();
  });
});
