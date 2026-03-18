import { Component, Input } from '@angular/core'
import { MatProgressBarModule } from '@angular/material/progress-bar'

/**
 * imr-progress-bar
 *
 * Wrapper around mat-progress-bar.
 * Usage: <imr-progress-bar mode="indeterminate"></imr-progress-bar>
 */
@Component({
  selector: 'imr-progress-bar',
  template: `
    <mat-progress-bar [mode]="mode" [value]="value" [class]="barClass"></mat-progress-bar>
  `,
  standalone: true,
  imports: [MatProgressBarModule],
})
export class ImrProgressBarComponent {
  @Input() mode: 'determinate' | 'indeterminate' | 'buffer' | 'query' = 'indeterminate'
  @Input() value = 0
  @Input() barClass = ''
}
