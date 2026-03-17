/**
 * IMR UI Library – Barrel-Export
 *
 * Alle IMR-Komponenten werden hier zentral exportiert.
 * Import in Feature-Modulen:
 *
 * ```typescript
 * import { ImrPageLayoutComponent, ImrSectionCardComponent } from '../imr-ui-library';
 * ```
 *
 * Oder als Gruppen-Import (alle Komponenten):
 * ```typescript
 * import { IMR_UI_COMPONENTS } from '../imr-ui-library';
 * ```
 */

export * from './imr-page-layout.component';
export * from './imr-section-card.component';
export * from './imr-header.component';
export * from './imr-top-actions.component';
export * from './imr-form-actions.component';
export * from './imr-table-wrap.component';
export * from './imr-chips.component';
export * from './imr-form-grid.component';

import { ImrPageLayoutComponent } from './imr-page-layout.component';
import { ImrSectionCardComponent } from './imr-section-card.component';
import { ImrHeaderComponent } from './imr-header.component';
import { ImrTopActionsComponent } from './imr-top-actions.component';
import { ImrFormActionsComponent } from './imr-form-actions.component';
import { ImrTableWrapComponent } from './imr-table-wrap.component';
import { ImrChipsComponent } from './imr-chips.component';
import { ImrFormGridComponent } from './imr-form-grid.component';

/** Alle IMR UI-Komponenten als Array für einfachen Import in standalone-Komponenten */
export const IMR_UI_COMPONENTS = [
  ImrPageLayoutComponent,
  ImrSectionCardComponent,
  ImrHeaderComponent,
  ImrTopActionsComponent,
  ImrFormActionsComponent,
  ImrTableWrapComponent,
  ImrChipsComponent,
  ImrFormGridComponent,
] as const;
