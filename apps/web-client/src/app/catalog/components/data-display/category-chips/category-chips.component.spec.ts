import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CategoryChipsComponent } from './category-chips.component';

describe('CategoryChipsComponent', () => {
  let component: CategoryChipsComponent;
  let fixture: ComponentFixture<CategoryChipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryChipsComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryChipsComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have empty categories by default', () => {
      fixture.detectChanges();
      expect(component.categories()).toEqual([]);
    });
  });

  describe('Rendering', () => {
    it('should render nothing when categories is empty', () => {
      fixture.componentRef.setInput('categories', []);
      fixture.detectChanges();

      const chips = fixture.nativeElement.querySelectorAll('.category-chip');
      expect(chips.length).toBe(0);
    });

    it('should render one chip for each category', () => {
      fixture.componentRef.setInput('categories', ['TypeScript', 'Angular', 'Testing']);
      fixture.detectChanges();

      const chips = fixture.nativeElement.querySelectorAll('.category-chip');
      expect(chips.length).toBe(3);
    });

    it('should display category names in chips', () => {
      fixture.componentRef.setInput('categories', ['TypeScript', 'Angular']);
      fixture.detectChanges();

      const chips = fixture.nativeElement.querySelectorAll('.category-chip');
      expect(chips[0].textContent.trim()).toBe('TypeScript');
      expect(chips[1].textContent.trim()).toBe('Angular');
    });
  });

  describe('Limiting displayed categories', () => {
    it('should display all categories when maxVisible is not set', () => {
      fixture.componentRef.setInput('categories', ['A', 'B', 'C', 'D', 'E']);
      fixture.detectChanges();

      const chips = fixture.nativeElement.querySelectorAll('.category-chip');
      expect(chips.length).toBe(5);
    });

    it('should limit displayed categories when maxVisible is set', () => {
      fixture.componentRef.setInput('categories', ['A', 'B', 'C', 'D', 'E']);
      fixture.componentRef.setInput('maxVisible', 3);
      fixture.detectChanges();

      const chips = fixture.nativeElement.querySelectorAll('.category-chip');
      expect(chips.length).toBe(3);
    });

    it('should show overflow indicator when categories exceed maxVisible', () => {
      fixture.componentRef.setInput('categories', ['A', 'B', 'C', 'D', 'E']);
      fixture.componentRef.setInput('maxVisible', 3);
      fixture.detectChanges();

      const overflow = fixture.nativeElement.querySelector('.overflow-indicator');
      expect(overflow).toBeTruthy();
      expect(overflow.textContent.trim()).toBe('+2');
    });

    it('should not show overflow indicator when categories fit within maxVisible', () => {
      fixture.componentRef.setInput('categories', ['A', 'B']);
      fixture.componentRef.setInput('maxVisible', 3);
      fixture.detectChanges();

      const overflow = fixture.nativeElement.querySelector('.overflow-indicator');
      expect(overflow).toBeFalsy();
    });

    it('should not show overflow indicator when categories equal maxVisible', () => {
      fixture.componentRef.setInput('categories', ['A', 'B', 'C']);
      fixture.componentRef.setInput('maxVisible', 3);
      fixture.detectChanges();

      const overflow = fixture.nativeElement.querySelector('.overflow-indicator');
      expect(overflow).toBeFalsy();
    });
  });

  describe('Overflow tooltip', () => {
    it('should have tooltip with hidden categories on overflow indicator', () => {
      fixture.componentRef.setInput('categories', ['A', 'B', 'C', 'D', 'E']);
      fixture.componentRef.setInput('maxVisible', 2);
      fixture.detectChanges();

      const overflow = fixture.nativeElement.querySelector('.overflow-indicator');
      const tooltipText = overflow.getAttribute('title') || overflow.getAttribute('matTooltip');
      expect(tooltipText).toContain('C');
      expect(tooltipText).toContain('D');
      expect(tooltipText).toContain('E');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on container', () => {
      fixture.componentRef.setInput('categories', ['TypeScript', 'Angular']);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('[role="list"]');
      expect(container).toBeTruthy();
    });

    it('should have listitem role on each chip', () => {
      fixture.componentRef.setInput('categories', ['TypeScript']);
      fixture.detectChanges();

      const chip = fixture.nativeElement.querySelector('.category-chip');
      expect(chip.getAttribute('role')).toBe('listitem');
    });
  });

  describe('Styling', () => {
    it('should apply chip styling class', () => {
      fixture.componentRef.setInput('categories', ['TypeScript']);
      fixture.detectChanges();

      const chip = fixture.nativeElement.querySelector('.category-chip');
      expect(chip.classList.contains('category-chip')).toBe(true);
    });
  });
});
