import { booleanAttribute, Component, Input, TemplateRef, ViewChild } from '@angular/core'

/**
 * imr-step
 *
 * Slot-Komponente fuer einen Schritt innerhalb von imr-stepper.
 */
@Component({
  selector: 'imr-step',
  templateUrl: './imr-step.component.html',
  styleUrl: './imr-step.component.sass',
  standalone: true,
})
export class ImrStepComponent {
  @Input() label = ''
  @Input({ transform: booleanAttribute }) optional = false
  @Input({ transform: booleanAttribute }) editable = true
  @Input({ transform: booleanAttribute }) hasError = false
  @Input() completed: boolean | null = null
  @Input() errorMessage = ''
  @Input() state = ''
  @Input() stepClass = ''

  @ViewChild(TemplateRef, { static: true }) contentTemplate!: TemplateRef<unknown>
}
