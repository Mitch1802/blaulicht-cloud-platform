import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/_interceptors/auth.interceptor';


function cleanupInstalledServiceWorkers(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then(async (registrations) => {
        if (registrations.length === 0) {
          return false;
        }

        const results = await Promise.all(registrations.map((registration) => registration.unregister()));
        return results.some(Boolean);
      })
      .then((didUnregister) => {
        if (!didUnregister) {
          return;
        }

        if (sessionStorage.getItem('sw-cleanup-reloaded') === '1') {
          sessionStorage.removeItem('sw-cleanup-reloaded');
          return;
        }

        sessionStorage.setItem('sw-cleanup-reloaded', '1');
        window.location.reload();
      })
      .catch((error) => {
        console.error('Service worker cleanup failed:', error);
      });
  });
}


cleanupInstalledServiceWorkers();


bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
    provideCharts(withDefaultRegisterables()),
  ]
}).catch(err => console.error(err));

