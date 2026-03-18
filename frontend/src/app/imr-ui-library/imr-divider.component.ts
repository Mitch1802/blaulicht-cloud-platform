import { Component, Input } from '@angular/core'
import { MatDividerModule } from '@angular/material/divider'

/**
 * imr-divider
 *
 * Wrapper around mat-divider for horizontal dividers.
 * Usage: <imr-divider></imr-divider>
 */
@Component({
  selector: 'imr-divider',
  template: `<mat-divider [class]="dividerClass"></mat-divider>`,
  standalone: true,
  imports: [MatDividerModule],
})
export class ImrDividerComponent {
  @Input() dividerClass = ''
}
