import { Component, Input } from '@angular/core'
import { MatToolbarModule } from '@angular/material/toolbar'

/**
 * imr-toolbar
 *
 * Wrapper around mat-toolbar.
 */
@Component({
  selector: 'imr-toolbar',
  templateUrl: './imr-toolbar.component.html',
  styleUrl: './imr-toolbar.component.sass',
  standalone: true,
  imports: [MatToolbarModule],
})
export class ImrToolbarComponent {
  @Input() toolbarClass = ''
}