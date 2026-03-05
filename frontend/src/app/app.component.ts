import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterOutlet } from '@angular/router';
import { GlobalDataService } from './_service/global-data.service';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    imports: [
        RouterOutlet,
        MatProgressBarModule,
        AsyncPipe
    ],
    styleUrls: [
        './app.component.sass'
    ]
})
export class AppComponent {
  private globalDataService = inject(GlobalDataService);

  loading$ = this.globalDataService.loading$;
}
