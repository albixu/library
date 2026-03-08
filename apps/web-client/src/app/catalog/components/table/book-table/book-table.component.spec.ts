import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookTableComponent } from './book-table.component';
import { Book } from '../../../../core/models/index';

describe('BookTableComponent', () => {
  let component: BookTableComponent;
  let fixture: ComponentFixture<BookTableComponent>;

  const mockBooks: Book[] = [
    {
      id: '1',
      isbn: '978-0132350884',
      title: 'Clean Code',
      authors: [{ id: 'a1', name: 'Robert C. Martin' }],
      type: 'Technical',
      categories: [{ id: 'c1', name: 'Programming' }],
      level: 'Intermediate',
      format: 'pdf',
      language: 'en',
      description: 'A handbook of agile software craftsmanship.',
      originalDescription: 'A handbook of agile software craftsmanship.',
      available: true,
      similarityScore: null,
    },
    {
      id: '2',
      isbn: '978-0201616224',
      title: 'The Pragmatic Programmer',
      authors: [
        { id: 'a2', name: 'David Thomas' },
        { id: 'a3', name: 'Andrew Hunt' },
      ],
      type: 'Technical',
      categories: [
        { id: 'c1', name: 'Programming' },
        { id: 'c2', name: 'Career' },
      ],
      level: 'Advanced',
      format: 'epub',
      language: 'en',
      description: 'Your journey to mastery.',
      originalDescription: 'Your journey to mastery.',
      available: true,
      similarityScore: null,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookTableComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have empty books by default', () => {
      fixture.detectChanges();
      expect(component.books()).toEqual([]);
    });
  });

  describe('Table structure', () => {
    it('should render table element', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeTruthy();
    });

    it('should render header row', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const headerRow = fixture.nativeElement.querySelector('thead tr');
      expect(headerRow).toBeTruthy();
    });

    it('should render correct number of data rows', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr.book-row');
      expect(rows.length).toBe(2);
    });
  });

  describe('Column display', () => {
    it('should display all header columns', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const headers = fixture.nativeElement.querySelectorAll('th');
      // TODO: Update to 8 when Actions column is re-enabled (HU-035)
      expect(headers.length).toBe(7); // ISBN, Book Details, Type/Category, Lang, Level, Format, Description
    });

    it('should display book title in cell', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const titleCell = fixture.nativeElement.querySelector('.book-title');
      expect(titleCell.textContent).toContain('Clean Code');
    });

    it('should display authors in cell', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const authorCells = fixture.nativeElement.querySelectorAll('.book-author');
      expect(authorCells[0].textContent).toContain('Robert C. Martin');
      expect(authorCells[1].textContent).toContain('David Thomas, Andrew Hunt');
    });

    it('should display ISBN in cell', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const isbnCell = fixture.nativeElement.querySelector('.isbn-text');
      expect(isbnCell.textContent).toContain('978-0132350884');
    });

    it('should display format in cell', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const formatCells = fixture.nativeElement.querySelectorAll('.format-text');
      expect(formatCells[0].textContent).toBe('pdf');
      expect(formatCells[1].textContent).toBe('epub');
    });
  });

  describe('Data display components', () => {
    it('should render level badge for each book', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const levelBadges = fixture.nativeElement.querySelectorAll('app-level-badge');
      expect(levelBadges.length).toBe(2);
    });

    it('should render language flag for each book', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const languageFlags = fixture.nativeElement.querySelectorAll('app-language-flag');
      expect(languageFlags.length).toBe(2);
    });

    it('should render category chips for each book', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const categoryChips = fixture.nativeElement.querySelectorAll('app-category-chips');
      expect(categoryChips.length).toBe(2);
    });

    it('should render description icon button for books with description', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const descriptionButtons = fixture.nativeElement.querySelectorAll('[aria-label="Ver descripción"]');
      expect(descriptionButtons.length).toBe(2);
    });

    it('should render book description dialog component', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const dialog = fixture.nativeElement.querySelector('app-book-description-dialog');
      expect(dialog).toBeTruthy();
    });
  });

  // TODO: Restore these tests when the Kindle flow is integrated in the MVP (HU-035)
  describe('Actions', () => {
    it('should not render send to kindle button while Kindle flow is not implemented', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const kindleButtons = fixture.nativeElement.querySelectorAll('[aria-label="Send to Kindle"]');
      expect(kindleButtons.length).toBe(0);
    });

    it('should open description dialog when description button is clicked', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const dialogSpy = vi.spyOn(component.descriptionDialog(), 'open');
      const descriptionButton = fixture.nativeElement.querySelector('[aria-label="Ver descripción"]');
      descriptionButton.click();

      expect(dialogSpy).toHaveBeenCalledWith(mockBooks[0].title, mockBooks[0].description);
    });

    it('should not propagate click event when description button is clicked', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const rowClickSpy = vi.fn();
      component.rowClick.subscribe(rowClickSpy);

      const descriptionButton = fixture.nativeElement.querySelector('[aria-label="Ver descripción"]');
      descriptionButton.click();

      expect(rowClickSpy).not.toHaveBeenCalled();
    });

    it('should emit rowClick event when row is clicked', () => {
      const rowClickSpy = vi.fn();
      component.rowClick.subscribe(rowClickSpy);

      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('tbody tr.book-row');
      row.click();

      expect(rowClickSpy).toHaveBeenCalledWith(mockBooks[0]);
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no books', () => {
      fixture.componentRef.setInput('books', []);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('app-empty-state');
      expect(emptyState).toBeTruthy();
    });

    it('should hide table when no books', () => {
      fixture.componentRef.setInput('books', []);
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeFalsy();
    });
  });

  describe('Loading state', () => {
    it('should show loading overlay when loading is true', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const loadingOverlay = fixture.nativeElement.querySelector('app-loading-overlay');
      expect(loadingOverlay).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have table aria-label', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('table');
      expect(table.getAttribute('aria-label')).toBe('Libros');
    });

    it('should have clickable rows with proper tabindex', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('tbody tr.book-row');
      expect(row.getAttribute('tabindex')).toBe('0');
    });

    it('should have keyboard navigation support on rows', () => {
      const rowClickSpy = vi.fn();
      component.rowClick.subscribe(rowClickSpy);

      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('tbody tr.book-row');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      row.dispatchEvent(enterEvent);

      expect(rowClickSpy).toHaveBeenCalledWith(mockBooks[0]);
    });
  });
});
