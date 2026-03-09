import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiHttpService } from '../_service/api-http.service';

export const guestGuard: CanActivateFn = () => {
  const apiHttpService = inject(ApiHttpService);
  const router = inject(Router);

  return apiHttpService.get('users/self').pipe(
    map(() => router.createUrlTree(['/start'])),
    catchError(() => of(true))
  );
};
