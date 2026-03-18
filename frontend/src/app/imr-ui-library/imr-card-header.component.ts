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
  template: `<mat-card-header><ng-content></ng-content></mat-card-header>`,
  standalone: true,
  imports: [MatCardModule],
})
export class ImrCardHeaderComponent {}
