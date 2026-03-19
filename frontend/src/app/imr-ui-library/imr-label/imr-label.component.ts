import { Component } from '@angular/core'
import { MatFormFieldModule } from '@angular/material/form-field'

/**
 * imr-label
 *
 * Wrapper around mat-label.
 * Usage: <imr-label>Field Label</imr-label>
 */
@Component({
  selector: 'imr-label',
  templateUrl: './imr-label.component.html',
  styleUrl: './imr-label.component.sass',
  standalone: true,
  imports: [MatFormFieldModule],
})
export class ImrLabelComponent {}


