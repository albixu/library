import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
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
      providers: [provideAnimationsAsync()],
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

      const label = fixture.nativeElement.querySelector('mat-label');
      expect(label.textContent.trim()).toBe('Categories');
    });

    it('should display options when provided', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();
      await fixture.whenStable();

      // Open the select panel
      const trigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const options = document.querySelectorAll('mat-option');
      expect(options.length).toBe(mockOptions.length);
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

  describe('Selection behavior', () => {
    it('should emit selected values when options are clicked', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();

      const emittedValues: string[][] = [];
      component.valueChange.subscribe((value: string[]) => emittedValues.push(value));

      // Open the select panel
      const trigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Click on an option
      const options = document.querySelectorAll('mat-option');
      (options[0] as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(emittedValues.length).toBeGreaterThan(0);
      expect(emittedValues[emittedValues.length - 1]).toContain('1');
    });

    it('should allow multiple selections', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();

      // Open the select panel
      const trigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Click on multiple options
      const options = document.querySelectorAll('mat-option');
      (options[0] as HTMLElement).click();
      (options[1] as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.internalValue().length).toBe(2);
    });
  });

  describe('Search/Filter functionality', () => {
    it('should show search input when select is opened', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();

      // Open the select panel
      const trigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const searchInput = document.querySelector('[data-testid="search-input"]');
      expect(searchInput).toBeTruthy();
    });

    it('should filter options based on search term', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();

      // Open the select panel
      const trigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Type in search
      const searchInput = document.querySelector(
        '[data-testid="search-input"]'
      ) as HTMLInputElement;
      searchInput.value = 'Prog';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();

      // Check filtered options are computed correctly
      expect(component.filteredOptions().length).toBe(1);
      expect(component.filteredOptions()[0].name).toBe('Programming');
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

      const select = fixture.nativeElement.querySelector('mat-select');
      const ariaLabel = select.getAttribute('aria-label');
      expect(ariaLabel).toBe('Categories');
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
  });

  describe('Disabled state', () => {
    it('should disable select when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const select = fixture.nativeElement.querySelector('mat-select');
      expect(select.getAttribute('aria-disabled')).toBe('true');
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
    it('should show loading indicator when loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('mat-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should disable select when loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const select = fixture.nativeElement.querySelector('mat-select');
      expect(select.getAttribute('aria-disabled')).toBe('true');
    });
  });
});
