import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeToggleComponent } from './theme-toggle.component';
import { ThemeService } from '@core/services/theme.service';
import { signal, computed } from '@angular/core';

describe('ThemeToggleComponent', () => {
  let component: ThemeToggleComponent;
  let fixture: ComponentFixture<ThemeToggleComponent>;
  let mockThemeService: {
    theme: ReturnType<typeof signal<'light' | 'dark'>>;
    isDark: ReturnType<typeof computed<boolean>>;
    themeIcon: ReturnType<typeof computed<string>>;
    toggleLabel: ReturnType<typeof computed<string>>;
    toggleTheme: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Create mock ThemeService with signals
    const themeSignal = signal<'light' | 'dark'>('light');

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
      imports: [ThemeToggleComponent],
      providers: [{ provide: ThemeService, useValue: mockThemeService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display dark_mode icon when in light mode', () => {
    const icon = fixture.nativeElement.querySelector('.material-symbols-outlined');
    expect(icon.textContent.trim()).toBe('dark_mode');
  });

  it('should have correct aria-label for accessibility', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
  });

  it('should call toggleTheme when button is clicked', () => {
    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(mockThemeService.toggleTheme).toHaveBeenCalled();
  });

  it('should update icon after toggle', async () => {
    // Initial state: light mode
    let icon = fixture.nativeElement.querySelector('.material-symbols-outlined');
    expect(icon.textContent.trim()).toBe('dark_mode');

    // Toggle to dark mode
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Should now show light_mode icon
    icon = fixture.nativeElement.querySelector('.material-symbols-outlined');
    expect(icon.textContent.trim()).toBe('light_mode');
  });

  it('should update aria-label after toggle', async () => {
    const button = fixture.nativeElement.querySelector('button');

    // Initial state
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');

    // Toggle
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // After toggle
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
  });
});
