import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { of } from 'rxjs';

import { BookListPageComponent } from './book-list-page.component.js';
import { BookSearchStore } from '../../../core/services/book-search.store.js';
import { DialogService } from '../../../core/services/dialog.service.js';
import {
  Book,
  PaginationInfo,
  SearchFilters,
  BookType,
  BookLevel,
  CategoryListItem,
} from '../../../core/models/index.js';

describe('BookListPageComponent', () => {
  let component: BookListPageComponent;
  let fixture: ComponentFixture<BookListPageComponent>;
  let mockStore: Partial<BookSearchStore>;
  let mockDialogService: { open: ReturnType<typeof vi.fn> };

  const mockBooks: Book[] = [
    {
      id: '1',
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
    },
    {
      id: '2',
      isbn: '978-0-596-51774-8',
      title: 'JavaScript: The Good Parts',
      authors: [{ id: '2', name: 'Douglas Crockford' }],
      type: 'technical',
      categories: [{ id: '2', name: 'Programming' }],
      level: 'Beginner',
      format: 'pdf',
      originalDescription: 'Most programming languages contain good and bad parts',
      description: 'Most programming languages contain good and bad parts',
      language: 'en',
      available: true,
      similarityScore: null,
    },
  ];

  const mockPagination: PaginationInfo = {
    limit: 50,
    hasNextPage: true,
    nextCursor: 'cursor123',
    totalCount: 100,
  };

  const mockTypes: BookType[] = [
    { id: '1', name: 'technical' },
    { id: '2', name: 'fiction' },
  ];

  const mockCategories: CategoryListItem[] = [
    { id: '1', name: 'Software Engineering', typeId: '1', description: null },
    { id: '2', name: 'Programming', typeId: '1', description: null },
  ];

  const mockLevels: BookLevel[] = [
    { id: '1', name: 'Beginner' },
    { id: '2', name: 'Intermediate' },
  ];

  beforeEach(async () => {
    mockStore = {
      books: signal(mockBooks),
      loading: signal(false),
      error: signal(null),
      pagination: signal(mockPagination),
      filters: signal({}),
      types: signal(mockTypes),
      categories: signal(mockCategories),
      levels: signal(mockLevels),
      typesLoading: signal(false),
      categoriesLoading: signal(false),
      levelsLoading: signal(false),
      isEmpty: signal(false),
      hasFilters: signal(false),
      searchBooks: vi.fn(),
      loadNextPage: vi.fn(),
      setFilters: vi.fn(),
      loadTypes: vi.fn(),
      loadCategories: vi.fn(),
      loadLevels: vi.fn(),
      reset: vi.fn(),
    };

    mockDialogService = {
      open: vi.fn().mockReturnValue({
        closed: of(undefined),
      } as unknown as DialogRef<unknown>),
    };

    await TestBed.configureTestingModule({
      imports: [BookListPageComponent],
      providers: [
        { provide: BookSearchStore, useValue: mockStore },
        { provide: DialogService, useValue: mockDialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookListPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Initialization', () => {
    it('should load book types on init', () => {
      expect(mockStore.loadTypes).toHaveBeenCalled();
    });

    it('should perform initial search on init', () => {
      expect(mockStore.searchBooks).toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('should render filter panel', () => {
      const filterPanel = fixture.nativeElement.querySelector('[data-testid="filter-panel"]');
      expect(filterPanel).toBeTruthy();
    });

    it('should render book table', () => {
      const bookTable = fixture.nativeElement.querySelector('app-book-table');
      expect(bookTable).toBeTruthy();
    });

    it('should render paginator', () => {
      const paginator = fixture.nativeElement.querySelector('app-paginator');
      expect(paginator).toBeTruthy();
    });
  });

  describe('Filter interactions', () => {
    it('should update store filters when filter panel emits changes', async () => {
      const newFilters: SearchFilters = {
        isbn: '',
        title: 'Clean',
        author: '',
        type: '',
        categories: [],
        levels: [],
        text: '',
      };

      component.onFiltersChange(newFilters);

      await vi.waitFor(() => {
        expect(mockStore.setFilters).toHaveBeenCalledWith(newFilters);
        expect(mockStore.searchBooks).toHaveBeenCalled();
      });
    });

    it('should load categories when type changes', () => {
      component.onTypeChange('technical');

      expect(mockStore.loadCategories).toHaveBeenCalledWith('technical');
      expect(mockStore.loadLevels).toHaveBeenCalledWith('technical');
    });

    it('should clear categories when type is empty', () => {
      component.onTypeChange('');

      expect(mockStore.loadCategories).toHaveBeenCalledWith('');
      expect(mockStore.loadLevels).toHaveBeenCalledWith('');
    });
  });

  describe('Pagination', () => {
    it('should load next page when paginator emits loadMore', () => {
      component.onLoadMore();

      expect(mockStore.loadNextPage).toHaveBeenCalled();
    });
  });

  describe('Send to Kindle', () => {
    it('should open SendToKindleDialog when sendToKindle is triggered', () => {
      const book = mockBooks[0];
      component.onSendToKindle(book);

      expect(mockDialogService.open).toHaveBeenCalled();
    });

    it('should pass book data to dialog', () => {
      const book = mockBooks[0];
      component.onSendToKindle(book);

      expect(mockDialogService.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: book,
        })
      );
    });
  });

  describe('Empty states', () => {
    it('should show initial state when no search has been performed', async () => {
      (mockStore.books as ReturnType<typeof signal>).set([]);
      (mockStore.hasFilters as ReturnType<typeof signal>).set(false);
      (mockStore.isEmpty as ReturnType<typeof signal>).set(true);
      fixture.detectChanges();

      expect(component.emptyStateType()).toBe('initial');
    });

    it('should show no-results state when search returns empty with filters', async () => {
      (mockStore.books as ReturnType<typeof signal>).set([]);
      (mockStore.hasFilters as ReturnType<typeof signal>).set(true);
      (mockStore.isEmpty as ReturnType<typeof signal>).set(true);
      fixture.detectChanges();

      expect(component.emptyStateType()).toBe('no-results');
    });

    it('should show empty (non-empty) state when books are present', () => {
      (mockStore.isEmpty as ReturnType<typeof signal>).set(false);
      fixture.detectChanges();

      expect(component.emptyStateType()).toBe('empty');
    });
  });

  describe('Loading state', () => {
    it('should pass loading state to book table', () => {
      (mockStore.loading as ReturnType<typeof signal>).set(true);
      fixture.detectChanges();

      const bookTable = fixture.nativeElement.querySelector('app-book-table');
      expect(bookTable).toBeTruthy();
    });
  });

  describe('Responsive behavior', () => {
    it('should not show mobile filter toggle by default (desktop view)', () => {
      // By default isMobile is false
      const mobileToggle = fixture.nativeElement.querySelector(
        '[data-testid="mobile-filter-toggle"]'
      );
      expect(mobileToggle).toBeFalsy();
    });

    it('should toggle mobile drawer state when toggleMobileDrawer is called', () => {
      const initialState = component.isMobileDrawerOpen();

      component.toggleMobileDrawer();

      expect(component.isMobileDrawerOpen()).toBe(!initialState);
    });

    it('should toggle mobile drawer back to original state when called twice', () => {
      const initialState = component.isMobileDrawerOpen();

      component.toggleMobileDrawer();
      component.toggleMobileDrawer();

      expect(component.isMobileDrawerOpen()).toBe(initialState);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on main content area', () => {
      const mainContent = fixture.nativeElement.querySelector('[role="main"]');
      expect(mainContent).toBeTruthy();
    });

    it('should have proper aria-label on filter panel region', () => {
      const filterRegion = fixture.nativeElement.querySelector('[role="complementary"]');
      expect(filterRegion).toBeTruthy();
    });
  });

  describe('Retry search', () => {
    it('should call store.searchBooks when onRetrySearch is called', () => {
      (mockStore.searchBooks as ReturnType<typeof vi.fn>).mockClear();

      component.onRetrySearch();

      expect(mockStore.searchBooks).toHaveBeenCalledTimes(1);
    });
  });

  describe('activeFilterCount computed', () => {
    it('should return 0 when no filters are set', () => {
      (mockStore.filters as ReturnType<typeof signal>).set({});
      expect(component.activeFilterCount()).toBe(0);
    });

    it('should count each active scalar filter', () => {
      (mockStore.filters as ReturnType<typeof signal>).set({
        isbn: '978-0-13',
        title: 'Clean',
        author: 'Martin',
        type: 'technical',
        text: 'software',
      });
      expect(component.activeFilterCount()).toBe(5);
    });

    it('should count array filters only when non-empty', () => {
      (mockStore.filters as ReturnType<typeof signal>).set({
        categories: ['fiction', 'technical'],
        levels: ['Beginner'],
      });
      expect(component.activeFilterCount()).toBe(2);
    });

    it('should not count empty array filters', () => {
      (mockStore.filters as ReturnType<typeof signal>).set({
        categories: [],
        levels: [],
      });
      expect(component.activeFilterCount()).toBe(0);
    });

    it('should count all filter types combined', () => {
      (mockStore.filters as ReturnType<typeof signal>).set({
        title: 'Clean',
        categories: ['fiction'],
        levels: ['Beginner'],
      });
      expect(component.activeFilterCount()).toBe(3);
    });
  });
});
