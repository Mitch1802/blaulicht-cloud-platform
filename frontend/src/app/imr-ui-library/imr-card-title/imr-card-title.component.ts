import { Component } from '@angular/core'
import { MatCardModule } from '@angular/material/card'

/**
 * imr-card-title
 *
 * Wrapper around mat-card-title. Use inside imr-card-header.
 */
@Component({
  selector: 'imr-card-title',
  templateUrl: './imr-card-title.component.html',
  styleUrl: './imr-card-title.component.sass',
  standalone: true,
  imports: [MatCardModule],
})
export class ImrCardTitleComponent {}


