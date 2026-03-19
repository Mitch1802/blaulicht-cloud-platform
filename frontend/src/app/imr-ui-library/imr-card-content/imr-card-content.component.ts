import { Component, Input } from '@angular/core'
import { MatCardModule } from '@angular/material/card'

/**
 * imr-card-content
 *
 * Wrapper around mat-card-content.
 */
@Component({
  selector: 'imr-card-content',
  templateUrl: './imr-card-content.component.html',
  styleUrl: './imr-card-content.component.sass',
  standalone: true,
  imports: [MatCardModule],
})
export class ImrCardContentComponent {
  @Input() contentClass = ''
}