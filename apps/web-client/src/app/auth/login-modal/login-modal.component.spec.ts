import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { LoginModalComponent } from './login-modal.component.js';
import { AuthService } from '../auth.service.js';

describe('LoginModalComponent', () => {
  let component: LoginModalComponent;
  let fixture: ComponentFixture<LoginModalComponent>;
  let authServiceMock: {
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    currentUser: ReturnType<typeof signal<{ email: string } | null>>;
  };

  beforeEach(async () => {
    authServiceMock = {
      login: vi.fn(),
      logout: vi.fn(),
      currentUser: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [LoginModalComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render a dialog with role="dialog"', () => {
      const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    it('should render email and password inputs', () => {
      const email = fixture.nativeElement.querySelector('#login-email');
      const password = fixture.nativeElement.querySelector('#login-password');
      expect(email).toBeTruthy();
      expect(password).toBeTruthy();
    });

    it('should render the submit button', () => {
      const btn = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(btn).toBeTruthy();
    });

    it('should render the "Olvidé mi contraseña" link', () => {
      const link = fixture.nativeElement.querySelector('a[ng-reflect-router-link], a');
      expect(link).toBeTruthy();
      expect(link.textContent.trim()).toContain('Olvidé mi contraseña');
    });

    it('should render title "Iniciar sesión"', () => {
      const title = fixture.nativeElement.querySelector('#login-modal-title');
      expect(title.textContent.trim()).toBe('Iniciar sesión');
    });
  });

  describe('Validation — empty form', () => {
    it('should show email required error after touching', fakeAsync(() => {
      const emailInput = fixture.nativeElement.querySelector('#login-email');
      emailInput.dispatchEvent(new Event('blur'));
      component.form.controls.email.markAsTouched();
      fixture.detectChanges();

      expect(component.emailHasError()).toBe(true);
    }));

    it('should show password required error after touching', fakeAsync(() => {
      component.form.controls.password.markAsTouched();
      fixture.detectChanges();

      expect(component.passwordHasError()).toBe(true);
    }));

    it('should NOT call authService.login when form is invalid', () => {
      component.submit();
      expect(authServiceMock.login).not.toHaveBeenCalled();
    });
  });

  describe('Validation — invalid email format', () => {
    it('should show email format error', () => {
      component.form.controls.email.setValue('notanemail');
      component.form.controls.email.markAsTouched();
      fixture.detectChanges();

      expect(component.emailHasError()).toBe(true);
      expect(component.form.controls.email.hasError('email')).toBe(true);
    });
  });

  describe('Submit — success', () => {
    it('should call authService.login with form values', fakeAsync(() => {
      authServiceMock.login.mockReturnValue(of(undefined));
      component.form.setValue({ email: 'user@example.com', password: 'secret123' });

      component.submit();
      tick();

      expect(authServiceMock.login).toHaveBeenCalledWith('user@example.com', 'secret123');
    }));

    it('should set isLoading to false after success', fakeAsync(() => {
      authServiceMock.login.mockReturnValue(of(undefined));
      component.form.setValue({ email: 'user@example.com', password: 'secret123' });

      component.submit();
      tick();

      expect(component.isLoading()).toBe(false);
    }));

    it('should clear serverError after success', fakeAsync(() => {
      authServiceMock.login.mockReturnValue(of(undefined));
      component.form.setValue({ email: 'user@example.com', password: 'secret123' });

      component.submit();
      tick();

      expect(component.serverError()).toBeNull();
    }));
  });

  describe('Submit — 401 error', () => {
    it('should show specific message on 401', fakeAsync(() => {
      authServiceMock.login.mockReturnValue(throwError(() => ({ status: 401 })));
      component.form.setValue({ email: 'user@example.com', password: 'wrong' });

      component.submit();
      tick();
      fixture.detectChanges();

      expect(component.serverError()).toContain('Credenciales incorrectas');
      expect(component.isLoading()).toBe(false);
    }));

    it('should render the error in the DOM on 401', fakeAsync(() => {
      authServiceMock.login.mockReturnValue(throwError(() => ({ status: 401 })));
      component.form.setValue({ email: 'user@example.com', password: 'wrong' });

      component.submit();
      tick();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.login-modal__server-error');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Credenciales incorrectas');
    }));
  });

  describe('Submit — generic error', () => {
    it('should show generic message on 500', fakeAsync(() => {
      authServiceMock.login.mockReturnValue(throwError(() => ({ status: 500 })));
      component.form.setValue({ email: 'user@example.com', password: 'pass' });

      component.submit();
      tick();

      expect(component.serverError()).toContain('Error al iniciar sesión');
    }));
  });

  describe('isLoading state', () => {
    it('should set isLoading true while request is pending', () => {
      const subject = new Subject<void>();
      authServiceMock.login.mockReturnValue(subject.asObservable());
      component.form.setValue({ email: 'user@example.com', password: 'pass' });

      component.submit();

      expect(component.isLoading()).toBe(true);

      // Complete to avoid memory leaks
      subject.complete();
    });
  });

  describe('Close button', () => {
    it('should render a close button', () => {
      const closeBtn = fixture.nativeElement.querySelector('.login-modal__close');
      expect(closeBtn).toBeTruthy();
    });

    it('should call close() when close button is clicked', () => {
      const closeSpy = vi.spyOn(component, 'close');
      const closeBtn = fixture.nativeElement.querySelector('.login-modal__close');
      closeBtn.click();
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
