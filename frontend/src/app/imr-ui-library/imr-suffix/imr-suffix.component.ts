import { Component } from '@angular/core'
import { MatFormFieldModule } from '@angular/material/form-field'

@Component({
  selector: 'imr-suffix',
  templateUrl: './imr-suffix.component.html',
  styleUrl: './imr-suffix.component.sass',
  standalone: true,
  imports: [MatFormFieldModule],
})
export class ImrSuffixComponent {}

