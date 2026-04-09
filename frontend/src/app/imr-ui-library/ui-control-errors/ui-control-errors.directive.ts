import {
  Component,
  ComponentRef,
  DestroyRef,
  Directive,
  EnvironmentInjector,
  Input,
  OnDestroy,
  OnInit,
  ViewContainerRef,
  inject,
} from '@angular/core'
import { AbstractControl, NgControl } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { startWith } from 'rxjs/operators'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'

import { UI_CONTROL_ERROR_MAP, UiControlErrorMap } from './ui-control-error-map.token'

@Component({
  selector: 'ui-control-error-outlet',
  standalone: true,
  imports: [MatFormFieldModule],
  template: '<mat-error>{{ message }}</mat-error>',
})
class UiControlErrorOutletComponent {
  @Input() message = ''
}

@Directive({
  selector: '[uiControlErrors]',
  standalone: true,
})
export class UiControlErrorsDirective implements OnInit, OnDestroy {
  @Input('uiControlErrors') errorMapOverride: UiControlErrorMap | '' | null = null

  private readonly ngControl = inject(NgControl, { self: true, optional: true })
  private readonly viewContainerRef = inject(ViewContainerRef)
  private readonly environmentInjector = inject(EnvironmentInjector)
  private readonly destroyRef = inject(DestroyRef)
  private readonly globalErrorMap = inject(UI_CONTROL_ERROR_MAP)

  private errorOutletRef: ComponentRef<UiControlErrorOutletComponent> | null = null

  ngOnInit(): void {
    const control = this.ngControl?.control
    if (!control) {
      return
    }

    control.statusChanges
      .pipe(startWith(control.status), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.renderError(control)
      })
  }

  ngOnDestroy(): void {
    this.clearError()
  }

  private renderError(control: AbstractControl): void {
    const errors = control.errors
    if (!errors) {
      this.clearError()
      return
    }

    const firstErrorKey = Object.keys(errors)[0]
    const firstErrorValue = errors[firstErrorKey]
    const map =
      !this.errorMapOverride || typeof this.errorMapOverride === 'string'
        ? this.globalErrorMap
        : this.errorMapOverride
    const mapEntry = map[firstErrorKey]

    if (!mapEntry) {
      this.clearError()
      return
    }

    const message = typeof mapEntry === 'function'
      ? mapEntry(firstErrorValue, control)
      : mapEntry

    this.ensureOutlet()
    this.errorOutletRef?.setInput('message', message)
  }

  private ensureOutlet(): void {
    if (this.errorOutletRef) {
      return
    }

    this.errorOutletRef = this.viewContainerRef.createComponent(UiControlErrorOutletComponent, {
      environmentInjector: this.environmentInjector,
    })
  }

  private clearError(): void {
    this.clearOutletOnly()
  }

  private clearOutletOnly(): void {
    if (!this.errorOutletRef) {
      return
    }

    this.errorOutletRef.destroy()
    this.errorOutletRef = null
  }
}
