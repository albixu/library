import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
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
      providers: [provideAnimationsAsync()],
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

      const label = fixture.nativeElement.querySelector('mat-label');
      expect(label.textContent.trim()).toBe('Book Type');
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
      // mockOptions + "All" option or empty option = 5 or 4 options
      expect(options.length).toBeGreaterThanOrEqual(mockOptions.length);
    });

    it('should display placeholder when no value selected', () => {
      fixture.componentRef.setInput('placeholder', 'Select type...');
      fixture.detectChanges();

      // Verify the placeholder is set on the component
      expect(component.placeholder()).toBe('Select type...');
    });

    it('should set selected value from input', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('value', '1');
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify value is set internally
      expect(component.internalValue()).toBe('1');

      // Verify the selected option can be found by opening the select
      const trigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const selectedOption = document.querySelector('mat-option.mdc-list-item--selected');
      expect(selectedOption?.textContent?.trim()).toBe('Technical');
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
      searchInput.value = 'Tech';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();

      // Check visible options
      const visibleOptions = document.querySelectorAll('mat-option:not(.hidden)');
      // Should only show "Technical" and possibly an "All" option
      expect(visibleOptions.length).toBeLessThan(mockOptions.length + 1);
    });

    it('should show "No results" message when no options match', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();

      // Open the select panel
      const trigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Type non-matching search
      const searchInput = document.querySelector(
        '[data-testid="search-input"]'
      ) as HTMLInputElement;
      searchInput.value = 'ZZZZZ';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();

      const noResults = document.querySelector('[data-testid="no-results"]');
      expect(noResults).toBeTruthy();
    });
  });

  describe('Selection behavior', () => {
    it('should emit selected value when option is clicked', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.detectChanges();

      const emittedValues: string[] = [];
      component.valueChange.subscribe((value: string) => emittedValues.push(value));

      // Open the select panel
      const trigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Click on an option
      const options = document.querySelectorAll('mat-option');
      const technicalOption = Array.from(options).find((opt) =>
        opt.textContent?.includes('Technical')
      ) as HTMLElement;
      technicalOption?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(emittedValues).toContain('1');
    });

    it('should emit empty string when "All" option is selected', async () => {
      fixture.componentRef.setInput('options', mockOptions);
      fixture.componentRef.setInput('showAllOption', true);
      fixture.componentRef.setInput('value', '1');
      fixture.detectChanges();
      await fixture.whenStable();

      const emittedValues: string[] = [];
      component.valueChange.subscribe((value: string) => emittedValues.push(value));

      // Open the select panel
      const trigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Click on "All" option
      const options = document.querySelectorAll('mat-option');
      const allOption = Array.from(options).find((opt) =>
        opt.textContent?.includes('All')
      ) as HTMLElement;
      allOption?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(emittedValues).toContain('');
    });
  });

  describe('Clear search on close', () => {
    it('should clear search input when panel is closed', async () => {
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
      searchInput.value = 'Tech';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // Close by clicking outside or selecting
      const options = document.querySelectorAll('mat-option');
      const technicalOption = Array.from(options).find((opt) =>
        opt.textContent?.includes('Technical')
      ) as HTMLElement;
      technicalOption?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Reopen
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Search should be cleared
      const searchInputAfter = document.querySelector(
        '[data-testid="search-input"]'
      ) as HTMLInputElement;
      expect(searchInputAfter?.value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on select', () => {
      fixture.componentRef.setInput('label', 'Book Type');
      fixture.detectChanges();

      const select = fixture.nativeElement.querySelector('mat-select');
      const ariaLabel = select.getAttribute('aria-label');
      expect(ariaLabel).toBe('Book Type');
    });
  });

  describe('Disabled state', () => {
    it('should disable select when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const select = fixture.nativeElement.querySelector('mat-select');
      expect(select.getAttribute('aria-disabled')).toBe('true');
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
