import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { FooterComponent } from './footer.component.js';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Structure', () => {
    it('should render a footer element', () => {
      const footer = fixture.nativeElement.querySelector('footer');
      expect(footer).toBeTruthy();
    });

    it('should have footer CSS class', () => {
      const footer = fixture.nativeElement.querySelector('footer');
      expect(footer.classList.contains('footer')).toBe(true);
    });
  });

  describe('Copyright', () => {
    it('should display copyright text with year 2025', () => {
      const footer = fixture.nativeElement.querySelector('footer');
      expect(footer.textContent).toContain('© 2025 Library');
    });

    it('should have copyright in a span element', () => {
      const copyright = fixture.nativeElement.querySelector('.footer__copyright');
      expect(copyright).toBeTruthy();
      expect(copyright.textContent.trim()).toBe('© 2025 Library');
    });
  });

  describe('Separator', () => {
    it('should display a separator between copyright and link', () => {
      const separator = fixture.nativeElement.querySelector('.footer__separator');
      expect(separator).toBeTruthy();
      expect(separator.textContent.trim()).toBe('•');
    });
  });

  describe('GitHub Link', () => {
    it('should have a GitHub link', () => {
      const link = fixture.nativeElement.querySelector('a');
      expect(link).toBeTruthy();
      expect(link.textContent.trim()).toBe('GitHub');
    });

    it('should link to the correct GitHub repository', () => {
      const link = fixture.nativeElement.querySelector('a');
      expect(link.getAttribute('href')).toBe('https://github.com/albixu/library');
    });

    it('should open link in new tab', () => {
      const link = fixture.nativeElement.querySelector('a');
      expect(link.getAttribute('target')).toBe('_blank');
    });

    it('should have security attributes for external link', () => {
      const link = fixture.nativeElement.querySelector('a');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate semantic footer element', () => {
      const footer = fixture.nativeElement.querySelector('footer');
      expect(footer.tagName.toLowerCase()).toBe('footer');
    });
  });
});
