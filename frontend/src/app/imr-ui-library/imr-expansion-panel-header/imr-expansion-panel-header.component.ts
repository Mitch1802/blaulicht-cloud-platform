import { Component, Input, TemplateRef, ViewChild } from '@angular/core'

/**
 * imr-expansion-panel-header
 *
 * Slot-Komponente fuer einen benutzerdefinierten Header innerhalb von imr-expansion-panel.
 */
@Component({
  selector: 'imr-expansion-panel-header',
  templateUrl: './imr-expansion-panel-header.component.html',
  styleUrl: './imr-expansion-panel-header.component.sass',
  standalone: true,
})
export class ImrExpansionPanelHeaderComponent {
  @Input() headerClass = ''
  @Input() collapsedHeight = ''
  @Input() expandedHeight = ''

  @ViewChild(TemplateRef, { static: true }) contentTemplate!: TemplateRef<unknown>
}
