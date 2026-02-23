import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarHorizontalPosition } from '@angular/material/snack-bar';
import { MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Observable, BehaviorSubject, finalize } from 'rxjs';
import { environment } from "src/environments/environment";


@Injectable({
  providedIn: 'root',
})
export class GlobalDataService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private _snackBar = inject(MatSnackBar);

  Demo = false;
  Author = "Ing. M. Reichenauer";
  AppUrl: string = environment.apiUrl;
  MaxUploadSize = 20480; // 20 MB => 1024 KB = 1 MB
  MessageShowInSeconds = 5; // Sekundenloading$ = new BehaviorSubject<boolean>(false);
  private loadingCount = 0;
  loading$ = new BehaviorSubject<boolean>(false);

  private setLoading(on: boolean) {
    this.loadingCount += on ? 1 : -1;
    if (this.loadingCount < 0) this.loadingCount = 0;
    this.loading$.next(this.loadingCount > 0);
  }

  private withLoading<T>(obs: Observable<T>): Observable<T> {
    this.setLoading(true);
    return obs.pipe(finalize(() => this.setLoading(false)));
  }

  abmelden(): void {
    const modul = 'auth/logout';
    this.post(modul, null, false).subscribe({
      next: (erg: any) => {
        try {
          sessionStorage.clear();
          document.cookie.split('; ').forEach(cookie => {
            const [name] = cookie.split('=');
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          });
          this.router.navigate(['/login']);
        } catch (e: any) {
          this.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.errorAnzeigen(error);
      }
    });
  }

  errorAnzeigen(response: any): void {
    if ('error' in response) {
      let msg = '';
      let count = 0;
      for (const [key, value] of Object.entries(response.error)) {
        if (count > 0) {
          msg += '\n';
        }
        msg += value;
        count += 1;
      }
      if (msg !== '') {
        this.erstelleMessage('error', msg);
      }
    }
    if (response.status == 401) {
      sessionStorage.clear();
      document.cookie.split('; ').forEach(cookie => {
        const [name] = cookie.split('=');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      this.router.navigate(['/login']);
      return;
    }

  }

  arraySortByKey(array: any[], key: any) {
    array.sort(function (a: any, b: any) {
      return a[key] == b[key] ? 0 : +(a[key] > b[key]) || -1;
    });
    return array;
  }

  arraySortByKeyDesc(array: any[], key: any) {
    array.sort(function (a: any, b: any) {
      return a[key] == b[key] ? 0 : +(a[key] < b[key]) || -1;
    });
    return array;
  }

  sucheArrayInArray(
    gesamtArray: any[],
    teilArray: any[],
    vergleichKey: string
  ) {
    const arrayNeu = [];
    for (let i = 0; i < gesamtArray.length; i++) {
      let count = 0;
      for (let x = 0; x < teilArray.length; x++) {
        if (gesamtArray[i][vergleichKey] == teilArray[x][vergleichKey]) {
          count += 1;
        }
      }
      if (count == 0) {
        arrayNeu.push(gesamtArray[i]);
      }
    }
    return arrayNeu;
  }

  sucheNumberArrayInObjectArray(gesamtArray: any[], teilArray: any[], gesamtArrayKey: string) {
    const arrayNeu = [];
    for (let i = 0; i < gesamtArray.length; i++) {
      let count = 0;
      for (let x = 0; x < teilArray.length; x++) {
        if (gesamtArray[i][gesamtArrayKey] == teilArray[x]) {
          count += 1;
        }
      }
      if (count == 0) {
        arrayNeu.push(gesamtArray[i]);
      }
    }
    return arrayNeu;
  }

  vergleicheZweiArrays(
    array1: any[],
    array2: any[],
    vergleichKey: string
  ) {
    const arrayNeu = array1;
    for (let i = 0; i < array2.length; i++) {
      let count = 0;
      for (let x = 0; x < arrayNeu.length; x++) {
        if (array2[i][vergleichKey] == arrayNeu[x][vergleichKey]) {
          count += 1;
        }
      }
      if (count == 0) {
        arrayNeu.push(array2[i]);
      }
    }
    return arrayNeu;
  }

  addItemFromSelectToList(
    control: AbstractControl,
    arrayGesamt: any[],
    array: any[]
  ): void {
    const selectedId = control.value;
    if (selectedId !== '0') {
      if (array.length > 0) {
        let count = 0;
        for (let i = 0; i < array.length; i++) {
          if (selectedId === array[i]) {
            count += 1;
          }
        }
        if (count === 0) {
          for (let i = 0; i < arrayGesamt.length; i++) {
            if (selectedId === arrayGesamt[i].pkid) {
              array.push({
                pkid: arrayGesamt[i].pkid,
                kuerzel: arrayGesamt[i].kuerzel,
                name: arrayGesamt[i].name,
              });
              arrayGesamt.splice(i, 1);
            }
          }
        }
      } else {
        for (let i = 0; i < arrayGesamt.length; i++) {
          if (selectedId === arrayGesamt[i].pkid) {
            array.push({
              pkid: arrayGesamt[i].pkid,
              kuerzel: arrayGesamt[i].kuerzel,
              name: arrayGesamt[i].name,
            });
            arrayGesamt.splice(i, 1);
          }
        }
      }

      control.setValue(0, { onlySelf: true });
      array = this.arraySortByKey(array, 'kuerzel');
    }
  }

  addItemFromListToSelect(
    pkid: string,
    arrayGesamt: any[],
    array: any[]
  ): void {
    for (let i = 0; i < array.length; i++) {
      if (pkid === array[i].pkid) {
        arrayGesamt.push({ pkid: array[i].pkid, kuerzel: array[i].kuerzel, name: array[i].name });
        array.splice(i, 1);
      }
    }
    arrayGesamt = this.arraySortByKey(arrayGesamt, 'kuerzel');
  }

  addFeldInArray(
    arrayGesamt: any[],
    array: any[],
    feldName: string,
    joinKey: string
  ): any[] {
    const map = new Map(
      arrayGesamt.map(item => [item[joinKey], item[feldName]])
    );

    return array.map(item => {
      const key = item[joinKey];
      if (map.has(key)) {
        return { ...item, [feldName]: map.get(key) };
      }
      return item;
    });
  }

  addAllFieldsToNumberArray(arrayGesamt: any[], array: any[]): any[] {
    const data_new = [];
    for (let i = 0; i < array.length; i++) {
      const pkid = array[i];
      for (let x = 0; x < arrayGesamt.length; x++) {
        if (pkid == arrayGesamt[x].pkid) {
          data_new.push(arrayGesamt[x]);
        }
      }
    }

    return data_new;
  }

  ladeHeaders(filesVorhanden: boolean): HttpHeaders {
    const token: string | null = sessionStorage.getItem('Token');
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', 'Bearer ' + token);
    }

    if (!filesVorhanden) {
      headers = headers.set('Content-Type', 'application/json; charset=utf-8');
    }
    return headers;
  }

  get(modul: string, param?: any, afterSlash?: boolean): Observable<any[]> {
    const headers = this.ladeHeaders(false);
    let url = this.AppUrl + modul;
    let paramUrl = '';
    for (const prop in param) {
      if (param.hasOwnProperty(prop)) {
        if (paramUrl == '') {
          paramUrl += '?' + prop + '=' + param[prop];
        } else {
          paramUrl += '&' + prop + '=' + param[prop];
        }
      }
    }

    if (paramUrl == '') {
      url += '/';
    } else {
      if (afterSlash == true) {
        url += '/';
      }
      url += paramUrl;
    }

    const response: any = this.http.get<any[]>(url, { headers: headers });

    return this.withLoading(response);
  }

  getURL(url: string): Observable<any[]> {
    const response: any = this.http.get<any[]>(url);

    return this.withLoading(response);
  }

  post(modul: string, daten: any, filesVorhanden?: boolean): Observable<any[]> {
    const isFD = typeof FormData !== 'undefined' && daten instanceof FormData;
    const headers = this.ladeHeaders(isFD ?? false);
    const url = this.AppUrl + modul + '/';
    return this.withLoading(this.http.post<any[]>(url, daten, { headers }));
  }

  cleanupOrphanMedia(payload: {
    target?: 'all' | 'news' | 'inventar';
    delete?: boolean;
    allow_missing_db?: boolean;
  }): Observable<any> {
    return this.post('files/cleanup-orphans', payload, false) as Observable<any>;
  }

  postBlob(modul: string, daten: any): Observable<Blob> {
    const isFD = typeof FormData !== 'undefined' && daten instanceof FormData;
    const headers = this.ladeHeaders(isFD).set('Accept', 'application/pdf');

    const url = this.AppUrl + modul + '/';

    return this.withLoading(this.http.post(url, daten, {
      headers,
      responseType: 'blob'
    }));
  }

  patch(modul: string, id: any, daten: any, filesVorhanden?: boolean): Observable<any[]> {
    const isFD = typeof FormData !== 'undefined' && daten instanceof FormData;
    const headers = this.ladeHeaders(isFD ?? false);
    let url = ''
    if (id !== '') {
      url += `${this.AppUrl}${modul}/${id}/`;
    } else {
      url += `${this.AppUrl}${modul}/`;
    }
    
    return this.withLoading(this.http.patch<any[]>(url, daten, { headers }));
  }

  delete(modul: string, id: any): Observable<any[]> {
    const headers = this.ladeHeaders(false);
    const url = this.AppUrl + modul + '/' + id + '/';
    const response: any = this.http.delete<any[]>(url, { headers: headers });

    return this.withLoading(response);
  }

  ladeBreadcrumb(): any[] {
    let list: any = [];
    let pageNumber: number = parseInt(
      sessionStorage.getItem('PageNumber')!
    );

    let page1: string = sessionStorage.getItem('Page1')!;
    let page2: string = sessionStorage.getItem('Page2')!;
    let page3: string = sessionStorage.getItem('Page3')!;


    if (pageNumber == 1) {
      list.push(this.erstelleBreadcrumbLink(page1, true));
      sessionStorage.setItem('Page2', '');
      sessionStorage.setItem('Page3', '');
    } else if (pageNumber >= 1) {
      list.push(this.erstelleBreadcrumbLink(page1, false));
    }

    if (pageNumber == 2) {
      list.push(this.erstelleBreadcrumbLink(page2, true));
      sessionStorage.setItem('Page3', '');
    } else if (pageNumber >= 2) {
      list.push(this.erstelleBreadcrumbLink(page2, false));
    }

    if (pageNumber == 3) {
      list.push(this.erstelleBreadcrumbLink(page3, true));
    }

    for (let i = 0; i < list.length; i++) {
      list[i].number = i + 1;
    }

    return list;
  }

  erstelleBreadcrumbLink(pagename: string, active: boolean): any {
    let link = '';
    const page = pagename.replace(' ', '');
    let kuerzel = '';
    if (page.toLowerCase() == 'start') {
      link = '/start';
      kuerzel = 'Start';
    } else if (page == 'FMD') {
      link = '/fmd';
      kuerzel = 'FMD';
    } else if (page == 'ATM') {
      link = '/atemschutz';
      kuerzel = 'Atemschutz';
    } else if (page == 'ATM_M') {
      link = '/atemschutz/masken';
      kuerzel = 'Masken';
    } else if (page == 'ATM_G') {
      link = '/atemschutz/geraete';
      kuerzel = 'Geräte';
    } else if (page == 'ATM_MG') {
      link = '/atemschutz/messgeraete';
      kuerzel = 'Messgeräte';
    } else if (page == 'ATM_DB') {
      link = '/atemschutz/dienstbuch';
      kuerzel = 'Dienstbuch';
    } else if (page == 'NEWS') {
      link = '/news';
      kuerzel = 'News';
    } else if (page == 'FZ') {
      link = '/fahrzeuge';
      kuerzel = 'Fahrzeug Beladung';
    } else if (page == 'INV') {
      link = '/inventar';
      kuerzel = 'Inventar';
    } else if (page == 'PDF') {
      link = '/pdf_templates';
      kuerzel = 'PDF Templates';
    } else if (page == 'VER') {
      link = '/verwaltung';
      kuerzel = 'Verwaltung';
    } else if (page == 'V_M') {
      link = '/mitglied';
      kuerzel = 'Mitglieder';
    } else if (page == 'V_MK') {
      link = '/modul_konfiguration';
      kuerzel = 'Modul Konfiguration';
    } else if (page == 'V_B') {
      link = '/benutzer';
      kuerzel = 'Benutzer';
    } else if (page == 'V_KO') {
      link = '/konfiguration';
      kuerzel = 'Konfiguration';
    } else if (page == 'V_ED') {
      link = '/eigene_daten';
      kuerzel = 'Eigene Daten';
    }

    const btn = {
      name: pagename,
      link: link,
      number: 0,
      kuerzel: kuerzel,
      active: active,
    };

    return btn;
  }

  setzeNeueBreadcrumbDaten(pageNeu: string, pageNumber: number): any {
    const pageNumberBack: number = pageNumber - 1;
    const pageNumberForward: number = pageNumber + 1;
    const pageBack: string = sessionStorage.getItem("Page" + pageNumberBack)!;
    const page: string = sessionStorage.getItem("Page" + pageNumber)!;
    let pageForward = '';

    if (pageNumberForward <= 6) {
      pageForward = sessionStorage.getItem("Page" + pageNumberForward)!;
    }

    if (pageNeu == pageBack) {
      sessionStorage.setItem("PageNumber", pageNumberBack.toString());
      sessionStorage.setItem("Page" + pageNumberBack, pageNeu);
    } else if (pageNeu == page) {
      sessionStorage.setItem("PageNumber", pageNumber.toString());
      sessionStorage.setItem("Page" + pageNumber, pageNeu);
    } else {
      sessionStorage.setItem("PageNumber", pageNumberForward.toString());
      sessionStorage.setItem("Page" + pageNumberForward, pageNeu);
    }
  }

  erstelleMessage(art: string, msg: string) {
    const horizontalPosition: MatSnackBarHorizontalPosition = 'center';
    const verticalPosition: MatSnackBarVerticalPosition = 'bottom';
    let panelClass = '';

    if (art == 'success') {
      panelClass = 'msg-snackbar-success';
    } else if (art == 'info') {
      panelClass = 'msg-snackbar-info';
    } else if (art == 'error') {
      panelClass = 'msg-snackbar-error';
    }

    this._snackBar.open(msg, 'X', {
      horizontalPosition: horizontalPosition,
      verticalPosition: verticalPosition,
      duration: this.MessageShowInSeconds * 1000,
      panelClass: panelClass,
    });
  }

  ladeFooter(): string {
    const year = new Date().getFullYear();
    const author = this.Author;
    const footer = "Version " + environment.version + "\n" + String.fromCharCode(169) + " " + year + " by " + author;
    return footer;
  }

  getWithBearer(modul: string, token: string): Observable<any[]> {
    const headers = this.ladeHeaders(false).set("Authorization", "Bearer " + token);
    const url = this.AppUrl + modul + '/';
    const response: any = this.http.get<any[]>(url, { headers });
    return this.withLoading(response);
  }


}
