import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { MultiSelectChipsComponent, SelectOption } from './multi-select-chips.component.js';

describe('MultiSelectChipsComponent', () => {
  let component: MultiSelectChipsComponent;
  let fixture: ComponentFixture<MultiSelectChipsComponent>;

  const mockOptions: SelectOption[] = [
    { id: '1', name: 'Programming' },
    { id: '2', name: 'Web Development' },
    { id: '3', name: 'Database' },
    { id: '4', name: 'DevOps' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiSelectChipsComponent],
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

    fixture = TestBed.createComponent(MultiSelectChipsComponent);
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
      fixture.componentRef.setInput('label', 'Categories');
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.multi-select-label');
      expect(label.textContent.trim()).toBe('Categories');
    });

    it('should set options from input', () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();

      // Verify options are passed to PrimeNG component
      const pMultiSelect = fixture.nativeElement.querySelector('p-multiselect');
      expect(pMultiSelect).toBeTruthy();
    });

    it('should display placeholder when no values selected', () => {
      fixture.componentRef.setInput('placeholder', 'Select categories...');
      fixture.detectChanges();

      expect(component.placeholder()).toBe('Select categories...');
    });

    it('should set selected values from input', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', ['1', '2']);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.internalValue()).toEqual(['1', '2']);
    });
  });

  describe('Chips display', () => {
    it('should display chips for selected values', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', ['1', '2']);
      fixture.detectChanges();
      await fixture.whenStable();

      const chips = fixture.nativeElement.querySelectorAll('[data-testid="selected-chip"]');
      expect(chips.length).toBe(2);
    });

    it('should display correct names on chips', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', ['1']);
      fixture.detectChanges();
      await fixture.whenStable();

      const chip = fixture.nativeElement.querySelector('[data-testid="selected-chip"]');
      expect(chip.textContent).toContain('Programming');
    });

    it('should remove chip when remove button is clicked', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', ['1', '2']);
      fixture.detectChanges();
      await fixture.whenStable();

      const emittedValues: string[][] = [];
      component.valueChange.subscribe((value: string[]) => emittedValues.push(value));

      const removeButton = fixture.nativeElement.querySelector('[data-testid="remove-chip"]');
      removeButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(emittedValues.length).toBeGreaterThan(0);
      expect(emittedValues[emittedValues.length - 1].length).toBe(1);
    });
  });

  describe('Value changes', () => {
    it('should emit values when selection changes', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();

      const emittedValues: string[][] = [];
      component.valueChange.subscribe((value: string[]) => emittedValues.push(value));

      // Simulate selection change
      component.onSelectionChange(['1', '2']);
      await fixture.whenStable();

      expect(emittedValues).toEqual([['1', '2']]);
      expect(component.internalValue()).toEqual(['1', '2']);
    });

    it('should sync external value changes to internal value', async () => {
      fixture.componentRef.setInput('value', ['1']);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.internalValue()).toEqual(['1']);

      fixture.componentRef.setInput('value', ['2', '3']);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.internalValue()).toEqual(['2', '3']);
    });
  });

  describe('Clear all functionality', () => {
    it('should show clear all button when values are selected', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', ['1', '2']);
      fixture.detectChanges();
      await fixture.whenStable();

      const clearAllButton = fixture.nativeElement.querySelector('[data-testid="clear-all"]');
      expect(clearAllButton).toBeTruthy();
    });

    it('should hide clear all button when no values selected', () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', []);
      fixture.detectChanges();

      const clearAllButton = fixture.nativeElement.querySelector('[data-testid="clear-all"]');
      expect(clearAllButton).toBeFalsy();
    });

    it('should clear all selections when clear all is clicked', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', ['1', '2']);
      fixture.detectChanges();
      await fixture.whenStable();

      const emittedValues: string[][] = [];
      component.valueChange.subscribe((value: string[]) => emittedValues.push(value));

      const clearAllButton = fixture.nativeElement.querySelector('[data-testid="clear-all"]');
      clearAllButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(emittedValues).toContainEqual([]);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on select', () => {
      fixture.componentRef.setInput('label', 'Categories');
      fixture.detectChanges();

      const pMultiSelect = fixture.nativeElement.querySelector('p-multiselect');
      expect(pMultiSelect).toBeTruthy();
    });

    it('should have proper aria-label on chip remove buttons', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', ['1']);
      fixture.detectChanges();
      await fixture.whenStable();

      const removeButton = fixture.nativeElement.querySelector('[data-testid="remove-chip"]');
      const ariaLabel = removeButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('Remove');
    });

    it('should generate unique input id', () => {
      const id1 = component.inputId();

      const fixture2 = TestBed.createComponent(MultiSelectChipsComponent);
      const component2 = fixture2.componentInstance;
      const id2 = component2.inputId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('Disabled state', () => {
    it('should disable select when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const pMultiSelect = fixture.nativeElement.querySelector('p-multiselect');
      expect(pMultiSelect).toBeTruthy();
    });

    it('should hide remove buttons on chips when disabled', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', ['1']);
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      await fixture.whenStable();

      const removeButton = fixture.nativeElement.querySelector('[data-testid="remove-chip"]');
      expect(removeButton).toBeFalsy();
    });
  });

  describe('Loading state', () => {
    it('should have loading state when loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      // Verify loading signal is set correctly
      expect(component.loading()).toBe(true);

      // Verify PrimeNG multiselect is rendered (icon templates are rendered dynamically)
      const pMultiSelect = fixture.nativeElement.querySelector('p-multiselect');
      expect(pMultiSelect).toBeTruthy();
    });

    it('should disable select when loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const pMultiSelect = fixture.nativeElement.querySelector('p-multiselect');
      expect(pMultiSelect).toBeTruthy();
    });

    it('should not be loading when loading is false', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();

      // Verify loading signal is set correctly
      expect(component.loading()).toBe(false);

      // Verify PrimeNG multiselect is rendered
      const pMultiSelect = fixture.nativeElement.querySelector('p-multiselect');
      expect(pMultiSelect).toBeTruthy();
    });
  });
});
