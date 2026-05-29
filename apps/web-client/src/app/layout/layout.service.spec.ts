import { TestBed } from '@angular/core/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { of } from 'rxjs';

import { LayoutService } from './layout.service.js';

describe('LayoutService', () => {
  describe('isMobile on desktop', () => {
    beforeEach(() => {
      const mockBreakpointObserver = {
        observe: vi
          .fn()
          .mockReturnValue(of({ matches: false, breakpoints: {} } as BreakpointState)),
      };

      TestBed.configureTestingModule({
        providers: [
          LayoutService,
          { provide: BreakpointObserver, useValue: mockBreakpointObserver },
        ],
      });
    });

    it('should return false when breakpoint does not match (desktop)', () => {
      const service = TestBed.inject(LayoutService);
      expect(service.isMobile()).toBe(false);
    });
  });

  describe('isMobile on mobile/tablet', () => {
    beforeEach(() => {
      const mockBreakpointObserver = {
        observe: vi.fn().mockReturnValue(of({ matches: true, breakpoints: {} } as BreakpointState)),
      };

      TestBed.configureTestingModule({
        providers: [
          LayoutService,
          { provide: BreakpointObserver, useValue: mockBreakpointObserver },
        ],
      });
    });

    it('should return true when XSmall or Small breakpoint matches (mobile)', () => {
      const service = TestBed.inject(LayoutService);
      expect(service.isMobile()).toBe(true);
    });

    it('should return true when Small breakpoint matches (tablet)', () => {
      const service = TestBed.inject(LayoutService);
      expect(service.isMobile()).toBe(true);
    });
  });
});
