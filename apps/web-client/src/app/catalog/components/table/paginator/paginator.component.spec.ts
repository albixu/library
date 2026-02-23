import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PaginatorComponent, PageEvent } from './paginator.component';

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

    it('should have default pageIndex of 0', () => {
      fixture.detectChanges();
      expect(component.pageIndex()).toBe(0);
    });

    it('should have default totalItems of 0', () => {
      fixture.detectChanges();
      expect(component.totalItems()).toBe(0);
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
    it('should display current range', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 0);
      fixture.detectChanges();

      const rangeLabel = fixture.nativeElement.textContent;
      expect(rangeLabel).toContain('1');
      expect(rangeLabel).toContain('25');
      expect(rangeLabel).toContain('100');
    });

    it('should display correct range for second page', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 1);
      fixture.detectChanges();

      const rangeLabel = fixture.nativeElement.textContent;
      expect(rangeLabel).toContain('26');
      expect(rangeLabel).toContain('50');
    });

    it('should display correct range for last page with partial results', () => {
      fixture.componentRef.setInput('totalItems', 73);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 2);
      fixture.detectChanges();

      const rangeLabel = fixture.nativeElement.textContent;
      expect(rangeLabel).toContain('51');
      expect(rangeLabel).toContain('73');
    });
  });

  describe('Navigation buttons', () => {
    it('should disable previous button on first page', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageIndex', 0);
      fixture.detectChanges();

      const prevButton = fixture.nativeElement.querySelector('[aria-label="Previous page"]');
      expect(prevButton.disabled).toBe(true);
    });

    it('should enable previous button when not on first page', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageIndex', 1);
      fixture.detectChanges();

      const prevButton = fixture.nativeElement.querySelector('[aria-label="Previous page"]');
      expect(prevButton.disabled).toBe(false);
    });

    it('should disable next button on last page', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 3);
      fixture.detectChanges();

      const nextButton = fixture.nativeElement.querySelector('[aria-label="Next page"]');
      expect(nextButton.disabled).toBe(true);
    });

    it('should enable next button when not on last page', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 0);
      fixture.detectChanges();

      const nextButton = fixture.nativeElement.querySelector('[aria-label="Next page"]');
      expect(nextButton.disabled).toBe(false);
    });
  });

  describe('Page change events', () => {
    it('should emit page event when next is clicked', () => {
      const pageSpy = vi.fn();
      component.page.subscribe(pageSpy);

      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 0);
      fixture.detectChanges();

      const nextButton = fixture.nativeElement.querySelector('[aria-label="Next page"]');
      nextButton.click();

      expect(pageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 1,
          pageSize: 25,
          previousPageIndex: 0,
        })
      );
    });

    it('should emit page event when previous is clicked', () => {
      const pageSpy = vi.fn();
      component.page.subscribe(pageSpy);

      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 2);
      fixture.detectChanges();

      const prevButton = fixture.nativeElement.querySelector('[aria-label="Previous page"]');
      prevButton.click();

      expect(pageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 1,
          pageSize: 25,
          previousPageIndex: 2,
        })
      );
    });

    it('should emit page event when page size changes', () => {
      const pageSpy = vi.fn();
      component.page.subscribe(pageSpy);

      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 1);
      fixture.detectChanges();

      // Simulate page size change
      component.onPageSizeChange(50);

      expect(pageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 0, // Reset to first page
          pageSize: 50,
          previousPageIndex: 1,
        })
      );
    });
  });

  describe('First and last page buttons', () => {
    it('should disable first page button on first page', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageIndex', 0);
      fixture.detectChanges();

      const firstButton = fixture.nativeElement.querySelector('[aria-label="First page"]');
      expect(firstButton.disabled).toBe(true);
    });

    it('should disable last page button on last page', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 3);
      fixture.detectChanges();

      const lastButton = fixture.nativeElement.querySelector('[aria-label="Last page"]');
      expect(lastButton.disabled).toBe(true);
    });

    it('should navigate to first page when first button is clicked', () => {
      const pageSpy = vi.fn();
      component.page.subscribe(pageSpy);

      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 2);
      fixture.detectChanges();

      const firstButton = fixture.nativeElement.querySelector('[aria-label="First page"]');
      firstButton.click();

      expect(pageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 0,
        })
      );
    });

    it('should navigate to last page when last button is clicked', () => {
      const pageSpy = vi.fn();
      component.page.subscribe(pageSpy);

      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('pageIndex', 0);
      fixture.detectChanges();

      const lastButton = fixture.nativeElement.querySelector('[aria-label="Last page"]');
      lastButton.click();

      expect(pageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 3,
        })
      );
    });
  });

  describe('Disabled state', () => {
    it('should disable all controls when disabled', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons.forEach((button: HTMLButtonElement) => {
        expect(button.disabled).toBe(true);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have navigation aria-label', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.detectChanges();

      const nav = fixture.nativeElement.querySelector('nav');
      expect(nav.getAttribute('aria-label')).toBe('Pagination');
    });
  });
});
