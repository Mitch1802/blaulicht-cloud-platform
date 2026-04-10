import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from 'src/environments/environment';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let cookieSpy: jasmine.Spy<() => string>;

  beforeEach(() => {
    cookieSpy = spyOnProperty(document, 'cookie', 'get').and.returnValue('');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('bootstraps a csrf token before the first mutating api request', () => {
    let response: { access_token: string } | undefined;

    http.post<{ access_token: string }>(`${environment.apiUrl}public/pin/verify/`, { pin: '1234' }).subscribe((value) => {
      response = value;
    });

    const csrfReq = httpMock.expectOne(`${environment.apiUrl}auth/csrf/`);
    expect(csrfReq.request.method).toBe('GET');
    expect(csrfReq.request.withCredentials).toBeTrue();
    csrfReq.flush({ csrfToken: 'bootstrap-token' });

    const verifyReq = httpMock.expectOne(`${environment.apiUrl}public/pin/verify/`);
    expect(verifyReq.request.method).toBe('POST');
    expect(verifyReq.request.withCredentials).toBeTrue();
    expect(verifyReq.request.headers.get('X-CSRFToken')).toBe('bootstrap-token');
    verifyReq.flush({ access_token: 'token' });

    expect(response).toEqual({ access_token: 'token' });
  });

  it('bootstraps a csrf token before refreshing an expired access token', () => {
    let response: unknown;

    http.get(`${environment.apiUrl}fahrzeuge/`).subscribe((value) => {
      response = value;
    });

    const initialReq = httpMock.expectOne(`${environment.apiUrl}fahrzeuge/`);
    expect(initialReq.request.withCredentials).toBeTrue();
    initialReq.flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    const csrfReq = httpMock.expectOne(`${environment.apiUrl}auth/csrf/`);
    expect(csrfReq.request.method).toBe('GET');
    expect(csrfReq.request.withCredentials).toBeTrue();
    csrfReq.flush({ csrfToken: 'refresh-token' });

    const refreshReq = httpMock.expectOne(`${environment.apiUrl}auth/token/refresh/`);
    expect(refreshReq.request.method).toBe('POST');
    expect(refreshReq.request.withCredentials).toBeTrue();
    expect(refreshReq.request.headers.get('X-CSRFToken')).toBe('refresh-token');
    refreshReq.flush({});

    const retriedReq = httpMock.expectOne(`${environment.apiUrl}fahrzeuge/`);
    expect(retriedReq.request.withCredentials).toBeTrue();
    retriedReq.flush([{ id: '1' }]);

    expect(response).toEqual([{ id: '1' }]);
  });

  it('uses an existing csrf cookie without fetching a new one', () => {
    cookieSpy.and.returnValue('csrftoken=existing-token');

    http.post(`${environment.apiUrl}public/pin/verify/`, { pin: '1234' }).subscribe();

    httpMock.expectNone(`${environment.apiUrl}auth/csrf/`);

    const verifyReq = httpMock.expectOne(`${environment.apiUrl}public/pin/verify/`);
    expect(verifyReq.request.headers.get('X-CSRFToken')).toBe('existing-token');
    verifyReq.flush({});
  });
});
