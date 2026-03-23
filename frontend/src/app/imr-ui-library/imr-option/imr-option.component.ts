import { AfterContentChecked, booleanAttribute, Component, ElementRef, inject, Input } from '@angular/core'

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
export class ImrOptionComponent implements AfterContentChecked {
  @Input() value: unknown
  @Input({ transform: booleanAttribute }) disabled = false

  private readonly el = inject(ElementRef<HTMLElement>)
  private _viewLabel = ''

  /** Cached text content of this option, used as the mat-option label. */
  get viewLabel(): string {
    return this._viewLabel
  }

  ngAfterContentChecked(): void {
    this._viewLabel = (this.el.nativeElement.textContent ?? '').trim()
  }
}


