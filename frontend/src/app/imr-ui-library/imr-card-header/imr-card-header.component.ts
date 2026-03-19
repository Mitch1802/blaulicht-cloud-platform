import { Component } from '@angular/core'
import { MatCardModule } from '@angular/material/card'

/**
 * imr-card-header
 *
 * Wrapper around mat-card-header. Use inside imr-card.
 * Usage: <imr-card-header><imr-card-title>...</imr-card-title></imr-card-header>
 */
@Component({
  selector: 'imr-card-header',
  templateUrl: './imr-card-header.component.html',
  styleUrl: './imr-card-header.component.sass',
  standalone: true,
  imports: [MatCardModule],
})
export class ImrCardHeaderComponent {}


