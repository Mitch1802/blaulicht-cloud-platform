import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatChipsModule } from '@angular/material/chips'

/**
 * imr-chip-set
 *
 * Wrapper around mat-chip-set.
 * Usage: <imr-chip-set>
 *          <imr-chip>Chip 1</imr-chip>
 *          <imr-chip>Chip 2</imr-chip>
 *        </imr-chip-set>
 */
@Component({
  selector: 'imr-chip-set',
  templateUrl: './imr-chip-set.component.html',
  styleUrl: './imr-chip-set.component.sass',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
})
export class ImrChipSetComponent {
  @Input() setClass = ''
}


