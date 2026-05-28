import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { of } from 'rxjs';

import { HeaderComponent } from './header.component.js';
import { AuthService } from '../../auth/auth.service.js';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let mockAuthService: {
    currentUser: ReturnType<typeof signal<{ email: string } | null>>;
    logout: ReturnType<typeof vi.fn>;
  };
  let mockDialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const currentUserSignal = signal<{ email: string } | null>(null);

    mockAuthService = {
      currentUser: currentUserSignal,
      logout: vi.fn(),
    };

    mockDialog = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Dialog, useValue: mockDialog },
      ],
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

  describe('Unauthenticated state (currentUser = null)', () => {
    it('should render the account_circle icon when not logged in', () => {
      const avatar = fixture.nativeElement.querySelector('.header__avatar');
      expect(avatar).toBeTruthy();
      const icon = avatar.querySelector('.material-symbols-outlined');
      expect(icon.textContent.trim()).toBe('account_circle');
    });

    it('should have aria-label "Iniciar sesión" on the avatar', () => {
      const avatar = fixture.nativeElement.querySelector('.header__avatar');
      expect(avatar.getAttribute('aria-label')).toBe('Iniciar sesión');
    });

    it('should open login modal when avatar is clicked', () => {
      const avatar = fixture.nativeElement.querySelector('.header__avatar');
      avatar.click();
      expect(mockDialog.open).toHaveBeenCalled();
    });

    it('should NOT render the user menu when unauthenticated', () => {
      const userMenu = fixture.nativeElement.querySelector('.header__user');
      expect(userMenu).toBeFalsy();
    });
  });

  describe('Authenticated state (currentUser has email)', () => {
    beforeEach(() => {
      mockAuthService.currentUser.set({ email: 'user@example.com' });
      fixture.detectChanges();
    });

    it('should NOT render the login avatar when authenticated', () => {
      const avatar = fixture.nativeElement.querySelector('.header__avatar');
      expect(avatar).toBeFalsy();
    });

    it('should render the user email', () => {
      const email = fixture.nativeElement.querySelector('.header__email');
      expect(email).toBeTruthy();
      expect(email.textContent.trim()).toBe('user@example.com');
    });

    it('should render the account_circle icon in user area', () => {
      const icon = fixture.nativeElement.querySelector('.header__user-icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent.trim()).toBe('account_circle');
    });

    it('should NOT show dropdown by default', () => {
      expect(component.isDropdownOpen()).toBe(false);
      const dropdown = fixture.nativeElement.querySelector('.header__dropdown');
      expect(dropdown).toBeFalsy();
    });

    it('should toggle dropdown on click', () => {
      const userArea = fixture.nativeElement.querySelector('.header__user');
      userArea.click();
      fixture.detectChanges();

      expect(component.isDropdownOpen()).toBe(true);
      const dropdown = fixture.nativeElement.querySelector('.header__dropdown');
      expect(dropdown).toBeTruthy();
    });

    it('should render "Desconectarse" button in dropdown', () => {
      component.isDropdownOpen.set(true);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.header__dropdown-item');
      expect(btn).toBeTruthy();
      expect(btn.textContent).toContain('Desconectarse');
    });

    it('should call authService.logout() when "Desconectarse" is clicked', () => {
      mockAuthService.logout.mockReturnValue(of(undefined));
      component.isDropdownOpen.set(true);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.header__dropdown-item');
      btn.click();

      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should close dropdown after logout', () => {
      mockAuthService.logout.mockReturnValue(of(undefined));
      component.isDropdownOpen.set(true);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.header__dropdown-item');
      btn.click();

      expect(component.isDropdownOpen()).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate role for header', () => {
      const header = fixture.nativeElement.querySelector('header');
      expect(header.tagName.toLowerCase()).toBe('header');
    });

    it('should include skip link target or appropriate structure', () => {
      const brand = fixture.nativeElement.querySelector('.header__brand');
      expect(brand).toBeTruthy();
    });
  });
});
