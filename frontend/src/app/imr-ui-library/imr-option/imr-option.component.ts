import { booleanAttribute, Component, Input } from '@angular/core'
import { MatOptionModule } from '@angular/material/core'

/**
 * imr-option
 *
 * Wrapper around mat-option.
 * Usage: <imr-option value="val">Label</imr-option>
 */
@Component({
  selector: 'imr-option',
  templateUrl: './imr-option.component.html',
  styleUrl: './imr-option.component.sass',
  standalone: true,
  imports: [MatOptionModule],
})
export class ImrOptionComponent {
  @Input() value: unknown
  @Input({ transform: booleanAttribute }) disabled = false
}


