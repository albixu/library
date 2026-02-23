import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, delay } from 'rxjs';

import { SendToKindleDialogComponent } from './send-to-kindle-dialog.component.js';
import { KindleService, SendToKindleResult } from '../../../../core/services/kindle.service.js';
import { Book } from '../../../../core/models/index.js';

describe('SendToKindleDialogComponent', () => {
  let component: SendToKindleDialogComponent;
  let fixture: ComponentFixture<SendToKindleDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockKindleService: {
    sendToKindle: ReturnType<typeof vi.fn>;
    validateKindleEmail: ReturnType<typeof vi.fn>;
    isKindleEmail: ReturnType<typeof vi.fn>;
  };

  const mockBook: Book = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    isbn: '978-0-13-468599-1',
    title: 'Clean Code',
    authors: [{ id: '1', name: 'Robert C. Martin' }],
    type: 'technical',
    categories: [{ id: '1', name: 'Software Engineering' }],
    level: 'Intermediate',
    format: 'epub',
    originalDescription: 'A handbook of agile software craftsmanship',
    description: 'A handbook of agile software craftsmanship',
    language: 'en',
    available: true,
    similarityScore: null,
  };

  const mockUnavailableBook: Book = {
    ...mockBook,
    id: '223e4567-e89b-12d3-a456-426614174001',
    available: false,
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: vi.fn(),
    };

    mockKindleService = {
      sendToKindle: vi.fn(),
      validateKindleEmail: vi.fn(),
      isKindleEmail: vi.fn(),
    };

    // Default mock implementations
    mockKindleService.validateKindleEmail.mockImplementation((email: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
    mockKindleService.isKindleEmail.mockImplementation((email: string) =>
      email.toLowerCase().endsWith('@kindle.com')
    );

    await TestBed.configureTestingModule({
      imports: [SendToKindleDialogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockBook },
        { provide: KindleService, useValue: mockKindleService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SendToKindleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Dialog content', () => {
    it('should display the book title', () => {
      const title = fixture.nativeElement.querySelector('[data-testid="book-title"]');
      expect(title.textContent).toContain('Clean Code');
    });

    it('should display email input field', () => {
      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      expect(emailInput).toBeTruthy();
    });

    it('should display cancel button', () => {
      const cancelButton = fixture.nativeElement.querySelector('[data-testid="cancel-button"]');
      expect(cancelButton).toBeTruthy();
      expect(cancelButton.textContent.trim()).toBe('Cancel');
    });

    it('should display send button', () => {
      const sendButton = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      expect(sendButton).toBeTruthy();
      expect(sendButton.textContent.trim()).toContain('Send');
    });
  });

  describe('Email validation', () => {
    it('should show error for empty email when touched', async () => {
      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.focus();
      emailInput.blur();
      fixture.detectChanges();
      await fixture.whenStable();

      const error = fixture.nativeElement.querySelector('mat-error');
      expect(error).toBeTruthy();
      expect(error.textContent).toContain('Email is required');
    });

    it('should show error for invalid email format', async () => {
      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'invalid-email';
      emailInput.dispatchEvent(new Event('input'));
      emailInput.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      await fixture.whenStable();

      const error = fixture.nativeElement.querySelector('mat-error');
      expect(error).toBeTruthy();
      expect(error.textContent).toContain('Please enter a valid email');
    });

    it('should show warning for non-kindle email', async () => {
      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'user@gmail.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();

      const warning = fixture.nativeElement.querySelector('[data-testid="kindle-warning"]');
      expect(warning).toBeTruthy();
      expect(warning.textContent).toContain('@kindle.com');
    });

    it('should not show warning for kindle email', async () => {
      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'user@kindle.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();

      const warning = fixture.nativeElement.querySelector('[data-testid="kindle-warning"]');
      expect(warning).toBeFalsy();
    });
  });

  describe('Send button state', () => {
    it('should disable send button when email is invalid', () => {
      const sendButton = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      expect(sendButton.disabled).toBe(true);
    });

    it('should enable send button when email is valid', async () => {
      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'user@kindle.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();

      const sendButton = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      expect(sendButton.disabled).toBe(false);
    });

    it('should disable send button while sending', fakeAsync(() => {
      const successResult: SendToKindleResult = {
        success: true,
        message: 'Book sent successfully',
      };
      mockKindleService.sendToKindle.mockReturnValue(of(successResult).pipe(delay(500)));

      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'user@kindle.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const sendButton = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      sendButton.click();
      fixture.detectChanges();

      expect(sendButton.disabled).toBe(true);

      tick(500);
      fixture.detectChanges();
    }));
  });

  describe('Cancel action', () => {
    it('should close dialog without result when cancel is clicked', () => {
      const cancelButton = fixture.nativeElement.querySelector('[data-testid="cancel-button"]');
      cancelButton.click();

      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });
  });

  describe('Send action', () => {
    it('should call KindleService.sendToKindle with book and email', async () => {
      const successResult: SendToKindleResult = {
        success: true,
        message: 'Book sent successfully',
      };
      mockKindleService.sendToKindle.mockReturnValue(of(successResult));

      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'user@kindle.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const sendButton = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      sendButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(mockKindleService.sendToKindle).toHaveBeenCalledWith(mockBook, 'user@kindle.com');
    });

    it('should show loading spinner while sending', fakeAsync(() => {
      const successResult: SendToKindleResult = {
        success: true,
        message: 'Book sent successfully',
      };
      mockKindleService.sendToKindle.mockReturnValue(of(successResult).pipe(delay(500)));

      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'user@kindle.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const sendButton = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      sendButton.click();
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('mat-spinner');
      expect(spinner).toBeTruthy();

      tick(500);
      fixture.detectChanges();
    }));

    it('should show success message after successful send', fakeAsync(() => {
      const successResult: SendToKindleResult = {
        success: true,
        message: '"Clean Code" has been sent to user@kindle.com. Check your Kindle!',
      };
      mockKindleService.sendToKindle.mockReturnValue(of(successResult));

      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'user@kindle.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const sendButton = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      sendButton.click();
      tick();
      fixture.detectChanges();

      const successMessage = fixture.nativeElement.querySelector('[data-testid="success-message"]');
      expect(successMessage).toBeTruthy();
      expect(successMessage.textContent).toContain('Clean Code');
    }));

    it('should show error message after failed send', fakeAsync(() => {
      const errorResult: SendToKindleResult = {
        success: false,
        message: 'Book is not available for sending',
      };
      mockKindleService.sendToKindle.mockReturnValue(of(errorResult));

      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'user@kindle.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const sendButton = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      sendButton.click();
      tick();
      fixture.detectChanges();

      const errorMessage = fixture.nativeElement.querySelector('[data-testid="error-message"]');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toContain('not available');
    }));

    it('should show close button after successful send', fakeAsync(() => {
      const successResult: SendToKindleResult = {
        success: true,
        message: 'Book sent successfully',
      };
      mockKindleService.sendToKindle.mockReturnValue(of(successResult));

      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'user@kindle.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const sendButton = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      sendButton.click();
      tick();
      fixture.detectChanges();

      const closeButton = fixture.nativeElement.querySelector('[data-testid="close-button"]');
      expect(closeButton).toBeTruthy();
    }));

    it('should close dialog with result when close button is clicked after success', fakeAsync(() => {
      const successResult: SendToKindleResult = {
        success: true,
        message: 'Book sent successfully',
      };
      mockKindleService.sendToKindle.mockReturnValue(of(successResult));

      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      emailInput.value = 'user@kindle.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const sendButton = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      sendButton.click();
      tick();
      fixture.detectChanges();

      const closeButton = fixture.nativeElement.querySelector('[data-testid="close-button"]');
      closeButton.click();

      expect(mockDialogRef.close).toHaveBeenCalledWith({ success: true, email: 'user@kindle.com' });
    }));
  });

  describe('Unavailable book', () => {
    beforeEach(async () => {
      await TestBed.resetTestingModule();

      mockDialogRef = {
        close: vi.fn(),
      };

      mockKindleService = {
        sendToKindle: vi.fn(),
        validateKindleEmail: vi.fn(),
        isKindleEmail: vi.fn(),
      };

      mockKindleService.validateKindleEmail.mockImplementation((email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      );
      mockKindleService.isKindleEmail.mockImplementation((email: string) =>
        email.toLowerCase().endsWith('@kindle.com')
      );

      await TestBed.configureTestingModule({
        imports: [SendToKindleDialogComponent],
        providers: [
          provideAnimationsAsync(),
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: mockUnavailableBook },
          { provide: KindleService, useValue: mockKindleService },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(SendToKindleDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should show unavailable warning for unavailable books', () => {
      const unavailableWarning = fixture.nativeElement.querySelector(
        '[data-testid="unavailable-warning"]'
      );
      expect(unavailableWarning).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on email input', () => {
      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      expect(emailInput.getAttribute('aria-label')).toBe('Kindle email address');
    });

    it('should have proper aria-describedby for email hints', () => {
      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      expect(emailInput.hasAttribute('aria-describedby')).toBe(true);
    });
  });
});
