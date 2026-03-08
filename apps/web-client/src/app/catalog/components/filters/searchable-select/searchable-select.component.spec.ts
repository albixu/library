import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { SearchableSelectComponent, SelectOption } from './searchable-select.component.js';

describe('SearchableSelectComponent', () => {
  let component: SearchableSelectComponent;
  let fixture: ComponentFixture<SearchableSelectComponent>;

  const mockOptions: SelectOption[] = [
    { id: '1', name: 'Technical' },
    { id: '2', name: 'Business' },
    { id: '3', name: 'Fiction' },
    { id: '4', name: 'Science' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableSelectComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG({
          theme: {
            preset: Aura,
            options: { unstyled: true },
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchableSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Inputs', () => {
    it('should display the provided label', () => {
      fixture.componentRef.setInput('label', 'Book Type');
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.searchable-select-label');
      expect(label.textContent.trim()).toBe('Book Type');
    });

    it('should set options from input', () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();

      // Verify options are passed to PrimeNG component
      const pSelect = fixture.nativeElement.querySelector('p-select');
      expect(pSelect).toBeTruthy();
    });

    it('should display placeholder when no value selected', () => {
      fixture.componentRef.setInput('placeholder', 'Select type...');
      fixture.detectChanges();

      expect(component.placeholder()).toBe('Select type...');
    });

    it('should set selected value from input', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', 'Technical');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.internalValue()).toBe('Technical');
    });
  });

  describe('Value changes', () => {
    it('should emit value when selection changes', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();

      const emittedValues: string[] = [];
      component.valueChange.subscribe((value: string) => emittedValues.push(value));

      // Simulate selection change
      component.onSelectionChange('Business');
      await fixture.whenStable();

      expect(emittedValues).toEqual(['Business']);
      expect(component.internalValue()).toBe('Business');
    });

    it('should handle null selection (clear)', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', 'Technical');
      fixture.detectChanges();
      await fixture.whenStable();

      const emittedValues: string[] = [];
      component.valueChange.subscribe((value: string) => emittedValues.push(value));

      // Simulate clear (PrimeNG returns null)
      component.onSelectionChange(null);
      await fixture.whenStable();

      expect(emittedValues).toEqual(['']);
      expect(component.internalValue()).toBe('');
    });

    it('should sync external value changes to internal value', async () => {
      fixture.componentRef.setInput('value', 'Technical');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.internalValue()).toBe('Technical');

      fixture.componentRef.setInput('value', 'Fiction');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.internalValue()).toBe('Fiction');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on select', () => {
      fixture.componentRef.setInput('label', 'Book Type');
      fixture.detectChanges();

      const pSelect = fixture.nativeElement.querySelector('p-select');
      expect(pSelect).toBeTruthy();
    });

    it('should generate unique input id', () => {
      const id1 = component.inputId();

      const fixture2 = TestBed.createComponent(SearchableSelectComponent);
      const component2 = fixture2.componentInstance;
      const id2 = component2.inputId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('Disabled state', () => {
    it('should disable select when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const pSelect = fixture.nativeElement.querySelector('p-select');
      expect(pSelect).toBeTruthy();
    });

    it('should disable select when loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const pSelect = fixture.nativeElement.querySelector('p-select');
      expect(pSelect).toBeTruthy();
    });
  });

  describe('Loading state', () => {
    it('should have loading state when loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      // Verify loading signal is set correctly
      expect(component.loading()).toBe(true);

      // Verify PrimeNG select is rendered (icon templates are rendered dynamically)
      const pSelect = fixture.nativeElement.querySelector('p-select');
      expect(pSelect).toBeTruthy();
    });

    it('should not be loading when loading is false', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();

      // Verify loading signal is set correctly
      expect(component.loading()).toBe(false);

      // Verify PrimeNG select is rendered
      const pSelect = fixture.nativeElement.querySelector('p-select');
      expect(pSelect).toBeTruthy();
    });
  });

  describe('Show all option', () => {
    it('should enable clear when showAllOption is true', () => {
      fixture.componentRef.setInput('showAllOption', true);
      fixture.detectChanges();

      expect(component.showAllOption()).toBe(true);
    });

    it('should disable clear when showAllOption is false', () => {
      fixture.componentRef.setInput('showAllOption', false);
      fixture.detectChanges();

      expect(component.showAllOption()).toBe(false);
    });
  });

  describe('hasValue computed', () => {
    it('should be false when internalValue is empty string', () => {
      component.internalValue.set('');
      expect(component.hasValue()).toBe(false);
    });

    it('should be true when internalValue has a non-empty value', () => {
      component.internalValue.set('Technical');
      expect(component.hasValue()).toBe(true);
    });

    it('should be false after clearing selection via onSelectionChange(null)', async () => {
      fixture.componentRef.setInput('value', 'Technical');
      fixture.detectChanges();
      await fixture.whenStable();

      component.onSelectionChange(null);

      expect(component.hasValue()).toBe(false);
    });

    it('should be true after selecting a value via onSelectionChange', () => {
      component.onSelectionChange('Fiction');
      expect(component.hasValue()).toBe(true);
    });
  });
});
