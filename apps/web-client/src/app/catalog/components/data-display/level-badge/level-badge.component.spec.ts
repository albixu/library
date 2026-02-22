import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LevelBadgeComponent, BookLevel } from './level-badge.component';

describe('LevelBadgeComponent', () => {
  let component: LevelBadgeComponent;
  let fixture: ComponentFixture<LevelBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LevelBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LevelBadgeComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have undefined level by default', () => {
      fixture.detectChanges();
      expect(component.level()).toBeUndefined();
    });
  });

  describe('Rendering', () => {
    it('should render nothing when level is undefined', () => {
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge).toBeFalsy();
    });

    it('should render badge when level is provided', () => {
      fixture.componentRef.setInput('level', 'Beginner');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge).toBeTruthy();
    });

    it('should display level text', () => {
      fixture.componentRef.setInput('level', 'Intermediate');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.textContent.trim()).toBe('Intermediate');
    });
  });

  describe('Level-based styling', () => {
    const levelTests: { level: BookLevel; expectedClass: string }[] = [
      { level: 'Beginner', expectedClass: 'level-beginner' },
      { level: 'Intermediate', expectedClass: 'level-intermediate' },
      { level: 'Advanced', expectedClass: 'level-advanced' },
      { level: 'Expert', expectedClass: 'level-expert' },
    ];

    levelTests.forEach(({ level, expectedClass }) => {
      it(`should apply ${expectedClass} class for ${level} level`, () => {
        fixture.componentRef.setInput('level', level);
        fixture.detectChanges();

        const badge = fixture.nativeElement.querySelector('.level-badge');
        expect(badge.classList.contains(expectedClass)).toBe(true);
      });
    });

    it('should have level-beginner with green styling', () => {
      fixture.componentRef.setInput('level', 'Beginner');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.classList.contains('level-beginner')).toBe(true);
    });

    it('should have level-intermediate with amber styling', () => {
      fixture.componentRef.setInput('level', 'Intermediate');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.classList.contains('level-intermediate')).toBe(true);
    });

    it('should have level-advanced with red styling', () => {
      fixture.componentRef.setInput('level', 'Advanced');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.classList.contains('level-advanced')).toBe(true);
    });

    it('should have level-expert with purple styling', () => {
      fixture.componentRef.setInput('level', 'Expert');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.classList.contains('level-expert')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label', () => {
      fixture.componentRef.setInput('level', 'Advanced');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.getAttribute('aria-label')).toBe('Book level: Advanced');
    });
  });

  describe('Unknown level handling', () => {
    it('should handle unknown level gracefully', () => {
      fixture.componentRef.setInput('level', 'Unknown' as BookLevel);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent.trim()).toBe('Unknown');
    });

    it('should apply default styling for unknown level', () => {
      fixture.componentRef.setInput('level', 'Unknown' as BookLevel);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.classList.contains('level-unknown')).toBe(true);
    });
  });
});
