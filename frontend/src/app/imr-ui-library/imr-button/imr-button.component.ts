import { Component, Input } from '@angular/core'
import { MatButton } from '@angular/material/button'

@Component({
  selector: 'imr-button',
  templateUrl: './imr-button.component.html',
  styleUrl: './imr-button.component.sass',
  standalone: true,
  imports: [
    MatButton
  ],
})
export class ImrButtonComponent {
  @Input() clickHandler?: () => void
  @Input() disabled = false
}


