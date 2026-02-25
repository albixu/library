import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component.js';
import { ThemeService } from '@core/services/theme.service';
import { signal } from '@angular/core';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let mockThemeService: {
    theme: ReturnType<typeof signal<'light' | 'dark'>>;
    setTheme: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Create mock ThemeService with signals
    const themeSignal = signal<'light' | 'dark'>('dark');

    mockThemeService = {
      theme: themeSignal,
      setTheme: vi.fn((theme: 'light' | 'dark') => {
        themeSignal.set(theme);
      }),
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [{ provide: ThemeService, useValue: mockThemeService }],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Structure', () => {
    it('should render a header element', () => {
      const header = fixture.nativeElement.querySelector('header');
      expect(header).toBeTruthy();
    });

    it('should have sticky positioning via CSS class', () => {
      const header = fixture.nativeElement.querySelector('header');
      expect(header.classList.contains('header')).toBe(true);
    });
  });

  describe('Logo', () => {
    it('should display the auto_stories icon', () => {
      const logoIcon = fixture.nativeElement.querySelector(
        '.header__logo .material-symbols-outlined'
      );
      expect(logoIcon).toBeTruthy();
      expect(logoIcon.textContent.trim()).toBe('auto_stories');
    });

    it('should have a logo container with the correct class', () => {
      const logoContainer = fixture.nativeElement.querySelector('.header__logo');
      expect(logoContainer).toBeTruthy();
    });
  });

  describe('Title', () => {
    it('should display "BiblioManager" as the title', () => {
      const title = fixture.nativeElement.querySelector('.header__title');
      expect(title).toBeTruthy();
      expect(title.textContent.trim()).toBe('BiblioManager');
    });
  });

  describe('Brand Section', () => {
    it('should have a brand container with logo and title', () => {
      const brand = fixture.nativeElement.querySelector('.header__brand');
      expect(brand).toBeTruthy();

      const logo = brand.querySelector('.header__logo');
      const title = brand.querySelector('.header__title');
      expect(logo).toBeTruthy();
      expect(title).toBeTruthy();
    });
  });

  describe('Theme Toggle', () => {
    it('should include the theme toggle component', () => {
      const themeToggle = fixture.nativeElement.querySelector('app-theme-toggle');
      expect(themeToggle).toBeTruthy();
    });

    it('should position theme toggle inside actions container', () => {
      const actions = fixture.nativeElement.querySelector('.header__actions');
      expect(actions).toBeTruthy();

      const themeToggle = actions.querySelector('app-theme-toggle');
      expect(themeToggle).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('should have notifications button with Material Symbol icon', () => {
      const button = fixture.nativeElement.querySelector('.header__icon-button');
      expect(button).toBeTruthy();
      expect(button.getAttribute('aria-label')).toBe('Notifications');

      const icon = button.querySelector('.material-symbols-outlined');
      expect(icon).toBeTruthy();
      expect(icon.textContent.trim()).toBe('notifications');
    });

    it('should have avatar with account_circle icon', () => {
      const avatar = fixture.nativeElement.querySelector('.header__avatar');
      expect(avatar).toBeTruthy();
      expect(avatar.getAttribute('role')).toBe('img');
      expect(avatar.getAttribute('aria-label')).toBe('User profile');

      const icon = avatar.querySelector('.material-symbols-outlined');
      expect(icon).toBeTruthy();
      expect(icon.textContent.trim()).toBe('account_circle');
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate role for header', () => {
      const header = fixture.nativeElement.querySelector('header');
      // header element has implicit banner role, but we check it exists
      expect(header.tagName.toLowerCase()).toBe('header');
    });

    it('should include skip link target or appropriate structure', () => {
      // The header should be properly structured for screen readers
      const brand = fixture.nativeElement.querySelector('.header__brand');
      expect(brand).toBeTruthy();
    });
  });
});
