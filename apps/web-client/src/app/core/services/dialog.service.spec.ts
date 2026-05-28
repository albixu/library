import { TestBed } from '@angular/core/testing';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Subject } from 'rxjs';
import { Component, provideZonelessChangeDetection } from '@angular/core';

import { DialogService } from './dialog.service.js';

// Dummy component to use as dialog content in tests
@Component({ selector: 'app-dummy-dialog', template: '', standalone: true })
class DummyDialogComponent {}

describe('DialogService', () => {
  let service: DialogService;
  let mockCdkDialog: {
    open: ReturnType<typeof vi.fn>;
    closeAll: ReturnType<typeof vi.fn>;
    afterOpened: Subject<DialogRef<unknown>>;
  };
  let mockDialogRef: Partial<DialogRef<unknown, DummyDialogComponent>>;

  beforeEach(() => {
    mockDialogRef = {
      close: vi.fn(),
    };

    mockCdkDialog = {
      open: vi.fn().mockReturnValue(mockDialogRef),
      closeAll: vi.fn(),
      afterOpened: new Subject<DialogRef<unknown>>(),
    };

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), DialogService, { provide: Dialog, useValue: mockCdkDialog }],
    });

    service = TestBed.inject(DialogService);
  });

  describe('Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('open()', () => {
    it('should call cdkDialog.open with the given component', () => {
      service.open(DummyDialogComponent);

      expect(mockCdkDialog.open).toHaveBeenCalledWith(DummyDialogComponent, expect.any(Object));
    });

    it('should apply default panel and backdrop classes', () => {
      service.open(DummyDialogComponent);

      const calledConfig = mockCdkDialog.open.mock.calls[0][1];
      expect(calledConfig.panelClass).toBe('dialog-panel');
      expect(calledConfig.backdropClass).toBe('dialog-backdrop');
    });

    it('should enable backdrop by default', () => {
      service.open(DummyDialogComponent);

      const calledConfig = mockCdkDialog.open.mock.calls[0][1];
      expect(calledConfig.hasBackdrop).toBe(true);
    });

    it('should NOT disable close by default', () => {
      service.open(DummyDialogComponent);

      const calledConfig = mockCdkDialog.open.mock.calls[0][1];
      expect(calledConfig.disableClose).toBe(false);
    });

    it('should merge provided config over defaults', () => {
      service.open(DummyDialogComponent, {
        disableClose: true,
        width: '600px',
        data: { foo: 'bar' },
      });

      const calledConfig = mockCdkDialog.open.mock.calls[0][1];
      // Caller override wins
      expect(calledConfig.disableClose).toBe(true);
      expect(calledConfig.width).toBe('600px');
      expect(calledConfig.data).toEqual({ foo: 'bar' });
      // Defaults still present
      expect(calledConfig.panelClass).toBe('dialog-panel');
    });

    it('should allow caller to override panelClass', () => {
      service.open(DummyDialogComponent, { panelClass: 'my-custom-panel' });

      const calledConfig = mockCdkDialog.open.mock.calls[0][1];
      expect(calledConfig.panelClass).toBe('my-custom-panel');
    });

    it('should return the DialogRef from cdkDialog.open', () => {
      const ref = service.open(DummyDialogComponent);

      expect(ref).toBe(mockDialogRef);
    });

    it('should pass data to the dialog config', () => {
      const data = { id: '1', title: 'Clean Code' };
      service.open(DummyDialogComponent, { data });

      const calledConfig = mockCdkDialog.open.mock.calls[0][1];
      expect(calledConfig.data).toEqual(data);
    });
  });

  describe('closeAll()', () => {
    it('should delegate to cdkDialog.closeAll', () => {
      service.closeAll();

      expect(mockCdkDialog.closeAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('afterOpened', () => {
    it('should return the cdkDialog.afterOpened observable', () => {
      expect(service.afterOpened).toBe(mockCdkDialog.afterOpened);
    });

    it('should emit when cdkDialog.afterOpened emits', () => {
      const emitted: DialogRef<unknown>[] = [];
      service.afterOpened.subscribe((ref) => emitted.push(ref));

      const fakeRef = {} as DialogRef<unknown>;
      mockCdkDialog.afterOpened.next(fakeRef);

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toBe(fakeRef);
    });
  });
});
