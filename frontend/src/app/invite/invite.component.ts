import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';

import { ApiHttpService } from '../_service/api-http.service';
import {
  ImrPageLayoutComponent,
  ImrSectionComponent,
  UiControlErrorsDirective,
} from '../imr-ui-library';
import { UiMessageService } from '../_service/ui-message.service';

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ImrPageLayoutComponent,
    ImrSectionComponent,
    UiControlErrorsDirective,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
  ],
  templateUrl: './invite.component.html',
  styleUrl: './invite.component.sass',
})
export class InviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiHttpService = inject(ApiHttpService);
  private uiMessageService = inject(UiMessageService);

  isSubmitting = false;
  tokenMissing = false;

  form = new FormGroup({
    token: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password1: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    password2: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  ngOnInit(): void {
    const token = String(this.route.snapshot.queryParamMap.get('token') || '').trim();
    this.form.controls.token.setValue(token);
    this.tokenMissing = token === '';

    if (this.tokenMissing) {
      this.uiMessageService.erstelleMessage('error', 'Einladungslink enthält keinen Token.');
    }
  }

  get passwordsMatch(): boolean {
    return this.form.controls.password1.value === this.form.controls.password2.value;
  }

  abschliessen(): void {
    if (this.tokenMissing) {
      return;
    }

    if (this.form.invalid || !this.passwordsMatch || this.isSubmitting) {
      this.form.markAllAsTouched();
      if (!this.passwordsMatch) {
        this.uiMessageService.erstelleMessage('error', 'Passwörter stimmen nicht überein.');
      }
      return;
    }

    this.isSubmitting = true;
    const payload = {
      token: this.form.controls.token.value,
      password1: this.form.controls.password1.value,
      password2: this.form.controls.password2.value,
    };

    this.apiHttpService
      .post('auth/invite/complete', payload, false)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.uiMessageService.erstelleMessage('success', 'Passwort erfolgreich gesetzt. Du kannst dich jetzt anmelden.');
          this.router.navigate(['/login']);
        },
        error: (error: { error?: { detail?: string } }) => {
          const detail = String(error?.error?.detail || 'Einladungslink ist ungültig oder abgelaufen.');
          this.uiMessageService.erstelleMessage('error', detail);
        },
      });
  }
}
