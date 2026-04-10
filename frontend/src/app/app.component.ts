import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiHttpService } from './_service/api-http.service';

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
    ],
    providers: [
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline', subscriptSizing: 'dynamic' } }
    ]
})
export class AppComponent {
    private apiHttpService = inject(ApiHttpService);

    loading$ = this.apiHttpService.loading$;
}

