import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { RecommendationsPageComponent } from './recommendations-page.component.js';
import {
  RecommendationsService,
  RecommendationsResponse,
} from '../data-access/recommendations.service.js';

describe('RecommendationsPageComponent', () => {
  let component: RecommendationsPageComponent;
  let fixture: ComponentFixture<RecommendationsPageComponent>;
  let mockService: { getRecommendations: ReturnType<typeof vi.fn> };

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

    await TestBed.configureTestingModule({
      imports: [RecommendationsPageComponent, RouterTestingModule],
      providers: [{ provide: RecommendationsService, useValue: mockService }],
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

    it('should populate items after successful load', () => {
      expect(component.items()).toHaveLength(2);
    });

    it('should set the category label', () => {
      expect(component.label()).toBe('Programación');
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

    it('should render a card for each recommendation', () => {
      const cards = fixture.nativeElement.querySelectorAll('.book-card');
      expect(cards.length).toBe(2);
    });

    it('should render book titles', () => {
      const titles = fixture.nativeElement.querySelectorAll('.book-card__title');
      expect(titles[0].textContent.trim()).toBe('Clean Code');
    });

    it('should render book authors', () => {
      const authors = fixture.nativeElement.querySelectorAll('.book-card__author');
      expect(authors[0].textContent.trim()).toBe('Robert C. Martin');
    });

    it('should render cover image when coverUrl is present', () => {
      const img = fixture.nativeElement.querySelector('.book-card__img');
      expect(img).toBeTruthy();
      expect(img.getAttribute('src')).toBe('https://example.com/cover.jpg');
    });

    it('should render cover placeholder when coverUrl is null', () => {
      const cards = fixture.nativeElement.querySelectorAll('.book-card');
      const placeholder = cards[1].querySelector('.book-card__cover-placeholder');
      expect(placeholder).toBeTruthy();
    });

    it('should show similarity percentage badge', () => {
      const badges = fixture.nativeElement.querySelectorAll('.book-card__similarity');
      expect(badges[0].textContent.trim()).toBe('95%');
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
      const cards = fixture.nativeElement.querySelectorAll('.book-card');
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

      const skeletons = fixture.nativeElement.querySelectorAll('.book-card--skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should NOT show skeleton cards after loading completes', () => {
      // loading is false after detectChanges in beforeEach
      const skeletons = fixture.nativeElement.querySelectorAll('.book-card--skeleton');
      expect(skeletons.length).toBe(0);
    });
  });

  describe('similarityPercent', () => {
    it('should convert 0.95 to 95', () => {
      expect(component.similarityPercent(0.95)).toBe(95);
    });

    it('should convert 0.5 to 50', () => {
      expect(component.similarityPercent(0.5)).toBe(50);
    });

    it('should round 0.876 to 88', () => {
      expect(component.similarityPercent(0.876)).toBe(88);
    });

    it('should convert 1 to 100', () => {
      expect(component.similarityPercent(1)).toBe(100);
    });

    it('should convert 0 to 0', () => {
      expect(component.similarityPercent(0)).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should have role="list" on the grid when there are items', () => {
      const grid = fixture.nativeElement.querySelector('.recommendations-grid[role="list"]');
      expect(grid).toBeTruthy();
    });

    it('should have role="listitem" on each book card', () => {
      const listItems = fixture.nativeElement.querySelectorAll('[role="listitem"]');
      expect(listItems.length).toBe(2);
    });
  });
});
