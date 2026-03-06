import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component.js';
import { ThemeService } from '@core/services/theme.service';
import { signal, computed } from '@angular/core';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let mockThemeService: {
    theme: ReturnType<typeof signal<'light' | 'dark'>>;
    isDark: ReturnType<typeof computed<boolean>>;
    themeIcon: ReturnType<typeof computed<string>>;
    toggleLabel: ReturnType<typeof computed<string>>;
    toggleTheme: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Create mock ThemeService with signals
    const themeSignal = signal<'light' | 'dark'>('dark');

    mockThemeService = {
      theme: themeSignal,
      isDark: computed(() => themeSignal() === 'dark'),
      themeIcon: computed(() => (themeSignal() === 'dark' ? 'light_mode' : 'dark_mode')),
      toggleLabel: computed(() =>
        themeSignal() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      ),
      toggleTheme: vi.fn(() => {
        themeSignal.update((current) => (current === 'light' ? 'dark' : 'light'));
      }),
    };

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: ThemeService, useValue: mockThemeService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Structure', () => {
    it('should have a main layout container', () => {
      const container = fixture.nativeElement.querySelector('.main-layout');
      expect(container).toBeTruthy();
    });

    it('should use flexbox column layout', () => {
      const container = fixture.nativeElement.querySelector('.main-layout');
      expect(container.classList.contains('main-layout')).toBe(true);
    });
  });

  describe('Header', () => {
    it('should include the header component', () => {
      const header = fixture.nativeElement.querySelector('app-header');
      expect(header).toBeTruthy();
    });

    it('should render header as the first child', () => {
      const container = fixture.nativeElement.querySelector('.main-layout');
      expect(container.firstElementChild.tagName.toLowerCase()).toBe('app-header');
    });
  });

  describe('Content', () => {
    it('should have a main content area', () => {
      const content = fixture.nativeElement.querySelector('.main-layout__content');
      expect(content).toBeTruthy();
    });

    it('should include router-outlet for content', () => {
      const routerOutlet = fixture.nativeElement.querySelector('router-outlet');
      expect(routerOutlet).toBeTruthy();
    });

    it('should have main element for semantic structure', () => {
      const main = fixture.nativeElement.querySelector('main');
      expect(main).toBeTruthy();
    });
  });

  describe('Footer', () => {
    it('should include the footer component', () => {
      const footer = fixture.nativeElement.querySelector('app-footer');
      expect(footer).toBeTruthy();
    });

    it('should render footer as the last child', () => {
      const container = fixture.nativeElement.querySelector('.main-layout');
      expect(container.lastElementChild.tagName.toLowerCase()).toBe('app-footer');
    });
  });

  describe('Layout Order', () => {
    it('should have correct order: header → content → footer', () => {
      const container = fixture.nativeElement.querySelector('.main-layout');
      const children = Array.from(container.children) as Element[];

      expect(children.length).toBe(3);
      expect(children[0].tagName.toLowerCase()).toBe('app-header');
      expect(children[1].tagName.toLowerCase()).toBe('main');
      expect(children[2].tagName.toLowerCase()).toBe('app-footer');
    });
  });
});
