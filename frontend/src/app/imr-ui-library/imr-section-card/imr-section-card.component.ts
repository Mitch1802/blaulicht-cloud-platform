import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ImrCardContentComponent } from '../imr-card-content.component';

/**
 * `<imr-section-card>`
 *
 * Einheitliche Card-Struktur für Modul-Bereiche.
 * Kapselt eine `mat-card` mit standardisiertem Kopfbereich
 * und einem Content-Bereich.
 *
 */
@Component({
  selector: 'imr-section-card',
  standalone: true,
  imports: [MatCardModule, ImrCardContentComponent],
  templateUrl: './imr-section-card.component.html',
  styleUrl: './imr-section-card.component.sass',
})
export class ImrSectionCardComponent {
  /** Optionaler Kartentitel (wird als <h2> im Kopfbereich gerendert) */
  @Input() title = '';
}


