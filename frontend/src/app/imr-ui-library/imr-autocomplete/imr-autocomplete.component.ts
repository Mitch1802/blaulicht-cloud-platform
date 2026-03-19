import { Component, EventEmitter, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete'

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
  templateUrl: './imr-autocomplete.component.html',
  styleUrl: './imr-autocomplete.component.sass',
  standalone: true,
  imports: [CommonModule, MatAutocompleteModule],
})
export class ImrAutocompleteComponent {
  @Output() selectionChange = new EventEmitter<MatAutocompleteSelectedEvent>()
}


