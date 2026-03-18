import { Component, Input, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatAutocompleteModule } from '@angular/material/autocomplete'

/**
 * imr-autocomplete
 *
 * Wrapper around mat-autocomplete.
 * Usage: <imr-autocomplete #autocomplete="matAutocomplete">
 *          <imr-option>...</imr-option>
 *        </imr-autocomplete>
 */
@Component({
  selector: 'imr-autocomplete',
  template: `
    <mat-autocomplete (optionSelected)="selectionChange.emit($event)">
      <ng-content></ng-content>
    </mat-autocomplete>
  `,
  standalone: true,
  imports: [CommonModule, MatAutocompleteModule],
})
export class ImrAutocompleteComponent {
  @Output() selectionChange = new EventEmitter()
}
