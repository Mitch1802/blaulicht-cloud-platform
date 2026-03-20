import { booleanAttribute, Component, EventEmitter, Input, Output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'

type ImrButtonVariant = 'flat' | 'stroked' | 'raised' | 'basic' | 'icon' | 'fab' | 'mini-fab'
type ImrButtonType = 'button' | 'submit' | 'reset'
type ImrButtonColor = 'primary' | 'accent' | 'warn'

@Component({
  selector: 'imr-button',
  templateUrl: './imr-button.component.html',
  styleUrl: './imr-button.component.sass',
  standalone: true,
  imports: [MatButtonModule],
})
export class ImrButtonComponent {
  @Input() variant: ImrButtonVariant = 'flat'
  @Input() type: ImrButtonType = 'button'
  @Input() color: ImrButtonColor = 'accent'
  @Input() buttonClass = ''
  @Input() ariaLabel: string | null = null
  @Input() id: string | null = null
  @Input() name: string | null = null
  @Input() value: string | null = null
  @Input() clickHandler?: () => void
  @Output() clicked = new EventEmitter<MouseEvent>()

  @Input({ transform: booleanAttribute }) fullWidth = true
  @Input({ transform: booleanAttribute }) disabled = false

  handleClick(event: MouseEvent): void {
    this.clickHandler?.()
    this.clicked.emit(event)
  }
}


