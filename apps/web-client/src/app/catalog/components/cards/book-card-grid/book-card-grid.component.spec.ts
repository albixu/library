import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { BookCardGridComponent } from './book-card-grid.component.js';
import { Book } from '../../../../core/models/index.js';
import { FavoriteService } from '../../../../books/services/favorite.service.js';
import { AuthService } from '../../../../auth/auth.service.js';

const makeBook = (id: string, available = true): Book => ({
  id,
  isbn: `isbn-${id}`,
  title: `Book ${id}`,
  authors: [{ id: 'a1', name: 'Author One' }],
  type: 'Technical',
  categories: [{ id: 'c1', name: 'Programming' }],
  level: 'Beginner',
  format: 'pdf',
  language: 'en',
  description: 'Description',
  originalDescription: 'Description',
  available,
  similarityScore: null,
});

describe('BookCardGridComponent', () => {
  let component: BookCardGridComponent;
  let fixture: ComponentFixture<BookCardGridComponent>;

  const mockFavoriteService = { toggle: vi.fn() };
  const mockAuthService = { currentUser: signal<null>(null) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookCardGridComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: FavoriteService, useValue: mockFavoriteService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookCardGridComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('books', []);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Grid structure', () => {
    it('should have role="list" on the grid container', () => {
      fixture.componentRef.setInput('books', []);
      fixture.detectChanges();

      const grid = fixture.nativeElement.querySelector('[role="list"]');
      expect(grid).toBeTruthy();
    });

    it('should render one listitem per book', () => {
      const books = [makeBook('1'), makeBook('2'), makeBook('3')];
      fixture.componentRef.setInput('books', books);
      fixture.detectChanges();

      const items = fixture.nativeElement.querySelectorAll('.book-card-grid > [role="listitem"]');
      expect(items.length).toBe(3);
    });

    it('should render one book-cover-card per book', () => {
      const books = [makeBook('1'), makeBook('2')];
      fixture.componentRef.setInput('books', books);
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('app-book-cover-card');
      expect(cards.length).toBe(2);
    });

    it('should show empty message when books array is empty', () => {
      fixture.componentRef.setInput('books', []);
      fixture.detectChanges();

      const msg = fixture.nativeElement.querySelector('.empty-message');
      expect(msg).toBeTruthy();
      expect(msg.textContent).toContain('No se encontraron libros');
    });

    it('should not show empty message when there are books', () => {
      fixture.componentRef.setInput('books', [makeBook('1')]);
      fixture.detectChanges();

      const msg = fixture.nativeElement.querySelector('.empty-message');
      expect(msg).toBeNull();
    });
  });

  describe('bookSelect output', () => {
    it('should emit bookSelect when a grid item is clicked', () => {
      const spy = vi.fn();
      component.bookSelect.subscribe(spy);

      const books = [makeBook('1'), makeBook('2')];
      fixture.componentRef.setInput('books', books);
      fixture.detectChanges();

      const firstItem = fixture.nativeElement.querySelector('.book-card-grid > [role="listitem"]');
      firstItem.click();

      expect(spy).toHaveBeenCalledWith(books[0]);
    });

    it('should emit the correct book when second item is clicked', () => {
      const spy = vi.fn();
      component.bookSelect.subscribe(spy);

      const books = [makeBook('1'), makeBook('2')];
      fixture.componentRef.setInput('books', books);
      fixture.detectChanges();

      const items = fixture.nativeElement.querySelectorAll('.book-card-grid > [role="listitem"]');
      items[1].click();

      expect(spy).toHaveBeenCalledWith(books[1]);
    });
  });

  describe('showDescription (Fix 2 — dialog in grid)', () => {
    it('should call descriptionDialog().open() when a card emits showDescription', () => {
      mockAuthService.currentUser.set(null);
      const book = makeBook('1');
      fixture.componentRef.setInput('books', [book]);
      fixture.detectChanges();

      const openSpy = vi.spyOn(component.descriptionDialog(), 'open');

      // Simulate card emitting showDescription by calling onShowDescription directly
      component.onShowDescription(book);

      expect(openSpy).toHaveBeenCalledWith(book.title, book.description);
    });
  });

  describe('sendToKindle output', () => {
    it('should emit sendToKindle when card emits it', () => {
      const spy = vi.fn();
      component.sendToKindle.subscribe(spy);

      const book = makeBook('1', true);
      fixture.componentRef.setInput('books', [book]);
      fixture.detectChanges();

      const kindleBtn = fixture.nativeElement.querySelector('[aria-label="Enviar a Kindle"]');
      expect(kindleBtn).toBeTruthy();
      kindleBtn.click();

      expect(spy).toHaveBeenCalledWith(book);
    });
  });
});
