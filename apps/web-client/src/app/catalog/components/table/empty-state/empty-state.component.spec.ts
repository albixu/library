import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default type of empty', () => {
      fixture.detectChanges();
      expect(component.type()).toBe('empty');
    });
  });

  describe('Empty state type', () => {
    it('should display empty icon for empty type', () => {
      fixture.componentRef.setInput('type', 'empty');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.material-symbols-outlined');
      expect(icon.textContent.trim()).toBe('inbox');
    });

    it('should display empty title', () => {
      fixture.componentRef.setInput('type', 'empty');
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('Sin libros todavía');
    });

    it('should display empty description', () => {
      fixture.componentRef.setInput('type', 'empty');
      fixture.detectChanges();

      const description = fixture.nativeElement.querySelector('.empty-state-description');
      expect(description.textContent).toContain('Comienza añadiendo tu primer libro');
    });
  });

  describe('No results state type', () => {
    it('should display search icon for no-results type', () => {
      fixture.componentRef.setInput('type', 'no-results');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.material-symbols-outlined');
      expect(icon.textContent.trim()).toBe('search_off');
    });

    it('should display no results title', () => {
      fixture.componentRef.setInput('type', 'no-results');
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('Sin resultados');
    });

    it('should display no results description', () => {
      fixture.componentRef.setInput('type', 'no-results');
      fixture.detectChanges();

      const description = fixture.nativeElement.querySelector('.empty-state-description');
      expect(description.textContent).toContain('Intenta ajustar tus filtros');
    });
  });

  describe('Initial state type', () => {
    it('should display book icon for initial type', () => {
      fixture.componentRef.setInput('type', 'initial');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.material-symbols-outlined');
      expect(icon.textContent.trim()).toBe('auto_stories');
    });

    it('should display initial title', () => {
      fixture.componentRef.setInput('type', 'initial');
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('Busca en tu biblioteca');
    });
  });

  describe('Error state type', () => {
    it('should display error icon for error type', () => {
      fixture.componentRef.setInput('type', 'error');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.material-symbols-outlined');
      expect(icon.textContent.trim()).toBe('error_outline');
    });

    it('should display error title', () => {
      fixture.componentRef.setInput('type', 'error');
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('Algo salió mal');
    });
  });

  describe('Custom content', () => {
    it('should display custom title when provided', () => {
      fixture.componentRef.setInput('type', 'empty');
      fixture.componentRef.setInput('title', 'Custom Title');
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.empty-state-title');
      expect(title.textContent).toContain('Custom Title');
    });

    it('should display custom description when provided', () => {
      fixture.componentRef.setInput('type', 'empty');
      fixture.componentRef.setInput('description', 'Custom description text');
      fixture.detectChanges();

      const description = fixture.nativeElement.querySelector('.empty-state-description');
      expect(description.textContent).toContain('Custom description text');
    });

    it('should display custom icon when provided', () => {
      fixture.componentRef.setInput('type', 'empty');
      fixture.componentRef.setInput('icon', 'favorite');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.material-symbols-outlined');
      expect(icon.textContent.trim()).toBe('favorite');
    });
  });

  describe('Action button', () => {
    it('should not show action button by default', () => {
      fixture.componentRef.setInput('type', 'empty');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.empty-state-action');
      expect(button).toBeFalsy();
    });

    it('should show action button when actionLabel is provided', () => {
      fixture.componentRef.setInput('type', 'empty');
      fixture.componentRef.setInput('actionLabel', 'Add Book');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.empty-state-action');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('Add Book');
    });

    it('should emit action event when button is clicked', () => {
      const actionSpy = vi.fn();
      fixture.componentRef.setInput('type', 'empty');
      fixture.componentRef.setInput('actionLabel', 'Add Book');
      fixture.detectChanges();

      component.action.subscribe(actionSpy);
      const button = fixture.nativeElement.querySelector('.empty-state-action');
      button.click();

      expect(actionSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate role', () => {
      fixture.componentRef.setInput('type', 'empty');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state');
      expect(container.getAttribute('role')).toBe('status');
    });

    it('should have aria-label', () => {
      fixture.componentRef.setInput('type', 'no-results');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.empty-state');
      expect(container.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
