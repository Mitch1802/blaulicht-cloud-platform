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

// Material Wrapper Components (IMR)
export * from './imr-button.component';
export * from './imr-card.component';
export * from './imr-card-content/imr-card-content.component';
export * from './imr-card-header.component';
export * from './imr-card-title.component';
export * from './imr-form-field.component';
export * from './ui-control-errors.directive';
export * from './ui-control-error-map.token';
export * from './imr-input.component';
export * from './imr-label.component';
export * from './imr-error.component';
export * from './imr-icon.component';
export * from './imr-toolbar/imr-toolbar.component';
export * from './imr-suffix.component';
export * from './imr-select.component';
export * from './imr-select-trigger.component';
export * from './imr-option.component';
export * from './imr-checkbox.component';
export * from './imr-autocomplete.component';
export * from './imr-paginator.component';
export * from './imr-tab-group.component';
export * from './imr-tab.component';
export * from './imr-accordion.component';
export * from './imr-expansion-panel/imr-expansion-panel.component';
export * from './imr-expansion-panel-header/imr-expansion-panel-header.component';
export * from './imr-panel-title.component';
export * from './imr-panel-description.component';
export * from './imr-divider.component';
export * from './imr-progress-bar.component';
export * from './imr-chip.component';
export * from './imr-chip-set.component';
export * from './imr-chip-remove.component';
export * from './imr-list/imr-list.component';
export * from './imr-list-item/imr-list-item.component';
export * from './imr-stepper/imr-stepper.component';
export * from './imr-step/imr-step.component';

import { ImrPageLayoutComponent } from './imr-page-layout.component';
import { ImrSectionCardComponent } from './imr-section-card.component';
import { ImrHeaderComponent } from './imr-header.component';
import { ImrTopActionsComponent } from './imr-top-actions.component';
import { ImrFormActionsComponent } from './imr-form-actions.component';
import { ImrTableWrapComponent } from './imr-table-wrap.component';
import { ImrChipsComponent } from './imr-chips.component';
import { ImrFormGridComponent } from './imr-form-grid.component';

// Material Wrapper Components
import { ImrButtonComponent } from './imr-button.component';
import { ImrInputComponent } from './imr-input.component';
import { ImrCardComponent } from './imr-card.component';
import { ImrCardContentComponent } from './imr-card-content/imr-card-content.component';
import { ImrCardHeaderComponent } from './imr-card-header.component';
import { ImrCardTitleComponent } from './imr-card-title.component';
import { ImrFormFieldComponent } from './imr-form-field.component';
import { UiControlErrorsDirective } from './ui-control-errors.directive';
import { ImrLabelComponent } from './imr-label.component';
import { ImrErrorComponent } from './imr-error.component';
import { ImrIconComponent } from './imr-icon.component';
import { ImrToolbarComponent } from './imr-toolbar.component';
import { ImrSuffixComponent } from './imr-suffix.component';
import { ImrSelectComponent } from './imr-select.component';
import { ImrSelectTriggerComponent } from './imr-select-trigger.component';
import { ImrOptionComponent } from './imr-option.component';
import { ImrCheckboxComponent } from './imr-checkbox.component';
import { ImrAutocompleteComponent } from './imr-autocomplete.component';
import { ImrPaginatorComponent } from './imr-paginator.component';
import { ImrTabGroupComponent } from './imr-tab-group.component';
import { ImrTabComponent } from './imr-tab.component';
import { ImrAccordionComponent } from './imr-accordion.component';
import { ImrExpansionPanelComponent } from './imr-expansion-panel/imr-expansion-panel.component';
import { ImrExpansionPanelHeaderComponent } from './imr-expansion-panel-header/imr-expansion-panel-header.component';
import { ImrPanelTitleComponent } from './imr-panel-title.component';
import { ImrPanelDescriptionComponent } from './imr-panel-description.component';
import { ImrDividerComponent } from './imr-divider.component';
import { ImrProgressBarComponent } from './imr-progress-bar.component';
import { ImrChipComponent } from './imr-chip.component';
import { ImrChipSetComponent } from './imr-chip-set.component';
import { ImrChipRemoveComponent } from './imr-chip-remove.component';
import { ImrListComponent } from './imr-list/imr-list.component';
import { ImrListItemComponent } from './imr-list-item/imr-list-item.component';
import { ImrStepperComponent } from './imr-stepper/imr-stepper.component';
import { ImrStepComponent } from './imr-step/imr-step.component';

/** Alle IMR UI-Komponenten als Array für einfachen Import in standalone-Komponenten */
export const IMR_UI_COMPONENTS = [
  ImrButtonComponent,
  ImrInputComponent,
  ImrPageLayoutComponent,
  ImrSectionCardComponent,
  ImrHeaderComponent,
  ImrTopActionsComponent,
  ImrFormActionsComponent,
  ImrTableWrapComponent,
  ImrChipsComponent,
  ImrFormGridComponent,
  ImrCardComponent,
  ImrCardContentComponent,
  ImrCardHeaderComponent,
  ImrCardTitleComponent,
  ImrFormFieldComponent,
  UiControlErrorsDirective,
  ImrLabelComponent,
  ImrErrorComponent,
  ImrIconComponent,
  ImrToolbarComponent,
  ImrSuffixComponent,
  ImrSelectComponent,
  ImrSelectTriggerComponent,
  ImrOptionComponent,
  ImrCheckboxComponent,
  ImrAutocompleteComponent,
  ImrPaginatorComponent,
  ImrTabGroupComponent,
  ImrTabComponent,
  ImrAccordionComponent,
  ImrExpansionPanelComponent,
  ImrExpansionPanelHeaderComponent,
  ImrPanelTitleComponent,
  ImrPanelDescriptionComponent,
  ImrDividerComponent,
  ImrProgressBarComponent,
  ImrChipComponent,
  ImrChipSetComponent,
  ImrChipRemoveComponent,
  ImrListComponent,
  ImrListItemComponent,
  ImrStepperComponent,
  ImrStepComponent,
] as const;
