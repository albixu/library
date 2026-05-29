import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';

import { RecommendationsPageComponent } from './recommendations-page.component.js';
import {
  RecommendationsService,
  RecommendationsResponse,
} from '../data-access/recommendations.service.js';
import { DialogService } from '../../core/services/dialog.service.js';
import { AuthService } from '../../auth/auth.service.js';
import { FavoriteService } from '../../books/services/favorite.service.js';

describe('RecommendationsPageComponent', () => {
  let component: RecommendationsPageComponent;
  let fixture: ComponentFixture<RecommendationsPageComponent>;
  let mockService: { getRecommendations: ReturnType<typeof vi.fn> };
  let mockDialogService: { open: ReturnType<typeof vi.fn> };
  let mockAuthService: { currentUser: ReturnType<typeof vi.fn> };
  let mockFavoriteService: { toggle: ReturnType<typeof vi.fn> };

  const mockResponse: RecommendationsResponse = {
    label: 'Programación',
    items: [
      {
        bookId: 'book-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        coverUrl: 'https://example.com/cover.jpg',
        similarity: 0.95,
        dominantCategory: 'Programación',
      },
      {
        bookId: 'book-2',
        title: 'The Pragmatic Programmer',
        author: 'David Thomas',
        coverUrl: null,
        similarity: 0.88,
        dominantCategory: 'Programación',
      },
    ],
  };

  const emptyResponse: RecommendationsResponse = { label: '', items: [] };

  beforeEach(async () => {
    mockService = {
      getRecommendations: vi.fn().mockReturnValue(of(mockResponse)),
    };
    mockDialogService = { open: vi.fn() };
    mockAuthService = { currentUser: vi.fn().mockReturnValue(null) };
    mockFavoriteService = { toggle: vi.fn().mockReturnValue(of({ data: { favorite: true } })) };

    await TestBed.configureTestingModule({
      imports: [RecommendationsPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: RecommendationsService, useValue: mockService },
        { provide: DialogService, useValue: mockDialogService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: FavoriteService, useValue: mockFavoriteService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecommendationsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Initialization', () => {
    it('should call getRecommendations on init', () => {
      expect(mockService.getRecommendations).toHaveBeenCalled();
    });

    it('should set loading to false after data loads', () => {
      expect(component.loading()).toBe(false);
    });

    it('should populate books after successful load', () => {
      expect(component.books()).toHaveLength(2);
    });

    it('should set the category label', () => {
      expect(component.label()).toBe('Programación');
    });

    it('should map similarity score to book.similarityScore', () => {
      const [first] = component.books();
      expect(first.book.similarityScore).toBe(0.95);
    });

    it('should map coverUrl to the entry coverUrl', () => {
      const [first, second] = component.books();
      expect(first.coverUrl).toBe('https://example.com/cover.jpg');
      expect(second.coverUrl).toBeUndefined();
    });
  });

  describe('Layout with data', () => {
    it('should render the page title "Para ti"', () => {
      const title = fixture.nativeElement.querySelector('.recommendations-title');
      expect(title?.textContent?.trim()).toBe('Para ti');
    });

    it('should render the category label', () => {
      const label = fixture.nativeElement.querySelector('.recommendations-label');
      expect(label?.textContent).toContain('Programación');
    });

    it('should render a BookCoverCard for each recommendation', () => {
      const cards = fixture.nativeElement.querySelectorAll('app-book-cover-card');
      expect(cards.length).toBe(2);
    });

    it('should wrap the grid with role="list"', () => {
      const grid = fixture.nativeElement.querySelector('.recommendations-grid[role="list"]');
      expect(grid).toBeTruthy();
    });

    it('should assign role="listitem" to each card host', () => {
      const listItems = fixture.nativeElement.querySelectorAll(
        'app-book-cover-card[role="listitem"]'
      );
      expect(listItems.length).toBe(2);
    });
  });

  describe('Empty state', () => {
    beforeEach(() => {
      mockService.getRecommendations.mockReturnValue(of(emptyResponse));
      component.load();
      fixture.detectChanges();
    });

    it('should render the empty-state element', () => {
      const empty = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
      expect(empty).toBeTruthy();
    });

    it('should show the no-history message', () => {
      const msg = fixture.nativeElement.querySelector('.empty-message');
      expect(msg?.textContent).toContain('suficiente historial');
    });

    it('should NOT render any book cards', () => {
      const cards = fixture.nativeElement.querySelectorAll('app-book-cover-card');
      expect(cards.length).toBe(0);
    });
  });

  describe('Error state', () => {
    beforeEach(() => {
      mockService.getRecommendations.mockReturnValue(throwError(() => new Error('500')));
      component.load();
      fixture.detectChanges();
    });

    it('should render the error-state element', () => {
      const error = fixture.nativeElement.querySelector('[data-testid="error-state"]');
      expect(error).toBeTruthy();
    });

    it('should set error signal to true', () => {
      expect(component.error()).toBe(true);
    });

    it('should show a retry button', () => {
      const btn = fixture.nativeElement.querySelector('[data-testid="error-state"] .btn-primary');
      expect(btn).toBeTruthy();
    });
  });

  describe('Loading state', () => {
    it('should show skeleton cards while loading', () => {
      component.loading.set(true);
      fixture.detectChanges();

      const skeletons = fixture.nativeElement.querySelectorAll('app-book-card-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should NOT show skeleton cards after loading completes', () => {
      // loading is false after detectChanges in beforeEach
      const skeletons = fixture.nativeElement.querySelectorAll('app-book-card-skeleton');
      expect(skeletons.length).toBe(0);
    });
  });

  describe('toBookEntry mapping', () => {
    it('should map bookId to book.id', () => {
      expect(component.books()[0].book.id).toBe('book-1');
    });

    it('should map author string to authors array', () => {
      expect(component.books()[0].book.authors[0].name).toBe('Robert C. Martin');
    });

    it('should map dominantCategory to categories array', () => {
      expect(component.books()[0].book.categories[0].name).toBe('Programación');
    });

    it('should have an empty categories array when dominantCategory is empty', () => {
      mockService.getRecommendations.mockReturnValue(
        of({
          label: '',
          items: [
            {
              bookId: 'x',
              title: 'T',
              author: 'A',
              coverUrl: null,
              similarity: 0.5,
              dominantCategory: '',
            },
          ],
        })
      );
      component.load();
      fixture.detectChanges();
      expect(component.books()[0].book.categories).toHaveLength(0);
    });
  });

  describe('onSendToKindle', () => {
    it('should open the Kindle dialog with the mapped book', () => {
      const [{ book }] = component.books();
      component.onSendToKindle(book);
      expect(mockDialogService.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: book })
      );
    });
  });

  describe('onShowDescription', () => {
    it('should open the description dialog with the book title and description', () => {
      const [{ book }] = component.books();
      const openSpy = vi.spyOn(component.descriptionDialog(), 'open');
      component.onShowDescription(book);
      expect(openSpy).toHaveBeenCalledWith(book.title, book.description ?? '', book.isbn);
    });
  });
});
