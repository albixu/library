import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let localStorageSpy: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
  };
  let matchMediaSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock localStorage
    localStorageSpy = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageSpy,
      writable: true,
    });

    // Mock matchMedia
    matchMediaSpy = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaSpy,
      writable: true,
    });

    // Clean up document data-theme attribute
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  function createService(): ThemeService {
    TestBed.configureTestingModule({
      providers: [ThemeService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    return TestBed.inject(ThemeService);
  }

  describe('initialization', () => {
    it('should use stored theme from localStorage', () => {
      localStorageSpy.getItem.mockReturnValue('dark');

      service = createService();

      expect(service.theme()).toBe('dark');
    });

    it('should use stored light theme from localStorage', () => {
      localStorageSpy.getItem.mockReturnValue('light');

      service = createService();

      expect(service.theme()).toBe('light');
    });

    it('should use system preference for light when no stored theme', () => {
      localStorageSpy.getItem.mockReturnValue(null);
      // System prefers light mode (prefers-color-scheme: light matches)
      matchMediaSpy.mockReturnValue({ matches: true });

      service = createService();

      expect(service.theme()).toBe('light');
    });

    it('should default to dark when no stored theme and system does not prefer light', () => {
      localStorageSpy.getItem.mockReturnValue(null);
      // System does not prefer light mode (prefers-color-scheme: light does NOT match)
      matchMediaSpy.mockReturnValue({ matches: false });

      service = createService();

      expect(service.theme()).toBe('dark');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      localStorageSpy.getItem.mockReturnValue('light');
      service = createService();

      service.toggleTheme();

      expect(service.theme()).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      localStorageSpy.getItem.mockReturnValue('dark');
      service = createService();

      service.toggleTheme();

      expect(service.theme()).toBe('light');
    });
  });

  describe('setTheme', () => {
    it('should set theme to dark', () => {
      localStorageSpy.getItem.mockReturnValue('light');
      service = createService();

      service.setTheme('dark');

      expect(service.theme()).toBe('dark');
    });

    it('should set theme to light', () => {
      localStorageSpy.getItem.mockReturnValue('dark');
      service = createService();

      service.setTheme('light');

      expect(service.theme()).toBe('light');
    });
  });

  describe('computed signals', () => {
    it('should compute isDark correctly', () => {
      localStorageSpy.getItem.mockReturnValue('dark');
      service = createService();

      expect(service.isDark()).toBe(true);
      expect(service.isLight()).toBe(false);
    });

    it('should compute isLight correctly', () => {
      localStorageSpy.getItem.mockReturnValue('light');
      service = createService();

      expect(service.isDark()).toBe(false);
      expect(service.isLight()).toBe(true);
    });

    it('should compute correct themeIcon for dark mode', () => {
      localStorageSpy.getItem.mockReturnValue('dark');
      service = createService();
      expect(service.themeIcon()).toBe('light_mode');
    });

    it('should compute correct themeIcon for light mode', () => {
      localStorageSpy.getItem.mockReturnValue('light');
      service = createService();
      expect(service.themeIcon()).toBe('dark_mode');
    });

    it('should compute correct toggleLabel for dark mode', () => {
      localStorageSpy.getItem.mockReturnValue('dark');
      service = createService();
      expect(service.toggleLabel()).toBe('Switch to light mode');
    });

    it('should compute correct toggleLabel for light mode', () => {
      localStorageSpy.getItem.mockReturnValue('light');
      service = createService();
      expect(service.toggleLabel()).toBe('Switch to dark mode');
    });
  });

  describe('signal updates', () => {
    it('should update isDark when theme changes', () => {
      localStorageSpy.getItem.mockReturnValue('light');
      service = createService();

      expect(service.isDark()).toBe(false);

      service.setTheme('dark');

      expect(service.isDark()).toBe(true);
    });

    it('should update themeIcon when theme toggles', () => {
      localStorageSpy.getItem.mockReturnValue('light');
      service = createService();

      expect(service.themeIcon()).toBe('dark_mode');

      service.toggleTheme();

      expect(service.themeIcon()).toBe('light_mode');
    });
  });

  describe('theme application', () => {
    it('should apply data-theme attribute to document on initialization', () => {
      localStorageSpy.getItem.mockReturnValue('dark');

      service = createService();
      TestBed.flushEffects();

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should update data-theme attribute when theme changes', () => {
      localStorageSpy.getItem.mockReturnValue('light');
      service = createService();
      TestBed.flushEffects();

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      service.setTheme('dark');
      TestBed.flushEffects();

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should persist theme to localStorage when theme changes', () => {
      localStorageSpy.getItem.mockReturnValue('light');
      service = createService();
      TestBed.flushEffects();

      service.setTheme('dark');
      TestBed.flushEffects();

      expect(localStorageSpy.setItem).toHaveBeenCalledWith('library-theme', 'dark');
    });
  });
});
