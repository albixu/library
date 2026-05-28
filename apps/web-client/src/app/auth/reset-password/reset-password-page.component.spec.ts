import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

import { ResetPasswordPageComponent } from './reset-password-page.component.js';
import { AuthService } from '../auth.service.js';

/**
 * Helper to create the TestBed with a customizable token query param.
 */
async function createComponent(token: string | null): Promise<{
  component: ResetPasswordPageComponent;
  fixture: ComponentFixture<ResetPasswordPageComponent>;
  authServiceMock: { resetPassword: ReturnType<typeof vi.fn> };
  router: Router;
}> {
  const authServiceMock = { resetPassword: vi.fn() };

  const queryParamMap = {
    get: (key: string) => (key === 'token' ? token : null),
  };

  await TestBed.configureTestingModule({
    imports: [ResetPasswordPageComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AuthService, useValue: authServiceMock },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap } },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ResetPasswordPageComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  const router = TestBed.inject(Router);

  return { component, fixture, authServiceMock, router };
}

describe('ResetPasswordPageComponent', () => {
  describe('Initialization — no token', () => {
    it('should create without error', async () => {
      const { component } = await createComponent(null);
      expect(component).toBeTruthy();
    });

    it('should set token to null when absent from URL', async () => {
      const { component } = await createComponent(null);
      expect(component.token).toBeNull();
    });

    it('should show invalid link error message in the DOM', async () => {
      const { fixture } = await createComponent(null);
      const alert = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('Enlace inválido');
    });

    it('should NOT render the form when token is absent', async () => {
      const { fixture } = await createComponent(null);
      const form = fixture.nativeElement.querySelector('form');
      expect(form).toBeNull();
    });
  });

  describe('Initialization — with token', () => {
    it('should set token from query param', async () => {
      const { component } = await createComponent('abc123');
      expect(component.token).toBe('abc123');
    });

    it('should render the form', async () => {
      const { fixture } = await createComponent('abc123');
      const form = fixture.nativeElement.querySelector('form');
      expect(form).toBeTruthy();
    });

    it('should render the password and confirm inputs', async () => {
      const { fixture } = await createComponent('abc123');
      const pwInput = fixture.nativeElement.querySelector('#rp-password');
      const confirmInput = fixture.nativeElement.querySelector('#rp-confirm');
      expect(pwInput).toBeTruthy();
      expect(confirmInput).toBeTruthy();
    });

    it('should render the submit button', async () => {
      const { fixture } = await createComponent('abc123');
      const btn = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(btn).toBeTruthy();
      expect(btn.textContent.trim()).toContain('Cambiar contraseña');
    });
  });

  describe('Validation', () => {
    it('should show required error on password when touched', async () => {
      const { component, fixture } = await createComponent('tok');
      component.form.controls.password.markAsTouched();
      fixture.detectChanges();

      expect(component.passwordHasError()).toBe(true);
    });

    it('should show minlength error if password is shorter than 8 chars', async () => {
      const { component, fixture } = await createComponent('tok');
      component.form.controls.password.setValue('short');
      component.form.controls.password.markAsTouched();
      fixture.detectChanges();

      expect(component.form.controls.password.hasError('minlength')).toBe(true);
    });

    it('should show mismatch error when passwords do not match', async () => {
      const { component, fixture } = await createComponent('tok');
      component.form.controls.password.setValue('password1');
      component.form.controls.confirmPassword.setValue('different1');
      component.form.controls.confirmPassword.markAsTouched();
      component.form.updateValueAndValidity();
      fixture.detectChanges();

      expect(component.form.controls.confirmPassword.hasError('mismatch')).toBe(true);
      expect(component.confirmHasError()).toBe(true);
    });

    it('should NOT call resetPassword when form is invalid', async () => {
      const { component, authServiceMock } = await createComponent('tok');
      component.submit();
      expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('Submit — success', () => {
    it('should call authService.resetPassword with token and password', fakeAsync(async () => {
      const { component, authServiceMock } = await createComponent('mytoken');
      authServiceMock.resetPassword.mockReturnValue(of(undefined));

      component.form.controls.password.setValue('newpassword1');
      component.form.controls.confirmPassword.setValue('newpassword1');
      component.submit();
      tick();

      expect(authServiceMock.resetPassword).toHaveBeenCalledWith('mytoken', 'newpassword1');
    }));

    it('should set isLoading to false after success', fakeAsync(async () => {
      const { component, authServiceMock } = await createComponent('mytoken');
      authServiceMock.resetPassword.mockReturnValue(of(undefined));

      component.form.controls.password.setValue('newpassword1');
      component.form.controls.confirmPassword.setValue('newpassword1');
      component.submit();
      tick();

      expect(component.isLoading()).toBe(false);
    }));

    it('should show success message after reset', fakeAsync(async () => {
      const { component, fixture, authServiceMock } = await createComponent('mytoken');
      authServiceMock.resetPassword.mockReturnValue(of(undefined));

      component.form.controls.password.setValue('newpassword1');
      component.form.controls.confirmPassword.setValue('newpassword1');
      component.submit();
      tick();
      fixture.detectChanges();

      expect(component.isSuccess()).toBe(true);
      const successEl = fixture.nativeElement.querySelector('[role="status"]');
      expect(successEl).toBeTruthy();
      expect(successEl.textContent).toContain('Contraseña cambiada');
    }));

    it('should navigate to "/" after 2 seconds on success', fakeAsync(async () => {
      const { component, authServiceMock, router } = await createComponent('mytoken');
      authServiceMock.resetPassword.mockReturnValue(of(undefined));
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.form.controls.password.setValue('newpassword1');
      component.form.controls.confirmPassword.setValue('newpassword1');
      component.submit();
      tick(2000);

      expect(navigateSpy).toHaveBeenCalledWith(['/']);
    }));
  });

  describe('Submit — token error (400/401/404)', () => {
    it('should show expired token message on 400', fakeAsync(async () => {
      const { component, fixture, authServiceMock } = await createComponent('badtoken');
      authServiceMock.resetPassword.mockReturnValue(throwError(() => ({ status: 400 })));

      component.form.controls.password.setValue('newpassword1');
      component.form.controls.confirmPassword.setValue('newpassword1');
      component.submit();
      tick();
      fixture.detectChanges();

      expect(component.serverError()).toContain('expirado');
      expect(component.isLoading()).toBe(false);
    }));

    it('should show expired token message on 401', fakeAsync(async () => {
      const { component, authServiceMock } = await createComponent('badtoken');
      authServiceMock.resetPassword.mockReturnValue(throwError(() => ({ status: 401 })));

      component.form.controls.password.setValue('newpassword1');
      component.form.controls.confirmPassword.setValue('newpassword1');
      component.submit();
      tick();

      expect(component.serverError()).toContain('expirado');
    }));

    it('should render the token error in the DOM', fakeAsync(async () => {
      const { component, fixture, authServiceMock } = await createComponent('badtoken');
      authServiceMock.resetPassword.mockReturnValue(throwError(() => ({ status: 400 })));

      component.form.controls.password.setValue('newpassword1');
      component.form.controls.confirmPassword.setValue('newpassword1');
      component.submit();
      tick();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('[role="alert"]');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('expirado');
    }));
  });

  describe('Submit — generic error', () => {
    it('should show generic message on 500', fakeAsync(async () => {
      const { component, authServiceMock } = await createComponent('tok');
      authServiceMock.resetPassword.mockReturnValue(throwError(() => ({ status: 500 })));

      component.form.controls.password.setValue('newpassword1');
      component.form.controls.confirmPassword.setValue('newpassword1');
      component.submit();
      tick();

      expect(component.serverError()).toContain('Ha ocurrido un error');
    }));
  });

  describe('isLoading state', () => {
    it('should set isLoading to true while request is in-flight', async () => {
      const { component, authServiceMock } = await createComponent('tok');
      const subject = new Subject<void>();
      authServiceMock.resetPassword.mockReturnValue(subject.asObservable());

      component.form.controls.password.setValue('newpassword1');
      component.form.controls.confirmPassword.setValue('newpassword1');
      component.submit();

      expect(component.isLoading()).toBe(true);

      subject.complete();
    });
  });
});
