import { Component } from '@angular/core'

/**
 * imr-panel-title
 *
 * Slot component for imr-expansion-panel header title.
 * Usage: <imr-expansion-panel><imr-panel-title>Title</imr-panel-title>...</imr-expansion-panel>
 */
@Component({
  selector: 'imr-panel-title',
  template: `<ng-content></ng-content>`,
  standalone: true,
})
export class ImrPanelTitleComponent {}
