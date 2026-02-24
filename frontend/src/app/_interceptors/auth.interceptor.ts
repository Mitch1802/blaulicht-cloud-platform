import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiRequest = req.url.startsWith(environment.apiUrl) || req.url.startsWith('/api/');

  if (!isApiRequest) {
    return next(req);
  }

  return next(req.clone({ withCredentials: true }));
};
