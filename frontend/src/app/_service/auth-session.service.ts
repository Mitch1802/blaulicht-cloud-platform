import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiHttpService } from './api-http.service';
import { UiMessageService } from './ui-message.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private api = inject(ApiHttpService);
  private router = inject(Router);
  private messages = inject(UiMessageService);
  private readonly knownCookieNames = new Set([
    'app-access-token',
    'app-refresh-token',
    'csrftoken',
    'sessionid',
  ]);

  abmelden(): void {
    this.api.post('auth/logout', null, false).subscribe({
      next: () => {
        this.clearSessionAndCookies();
        this.router.navigate(['/login']);
      },
      error: (error: unknown) => {
        this.errorAnzeigen(error);
      },
    });
  }

  errorAnzeigen(response: unknown): void {
    const responseObj = response as { error?: unknown; status?: number };
    const errorObject = responseObj?.error;

    if (errorObject && typeof errorObject === 'object') {
      const msg = Object.values(errorObject)
        .map((value) => String(value))
        .join('\n');

      if (msg !== '') {
        this.messages.erstelleMessage('error', msg);
      }
    }

    if (responseObj?.status === 401) {
      this.clearSessionAndCookies();
      this.router.navigate(['/login']);
    }
  }

  private clearSessionAndCookies(): void {
    this.clearSessionState();
    this.clearKnownCookies();
  }

  private clearSessionState(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    ['PageNumber', 'Benutzername', 'public_token_global', 'auth_guard_ok_until', 'sw-cleanup-reloaded']
      .forEach((key) => sessionStorage.removeItem(key));

    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && /^Page\d+$/.test(key)) {
        sessionStorage.removeItem(key);
      }
    }
  }

  private clearKnownCookies(): void {
    if (typeof document === 'undefined') {
      return;
    }

    let refreshPath = '/auth/token/refresh/';
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const apiPath = new URL(String(environment.apiUrl || '/api/v1/'), base).pathname.replace(/\/+$/g, '');
      refreshPath = `${apiPath}/auth/token/refresh/`;
    } catch {
      refreshPath = '/auth/token/refresh/';
    }

    document.cookie
      .split(';')
      .map((entry) => entry.trim())
      .forEach((cookie) => {
        const [name] = cookie.split('=');
        if (!this.knownCookieNames.has(name)) {
          return;
        }

        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${refreshPath}; SameSite=Lax`;
      });
  }
}

