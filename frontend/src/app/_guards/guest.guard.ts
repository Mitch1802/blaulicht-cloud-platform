import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { GlobalDataService } from '../_service/global-data.service';

export const guestGuard: CanActivateFn = () => {
  const globalDataService = inject(GlobalDataService);
  const router = inject(Router);

  return globalDataService.get('users/self').pipe(
    map(() => router.createUrlTree(['/start'])),
    catchError(() => of(true))
  );
};
