import { booleanAttribute, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator'

/**
 * imr-paginator
 *
 * Wrapper around mat-paginator for table pagination.
 * Usage: <imr-paginator
 *          [length]="totalItems"
 *          [pageSize]="pageSize"
 *          [pageSizeOptions]="[10, 25, 50]"
 *          (page)="onPageChange($event)">
 *        </imr-paginator>
 */
@Component({
  selector: 'imr-paginator',
  templateUrl: './imr-paginator.component.html',
  styleUrl: './imr-paginator.component.sass',
  standalone: true,
  imports: [CommonModule, MatPaginatorModule],
})
export class ImrPaginatorComponent {
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator

  @Input() length = 0
  @Input() pageSize = 10
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50]
  @Input({ transform: booleanAttribute }) showFirstLastButtons = false
  @Input('aria-label') ariaLabel = ''
  @Output() page = new EventEmitter<PageEvent>()

  firstPage(): void {
    this.paginator.firstPage()
  }
}


