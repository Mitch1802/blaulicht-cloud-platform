import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    imports: [
        RouterOutlet
    ],
    styleUrls: [
        './app.component.sass'
    ]
})
export class AppComponent {}
