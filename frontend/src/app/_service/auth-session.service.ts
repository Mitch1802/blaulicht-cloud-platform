import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiHttpService } from './api-http.service';
import { UiMessageService } from './ui-message.service';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private api = inject(ApiHttpService);
  private router = inject(Router);
  private messages = inject(UiMessageService);

  abmelden(): void {
    this.api.post('auth/logout', null, false).subscribe({
      next: () => {
        this.clearSessionAndCookies();
        this.router.navigate(['/login']);
      },
      error: (error: any) => {
        this.errorAnzeigen(error);
      },
    });
  }

  errorAnzeigen(response: any): void {
    const errorObject = response?.error;

    if (errorObject && typeof errorObject === 'object') {
      const msg = Object.values(errorObject)
        .map((value) => String(value))
        .join('\n');

      if (msg !== '') {
        this.messages.erstelleMessage('error', msg);
      }
    }

    if (response?.status === 401) {
      this.clearSessionAndCookies();
      this.router.navigate(['/login']);
    }
  }

  private clearSessionAndCookies(): void {
    sessionStorage.clear();
    document.cookie.split('; ').forEach((cookie) => {
      const [name] = cookie.split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  }
}
