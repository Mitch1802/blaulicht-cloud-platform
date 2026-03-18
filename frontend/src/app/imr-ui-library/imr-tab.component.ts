import { Component, Input } from '@angular/core'
import { MatTabsModule } from '@angular/material/tabs'

/**
 * imr-tab
 *
 * Wrapper around mat-tab.
 * Usage: <imr-tab label="Tab Title">Content</imr-tab>
 */
@Component({
  selector: 'imr-tab',
  template: `
    <mat-tab [label]="label">
      <ng-content></ng-content>
    </mat-tab>
  `,
  standalone: true,
  imports: [MatTabsModule],
})
export class ImrTabComponent {
  @Input() label = ''
}
