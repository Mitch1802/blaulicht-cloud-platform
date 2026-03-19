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
  templateUrl: './imr-divider.component.html',
  styleUrl: './imr-divider.component.sass',
  standalone: true,
  imports: [MatDividerModule],
})
export class ImrDividerComponent {
  @Input() dividerClass = ''
}


