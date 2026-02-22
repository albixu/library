import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormatIconComponent, BookFormat } from './format-icon.component';

describe('FormatIconComponent', () => {
  let component: FormatIconComponent;
  let fixture: ComponentFixture<FormatIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormatIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormatIconComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have undefined format by default', () => {
      fixture.detectChanges();
      expect(component.format()).toBeUndefined();
    });
  });

  describe('Rendering', () => {
    it('should render nothing when format is undefined', () => {
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('.format-icon');
      expect(icon).toBeFalsy();
    });

    it('should render icon when format is provided', () => {
      fixture.componentRef.setInput('format', 'PDF');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.format-icon');
      expect(icon).toBeTruthy();
    });
  });

  describe('Format-based icons', () => {
    const formatTests: { format: BookFormat; expectedIcon: string }[] = [
      { format: 'PDF', expectedIcon: 'picture_as_pdf' },
      { format: 'EPUB', expectedIcon: 'book' },
      { format: 'MOBI', expectedIcon: 'tablet_android' },
      { format: 'AZW3', expectedIcon: 'tablet_android' },
      { format: 'TXT', expectedIcon: 'description' },
    ];

    formatTests.forEach(({ format, expectedIcon }) => {
      it(`should display ${expectedIcon} icon for ${format} format`, () => {
        fixture.componentRef.setInput('format', format);
        fixture.detectChanges();

        const icon = fixture.nativeElement.querySelector('mat-icon');
        expect(icon.textContent.trim()).toBe(expectedIcon);
      });
    });

    it('should display insert_drive_file icon for unknown format', () => {
      fixture.componentRef.setInput('format', 'UNKNOWN' as BookFormat);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon.textContent.trim()).toBe('insert_drive_file');
    });
  });

  describe('Tooltip', () => {
    it('should have tooltip with format name', () => {
      fixture.componentRef.setInput('format', 'PDF');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.format-icon');
      const tooltipText = container.getAttribute('title') || container.getAttribute('matTooltip');
      expect(tooltipText).toBe('PDF');
    });

    it('should show format in tooltip for EPUB', () => {
      fixture.componentRef.setInput('format', 'EPUB');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.format-icon');
      const tooltipText = container.getAttribute('title') || container.getAttribute('matTooltip');
      expect(tooltipText).toBe('EPUB');
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label', () => {
      fixture.componentRef.setInput('format', 'PDF');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.format-icon');
      expect(container.getAttribute('aria-label')).toBe('Format: PDF');
    });

    it('should have aria-hidden on icon', () => {
      fixture.componentRef.setInput('format', 'PDF');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Size', () => {
    it('should apply small size by default', () => {
      fixture.componentRef.setInput('format', 'PDF');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.format-icon');
      expect(container.classList.contains('size-small')).toBe(true);
    });

    it('should apply medium size when specified', () => {
      fixture.componentRef.setInput('format', 'PDF');
      fixture.componentRef.setInput('size', 'medium');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.format-icon');
      expect(container.classList.contains('size-medium')).toBe(true);
    });

    it('should apply large size when specified', () => {
      fixture.componentRef.setInput('format', 'PDF');
      fixture.componentRef.setInput('size', 'large');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.format-icon');
      expect(container.classList.contains('size-large')).toBe(true);
    });
  });
});
