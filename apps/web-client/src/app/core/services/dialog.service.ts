import { Injectable, inject, ComponentType } from '@angular/core';
import { Dialog, DialogRef, DialogConfig } from '@angular/cdk/dialog';
import { Observable } from 'rxjs';

/**
 * DialogService - Wrapper around Angular CDK Dialog
 *
 * Provides a simplified API for opening dialogs with Tailwind styling.
 * Replaces Angular Material Dialog with CDK Dialog for better customization.
 *
 * Usage:
 * ```typescript
 * const dialogRef = this.dialogService.open(MyDialogComponent, {
 *   data: someData,
 *   width: '400px',
 *   panelClass: 'custom-dialog'
 * });
 *
 * dialogRef.closed.subscribe(result => {
 *   console.log('Dialog closed with result:', result);
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private readonly cdkDialog = inject(Dialog);

  /**
   * Opens a dialog with the specified component
   *
   * @param component - The component to render in the dialog
   * @param config - Optional dialog configuration
   * @returns DialogRef with the component instance
   */
  open<T, D = unknown, R = unknown>(
    component: ComponentType<T>,
    config?: DialogConfig<D>
  ): DialogRef<R, T> {
    // Default configuration with Tailwind-friendly classes
    const defaultConfig: DialogConfig<D> = {
      panelClass: 'dialog-panel',
      backdropClass: 'dialog-backdrop',
      hasBackdrop: true,
      disableClose: false,
      ...config,
    };

    return this.cdkDialog.open<R, D, T>(component, defaultConfig);
  }

  /**
   * Closes all open dialogs
   */
  closeAll(): void {
    this.cdkDialog.closeAll();
  }

  /**
   * Observable that emits when a dialog is opened
   */
  get afterOpened(): Observable<DialogRef<unknown>> {
    return this.cdkDialog.afterOpened;
  }
}
