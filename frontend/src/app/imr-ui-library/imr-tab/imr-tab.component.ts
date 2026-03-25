import { Component, Input, TemplateRef, ViewChild } from '@angular/core'

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
  imports: [],
})
export class ImrTabComponent {
  @Input() label = ''
  @ViewChild(TemplateRef, { static: true }) contentTpl!: TemplateRef<unknown>
}


