import { booleanAttribute, Component, Input } from '@angular/core'
import { MatOptionModule } from '@angular/material/core'

/**
 * imr-option
 *
 * Wrapper around mat-option.
 * Usage: <imr-option value="val">Label</imr-option>
 */
@Component({
  selector: 'imr-option',
  template: `
    <mat-option [value]="value" [disabled]="disabled">
      <ng-content></ng-content>
    </mat-option>
  `,
  standalone: true,
  imports: [MatOptionModule],
})
export class ImrOptionComponent {
  @Input() value: any
  @Input({ transform: booleanAttribute }) disabled = false
}
