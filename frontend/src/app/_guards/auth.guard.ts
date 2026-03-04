import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';

const AUTH_GUARD_CACHE_KEY = 'auth_guard_ok_until';
const AUTH_GUARD_CACHE_MS = 30_000;

const hasValidGuardCache = (): boolean => {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  const validUntil = Number(sessionStorage.getItem(AUTH_GUARD_CACHE_KEY) ?? 0);
  return Number.isFinite(validUntil) && validUntil > Date.now();
};

const setGuardCache = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(AUTH_GUARD_CACHE_KEY, String(Date.now() + AUTH_GUARD_CACHE_MS));
};

const clearGuardCache = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(AUTH_GUARD_CACHE_KEY);
};

export const authGuard: CanActivateFn = () => {
  const http = inject(HttpClient);
  const router = inject(Router);

  if (hasValidGuardCache()) {
    return of(true);
  }

  return http.get(`${environment.apiUrl}users/self/`).pipe(
    map(() => {
      setGuardCache();
      return true;
    }),
    catchError(() => {
      clearGuardCache();
      return of(router.createUrlTree(['/login']));
    })
  );
};
