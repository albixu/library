import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { of } from 'rxjs';

import { BottomNavComponent } from './bottom-nav.component.js';
import { AuthService } from '../../auth/auth.service.js';

describe('BottomNavComponent', () => {
  let component: BottomNavComponent;
  let fixture: ComponentFixture<BottomNavComponent>;
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
      imports: [BottomNavComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: Dialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Unauthenticated state (currentUser = null)', () => {
    it('should show the "Entrar" button when unauthenticated', () => {
      const btn = fixture.nativeElement.querySelector('.bottom-nav__item');
      expect(btn).toBeTruthy();
      expect(btn.textContent).toContain('Entrar');
    });

    it('should NOT show catalog or recommendations links when unauthenticated', () => {
      const links = fixture.nativeElement.querySelectorAll('a.bottom-nav__item');
      expect(links.length).toBe(0);
    });

    it('should NOT show logout button when unauthenticated', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button.bottom-nav__item');
      const logoutBtn = Array.from(buttons).find((btn: unknown) =>
        (btn as HTMLElement).textContent?.includes('Salir')
      );
      expect(logoutBtn).toBeFalsy();
    });
  });

  describe('Authenticated state (currentUser has email)', () => {
    beforeEach(() => {
      mockAuthService.currentUser.set({ email: 'user@example.com' });
      fixture.detectChanges();
    });

    it('should show the Catálogo link when authenticated', () => {
      const links = fixture.nativeElement.querySelectorAll('a.bottom-nav__item');
      const catalogLink = Array.from(links).find((link: unknown) =>
        (link as HTMLElement).textContent?.includes('Catálogo')
      );
      expect(catalogLink).toBeTruthy();
    });

    it('should show the Para ti link when authenticated', () => {
      const links = fixture.nativeElement.querySelectorAll('a.bottom-nav__item');
      const paraLink = Array.from(links).find((link: unknown) =>
        (link as HTMLElement).textContent?.includes('Para ti')
      );
      expect(paraLink).toBeTruthy();
    });

    it('should show the logout button when authenticated', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button.bottom-nav__item');
      const logoutBtn = Array.from(buttons).find((btn: unknown) =>
        (btn as HTMLElement).textContent?.includes('Salir')
      );
      expect(logoutBtn).toBeTruthy();
    });

    it('should NOT show the "Entrar" button when authenticated', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button.bottom-nav__item');
      const loginBtn = Array.from(buttons).find((btn: unknown) =>
        (btn as HTMLElement).textContent?.includes('Entrar')
      );
      expect(loginBtn).toBeFalsy();
    });
  });

  describe('openLoginModal()', () => {
    it('should call Dialog.open when "Entrar" button is clicked', () => {
      const btn = fixture.nativeElement.querySelector('button.bottom-nav__item');
      btn.click();
      expect(mockDialog.open).toHaveBeenCalled();
    });
  });

  describe('logout()', () => {
    beforeEach(() => {
      mockAuthService.currentUser.set({ email: 'user@example.com' });
      fixture.detectChanges();
    });

    it('should call authService.logout() when logout button is clicked', () => {
      mockAuthService.logout.mockReturnValue(of(undefined));

      const buttons = fixture.nativeElement.querySelectorAll('button.bottom-nav__item');
      const logoutBtn = Array.from(buttons).find((btn: unknown) =>
        (btn as HTMLElement).textContent?.includes('Salir')
      ) as HTMLElement;

      logoutBtn.click();

      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });
});
