import { NgTemplateOutlet } from '@angular/common'
import { AfterContentInit, Component, ContentChild, Input } from '@angular/core'
import { MatExpansionModule } from '@angular/material/expansion'
import { ImrPanelTitleComponent } from '../imr-panel-title/imr-panel-title.component'
import { ImrExpansionPanelHeaderComponent } from '../imr-expansion-panel-header/imr-expansion-panel-header.component'

/**
 * imr-expansion-panel
 *
 * Wrapper around mat-expansion-panel.
 * Supports either a dedicated imr-expansion-panel-header slot or
 * imr-panel-title and imr-panel-description for the header.
 */
@Component({
  selector: 'imr-expansion-panel',
  templateUrl: './imr-expansion-panel.component.html',
  styleUrl: './imr-expansion-panel.component.sass',
  standalone: true,
  imports: [NgTemplateOutlet, MatExpansionModule],
})
export class ImrExpansionPanelComponent implements AfterContentInit {
  @Input() panelClass = ''
  @ContentChild(ImrExpansionPanelHeaderComponent) panelHeader?: ImrExpansionPanelHeaderComponent
  @ContentChild(ImrPanelTitleComponent) panelTitle?: ImrPanelTitleComponent
  hasHeader = false

  ngAfterContentInit(): void {
    this.hasHeader = !!this.panelHeader || !!this.panelTitle
  }
}


