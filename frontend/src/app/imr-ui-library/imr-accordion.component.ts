import { booleanAttribute, Component, Input } from '@angular/core'
import { MatExpansionModule } from '@angular/material/expansion'

/**
 * imr-accordion
 *
 * Wrapper around mat-accordion.
 * Usage: <imr-accordion [multi]="true">
 *          <imr-expansion-panel>...</imr-expansion-panel>
 *        </imr-accordion>
 */
@Component({
  selector: 'imr-accordion',
  template: `
    <mat-accordion [multi]="multi">
      <ng-content></ng-content>
    </mat-accordion>
  `,
  standalone: true,
  imports: [MatExpansionModule],
})
export class ImrAccordionComponent {
  @Input({ transform: booleanAttribute }) multi = false
}
