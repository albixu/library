import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BookCardSkeletonComponent } from './book-card-skeleton.component.js';

describe('BookCardSkeletonComponent', () => {
  let component: BookCardSkeletonComponent;
  let fixture: ComponentFixture<BookCardSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookCardSkeletonComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(BookCardSkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render 12 skeleton cards by default', () => {
    const cards = fixture.nativeElement.querySelectorAll('.skeleton-card');
    expect(cards.length).toBe(12);
  });

  it('should render the count number of skeleton cards', () => {
    fixture.componentRef.setInput('count', 6);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.skeleton-card');
    expect(cards.length).toBe(6);
  });

  it('should have role="status" and aria-busy="true" on the grid', () => {
    const grid = fixture.nativeElement.querySelector('[role="status"]');
    expect(grid).toBeTruthy();
    expect(grid.getAttribute('aria-busy')).toBe('true');
  });

  it('should NOT show skeleton cards after loading completes', () => {
    fixture.componentRef.setInput('count', 0);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.skeleton-card');
    expect(cards.length).toBe(0);
  });
});
