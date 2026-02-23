import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BookCardComponent } from './book-card.component';
import { Book } from '../../../../core/models/index';

describe('BookCardComponent', () => {
  let component: BookCardComponent;
  let fixture: ComponentFixture<BookCardComponent>;

  const mockBook: Book = {
    id: '1',
    isbn: '978-0132350884',
    title: 'Clean Code',
    authors: [{ id: 'a1', name: 'Robert C. Martin' }],
    type: 'Technical',
    categories: [
      { id: 'c1', name: 'Programming' },
      { id: 'c2', name: 'Best Practices' },
    ],
    level: 'Intermediate',
    format: 'pdf',
    language: 'en',
    description: 'A handbook of agile software craftsmanship.',
    originalDescription: 'A handbook of agile software craftsmanship.',
    available: true,
    similarityScore: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookCardComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(BookCardComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Book display', () => {
    it('should display book title', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.book-card-title');
      expect(title.textContent.trim()).toBe('Clean Code');
    });

    it('should display book authors', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const authors = fixture.nativeElement.querySelector('.book-card-authors');
      expect(authors.textContent).toContain('Robert C. Martin');
    });

    it('should display multiple authors separated by comma', () => {
      const multiAuthorBook: Book = {
        ...mockBook,
        authors: [
          { id: 'a1', name: 'Author 1' },
          { id: 'a2', name: 'Author 2' },
        ],
      };
      fixture.componentRef.setInput('book', multiAuthorBook);
      fixture.detectChanges();

      const authors = fixture.nativeElement.querySelector('.book-card-authors');
      expect(authors.textContent).toContain('Author 1');
      expect(authors.textContent).toContain('Author 2');
    });

    it('should display book categories', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const categories = fixture.nativeElement.querySelector('app-category-chips');
      expect(categories).toBeTruthy();
    });

    it('should display book level badge', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const level = fixture.nativeElement.querySelector('app-level-badge');
      expect(level).toBeTruthy();
    });

    it('should display format icon', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const format = fixture.nativeElement.querySelector('app-format-icon');
      expect(format).toBeTruthy();
    });

    it('should display language flag', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const language = fixture.nativeElement.querySelector('app-language-flag');
      expect(language).toBeTruthy();
    });

    it('should display truncated description', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const description = fixture.nativeElement.querySelector('app-truncated-text');
      expect(description).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('should emit select event when card is clicked', () => {
      const selectSpy = vi.fn();
      component.select.subscribe(selectSpy);

      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.book-card');
      card.click();

      expect(selectSpy).toHaveBeenCalledWith(mockBook);
    });

    it('should emit sendToKindle event when kindle button is clicked', () => {
      const kindleSpy = vi.fn();
      component.sendToKindle.subscribe(kindleSpy);

      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const kindleButton = fixture.nativeElement.querySelector('[aria-label="Send to Kindle"]');
      kindleButton.click();

      expect(kindleSpy).toHaveBeenCalledWith(mockBook);
    });

    it('should stop propagation when kindle button is clicked', () => {
      const selectSpy = vi.fn();
      component.select.subscribe(selectSpy);

      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const kindleButton = fixture.nativeElement.querySelector('[aria-label="Send to Kindle"]');
      kindleButton.click();

      // Select should not be called
      expect(selectSpy).not.toHaveBeenCalled();
    });
  });

  describe('Selected state', () => {
    it('should apply selected class when selected is true', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.componentRef.setInput('selected', true);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.book-card');
      expect(card.classList.contains('selected')).toBe(true);
    });

    it('should not apply selected class by default', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.book-card');
      expect(card.classList.contains('selected')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have article role', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.book-card');
      expect(card.getAttribute('role')).toBe('article');
    });

    it('should have aria-label with book title', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.book-card');
      expect(card.getAttribute('aria-label')).toContain('Clean Code');
    });

    it('should be keyboard focusable', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.book-card');
      expect(card.getAttribute('tabindex')).toBe('0');
    });
  });
});
