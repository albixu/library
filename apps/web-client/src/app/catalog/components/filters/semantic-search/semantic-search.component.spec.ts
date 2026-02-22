import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SemanticSearchComponent } from './semantic-search.component.js';

describe('SemanticSearchComponent', () => {
  let component: SemanticSearchComponent;
  let fixture: ComponentFixture<SemanticSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SemanticSearchComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(SemanticSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Inputs', () => {
    it('should display the provided label', () => {
      fixture.componentRef.setInput('label', 'Semantic Search');
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('mat-label');
      expect(label.textContent.trim()).toBe('Semantic Search');
    });

    it('should display the provided placeholder', () => {
      fixture.componentRef.setInput('placeholder', 'Describe what you are looking for...');
      fixture.detectChanges();

      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.getAttribute('placeholder')).toBe('Describe what you are looking for...');
    });

    it('should set initial value from input', async () => {
      fixture.componentRef.setInput('value', 'Initial search text');
      fixture.detectChanges();
      await fixture.whenStable();

      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.value).toBe('Initial search text');
    });

    it('should display hint text when provided', () => {
      fixture.componentRef.setInput(
        'hint',
        'Use natural language to describe what you want to find'
      );
      fixture.detectChanges();

      const hint = fixture.nativeElement.querySelector('mat-hint');
      expect(hint.textContent.trim()).toContain('Use natural language');
    });
  });

  describe('Debounce behavior', () => {
    it('should emit value after debounce time (300ms)', async () => {
      vi.useFakeTimers();
      const emittedValues: string[] = [];
      component.valueChange.subscribe((value: string) => emittedValues.push(value));

      const textarea = fixture.nativeElement.querySelector('textarea');
      textarea.value = 'test search query';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // Should not emit immediately
      expect(emittedValues).toHaveLength(0);

      // After 300ms debounce
      vi.advanceTimersByTime(300);
      await fixture.whenStable();

      expect(emittedValues).toHaveLength(1);
      expect(emittedValues[0]).toBe('test search query');
    });

    it('should debounce multiple rapid inputs', async () => {
      vi.useFakeTimers();
      const emittedValues: string[] = [];
      component.valueChange.subscribe((value: string) => emittedValues.push(value));

      const textarea = fixture.nativeElement.querySelector('textarea');

      // Type multiple characters rapidly
      textarea.value = 'test';
      textarea.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);

      textarea.value = 'test query';
      textarea.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);

      textarea.value = 'test query final';
      textarea.dispatchEvent(new Event('input'));

      // Only the last value should be emitted after full debounce
      vi.advanceTimersByTime(300);
      await fixture.whenStable();

      expect(emittedValues).toHaveLength(1);
      expect(emittedValues[0]).toBe('test query final');
    });
  });

  describe('Clear functionality', () => {
    it('should show clear button when textarea has value', async () => {
      fixture.componentRef.setInput('value', 'test');
      fixture.detectChanges();
      await fixture.whenStable();

      const clearButton = fixture.nativeElement.querySelector('[data-testid="clear-button"]');
      expect(clearButton).toBeTruthy();
    });

    it('should hide clear button when textarea is empty', () => {
      fixture.componentRef.setInput('value', '');
      fixture.detectChanges();

      const clearButton = fixture.nativeElement.querySelector('[data-testid="clear-button"]');
      expect(clearButton).toBeFalsy();
    });

    it('should clear textarea and emit empty string when clear button is clicked', async () => {
      fixture.componentRef.setInput('value', 'test');
      fixture.detectChanges();
      await fixture.whenStable();

      const emittedValues: string[] = [];
      component.valueChange.subscribe((value: string) => emittedValues.push(value));

      const clearButton = fixture.nativeElement.querySelector('[data-testid="clear-button"]');
      clearButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.value).toBe('');
      expect(emittedValues).toContain('');
    });
  });

  describe('Character count', () => {
    it('should show character count when maxLength is set', () => {
      fixture.componentRef.setInput('maxLength', 500);
      fixture.detectChanges();

      const charCount = fixture.nativeElement.querySelector('[data-testid="char-count"]');
      expect(charCount).toBeTruthy();
    });

    it('should update character count as user types', async () => {
      fixture.componentRef.setInput('maxLength', 500);
      fixture.componentRef.setInput('value', 'Hello');
      fixture.detectChanges();
      await fixture.whenStable();

      const charCount = fixture.nativeElement.querySelector('[data-testid="char-count"]');
      expect(charCount.textContent).toContain('5');
      expect(charCount.textContent).toContain('500');
    });

    it('should not show character count when maxLength is not set', () => {
      fixture.componentRef.setInput('maxLength', 0);
      fixture.detectChanges();

      const charCount = fixture.nativeElement.querySelector('[data-testid="char-count"]');
      expect(charCount).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on textarea', () => {
      fixture.componentRef.setInput('label', 'Semantic Search');
      fixture.detectChanges();

      const textarea = fixture.nativeElement.querySelector('textarea');
      const ariaLabel = textarea.getAttribute('aria-label');
      expect(ariaLabel).toBe('Semantic Search');
    });

    it('should have proper aria-label on clear button', async () => {
      fixture.componentRef.setInput('value', 'test');
      fixture.detectChanges();
      await fixture.whenStable();

      const clearButton = fixture.nativeElement.querySelector('[data-testid="clear-button"]');
      const ariaLabel = clearButton.getAttribute('aria-label');
      expect(ariaLabel).toBe('Clear search');
    });
  });

  describe('Disabled state', () => {
    it('should disable textarea when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.disabled).toBe(true);
    });

    it('should hide clear button when disabled', async () => {
      fixture.componentRef.setInput('value', 'test');
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      await fixture.whenStable();

      const clearButton = fixture.nativeElement.querySelector('[data-testid="clear-button"]');
      expect(clearButton).toBeFalsy();
    });
  });

  describe('Rows configuration', () => {
    it('should set textarea rows from input', () => {
      fixture.componentRef.setInput('rows', 5);
      fixture.detectChanges();

      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.getAttribute('rows')).toBe('5');
    });

    it('should use default rows of 3', () => {
      fixture.detectChanges();

      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.getAttribute('rows')).toBe('3');
    });
  });
});
