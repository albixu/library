import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { BookCoverCardComponent } from './book-cover-card.component.js';
import { Book } from '../../../../core/models/index.js';
import { FavoriteService } from '../../../../books/services/favorite.service.js';
import { AuthService } from '../../../../auth/auth.service.js';

describe('BookCoverCardComponent', () => {
  let component: BookCoverCardComponent;
  let fixture: ComponentFixture<BookCoverCardComponent>;

  const mockBook: Book = {
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
  };

  const mockFavoriteService = { toggle: vi.fn() };
  const mockAuthService = { currentUser: signal<{ id: string } | null>(null) };

  beforeEach(async () => {
    mockFavoriteService.toggle.mockReset();
    mockAuthService.currentUser.set(null);

    await TestBed.configureTestingModule({
      imports: [BookCoverCardComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: FavoriteService, useValue: mockFavoriteService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookCoverCardComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  });

  describe('Book display', () => {
    it('should display title', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.book-title');
      expect(title.textContent.trim()).toBe('Clean Code');
    });

    it('should display author name', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const author = fixture.nativeElement.querySelector('.book-author');
      expect(author.textContent).toContain('Robert C. Martin');
    });

    it('should display isbn when present', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const isbn = fixture.nativeElement.querySelector('.book-isbn');
      expect(isbn).toBeTruthy();
      expect(isbn.textContent).toContain('978-0132350884');
    });

    it('should not display isbn when null', () => {
      const bookNoIsbn: Book = { ...mockBook, isbn: null };
      fixture.componentRef.setInput('book', bookNoIsbn);
      fixture.detectChanges();

      const isbn = fixture.nativeElement.querySelector('.book-isbn');
      expect(isbn).toBeNull();
    });
  });

  describe('Language badge', () => {
    it('should show language badge with code and flag', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.language-badge');
      expect(badge).toBeTruthy();

      const code = badge.querySelector('.lang-code');
      expect(code.textContent.trim()).toBe('EN');

      const flag = badge.querySelector('.lang-flag');
      expect(flag.textContent.trim()).toBe('🇬🇧');
    });

    it('should show correct flag for Spanish', () => {
      const esBook: Book = { ...mockBook, language: 'es' };
      fixture.componentRef.setInput('book', esBook);
      fixture.detectChanges();

      const flag = fixture.nativeElement.querySelector('.lang-flag');
      expect(flag.textContent.trim()).toBe('🇪🇸');
    });

    it('should show no flag for unknown language', () => {
      const unknownBook: Book = { ...mockBook, language: 'xx' };
      fixture.componentRef.setInput('book', unknownBook);
      fixture.detectChanges();

      const flag = fixture.nativeElement.querySelector('.lang-flag');
      expect(flag.textContent.trim()).toBe('');
    });
  });

  describe('Send to Kindle button', () => {
    it('should show Send to Kindle button when available is true', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('[aria-label="Enviar a Kindle"]');
      expect(btn).toBeTruthy();
    });

    it('should hide Send to Kindle button when available is false', () => {
      const unavailableBook: Book = { ...mockBook, available: false };
      fixture.componentRef.setInput('book', unavailableBook);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('[aria-label="Enviar a Kindle"]');
      expect(btn).toBeNull();
    });

    it('should emit sendToKindle output when button is clicked', () => {
      const spy = vi.fn();
      component.sendToKindle.subscribe(spy);

      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('[aria-label="Enviar a Kindle"]');
      btn.click();

      expect(spy).toHaveBeenCalledWith(mockBook);
    });

    it('should not emit sendToKindle when clicking the card body', () => {
      const spy = vi.fn();
      component.sendToKindle.subscribe(spy);

      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const body = fixture.nativeElement.querySelector('.card-body');
      body.click();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Cover image', () => {
    it('should show placeholder when coverUrl is undefined', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const placeholder = fixture.nativeElement.querySelector('.cover-placeholder');
      expect(placeholder).toBeTruthy();

      const img = fixture.nativeElement.querySelector('img.cover-img');
      expect(img).toBeNull();
    });

    it('should show img element when coverUrl is provided', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.componentRef.setInput('coverUrl', 'https://example.com/cover.jpg');
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img.cover-img');
      expect(img).toBeTruthy();
      expect(img.src).toContain('https://example.com/cover.jpg');

      const placeholder = fixture.nativeElement.querySelector('.cover-placeholder');
      expect(placeholder).toBeNull();
    });
  });

  describe('Favorite button (Fix 1)', () => {
    it('should show favorite button when authenticated', () => {
      mockAuthService.currentUser.set({ id: 'user1' });
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.favorite-btn');
      expect(btn).toBeTruthy();
    });

    it('should not show favorite button when not authenticated', () => {
      mockAuthService.currentUser.set(null);
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.favorite-btn');
      expect(btn).toBeNull();
    });

    it('should show favorite_border icon when book.favorite is false', () => {
      mockAuthService.currentUser.set({ id: 'user1' });
      const bookNotFavorite: Book = { ...mockBook, favorite: false };
      fixture.componentRef.setInput('book', bookNotFavorite);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.favorite-btn');
      const icon = btn.querySelector('.material-symbols-outlined');
      expect(icon.textContent.trim()).toBe('favorite_border');
    });

    it('should show favorite icon when book.favorite is true', () => {
      mockAuthService.currentUser.set({ id: 'user1' });
      const bookFavorite: Book = { ...mockBook, favorite: true };
      fixture.componentRef.setInput('book', bookFavorite);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.favorite-btn');
      const icon = btn.querySelector('.material-symbols-outlined');
      expect(icon.textContent.trim()).toBe('favorite');
    });

    it('should call FavoriteService.toggle and emit favoriteToggle on click', () => {
      mockAuthService.currentUser.set({ id: 'user1' });
      mockFavoriteService.toggle.mockReturnValue(of({ data: { favorite: true } }));

      const spy = vi.fn();
      component.favoriteToggle.subscribe(spy);

      fixture.componentRef.setInput('book', { ...mockBook, favorite: false });
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.favorite-btn');
      btn.click();

      expect(mockFavoriteService.toggle).toHaveBeenCalledWith(mockBook.id);
      expect(spy).toHaveBeenCalledWith({
        book: expect.objectContaining({ id: mockBook.id }),
        favorite: true,
      });
    });

    it('should revert optimistic update on error', () => {
      mockAuthService.currentUser.set({ id: 'user1' });
      mockFavoriteService.toggle.mockReturnValue(throwError(() => new Error('Network error')));

      const bookNotFavorite: Book = { ...mockBook, favorite: false };
      fixture.componentRef.setInput('book', bookNotFavorite);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.favorite-btn');
      btn.click();
      fixture.detectChanges();

      // After error, should revert to original state (false → favorite_border)
      expect(component.getEffectiveFavorite()).toBe(false);
      expect(component.pendingFavorite()).toBe(false);
    });
  });

  describe('Info button emits showDescription (Fix 2)', () => {
    it('should emit showDescription with the book when info button is clicked', () => {
      const spy = vi.fn();
      component.showDescription.subscribe(spy);

      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('.info-btn');
      btn.click();

      expect(spy).toHaveBeenCalledWith(mockBook);
    });
  });

  describe('Categories (Fix 3)', () => {
    it('should render category chips when book has categories', () => {
      fixture.componentRef.setInput('book', mockBook);
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('.categories-row');
      expect(row).toBeTruthy();
    });

    it('should not render categories row when book has no categories', () => {
      const bookNoCategories: Book = { ...mockBook, categories: [] };
      fixture.componentRef.setInput('book', bookNoCategories);
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('.categories-row');
      expect(row).toBeNull();
    });
  });
});
