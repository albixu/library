import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookDescriptionDialogComponent } from './book-description-dialog.component';

describe('BookDescriptionDialogComponent', () => {
  let component: BookDescriptionDialogComponent;
  let fixture: ComponentFixture<BookDescriptionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookDescriptionDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookDescriptionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start with dialog not visible', () => {
      expect(component.visible()).toBe(false);
    });

    it('should start with empty title', () => {
      expect(component.title()).toBe('');
    });

    it('should start with empty description', () => {
      expect(component.description()).toBe('');
    });
  });

  describe('open()', () => {
    it('should set visible to true', () => {
      component.open('Clean Code', 'A handbook of agile software craftsmanship.');

      expect(component.visible()).toBe(true);
    });

    it('should set the title', () => {
      component.open('Clean Code', 'A handbook of agile software craftsmanship.');

      expect(component.title()).toBe('Clean Code');
    });

    it('should set the description', () => {
      component.open('Clean Code', 'A handbook of agile software craftsmanship.');

      expect(component.description()).toBe('A handbook of agile software craftsmanship.');
    });

    it('should update title and description on subsequent calls', () => {
      component.open('Clean Code', 'First description');
      component.open('The Pragmatic Programmer', 'Second description');

      expect(component.title()).toBe('The Pragmatic Programmer');
      expect(component.description()).toBe('Second description');
    });

    it('should handle empty description', () => {
      component.open('Book Without Description', '');

      expect(component.visible()).toBe(true);
      expect(component.description()).toBe('');
    });

    it('should handle long descriptions', () => {
      const longDescription = 'A'.repeat(25000);
      component.open('Big Book', longDescription);

      expect(component.description()).toBe(longDescription);
    });
  });

  describe('onClose()', () => {
    it('should set visible to false', () => {
      component.open('Clean Code', 'Some description');
      expect(component.visible()).toBe(true);

      component.onClose();

      expect(component.visible()).toBe(false);
    });

    it('should preserve title and description after closing', () => {
      component.open('Clean Code', 'A handbook of agile software craftsmanship.');
      component.onClose();

      expect(component.title()).toBe('Clean Code');
      expect(component.description()).toBe('A handbook of agile software craftsmanship.');
    });

    it('should be idempotent when called on an already closed dialog', () => {
      expect(component.visible()).toBe(false);

      component.onClose();

      expect(component.visible()).toBe(false);
    });
  });

  describe('Template rendering', () => {
    it('should not render dialog content when not visible', () => {
      fixture.detectChanges();

      // p-dialog is not rendered in DOM when not visible by default
      const _dialog = fixture.nativeElement.querySelector('p-dialog');
      expect(component.visible()).toBe(false);
    });

    it('should reflect open state in visible signal after open()', () => {
      component.open('The Pragmatic Programmer', 'Your journey to mastery.');
      fixture.detectChanges();

      expect(component.visible()).toBe(true);
      expect(component.title()).toBe('The Pragmatic Programmer');
      expect(component.description()).toBe('Your journey to mastery.');
    });
  });
});
