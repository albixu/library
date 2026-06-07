import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component.js';
import { FooterComponent } from '../footer/footer.component.js';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component.js';
import { LayoutService } from '../layout.service.js';

/**
 * MainLayoutComponent - Main application layout wrapper
 *
 * Features:
 * - Header with logo and theme toggle at the top
 * - Main content area with router-outlet
 * - Footer with copyright and GitHub link at the bottom
 * - Bottom navigation bar on mobile (conditionally rendered)
 * - Flexbox layout with min-height: 100vh
 * - Content area grows to fill available space
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="main-layout">
      <app-header />
      <main class="main-layout__content" [class.main-layout__content--mobile]="isMobile()">
        <router-outlet />
      </main>
      @if (isMobile()) {
        <app-bottom-nav />
      }
      <app-footer />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .main-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
      }

      .main-layout__content {
        flex: 1;
        display: flex;
        flex-direction: column;
        background-color: var(--color-bg-primary);
        transition: background-color var(--transition-normal);
        overflow: hidden;
      }

      .main-layout__content--mobile {
        padding-bottom: var(--bottom-nav-height);
      }
    `,
  ],
})
export class MainLayoutComponent {
  private readonly layoutService = inject(LayoutService);
  readonly isMobile = this.layoutService.isMobile;
}
