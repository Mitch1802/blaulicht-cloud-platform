import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FormatService {
  formatBetrag(betrag: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(betrag);
  }

  formatDatum(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
  }
}

