import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TruncatedTextComponent } from './truncated-text.component';

describe('TruncatedTextComponent', () => {
  let component: TruncatedTextComponent;
  let fixture: ComponentFixture<TruncatedTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TruncatedTextComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(TruncatedTextComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have empty text by default', () => {
      fixture.detectChanges();
      expect(component.text()).toBe('');
    });

    it('should have maxLines of 2 by default', () => {
      fixture.detectChanges();
      expect(component.maxLines()).toBe(2);
    });
  });

  describe('Rendering', () => {
    it('should render nothing when text is empty', () => {
      fixture.componentRef.setInput('text', '');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      expect(container).toBeFalsy();
    });

    it('should render text when provided', () => {
      fixture.componentRef.setInput('text', 'Hello World');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      expect(container).toBeTruthy();
      expect(container.textContent.trim()).toBe('Hello World');
    });
  });

  describe('CSS truncation', () => {
    it('should apply line-clamp style based on maxLines', () => {
      fixture.componentRef.setInput('text', 'Some long text that might need truncation');
      fixture.componentRef.setInput('maxLines', 3);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      expect(container.style.getPropertyValue('--max-lines')).toBe('3');
    });

    it('should apply line-clamp-2 class for default maxLines', () => {
      fixture.componentRef.setInput('text', 'Some text');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      expect(container.style.getPropertyValue('--max-lines')).toBe('2');
    });

    it('should support maxLines of 1', () => {
      fixture.componentRef.setInput('text', 'Some text');
      fixture.componentRef.setInput('maxLines', 1);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      expect(container.style.getPropertyValue('--max-lines')).toBe('1');
    });
  });

  describe('Tooltip', () => {
    it('should have tooltip with full text', () => {
      const longText = 'This is a very long text that will be truncated in the display';
      fixture.componentRef.setInput('text', longText);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      const tooltipText = container.getAttribute('title') || container.getAttribute('matTooltip');
      expect(tooltipText).toBe(longText);
    });

    it('should show full text in tooltip even for short text', () => {
      const shortText = 'Short';
      fixture.componentRef.setInput('text', shortText);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      const tooltipText = container.getAttribute('title') || container.getAttribute('matTooltip');
      expect(tooltipText).toBe(shortText);
    });
  });

  describe('Disable tooltip', () => {
    it('should not show tooltip when showTooltip is false', () => {
      fixture.componentRef.setInput('text', 'Some text');
      fixture.componentRef.setInput('showTooltip', false);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      const tooltipText = container.getAttribute('title');
      expect(tooltipText).toBeFalsy();
    });

    it('should show tooltip by default', () => {
      fixture.componentRef.setInput('text', 'Some text');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      const tooltipText = container.getAttribute('title');
      expect(tooltipText).toBe('Some text');
    });
  });

  describe('Accessibility', () => {
    it('should preserve full text for screen readers', () => {
      const text = 'This is accessible text';
      fixture.componentRef.setInput('text', text);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      expect(container.textContent.trim()).toBe(text);
    });
  });

  describe('HTML safety', () => {
    it('should escape HTML in text', () => {
      const htmlText = '<script>alert("xss")</script>';
      fixture.componentRef.setInput('text', htmlText);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.truncated-text');
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.textContent).toContain('<script>');
    });
  });
});
