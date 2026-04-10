import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ImrBreadcrumbItem } from '../imr-ui-library';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  readonly Author = 'Ing. M. Reichenauer';

  ladeBreadcrumb(): ImrBreadcrumbItem[] {
    const list: ImrBreadcrumbItem[] = [];
    const pageNumber = Number.parseInt(sessionStorage.getItem('PageNumber') ?? '0', 10);

    const page1 = sessionStorage.getItem('Page1') ?? '';
    const page2 = sessionStorage.getItem('Page2') ?? '';
    const page3 = sessionStorage.getItem('Page3') ?? '';

    if (pageNumber === 1) {
      list.push(this.erstelleBreadcrumbLink(page1, true));
      sessionStorage.setItem('Page2', '');
      sessionStorage.setItem('Page3', '');
    } else if (pageNumber >= 1) {
      list.push(this.erstelleBreadcrumbLink(page1, false));
    }

    if (pageNumber === 2) {
      list.push(this.erstelleBreadcrumbLink(page2, true));
      sessionStorage.setItem('Page3', '');
    } else if (pageNumber >= 2) {
      list.push(this.erstelleBreadcrumbLink(page2, false));
    }

    if (pageNumber === 3) {
      list.push(this.erstelleBreadcrumbLink(page3, true));
    }

    for (let i = 0; i < list.length; i += 1) {
      list[i].number = i + 1;
    }

    return list;
  }

  erstelleBreadcrumbLink(pagename: string, _active: boolean): ImrBreadcrumbItem {
    let link = '';
    const page = String(pagename ?? '').replace(' ', '');
    let kuerzel = '';

    if (page.toLowerCase() === 'start') {
      link = '/start';
      kuerzel = 'Start';
    } else if (page === 'FMD') {
      link = '/fmd';
      kuerzel = 'FMD';
    } else if (page === 'ATM') {
      link = '/atemschutz';
      kuerzel = 'Atemschutz';
    } else if (page === 'ATM_M') {
      link = '/atemschutz/masken';
      kuerzel = 'Masken';
    } else if (page === 'ATM_G') {
      link = '/atemschutz/geraete';
      kuerzel = 'Geräte';
    } else if (page === 'ATM_MG') {
      link = '/atemschutz/messgeraete';
      kuerzel = 'Messgeräte';
    } else if (page === 'ATM_DB') {
      link = '/atemschutz/dienstbuch';
      kuerzel = 'Dienstbuch';
    } else if (page === 'NEWS') {
      link = '/news';
      kuerzel = 'News';
    } else if (page === 'HOME') {
      link = '/homepage';
      kuerzel = 'Homepage';
    } else if (page === 'FZ') {
      link = '/fahrzeuge';
      kuerzel = 'Fahrzeug Beladung';
    } else if (page === 'INV') {
      link = '/inventar';
      kuerzel = 'Inventar';
    } else if (page === 'WS') {
      link = '/wartung-service';
      kuerzel = 'Wartung/Service';
    } else if (page === 'BER') {
      link = '/einsatzbericht';
      kuerzel = 'Einsatzbericht';
    } else if (page === 'ANW') {
      link = '/anwesenheitsliste';
      kuerzel = 'Anwesenheitsliste';
    } else if (page === 'PDF') {
      link = '/pdf_template';
      kuerzel = 'PDF Templates';
    } else if (page === 'VER') {
      link = '/verwaltung';
      kuerzel = 'Verwaltung';
    } else if (page === 'V_M') {
      link = '/mitglied';
      kuerzel = 'Mitglieder';
    } else if (page === 'JUGEND') {
      link = '/jugend';
      kuerzel = 'Jugend';
    } else if (page === 'V_MK') {
      link = '/modul_konfiguration';
      kuerzel = 'Modul Konfiguration';
    } else if (page === 'V_B') {
      link = '/benutzer';
      kuerzel = 'Benutzer';
    } else if (page === 'V_KO') {
      link = '/konfiguration';
      kuerzel = 'Konfiguration';
    } else if (page === 'V_ED') {
      link = '/eigene_daten';
      kuerzel = 'Eigene Daten';
    }

    return {
      label: pagename,
      link,
      number: 0,
      kuerzel,
    };
  }

  setzeNeueBreadcrumbDaten(pageNeu: string, pageNumber: number): void {
    const pageNumberBack = pageNumber - 1;
    const pageNumberForward = pageNumber + 1;
    const pageBack = sessionStorage.getItem(`Page${pageNumberBack}`) ?? '';
    const page = sessionStorage.getItem(`Page${pageNumber}`) ?? '';

    if (pageNeu === pageBack) {
      sessionStorage.setItem('PageNumber', pageNumberBack.toString());
      sessionStorage.setItem(`Page${pageNumberBack}`, pageNeu);
      return;
    }

    if (pageNeu === page) {
      sessionStorage.setItem('PageNumber', pageNumber.toString());
      sessionStorage.setItem(`Page${pageNumber}`, pageNeu);
      return;
    }

    if (pageNumberForward <= 6) {
      sessionStorage.setItem('PageNumber', pageNumberForward.toString());
      sessionStorage.setItem(`Page${pageNumberForward}`, pageNeu);
    }
  }

  ladeFooter(): string {
    const year = new Date().getFullYear();
    const footer = `Version ${environment.version}\n${String.fromCharCode(169)} ${year} by ${this.Author}`;
    return footer;
  }
}

