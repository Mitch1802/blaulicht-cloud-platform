import { Component } from '@angular/core';

/**
 * `<imr-table-wrap>`
 *
 * Horizontaler Scroll-Container für `mat-table` Komponenten.
 * Stellt sicher, dass Tabellen auf kleinen Bildschirmen scrollbar sind.
 *
 * @example
 * ```html
 * <imr-table-wrap>
 *   <table mat-table [dataSource]="data">
 *     <!-- Spalten -->
 *   </table>
 *   <mat-paginator [pageSizeOptions]="[10, 50]"></mat-paginator>
 * </imr-table-wrap>
 * ```
 */
@Component({
  selector: 'imr-table-wrap',
  standalone: true,
  templateUrl: './imr-table-wrap.component.html',
  styleUrl: './imr-table-wrap.component.sass',
})
export class ImrTableWrapComponent {}


