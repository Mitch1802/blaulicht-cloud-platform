import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

let refreshInFlight$: Observable<boolean> | null = null;
let csrfBootstrapInFlight$: Observable<string> | null = null;
const csrfHeaderName = 'X-CSRFToken';

type CsrfCookieResponse = {
  csrfToken?: string;
};

const isApiRequest = (url: string): boolean => {
  return url.startsWith(environment.apiUrl) || url.startsWith('/api/');
};

const isAuthRefreshRequest = (url: string): boolean => {
  return /\/auth\/token\/refresh\/?$/.test(url);
};

const isLoginOrLogoutRequest = (url: string): boolean => {
  return /\/auth\/(login|logout)\/?$/.test(url);
};

const isCsrfCookieRequest = (url: string): boolean => {
  return /\/auth\/csrf\/?$/.test(url);
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

const withCsrfHeader = (request: HttpRequest<unknown>, csrfToken = readCookieValue('csrftoken')): HttpRequest<unknown> => {
  if (!isMutatingMethod(request.method) || request.headers.has(csrfHeaderName) || !csrfToken) {
    return request;
  }

  return request.clone({
    setHeaders: {
      [csrfHeaderName]: csrfToken,
    },
  });
};

const ensureCsrfToken = (httpBackend: HttpBackend): Observable<string> => {
  const existingCsrfToken = readCookieValue('csrftoken');
  if (existingCsrfToken) {
    return of(existingCsrfToken);
  }

  if (!csrfBootstrapInFlight$) {
    const bareHttpClient = new HttpClient(httpBackend);

    csrfBootstrapInFlight$ = bareHttpClient.get<CsrfCookieResponse>(`${environment.apiUrl}auth/csrf/`, { withCredentials: true }).pipe(
      map((response) => String(response?.csrfToken || readCookieValue('csrftoken') || '')),
      finalize(() => {
        csrfBootstrapInFlight$ = null;
      }),
      shareReplay(1)
    );
  }

  return csrfBootstrapInFlight$;
};

const requestAccessTokenRefresh = (httpBackend: HttpBackend): Observable<boolean> => {
  const bareHttpClient = new HttpClient(httpBackend);
  return ensureCsrfToken(httpBackend).pipe(
    switchMap((csrfToken) => {
      const headers = csrfToken ? { [csrfHeaderName]: csrfToken } : undefined;

      return bareHttpClient.post(`${environment.apiUrl}auth/token/refresh/`, {}, { withCredentials: true, headers }).pipe(
        map(() => true),
        catchError(() => of(false))
      );
    })
  );
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const httpBackend = inject(HttpBackend);
  const requestWithCredentials = req.clone({ withCredentials: true });

  const sendRequest = (requestToSend: HttpRequest<unknown>) => {
    const skipRefresh =
      isAuthRefreshRequest(requestToSend.url)
      || isLoginOrLogoutRequest(requestToSend.url)
      || isPublicBearerRequest(requestToSend.url, requestToSend.headers.has('Authorization'));

    return next(requestToSend).pipe(
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

            return next(requestToSend);
          })
        );
      })
    );
  };

  if (isMutatingMethod(requestWithCredentials.method) && !requestWithCredentials.headers.has(csrfHeaderName) && !readCookieValue('csrftoken') && !isCsrfCookieRequest(requestWithCredentials.url)) {
    return ensureCsrfToken(httpBackend).pipe(
      switchMap((csrfToken) => sendRequest(withCsrfHeader(requestWithCredentials, csrfToken)))
    );
  }

  return sendRequest(withCsrfHeader(requestWithCredentials));
};

