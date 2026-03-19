import { Component, Input } from '@angular/core'
import { MatListModule } from '@angular/material/list'

/**
 * imr-list-item
 *
 * Wrapper around mat-list-item.
 */
@Component({
  selector: 'imr-list-item',
  templateUrl: './imr-list-item.component.html',
  styleUrl: './imr-list-item.component.sass',
  standalone: true,
  imports: [MatListModule],
})
export class ImrListItemComponent {
  @Input() itemClass = ''
}