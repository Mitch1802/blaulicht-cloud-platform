import { Component, Input } from '@angular/core'
import { MatListModule } from '@angular/material/list'

/**
 * imr-list
 *
 * Wrapper around mat-list.
 */
@Component({
  selector: 'imr-list',
  templateUrl: './imr-list.component.html',
  styleUrl: './imr-list.component.sass',
  standalone: true,
  imports: [MatListModule],
})
export class ImrListComponent {
  @Input() listClass = ''
}