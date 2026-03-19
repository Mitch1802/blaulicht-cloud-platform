import { Component, Input, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatChipsModule } from '@angular/material/chips'

/**
 * imr-chip
 *
 * Wrapper around mat-chip.
 * Usage: <imr-chip [removable]="true" (removed)="onRemoved()">Label</imr-chip>
 */
@Component({
  selector: 'imr-chip',
  templateUrl: './imr-chip.component.html',
  styleUrl: './imr-chip.component.sass',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
})
export class ImrChipComponent {
  @Input() removable = false
  @Input() chipClass = ''
  @Output() removed = new EventEmitter()
}


