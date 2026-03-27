import { AfterContentInit, Component, ContentChildren, EventEmitter, Input, OnDestroy, Output, QueryList } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatTabsModule } from '@angular/material/tabs'
import { Subscription } from 'rxjs'
import { ImrTabComponent } from '../imr-tab/imr-tab.component'

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
export class ImrTabGroupComponent implements AfterContentInit, OnDestroy {
  @ContentChildren(ImrTabComponent) tabs!: QueryList<ImrTabComponent>
  @Input() selectedIndex = 0
  @Output() selectedIndexChange = new EventEmitter<number>()
  renderedTabs: ImrTabComponent[] = []
  private tabsChangesSub?: Subscription

  ngAfterContentInit(): void {
    this.syncTabs()
    this.tabsChangesSub = this.tabs.changes.subscribe(() => this.syncTabs())
  }

  ngOnDestroy(): void {
    this.tabsChangesSub?.unsubscribe()
  }

  onSelectedIndexChange(index: number): void {
    this.selectedIndex = index
    this.selectedIndexChange.emit(index)
  }

  private syncTabs(): void {
    this.renderedTabs = this.tabs?.toArray() ?? []
    if (this.renderedTabs.length === 0) {
      this.selectedIndex = 0
      return
    }

    if (this.selectedIndex < 0 || this.selectedIndex >= this.renderedTabs.length) {
      this.selectedIndex = 0
      this.selectedIndexChange.emit(this.selectedIndex)
    }
  }
}


