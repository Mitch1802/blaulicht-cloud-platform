import { Component, HostListener, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GlobalDataService } from '../_service/global-data.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatSuffix, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

type VersionInfo = {
  version: string;
  commit: string;
  channel: string;
  builtAt?: string;
};

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.sass'],
    imports: [
      CommonModule,
      MatCardModule,
      FormsModule,
      ReactiveFormsModule,
      MatFormField,
      MatLabel,
      MatInput,
      MatError,
      MatIcon,
      MatSuffix,
      MatButton,
      MatIconButton,
      HttpClientModule
    ]
})

export class LoginComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private globalDataService = inject(GlobalDataService);
  private http = inject(HttpClient);

  title: string = environment.title;
  modul: string = "auth/login";
  form!: FormGroup;
  versionInfo?: VersionInfo;
  screenResolution = '';
  isSubmitting = false;

  public showPassword: boolean = false;

  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnInit(): void {
    this.http.get<VersionInfo>('/assets/version.json').subscribe({
      next: (v) => (this.versionInfo = v),
      error: () => (this.versionInfo = undefined),
    });

    this.updateScreenResolution();

    this.clearLoginSessionState();

    this.form = this.formBuilder.group({
      user: ['', Validators.required],
      pwd: ['', Validators.required]
    });
  }

  get isTestVersion(): boolean {
    const version = String(this.versionInfo?.version ?? '').toLowerCase();
    const channel = String(this.versionInfo?.channel ?? '').toLowerCase();
    return version.includes('test') || channel.includes('test');
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateScreenResolution();
  }

  private updateScreenResolution(): void {
    if (typeof window === 'undefined') {
      this.screenResolution = '';
      return;
    }
    this.screenResolution = `${window.innerWidth} x ${window.innerHeight}px`;
  }

  private clearLoginSessionState(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    const keysToClear = ['PageNumber', 'Benutzername', 'public_token_global', 'auth_guard_ok_until'];
    keysToClear.forEach((key) => sessionStorage.removeItem(key));

    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && /^Page\d+$/.test(key)) {
        sessionStorage.removeItem(key);
      }
    }
  }

  get f() { return this.form.controls; }

  anmelden(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const data = {
      "username": this.f.user.value,
      "password": this.f.pwd.value
    };

    this.globalDataService
      .post(this.modul, data, false)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (erg: any) => {
          try {
            this.router.navigate(['/start']);
          } catch (e: any) {
            this.globalDataService.erstelleMessage("error", e);
          }
        },
        error: (error: any) => {
          this.globalDataService.errorAnzeigen(error);
        }
      });
  }
}
