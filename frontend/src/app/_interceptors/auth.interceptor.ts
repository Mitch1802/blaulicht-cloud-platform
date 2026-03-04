import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

let refreshInFlight$: Observable<boolean> | null = null;
const csrfHeaderName = 'X-CSRFToken';

const isApiRequest = (url: string): boolean => {
  return url.startsWith(environment.apiUrl) || url.startsWith('/api/');
};

const isAuthRefreshRequest = (url: string): boolean => {
  return /\/auth\/token\/refresh\/?$/.test(url);
};

const isLoginOrLogoutRequest = (url: string): boolean => {
  return /\/auth\/(login|logout)\/?$/.test(url);
};

const isPublicBearerRequest = (url: string, hasAuthorizationHeader: boolean): boolean => {
  return hasAuthorizationHeader && /\/public\//.test(url);
};

const readCookieValue = (name: string): string => {
  if (typeof document === 'undefined' || !document.cookie) {
    return '';
  }

  const parts = document.cookie.split(';').map((entry) => entry.trim());
  const match = parts.find((entry) => entry.startsWith(`${name}=`));
  if (!match) {
    return '';
  }

  return decodeURIComponent(match.substring(name.length + 1));
};

const isMutatingMethod = (method: string): boolean => {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
};

const withCsrfHeader = (request: HttpRequest<unknown>): HttpRequest<unknown> => {
  if (!isMutatingMethod(request.method) || request.headers.has(csrfHeaderName)) {
    return request;
  }

  const csrfToken = readCookieValue('csrftoken');
  if (!csrfToken) {
    return request;
  }

  return request.clone({
    setHeaders: {
      [csrfHeaderName]: csrfToken,
    },
  });
};

const requestAccessTokenRefresh = (httpBackend: HttpBackend): Observable<boolean> => {
  const bareHttpClient = new HttpClient(httpBackend);
  const csrfToken = readCookieValue('csrftoken');
  const headers = csrfToken ? { [csrfHeaderName]: csrfToken } : undefined;

  return bareHttpClient.post(`${environment.apiUrl}auth/token/refresh/`, {}, { withCredentials: true, headers }).pipe(
    map(() => true),
    catchError(() => of(false))
  );
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const httpBackend = inject(HttpBackend);
  const requestWithCredentials = withCsrfHeader(req.clone({ withCredentials: true }));
  const skipRefresh =
    isAuthRefreshRequest(requestWithCredentials.url)
    || isLoginOrLogoutRequest(requestWithCredentials.url)
    || isPublicBearerRequest(requestWithCredentials.url, requestWithCredentials.headers.has('Authorization'));

  return next(requestWithCredentials).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || skipRefresh) {
        return throwError(() => error);
      }

      if (!refreshInFlight$) {
        refreshInFlight$ = requestAccessTokenRefresh(httpBackend).pipe(
          finalize(() => {
            refreshInFlight$ = null;
          }),
          shareReplay(1)
        );
      }

      return refreshInFlight$.pipe(
        switchMap((refreshSucceeded) => {
          if (!refreshSucceeded) {
            return throwError(() => error);
          }
          return next(requestWithCredentials);
        })
      );
    })
  );
};
