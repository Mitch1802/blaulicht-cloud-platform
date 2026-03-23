import { booleanAttribute, Component, ElementRef, inject, Input } from '@angular/core'

/**
 * imr-option
 *
 * Data-holder component for use with imr-select.
 * imr-select collects these via @ContentChildren and renders
 * corresponding mat-option elements so that mat-select's content
 * query can discover them properly.
 * Usage: <imr-option value="val">Label</imr-option>
 */
@Component({
  selector: 'imr-option',
  templateUrl: './imr-option.component.html',
  styleUrl: './imr-option.component.sass',
  standalone: true,
})
export class ImrOptionComponent {
  @Input() value: unknown
  @Input({ transform: booleanAttribute }) disabled = false

  private readonly el = inject(ElementRef<HTMLElement>)

  /** Returns the rendered text content of this option (used as mat-option label). */
  get viewLabel(): string {
    return (this.el.nativeElement.textContent ?? '').trim()
  }
}


