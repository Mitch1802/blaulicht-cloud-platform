import { NgTemplateOutlet } from '@angular/common'
import { StepperOrientation, StepperSelectionEvent } from '@angular/cdk/stepper'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import {
  AfterContentInit,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  inject,
} from '@angular/core'
import { MatStepperModule } from '@angular/material/stepper'
import { ImrStepComponent } from '../imr-step.component'

export type ImrStepperLabelPosition = 'bottom' | 'end'

/**
 * imr-stepper
 *
 * Wrapper around mat-stepper.
 */
@Component({
  selector: 'imr-stepper',
  templateUrl: './imr-stepper.component.html',
  styleUrl: './imr-stepper.component.sass',
  standalone: true,
  imports: [NgTemplateOutlet, MatStepperModule],
})
export class ImrStepperComponent implements AfterContentInit {
  private destroyRef = inject(DestroyRef)
  private cdr = inject(ChangeDetectorRef)

  @ContentChildren(ImrStepComponent) steps?: QueryList<ImrStepComponent>

  @Input() linear = false
  @Input() selectedIndex = 0
  @Input() orientation: StepperOrientation = 'horizontal'
  @Input() labelPosition: ImrStepperLabelPosition = 'end'
  @Output() selectedIndexChange = new EventEmitter<number>()
  @Output() selectionChange = new EventEmitter<StepperSelectionEvent>()

  renderedSteps: ImrStepComponent[] = []

  ngAfterContentInit(): void {
    this.syncSteps()
    this.steps?.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncSteps()
      this.cdr.markForCheck()
    })
  }

  private syncSteps(): void {
    this.renderedSteps = this.steps?.toArray() ?? []
  }
}
