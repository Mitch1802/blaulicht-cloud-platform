import { Component } from '@angular/core'
import { MatCardModule } from '@angular/material/card'

/**
 * imr-card-title
 *
 * Wrapper around mat-card-title. Use inside imr-card-header.
 */
@Component({
  selector: 'imr-card-title',
  template: `<mat-card-title><ng-content></ng-content></mat-card-title>`,
  standalone: true,
  imports: [MatCardModule],
})
export class ImrCardTitleComponent {}
