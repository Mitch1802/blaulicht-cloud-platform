import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GlobalDataService } from '../_service/global-data.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';

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
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatIcon, MatSuffix, MatButton]
})

export class LoginComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private globalDataService = inject(GlobalDataService);

  modul = "auth/login";
  form!: FormGroup;
  versionInfo?: VersionInfo;

  public showPassword = false;

  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnInit(): void {
    this.http.get<VersionInfo>('/assets/version.json').subscribe({
      next: (v) => (this.versionInfo = v),
      error: () => (this.versionInfo = undefined),
    });

    if (sessionStorage.getItem("Token")) {
      this.router.navigate(['/start']);
    } else {
      this.ladeFooter();
      sessionStorage.clear();

      this.form = this.formBuilder.group({
        user: ['', Validators.required],
        pwd: ['', Validators.required]
      });
    }
  }

  get f() { return this.form.controls; }

  anmelden(): void {
    const data = {
      "username": this.f.user.value,
      "password": this.f.pwd.value
    };

    this.globalDataService.post(this.modul, data, false).subscribe({
      next: (erg: any) => {
        try {
          sessionStorage.setItem("Token", erg.access);
          sessionStorage.setItem('Benutzername', erg.user.username);
          sessionStorage.setItem('Rollen', JSON.stringify(erg.user.roles));
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
