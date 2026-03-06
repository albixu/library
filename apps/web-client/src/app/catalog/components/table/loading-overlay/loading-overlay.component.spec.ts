import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingOverlayComponent } from './loading-overlay.component';

describe('LoadingOverlayComponent', () => {
  let component: LoadingOverlayComponent;
  let fixture: ComponentFixture<LoadingOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingOverlayComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should not be visible by default', () => {
      fixture.detectChanges();
      expect(component.visible()).toBe(false);
    });
  });

  describe('Visibility', () => {
    it('should not render overlay when visible is false', () => {
      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay).toBeFalsy();
    });

    it('should render overlay when visible is true', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay).toBeTruthy();
    });
  });

  describe('Spinner', () => {
    it('should display spinner when visible', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner).toBeTruthy();
    });

    it('should have default diameter of 48', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      expect(component.diameter()).toBe(48);
    });

    it('should use custom diameter when provided', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('diameter', 64);
      fixture.detectChanges();

      expect(component.diameter()).toBe(64);
      const spinner = fixture.nativeElement.querySelector('.spinner');
      expect(spinner.style.width).toBe('64px');
      expect(spinner.style.height).toBe('64px');
    });
  });

  describe('Message', () => {
    it('should not display message by default', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.loading-message');
      expect(message).toBeFalsy();
    });

    it('should display message when provided', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('message', 'Loading books...');
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.loading-message');
      expect(message).toBeTruthy();
      expect(message.textContent.trim()).toBe('Loading books...');
    });
  });

  describe('Backdrop', () => {
    it('should show semi-transparent backdrop', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay.classList.contains('loading-overlay')).toBe(true);
    });

    it('should apply transparent class when transparent is true', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('transparent', true);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay.classList.contains('transparent')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-busy attribute when visible', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay.getAttribute('aria-busy')).toBe('true');
    });

    it('should have role="status"', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay.getAttribute('role')).toBe('status');
    });

    it('should have aria-label', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay.getAttribute('aria-label')).toBe('Cargando');
    });

    it('should use custom message as aria-label when provided', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('message', 'Fetching data...');
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.loading-overlay');
      expect(overlay.getAttribute('aria-label')).toBe('Fetching data...');
    });
  });
});
