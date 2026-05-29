import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component.js';
import { provideZonelessChangeDetection } from '@angular/core';
import { signal } from '@angular/core';
import { LayoutService } from '../layout.service.js';
import { AuthService } from '../../auth/auth.service.js';
import { Dialog } from '@angular/cdk/dialog';
import { vi } from 'vitest';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let isMobileSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    isMobileSignal = signal(false);

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: LayoutService, useValue: { isMobile: isMobileSignal } },
        { provide: AuthService, useValue: { currentUser: signal(null), logout: vi.fn() } },
        { provide: Dialog, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Structure', () => {
    it('should have a main layout container', () => {
      const container = fixture.nativeElement.querySelector('.main-layout');
      expect(container).toBeTruthy();
    });

    it('should use flexbox column layout', () => {
      const container = fixture.nativeElement.querySelector('.main-layout');
      expect(container.classList.contains('main-layout')).toBe(true);
    });
  });

  describe('Header', () => {
    it('should include the header component', () => {
      const header = fixture.nativeElement.querySelector('app-header');
      expect(header).toBeTruthy();
    });

    it('should render header as the first child', () => {
      const container = fixture.nativeElement.querySelector('.main-layout');
      expect(container.firstElementChild.tagName.toLowerCase()).toBe('app-header');
    });
  });

  describe('Content', () => {
    it('should have a main content area', () => {
      const content = fixture.nativeElement.querySelector('.main-layout__content');
      expect(content).toBeTruthy();
    });

    it('should include router-outlet for content', () => {
      const routerOutlet = fixture.nativeElement.querySelector('router-outlet');
      expect(routerOutlet).toBeTruthy();
    });

    it('should have main element for semantic structure', () => {
      const main = fixture.nativeElement.querySelector('main');
      expect(main).toBeTruthy();
    });
  });

  describe('Footer', () => {
    it('should include the footer component', () => {
      const footer = fixture.nativeElement.querySelector('app-footer');
      expect(footer).toBeTruthy();
    });

    it('should render footer as the last child', () => {
      const container = fixture.nativeElement.querySelector('.main-layout');
      expect(container.lastElementChild.tagName.toLowerCase()).toBe('app-footer');
    });
  });

  describe('Layout Order', () => {
    it('should have correct order: header → content → footer (desktop)', () => {
      const container = fixture.nativeElement.querySelector('.main-layout');
      const children = Array.from(container.children) as Element[];

      expect(children.length).toBe(3);
      expect(children[0].tagName.toLowerCase()).toBe('app-header');
      expect(children[1].tagName.toLowerCase()).toBe('main');
      expect(children[2].tagName.toLowerCase()).toBe('app-footer');
    });

    it('should show app-bottom-nav in mobile', async () => {
      isMobileSignal.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const bottomNav = fixture.nativeElement.querySelector('app-bottom-nav');
      expect(bottomNav).toBeTruthy();
    });
  });

  describe('Bottom Nav', () => {
    it('should render bottom-nav when mobile', async () => {
      isMobileSignal.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const bottomNav = fixture.nativeElement.querySelector('app-bottom-nav');
      expect(bottomNav).toBeTruthy();
    });

    it('should NOT render bottom-nav when desktop', () => {
      isMobileSignal.set(false);
      fixture.detectChanges();

      const bottomNav = fixture.nativeElement.querySelector('app-bottom-nav');
      expect(bottomNav).toBeFalsy();
    });
  });

  describe('Mobile padding', () => {
    it('should add mobile class to content when isMobile is true', async () => {
      isMobileSignal.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const content = fixture.nativeElement.querySelector('.main-layout__content');
      expect(content.classList.contains('main-layout__content--mobile')).toBe(true);
    });

    it('should NOT add mobile class when desktop', () => {
      isMobileSignal.set(false);
      fixture.detectChanges();

      const content = fixture.nativeElement.querySelector('.main-layout__content');
      expect(content.classList.contains('main-layout__content--mobile')).toBe(false);
    });
  });
});
