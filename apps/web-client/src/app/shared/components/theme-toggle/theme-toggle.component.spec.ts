import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeToggleComponent } from './theme-toggle.component';
import { ThemeService } from '@core/services/theme.service';
import { signal } from '@angular/core';

describe('ThemeToggleComponent', () => {
  let component: ThemeToggleComponent;
  let fixture: ComponentFixture<ThemeToggleComponent>;
  let mockThemeService: {
    theme: ReturnType<typeof signal<'light' | 'dark'>>;
    setTheme: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Create mock ThemeService with signals
    const themeSignal = signal<'light' | 'dark'>('light');

    mockThemeService = {
      theme: themeSignal,
      setTheme: vi.fn((theme: 'light' | 'dark') => {
        themeSignal.set(theme);
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

  it('should render two buttons (light and dark)', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.theme-switch__button');
    expect(buttons.length).toBe(2);
  });

  it('should display light_mode and dark_mode icons', () => {
    const icons = fixture.nativeElement.querySelectorAll('.material-symbols-outlined');
    expect(icons.length).toBe(2);
    expect(icons[0].textContent.trim()).toBe('light_mode');
    expect(icons[1].textContent.trim()).toBe('dark_mode');
  });

  it('should have correct aria-labels for accessibility', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.theme-switch__button');
    expect(buttons[0].getAttribute('aria-label')).toBe('Light mode');
    expect(buttons[1].getAttribute('aria-label')).toBe('Dark mode');
  });

  it('should mark light button as active when theme is light', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.theme-switch__button');
    expect(buttons[0].classList.contains('theme-switch__button--active')).toBe(true);
    expect(buttons[1].classList.contains('theme-switch__button--active')).toBe(false);
  });

  it('should mark dark button as active when theme is dark', async () => {
    mockThemeService.theme.set('dark');
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = fixture.nativeElement.querySelectorAll('.theme-switch__button');
    expect(buttons[0].classList.contains('theme-switch__button--active')).toBe(false);
    expect(buttons[1].classList.contains('theme-switch__button--active')).toBe(true);
  });

  it('should call setTheme with "light" when light button is clicked', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.theme-switch__button');
    buttons[0].click();

    expect(mockThemeService.setTheme).toHaveBeenCalledWith('light');
  });

  it('should call setTheme with "dark" when dark button is clicked', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.theme-switch__button');
    buttons[1].click();

    expect(mockThemeService.setTheme).toHaveBeenCalledWith('dark');
  });

  it('should update active state when switching themes', async () => {
    const buttons = fixture.nativeElement.querySelectorAll('.theme-switch__button');

    // Initially light mode is active
    expect(buttons[0].classList.contains('theme-switch__button--active')).toBe(true);

    // Click dark mode button
    buttons[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Now dark mode should be active
    expect(buttons[0].classList.contains('theme-switch__button--active')).toBe(false);
    expect(buttons[1].classList.contains('theme-switch__button--active')).toBe(true);
  });

  it('should have correct aria-pressed attributes', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.theme-switch__button');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('should have role="group" with aria-label on container', () => {
    const container = fixture.nativeElement.querySelector('.theme-switch');
    expect(container.getAttribute('role')).toBe('group');
    expect(container.getAttribute('aria-label')).toBe('Theme selection');
  });
});
