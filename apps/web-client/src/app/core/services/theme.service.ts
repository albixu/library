import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

/**
 * ThemeService - Manages application theme (light/dark mode)
 *
 * This service handles theme persistence, system preference detection,
 * and applies the theme to the document.
 *
 * Features:
 * - Persists theme choice in localStorage
 * - Detects system preference (prefers-color-scheme)
 * - Applies theme via CSS class on document root
 * - Reactive signals for theme state
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'library-theme';

  /** Current theme signal */
  readonly theme = signal<Theme>(this.getInitialTheme());

  /** Computed signal: whether dark mode is active */
  readonly isDark = computed(() => this.theme() === 'dark');

  /** Computed signal: whether light mode is active */
  readonly isLight = computed(() => this.theme() === 'light');

  /** Icon name for the current theme (for toggle button) */
  readonly themeIcon = computed(() => (this.isDark() ? 'light_mode' : 'dark_mode'));

  /** Accessible label for the toggle button */
  readonly toggleLabel = computed(() =>
    this.isDark() ? 'Switch to light mode' : 'Switch to dark mode'
  );

  constructor() {
    // Apply theme changes to document
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    this.theme.update((current) => (current === 'light' ? 'dark' : 'light'));
  }

  /**
   * Set a specific theme
   */
  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  /**
   * Get the initial theme from storage or system preference
   *
   * Priority:
   * 1. localStorage preference
   * 2. System preference (prefers-color-scheme)
   * 3. Default to dark mode
   */
  private getInitialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'dark';
    }

    // Check localStorage first
    const stored = localStorage.getItem(this.storageKey);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    // Fall back to system preference
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      return 'light';
    }

    // Default to dark mode
    return 'dark';
  }

  /**
   * Apply theme to the document and persist to storage
   *
   * Uses data-theme attribute on <html> element for CSS variable switching
   */
  private applyTheme(theme: Theme): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const html = document.documentElement;
    html.setAttribute('data-theme', theme);

    localStorage.setItem(this.storageKey, theme);
  }
}
