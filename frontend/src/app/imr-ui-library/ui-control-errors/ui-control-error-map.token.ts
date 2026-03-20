import { AbstractControl } from '@angular/forms'
import { InjectionToken } from '@angular/core'

export type UiControlErrorMessageFactory = (errorValue: unknown, control: AbstractControl) => string
export type UiControlErrorValue = string | UiControlErrorMessageFactory
export type UiControlErrorMap = Record<string, UiControlErrorValue>

export const DEFAULT_UI_CONTROL_ERROR_MAP: UiControlErrorMap = {
  required: 'Pflichtfeld',
  minlength: (errorValue: unknown) => {
    const minlengthError = errorValue as { requiredLength?: number; actualLength?: number }
    const requiredLength = minlengthError.requiredLength ?? 0
    const actualLength = minlengthError.actualLength ?? 0
    return `Mindestens ${requiredLength} Zeichen (aktuell ${actualLength})`
  },
  email: 'Ungültige E-Mail',
}

export const UI_CONTROL_ERROR_MAP = new InjectionToken<UiControlErrorMap>('UI_CONTROL_ERROR_MAP', {
  providedIn: 'root',
  factory: () => DEFAULT_UI_CONTROL_ERROR_MAP,
})
