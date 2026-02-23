import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BookTableComponent } from './book-table.component';
import { Book } from '../book-card/book-card.component';

describe('BookTableComponent', () => {
  let component: BookTableComponent;
  let fixture: ComponentFixture<BookTableComponent>;

  const mockBooks: Book[] = [
    {
      id: '1',
      title: 'Clean Code',
      authors: ['Robert C. Martin'],
      categories: ['Programming'],
      level: 'Intermediate',
      format: 'PDF',
      language: 'en',
      description: 'A handbook of agile software craftsmanship.',
    },
    {
      id: '2',
      title: 'The Pragmatic Programmer',
      authors: ['David Thomas', 'Andrew Hunt'],
      categories: ['Programming', 'Career'],
      level: 'Advanced',
      format: 'EPUB',
      language: 'en',
      description: 'Your journey to mastery.',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookTableComponent, NoopAnimationsModule],
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

      const headerRow = fixture.nativeElement.querySelector('tr.mat-mdc-header-row');
      expect(headerRow).toBeTruthy();
    });

    it('should render correct number of data rows', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
      expect(rows.length).toBe(2);
    });
  });

  describe('Column display', () => {
    it('should display title column', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const titleHeader = fixture.nativeElement.querySelector('th.mat-column-title');
      expect(titleHeader).toBeTruthy();
    });

    it('should display authors column', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const authorsHeader = fixture.nativeElement.querySelector('th.mat-column-authors');
      expect(authorsHeader).toBeTruthy();
    });

    it('should display book title in cell', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const titleCell = fixture.nativeElement.querySelector('td.mat-column-title');
      expect(titleCell.textContent).toContain('Clean Code');
    });

    it('should display authors in cell', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const authorsCells = fixture.nativeElement.querySelectorAll('td.mat-column-authors');
      expect(authorsCells[1].textContent).toContain('David Thomas');
    });
  });

  describe('Data display components', () => {
    it('should render level badge for each book', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const levelBadges = fixture.nativeElement.querySelectorAll('app-level-badge');
      expect(levelBadges.length).toBe(2);
    });

    it('should render format icon for each book', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const formatIcons = fixture.nativeElement.querySelectorAll('app-format-icon');
      expect(formatIcons.length).toBe(2);
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
  });

  describe('Actions', () => {
    it('should render send to kindle button for each row', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const kindleButtons = fixture.nativeElement.querySelectorAll('[aria-label="Send to Kindle"]');
      expect(kindleButtons.length).toBe(2);
    });

    it('should emit sendToKindle event when kindle button is clicked', () => {
      const kindleSpy = vi.fn();
      component.sendToKindle.subscribe(kindleSpy);

      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const kindleButton = fixture.nativeElement.querySelector('[aria-label="Send to Kindle"]');
      kindleButton.click();

      expect(kindleSpy).toHaveBeenCalledWith(mockBooks[0]);
    });

    it('should emit rowClick event when row is clicked', () => {
      const rowClickSpy = vi.fn();
      component.rowClick.subscribe(rowClickSpy);

      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('tr.mat-mdc-row');
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
      expect(table.getAttribute('aria-label')).toBe('Books');
    });

    it('should have clickable rows with proper role', () => {
      fixture.componentRef.setInput('books', mockBooks);
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('tr.mat-mdc-row');
      expect(row.getAttribute('tabindex')).toBe('0');
    });
  });
});
