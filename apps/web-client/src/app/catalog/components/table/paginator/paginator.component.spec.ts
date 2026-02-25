import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginatorComponent } from './paginator.component';

describe('PaginatorComponent', () => {
  let component: PaginatorComponent;
  let fixture: ComponentFixture<PaginatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginatorComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have fixed PAGE_SIZE of 25', () => {
      expect(PaginatorComponent.PAGE_SIZE).toBe(25);
    });

    it('should have default totalCount of 0', () => {
      fixture.detectChanges();
      expect(component.totalCount()).toBe(0);
    });

    it('should have default currentCount of 0', () => {
      fixture.detectChanges();
      expect(component.currentCount()).toBe(0);
    });

    it('should have default hasNextPage of false', () => {
      fixture.detectChanges();
      expect(component.hasNextPage()).toBe(false);
    });

    it('should have default loading of false', () => {
      fixture.detectChanges();
      expect(component.loading()).toBe(false);
    });
  });

  describe('Display', () => {
    it('should display current count of total count with Stitch format', () => {
      fixture.componentRef.setInput('totalCount', 100);
      fixture.componentRef.setInput('currentCount', 25);
      fixture.detectChanges();

      const rangeLabel = fixture.nativeElement.textContent;
      expect(rangeLabel).toContain('Showing 25 of 100 items');
    });

    it('should display 0 of 0 items when no items', () => {
      fixture.componentRef.setInput('totalCount', 0);
      fixture.componentRef.setInput('currentCount', 0);
      fixture.detectChanges();

      const rangeLabel = fixture.nativeElement.textContent;
      expect(rangeLabel).toContain('Showing 0 of 0 items');
    });

    it('should display all items loaded correctly', () => {
      fixture.componentRef.setInput('totalCount', 45);
      fixture.componentRef.setInput('currentCount', 45);
      fixture.detectChanges();

      const rangeLabel = fixture.nativeElement.textContent;
      expect(rangeLabel).toContain('Showing 45 of 45 items');
    });
  });

  describe('Load more button', () => {
    it('should show load more button when hasNextPage is true', () => {
      fixture.componentRef.setInput('totalCount', 100);
      fixture.componentRef.setInput('currentCount', 25);
      fixture.componentRef.setInput('hasNextPage', true);
      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();

      const loadMoreButton = fixture.nativeElement.querySelector(
        '[data-testid="load-more-button"]'
      );
      expect(loadMoreButton).toBeTruthy();
    });

    it('should not show load more button when hasNextPage is false', () => {
      fixture.componentRef.setInput('totalCount', 45);
      fixture.componentRef.setInput('currentCount', 45);
      fixture.componentRef.setInput('hasNextPage', false);
      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();

      const loadMoreButton = fixture.nativeElement.querySelector(
        '[data-testid="load-more-button"]'
      );
      expect(loadMoreButton).toBeFalsy();
    });

    it('should show spinner instead of load more button when loading', () => {
      fixture.componentRef.setInput('totalCount', 100);
      fixture.componentRef.setInput('currentCount', 25);
      fixture.componentRef.setInput('hasNextPage', true);
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const loadMoreButton = fixture.nativeElement.querySelector(
        '[data-testid="load-more-button"]'
      );
      const spinner = fixture.nativeElement.querySelector('.spinner');

      expect(loadMoreButton).toBeFalsy();
      expect(spinner).toBeTruthy();
    });

    it('should display Material Symbols icon in load more button', () => {
      fixture.componentRef.setInput('totalCount', 100);
      fixture.componentRef.setInput('currentCount', 25);
      fixture.componentRef.setInput('hasNextPage', true);
      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector(
        '[data-testid="load-more-button"] .material-symbols-outlined'
      );
      expect(icon).toBeTruthy();
      expect(icon.textContent.trim()).toBe('expand_more');
    });
  });

  describe('Events', () => {
    it('should emit loadMore event when load more button is clicked', () => {
      const loadMoreSpy = vi.fn();
      component.loadMore.subscribe(loadMoreSpy);

      fixture.componentRef.setInput('totalCount', 100);
      fixture.componentRef.setInput('currentCount', 25);
      fixture.componentRef.setInput('hasNextPage', true);
      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();

      const loadMoreButton = fixture.nativeElement.querySelector(
        '[data-testid="load-more-button"]'
      );
      loadMoreButton.click();

      expect(loadMoreSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have navigation aria-label', () => {
      fixture.componentRef.setInput('totalCount', 100);
      fixture.detectChanges();

      const nav = fixture.nativeElement.querySelector('nav');
      expect(nav.getAttribute('aria-label')).toBe('Pagination');
    });

    it('should have aria-label on load more button', () => {
      fixture.componentRef.setInput('totalCount', 100);
      fixture.componentRef.setInput('currentCount', 25);
      fixture.componentRef.setInput('hasNextPage', true);
      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();

      const loadMoreButton = fixture.nativeElement.querySelector(
        '[data-testid="load-more-button"]'
      );
      expect(loadMoreButton.getAttribute('aria-label')).toBe('Load more items');
    });
  });
});
