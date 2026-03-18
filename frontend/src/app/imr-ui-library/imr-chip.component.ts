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
  template: `
    <mat-chip [removable]="removable" (removed)="removed.emit()" [class]="chipClass">
      <ng-content></ng-content>
    </mat-chip>
  `,
  standalone: true,
  imports: [CommonModule, MatChipsModule],
})
export class ImrChipComponent {
  @Input() removable = false
  @Input() chipClass = ''
  @Output() removed = new EventEmitter()
}
