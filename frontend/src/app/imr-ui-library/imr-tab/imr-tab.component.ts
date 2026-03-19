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
  templateUrl: './imr-tab.component.html',
  styleUrl: './imr-tab.component.sass',
  standalone: true,
  imports: [MatTabsModule],
})
export class ImrTabComponent {
  @Input() label = ''
}


