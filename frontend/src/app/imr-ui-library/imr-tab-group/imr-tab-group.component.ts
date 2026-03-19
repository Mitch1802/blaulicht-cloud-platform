import { Component, Input, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatTabsModule } from '@angular/material/tabs'

/**
 * imr-tab-group
 *
 * Wrapper around mat-tab-group for tabbed interfaces.
 * Usage: <imr-tab-group>
 *          <imr-tab>
 *            <ng-template imrTabLabel>Tab 1</ng-template>
 *            <div>Content 1</div>
 *          </imr-tab>
 *        </imr-tab-group>
 */
@Component({
  selector: 'imr-tab-group',
  templateUrl: './imr-tab-group.component.html',
  styleUrl: './imr-tab-group.component.sass',
  standalone: true,
  imports: [CommonModule, MatTabsModule],
})
export class ImrTabGroupComponent {
  @Input() selectedIndex = 0
  @Output() selectedIndexChange = new EventEmitter<number>()
}


