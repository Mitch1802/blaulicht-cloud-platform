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
  templateUrl: './imr-progress-bar.component.html',
  styleUrl: './imr-progress-bar.component.sass',
  standalone: true,
  imports: [MatProgressBarModule],
})
export class ImrProgressBarComponent {
  @Input() mode: 'determinate' | 'indeterminate' | 'buffer' | 'query' = 'indeterminate'
  @Input() value = 0
  @Input() barClass = ''
}


