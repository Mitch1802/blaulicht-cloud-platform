import { Component, ContentChild, Input, AfterContentInit } from '@angular/core'
import { MatExpansionModule } from '@angular/material/expansion'
import { ImrPanelTitleComponent } from './imr-panel-title.component'
import { ImrPanelDescriptionComponent } from './imr-panel-description.component'

/**
 * imr-expansion-panel
 *
 * Wrapper around mat-expansion-panel.
 * Supports imr-panel-title and imr-panel-description slot components for the header.
 * Usage:
 *   <imr-expansion-panel>
 *     <imr-panel-title>Title</imr-panel-title>
 *     <imr-panel-description>Description</imr-panel-description>
 *     <div>Panel content</div>
 *   </imr-expansion-panel>
 */
@Component({
  selector: 'imr-expansion-panel',
  template: `
    <mat-expansion-panel [class]="panelClass">
      @if (hasHeader) {
        <mat-expansion-panel-header>
          <mat-panel-title><ng-content select="imr-panel-title"></ng-content></mat-panel-title>
          <mat-panel-description><ng-content select="imr-panel-description"></ng-content></mat-panel-description>
        </mat-expansion-panel-header>
      }
      <ng-content></ng-content>
    </mat-expansion-panel>
  `,
  standalone: true,
  imports: [MatExpansionModule, ImrPanelTitleComponent, ImrPanelDescriptionComponent],
})
export class ImrExpansionPanelComponent implements AfterContentInit {
  @Input() panelClass = ''
  @ContentChild(ImrPanelTitleComponent) panelTitle?: ImrPanelTitleComponent
  hasHeader = false

  ngAfterContentInit() {
    this.hasHeader = !!this.panelTitle
  }
}
