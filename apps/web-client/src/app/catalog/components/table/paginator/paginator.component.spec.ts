import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PaginatorComponent } from './paginator.component';

describe('PaginatorComponent', () => {
  let component: PaginatorComponent;
  let fixture: ComponentFixture<PaginatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginatorComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginatorComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default pageSize of 25', () => {
      fixture.detectChanges();
      expect(component.pageSize()).toBe(25);
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

  describe('Page size options', () => {
    it('should have default page size options of [25, 50, 100]', () => {
      fixture.detectChanges();
      expect(component.pageSizeOptions()).toEqual([25, 50, 100]);
    });

    it('should use custom page size options when provided', () => {
      fixture.componentRef.setInput('pageSizeOptions', [10, 20, 50]);
      fixture.detectChanges();
      expect(component.pageSizeOptions()).toEqual([10, 20, 50]);
    });
  });

  describe('Display', () => {
    it('should display current count of total count', () => {
      fixture.componentRef.setInput('totalCount', 100);
      fixture.componentRef.setInput('currentCount', 25);
      fixture.detectChanges();

      const rangeLabel = fixture.nativeElement.textContent;
      expect(rangeLabel).toContain('25 of 100');
    });

    it('should display 0 of 0 when no items', () => {
      fixture.componentRef.setInput('totalCount', 0);
      fixture.componentRef.setInput('currentCount', 0);
      fixture.detectChanges();

      const rangeLabel = fixture.nativeElement.textContent;
      expect(rangeLabel).toContain('0 of 0');
    });

    it('should display all items loaded correctly', () => {
      fixture.componentRef.setInput('totalCount', 45);
      fixture.componentRef.setInput('currentCount', 45);
      fixture.detectChanges();

      const rangeLabel = fixture.nativeElement.textContent;
      expect(rangeLabel).toContain('45 of 45');
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
      const spinner = fixture.nativeElement.querySelector('mat-spinner');

      expect(loadMoreButton).toBeFalsy();
      expect(spinner).toBeTruthy();
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

    it('should emit pageSizeChange event when page size changes', () => {
      const pageSizeChangeSpy = vi.fn();
      component.pageSizeChange.subscribe(pageSizeChangeSpy);

      fixture.componentRef.setInput('totalCount', 100);
      fixture.componentRef.setInput('currentCount', 25);
      fixture.detectChanges();

      component.onPageSizeChange(50);

      expect(pageSizeChangeSpy).toHaveBeenCalledWith(50);
    });
  });

  describe('Loading state', () => {
    it('should disable page size select when loading', () => {
      fixture.componentRef.setInput('totalCount', 100);
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const select = fixture.nativeElement.querySelector('mat-select');
      expect(select.getAttribute('aria-disabled')).toBe('true');
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
