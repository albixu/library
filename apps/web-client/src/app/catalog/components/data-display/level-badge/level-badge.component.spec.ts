import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LevelBadgeComponent } from './level-badge.component';
import { BookLevelName } from '../../../../core/models/index.js';

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

    it('should render nothing when level is null', () => {
      fixture.componentRef.setInput('level', null);
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
    const levelTests: { level: BookLevelName; expectedClass: string }[] = [
      { level: 'Beginner', expectedClass: 'level-beginner' },
      { level: 'Intermediate', expectedClass: 'level-intermediate' },
      { level: 'Advanced', expectedClass: 'level-advanced' },
      { level: 'Beginner to Intermediate', expectedClass: 'level-beginner-intermediate' },
      { level: 'Intermediate to Advanced', expectedClass: 'level-intermediate-advanced' },
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

    it('should have level-beginner-intermediate with teal styling', () => {
      fixture.componentRef.setInput('level', 'Beginner to Intermediate');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.classList.contains('level-beginner-intermediate')).toBe(true);
    });

    it('should have level-intermediate-advanced with orange styling', () => {
      fixture.componentRef.setInput('level', 'Intermediate to Advanced');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.classList.contains('level-intermediate-advanced')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label', () => {
      fixture.componentRef.setInput('level', 'Advanced');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.getAttribute('aria-label')).toBe('Book level: Advanced');
    });

    it('should have appropriate aria-label for compound levels', () => {
      fixture.componentRef.setInput('level', 'Beginner to Intermediate');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.getAttribute('aria-label')).toBe('Book level: Beginner to Intermediate');
    });
  });

  describe('Unknown level handling', () => {
    it('should handle unknown level gracefully', () => {
      fixture.componentRef.setInput('level', 'Unknown' as BookLevelName);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent.trim()).toBe('Unknown');
    });

    it('should apply default styling for unknown level', () => {
      fixture.componentRef.setInput('level', 'Unknown' as BookLevelName);
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge.classList.contains('level-unknown')).toBe(true);
    });
  });
});
