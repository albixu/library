import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageFlagComponent, LanguageCode } from './language-flag.component';

describe('LanguageFlagComponent', () => {
  let component: LanguageFlagComponent;
  let fixture: ComponentFixture<LanguageFlagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageFlagComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageFlagComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have undefined languageCode by default', () => {
      fixture.detectChanges();
      expect(component.languageCode()).toBeUndefined();
    });
  });

  describe('Rendering', () => {
    it('should render nothing when languageCode is undefined', () => {
      fixture.detectChanges();
      const flag = fixture.nativeElement.querySelector('.language-flag');
      expect(flag).toBeFalsy();
    });

    it('should render flag when languageCode is provided', () => {
      fixture.componentRef.setInput('languageCode', 'en');
      fixture.detectChanges();

      const flag = fixture.nativeElement.querySelector('.language-flag');
      expect(flag).toBeTruthy();
    });
  });

  describe('Language-based flags', () => {
    const languageTests: { code: LanguageCode; expectedFlag: string }[] = [
      { code: 'en', expectedFlag: '🇬🇧' },
      { code: 'es', expectedFlag: '🇪🇸' },
      { code: 'fr', expectedFlag: '🇫🇷' },
      { code: 'de', expectedFlag: '🇩🇪' },
      { code: 'it', expectedFlag: '🇮🇹' },
      { code: 'pt', expectedFlag: '🇵🇹' },
    ];

    languageTests.forEach(({ code, expectedFlag }) => {
      it(`should display ${expectedFlag} flag for ${code} language`, () => {
        fixture.componentRef.setInput('languageCode', code);
        fixture.detectChanges();

        const flagEmoji = fixture.nativeElement.querySelector('.flag-emoji');
        expect(flagEmoji.textContent.trim()).toBe(expectedFlag);
      });
    });

    it('should display globe emoji for unknown language code', () => {
      fixture.componentRef.setInput('languageCode', 'xx' as LanguageCode);
      fixture.detectChanges();

      const flagEmoji = fixture.nativeElement.querySelector('.flag-emoji');
      expect(flagEmoji.textContent.trim()).toBe('🌐');
    });
  });

  describe('Language name display', () => {
    it('should show language name when showName is true', () => {
      fixture.componentRef.setInput('languageCode', 'en');
      fixture.componentRef.setInput('showName', true);
      fixture.detectChanges();

      const name = fixture.nativeElement.querySelector('.language-name');
      expect(name).toBeTruthy();
      expect(name.textContent.trim()).toBe('English');
    });

    it('should not show language name when showName is false', () => {
      fixture.componentRef.setInput('languageCode', 'en');
      fixture.componentRef.setInput('showName', false);
      fixture.detectChanges();

      const name = fixture.nativeElement.querySelector('.language-name');
      expect(name).toBeFalsy();
    });

    it('should not show language name by default', () => {
      fixture.componentRef.setInput('languageCode', 'en');
      fixture.detectChanges();

      const name = fixture.nativeElement.querySelector('.language-name');
      expect(name).toBeFalsy();
    });

    const languageNameTests: { code: LanguageCode; expectedName: string }[] = [
      { code: 'en', expectedName: 'English' },
      { code: 'es', expectedName: 'Spanish' },
      { code: 'fr', expectedName: 'French' },
      { code: 'de', expectedName: 'German' },
      { code: 'it', expectedName: 'Italian' },
      { code: 'pt', expectedName: 'Portuguese' },
    ];

    languageNameTests.forEach(({ code, expectedName }) => {
      it(`should display "${expectedName}" for ${code} when showName is true`, () => {
        fixture.componentRef.setInput('languageCode', code);
        fixture.componentRef.setInput('showName', true);
        fixture.detectChanges();

        const name = fixture.nativeElement.querySelector('.language-name');
        expect(name.textContent.trim()).toBe(expectedName);
      });
    });
  });

  describe('Tooltip', () => {
    it('should have tooltip with language name', () => {
      fixture.componentRef.setInput('languageCode', 'en');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.language-flag');
      const tooltipText = container.getAttribute('title') || container.getAttribute('matTooltip');
      expect(tooltipText).toBe('English');
    });

    it('should show "Spanish" in tooltip for es code', () => {
      fixture.componentRef.setInput('languageCode', 'es');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.language-flag');
      const tooltipText = container.getAttribute('title') || container.getAttribute('matTooltip');
      expect(tooltipText).toBe('Spanish');
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label', () => {
      fixture.componentRef.setInput('languageCode', 'en');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.language-flag');
      expect(container.getAttribute('aria-label')).toBe('Language: English');
    });

    it('should have role img on flag emoji', () => {
      fixture.componentRef.setInput('languageCode', 'en');
      fixture.detectChanges();

      const flag = fixture.nativeElement.querySelector('.flag-emoji');
      expect(flag.getAttribute('role')).toBe('img');
    });
  });
});
