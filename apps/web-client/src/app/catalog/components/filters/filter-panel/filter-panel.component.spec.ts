import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { FilterPanelComponent, SearchFilters } from './filter-panel.component.js';
import { SelectOption } from '../searchable-select/searchable-select.component.js';

describe('FilterPanelComponent', () => {
  let component: FilterPanelComponent;
  let fixture: ComponentFixture<FilterPanelComponent>;

  const mockTypes: SelectOption[] = [
    { id: 'technical', name: 'Technical' },
    { id: 'fiction', name: 'Fiction' },
    { id: 'reference', name: 'Reference' },
  ];

  const mockCategories: SelectOption[] = [
    { id: 'programming', name: 'Programming' },
    { id: 'databases', name: 'Databases' },
    { id: 'devops', name: 'DevOps' },
  ];

  const mockLevels: SelectOption[] = [
    { id: 'Beginner', name: 'Beginner' },
    { id: 'Intermediate', name: 'Intermediate' },
    { id: 'Advanced', name: 'Advanced' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterPanelComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create the component', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have default empty filters', () => {
      fixture.detectChanges();
      expect(component.currentFilters()).toEqual({
        isbn: '',
        title: '',
        author: '',
        type: '',
        categories: [],
        levels: [],
        text: '',
      });
    });
  });

  describe('Filter Inputs', () => {
    it('should render ISBN text filter input', () => {
      fixture.detectChanges();
      const isbnFilter = fixture.debugElement.query(By.css('[data-testid="isbn-filter"]'));
      expect(isbnFilter).toBeTruthy();
    });

    it('should render title text filter input', () => {
      fixture.detectChanges();
      const titleFilter = fixture.debugElement.query(By.css('[data-testid="title-filter"]'));
      expect(titleFilter).toBeTruthy();
    });

    it('should render author text filter input', () => {
      fixture.detectChanges();
      const authorFilter = fixture.debugElement.query(By.css('[data-testid="author-filter"]'));
      expect(authorFilter).toBeTruthy();
    });

    it('should render type select', () => {
      fixture.detectChanges();
      const typeSelect = fixture.debugElement.query(By.css('[data-testid="type-filter"]'));
      expect(typeSelect).toBeTruthy();
    });

    it('should render categories multi-select', () => {
      fixture.detectChanges();
      const categoriesSelect = fixture.debugElement.query(
        By.css('[data-testid="categories-filter"]')
      );
      expect(categoriesSelect).toBeTruthy();
    });

    it('should render levels multi-select', () => {
      fixture.detectChanges();
      const levelsSelect = fixture.debugElement.query(By.css('[data-testid="levels-filter"]'));
      expect(levelsSelect).toBeTruthy();
    });

    it('should render semantic search textarea', () => {
      fixture.detectChanges();
      const semanticSearch = fixture.debugElement.query(
        By.css('[data-testid="semantic-search-filter"]')
      );
      expect(semanticSearch).toBeTruthy();
    });

    it('should render clear filters button', () => {
      fixture.detectChanges();
      const clearButton = fixture.debugElement.query(
        By.css('[data-testid="clear-filters-button"]')
      );
      expect(clearButton).toBeTruthy();
    });
  });

  describe('Input Options', () => {
    it('should pass types to type select', () => {
      fixture.componentRef.setInput('types', mockTypes);
      fixture.detectChanges();

      expect(component.types()).toEqual(mockTypes);
    });

    it('should pass categories to categories multi-select', () => {
      fixture.componentRef.setInput('categories', mockCategories);
      fixture.detectChanges();

      expect(component.categories()).toEqual(mockCategories);
    });

    it('should pass levels to levels multi-select', () => {
      fixture.componentRef.setInput('levels', mockLevels);
      fixture.detectChanges();

      expect(component.levels()).toEqual(mockLevels);
    });
  });

  describe('Loading States', () => {
    it('should disable type select when typesLoading is true', () => {
      fixture.componentRef.setInput('typesLoading', true);
      fixture.detectChanges();

      expect(component.typesLoading()).toBe(true);
    });

    it('should disable categories select when categoriesLoading is true', () => {
      fixture.componentRef.setInput('categoriesLoading', true);
      fixture.detectChanges();

      expect(component.categoriesLoading()).toBe(true);
    });

    it('should disable levels select when levelsLoading is true', () => {
      fixture.componentRef.setInput('levelsLoading', true);
      fixture.detectChanges();

      expect(component.levelsLoading()).toBe(true);
    });
  });

  describe('Filter Change Events', () => {
    it('should emit filtersChange when ISBN changes', async () => {
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.filtersChange, 'emit');

      component.onIsbnChange('978-0-13-468599-1');
      await fixture.whenStable();

      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ isbn: '978-0-13-468599-1' }));
    });

    it('should emit filtersChange when title changes', async () => {
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.filtersChange, 'emit');

      component.onTitleChange('Clean Code');
      await fixture.whenStable();

      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Clean Code' }));
    });

    it('should emit filtersChange when author changes', async () => {
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.filtersChange, 'emit');

      component.onAuthorChange('Robert C. Martin');
      await fixture.whenStable();

      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ author: 'Robert C. Martin' }));
    });

    it('should emit filtersChange when type changes', async () => {
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.filtersChange, 'emit');

      component.onTypeChange('technical');
      await fixture.whenStable();

      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'technical' }));
    });

    it('should emit typeChange when type changes', async () => {
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.typeChange, 'emit');

      component.onTypeChange('technical');
      await fixture.whenStable();

      expect(emitSpy).toHaveBeenCalledWith('technical');
    });

    it('should emit filtersChange when categories change', async () => {
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.filtersChange, 'emit');

      component.onCategoriesChange(['programming', 'databases']);
      await fixture.whenStable();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ categories: ['programming', 'databases'] })
      );
    });

    it('should emit filtersChange when levels change', async () => {
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.filtersChange, 'emit');

      component.onLevelsChange(['Beginner', 'Intermediate']);
      await fixture.whenStable();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ levels: ['Beginner', 'Intermediate'] })
      );
    });

    it('should emit filtersChange when semantic search changes', async () => {
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.filtersChange, 'emit');

      component.onSemanticSearchChange('books about design patterns');
      await fixture.whenStable();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'books about design patterns' })
      );
    });
  });

  describe('Type Change - Clear Dependent Filters', () => {
    it('should clear categories when type changes', async () => {
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.filtersChange, 'emit');

      // First set some categories
      component.onCategoriesChange(['programming']);
      await fixture.whenStable();
      emitSpy.mockClear();

      // Now change the type
      component.onTypeChange('fiction');
      await fixture.whenStable();

      // Should emit with only the type (categories/levels are omitted when empty)
      expect(emitSpy).toHaveBeenCalledWith({ type: 'fiction' });
      // Verify that categories and levels are cleared in the state
      expect(component.currentFilters().categories).toEqual([]);
      expect(component.currentFilters().levels).toEqual([]);
    });

    it('should clear levels when type changes', async () => {
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.filtersChange, 'emit');

      // First set some levels
      component.onLevelsChange(['Beginner']);
      await fixture.whenStable();
      emitSpy.mockClear();

      // Now change the type
      component.onTypeChange('fiction');
      await fixture.whenStable();

      // Should emit with only the type (categories/levels are omitted when empty)
      expect(emitSpy).toHaveBeenCalledWith({ type: 'fiction' });
      // Verify that categories and levels are cleared in the state
      expect(component.currentFilters().categories).toEqual([]);
      expect(component.currentFilters().levels).toEqual([]);
    });

    it('should not clear categories and levels when type is set to same value', async () => {
      fixture.detectChanges();

      // Set type first
      component.onTypeChange('technical');
      await fixture.whenStable();

      // Set categories and levels
      component.onCategoriesChange(['programming']);
      component.onLevelsChange(['Beginner']);
      await fixture.whenStable();

      // Set type to same value
      component.onTypeChange('technical');
      await fixture.whenStable();

      // Categories and levels should not be cleared
      expect(component.currentFilters().categories).toEqual(['programming']);
      expect(component.currentFilters().levels).toEqual(['Beginner']);
    });
  });

  describe('Clear Filters Button', () => {
    it('should reset all filters when clear button is clicked', async () => {
      fixture.detectChanges();

      // Set various filters
      component.onIsbnChange('978-0-13-468599-1');
      component.onTitleChange('Clean Code');
      component.onAuthorChange('Robert C. Martin');
      component.onTypeChange('technical');
      component.onCategoriesChange(['programming']);
      component.onLevelsChange(['Beginner']);
      component.onSemanticSearchChange('design patterns');
      await fixture.whenStable();

      const emitSpy = vi.spyOn(component.filtersChange, 'emit');

      // Click clear button
      component.clearFilters();
      await fixture.whenStable();

      // Component only emits non-empty values, so empty filters = {}
      expect(emitSpy).toHaveBeenCalledWith({});
    });

    it('should reset currentFilters signal to default values', async () => {
      fixture.detectChanges();

      // Set various filters
      component.onTitleChange('Clean Code');
      component.onTypeChange('technical');
      await fixture.whenStable();

      component.clearFilters();
      await fixture.whenStable();

      expect(component.currentFilters()).toEqual({
        isbn: '',
        title: '',
        author: '',
        type: '',
        categories: [],
        levels: [],
        text: '',
      });
    });

    it('should emit typeChange with empty string when clearing filters', async () => {
      fixture.detectChanges();
      component.onTypeChange('technical');
      await fixture.whenStable();

      const emitSpy = vi.spyOn(component.typeChange, 'emit');
      component.clearFilters();
      await fixture.whenStable();

      expect(emitSpy).toHaveBeenCalledWith('');
    });
  });

  describe('hasActiveFilters Computed', () => {
    it('should return false when no filters are set', () => {
      fixture.detectChanges();
      expect(component.hasActiveFilters()).toBe(false);
    });

    it('should return true when isbn is set', async () => {
      fixture.detectChanges();
      component.onIsbnChange('978-0-13-468599-1');
      await fixture.whenStable();
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should return true when title is set', async () => {
      fixture.detectChanges();
      component.onTitleChange('Clean Code');
      await fixture.whenStable();
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should return true when author is set', async () => {
      fixture.detectChanges();
      component.onAuthorChange('Robert Martin');
      await fixture.whenStable();
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should return true when type is set', async () => {
      fixture.detectChanges();
      component.onTypeChange('technical');
      await fixture.whenStable();
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should return true when categories are set', async () => {
      fixture.detectChanges();
      component.onCategoriesChange(['programming']);
      await fixture.whenStable();
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should return true when levels are set', async () => {
      fixture.detectChanges();
      component.onLevelsChange(['Beginner']);
      await fixture.whenStable();
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should return true when semantic search is set', async () => {
      fixture.detectChanges();
      component.onSemanticSearchChange('design patterns');
      await fixture.whenStable();
      expect(component.hasActiveFilters()).toBe(true);
    });
  });

  describe('Disabled State', () => {
    it('should disable all inputs when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      expect(component.disabled()).toBe(true);
    });

    it('should disable clear button when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const clearButton = fixture.debugElement.query(
        By.css('[data-testid="clear-filters-button"]')
      );
      expect(clearButton.nativeElement.disabled).toBe(true);
    });
  });

  describe('External Value Sync', () => {
    it('should sync filters when value input changes', async () => {
      const externalFilters: SearchFilters = {
        isbn: '978-0-13-468599-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        type: 'technical',
        categories: ['programming'],
        levels: ['Intermediate'],
        text: 'best practices',
      };

      fixture.componentRef.setInput('value', externalFilters);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.currentFilters()).toEqual(externalFilters);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible panel with role region', () => {
      fixture.detectChanges();
      const panel = fixture.debugElement.query(By.css('[data-testid="filter-panel"]'));
      expect(panel.nativeElement.getAttribute('role')).toBe('region');
    });

    it('should have aria-label on clear button', () => {
      fixture.detectChanges();
      const clearButton = fixture.debugElement.query(
        By.css('[data-testid="clear-filters-button"]')
      );
      expect(clearButton.nativeElement.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
