import {
  booleanAttribute,
  Component,
  Input,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'imr-input',
  templateUrl: './imr-input.component.html',
  styleUrl: './imr-input.component.sass',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
})
export class ImrInputComponent {
  @Input({ required: true }) control!: FormControl;

  @Input() hintLabel = ''
  @Input() label = ''
  @Input() type = 'text'
  @Input() placeholder = ''
  @Input() autocomplete = 'off'
  @Input() fieldClass = 'imr-full-width'
  @Input() appearance: 'fill' | 'outline' = 'outline'
  @Input() subscriptSizing: 'fixed' | 'dynamic' = 'dynamic'

  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Input({ transform: booleanAttribute })
  set disabled(value: boolean) {
    if (value) {
      this.control.disable({ emitEvent: false });
    } else {
      this.control.enable({ emitEvent: false });
    }
  }
}