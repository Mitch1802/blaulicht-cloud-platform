import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiHttpService {
  private http = inject(HttpClient);

  readonly AppUrl: string = environment.apiUrl;
  readonly MaxUploadSize = 20480; // 20 MB => 1024 KB = 1 MB

  private loadingCount = 0;
  private loadingEmitScheduled = false;
  readonly loading$ = new BehaviorSubject<boolean>(false);

  private scheduleLoadingEmit(): void {
    if (this.loadingEmitScheduled) {
      return;
    }

    this.loadingEmitScheduled = true;
    Promise.resolve().then(() => {
      this.loadingEmitScheduled = false;
      this.loading$.next(this.loadingCount > 0);
    });
  }

  private setLoading(on: boolean): void {
    this.loadingCount += on ? 1 : -1;
    if (this.loadingCount < 0) {
      this.loadingCount = 0;
    }
    this.scheduleLoadingEmit();
  }

  private withLoading<T>(obs: Observable<T>): Observable<T> {
    this.setLoading(true);
    return obs.pipe(finalize(() => this.setLoading(false)));
  }

  ladeHeaders(filesVorhanden: boolean, bearerToken?: string): HttpHeaders {
    let headers = new HttpHeaders();

    if (bearerToken) {
      headers = headers.set('Authorization', `Bearer ${bearerToken}`);
    }

    if (!filesVorhanden) {
      headers = headers.set('Content-Type', 'application/json; charset=utf-8');
    }

    return headers;
  }

  get<T = unknown>(modul: string, param?: any, afterSlash?: boolean): Observable<T> {
    const headers = this.ladeHeaders(false);
    const query = this.buildQueryString(param);

    let url = `${this.AppUrl}${modul}`;
    if (!query) {
      url += '/';
    } else {
      if (afterSlash === true) {
        url += '/';
      }
      url += query;
    }

    return this.withLoading(this.http.get<T>(url, { headers }));
  }

  getURL<T = unknown>(url: string): Observable<T> {
    return this.withLoading(this.http.get<T>(url));
  }

  post<T = unknown>(modul: string, daten: any, _filesVorhanden?: boolean): Observable<T> {
    const isFD = typeof FormData !== 'undefined' && daten instanceof FormData;
    const headers = this.ladeHeaders(isFD);
    const url = `${this.AppUrl}${modul}/`;

    return this.withLoading(this.http.post<T>(url, daten, { headers }));
  }

  patch<T = unknown>(modul: string, id: any, daten: any, _filesVorhanden?: boolean): Observable<T> {
    const isFD = typeof FormData !== 'undefined' && daten instanceof FormData;
    const headers = this.ladeHeaders(isFD);

    const url = id !== ''
      ? `${this.AppUrl}${modul}/${id}/`
      : `${this.AppUrl}${modul}/`;

    return this.withLoading(this.http.patch<T>(url, daten, { headers }));
  }

  delete<T = unknown>(modul: string, id: any): Observable<T> {
    const headers = this.ladeHeaders(false);
    const url = `${this.AppUrl}${modul}/${id}/`;

    return this.withLoading(this.http.delete<T>(url, { headers }));
  }

  postBlob(modul: string, daten: any): Observable<Blob> {
    const isFD = typeof FormData !== 'undefined' && daten instanceof FormData;
    const headers = this.ladeHeaders(isFD).set('Accept', 'application/pdf');
    const url = `${this.AppUrl}${modul}/`;

    return this.withLoading(this.http.post(url, daten, {
      headers,
      responseType: 'blob',
    }));
  }

  getWithBearer<T = unknown>(modul: string, token: string): Observable<T> {
    const headers = this.ladeHeaders(false, token);
    const url = `${this.AppUrl}${modul}/`;

    return this.withLoading(this.http.get<T>(url, { headers }));
  }

  cleanupOrphanMedia(payload: {
    target?: 'all' | 'news' | 'homepage' | 'inventar' | 'einsatzberichte' | 'anwesenheitsliste';
    delete?: boolean;
    allow_missing_db?: boolean;
  }): Observable<any> {
    return this.post('files/cleanup-orphans', payload, false);
  }

  private buildQueryString(param?: Record<string, any>): string {
    if (!param || typeof param !== 'object') {
      return '';
    }

    let query = '';
    for (const prop in param) {
      if (Object.prototype.hasOwnProperty.call(param, prop)) {
        query += query === '' ? `?${prop}=${param[prop]}` : `&${prop}=${param[prop]}`;
      }
    }

    return query;
  }
}
