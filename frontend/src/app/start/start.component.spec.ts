import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';

import { StartComponent } from './start.component';

const MOCK_ITEMS_UNORDERED = [
  { icon: 'settings', modul: 'Konfiguration', rolle: 'ADMIN', kategorie: 'Administration', routerlink: '/konfiguration' },
  { icon: 'book', modul: 'Einsatzbericht', rolle: 'ADMIN', kategorie: 'Dokumentation', routerlink: '/einsatzbericht' },
  { icon: 'pending_actions', modul: 'Aufgaben', rolle: 'ADMIN', kategorie: 'Geplant', routerlink: '/aufgaben' },
  { icon: 'healing', modul: 'FMD', rolle: 'ADMIN', kategorie: 'Fachchargen', routerlink: '/fmd' },
  { icon: 'construction', modul: 'Inventar', rolle: 'ADMIN', kategorie: 'Verwaltung', routerlink: '/inventar' },
];

describe('StartComponent', () => {
  let component: StartComponent;
  let fixture: ComponentFixture<StartComponent>;
  let apiHttpServiceSpy: jasmine.SpyObj<ApiHttpService>;
  let authSessionServiceSpy: jasmine.SpyObj<AuthSessionService>;
  let navigationServiceSpy: jasmine.SpyObj<NavigationService>;
  let uiMessageServiceSpy: jasmine.SpyObj<UiMessageService>;

  beforeEach(async () => {
    apiHttpServiceSpy = jasmine.createSpyObj<ApiHttpService>('ApiHttpService', ['get']);
    authSessionServiceSpy = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['errorAnzeigen']);
    navigationServiceSpy = jasmine.createSpyObj<NavigationService>('NavigationService', ['ladeBreadcrumb']);
    uiMessageServiceSpy = jasmine.createSpyObj<UiMessageService>('UiMessageService', ['erstelleMessage']);

    navigationServiceSpy.ladeBreadcrumb.and.returnValue([]);
    apiHttpServiceSpy.get.and.returnValue(of({
      user: {
        roles: ['MITGLIED'],
        first_name: 'Max',
        last_name: 'Mustermann',
        username: 'max',
      },
      main: [],
    }));

    await TestBed.configureTestingModule({
      imports: [StartComponent],
      providers: [
        { provide: ApiHttpService, useValue: apiHttpServiceSpy },
        { provide: AuthSessionService, useValue: authSessionServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: UiMessageService, useValue: uiMessageServiceSpy },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('category ordering', () => {
    it('should enforce the fixed category order via categoryOrder', () => {
      expect(component['categoryOrder']).toEqual([
        'Dokumentation',
        'Fachchargen',
        'Verwaltung',
        'Administration',
        'Geplant',
      ]);
    });

    it('should sort categories in the required order when building categorized items', () => {
      // Feed all roles so all items are accessible
      component['meine_rollen'] = ['ADMIN'];
      component['categorizedItems'] = (component as any)['buildCategories'](MOCK_ITEMS_UNORDERED);

      const names = component['categorizedItems'].map((c: any) => c.name);
      expect(names).toEqual(['Dokumentation', 'Fachchargen', 'Verwaltung', 'Administration', 'Geplant']);
    });

    it('should place unknown categories before Geplant', () => {
      const items = [
        { modul: 'X', rolle: 'ADMIN', kategorie: 'Geplant', routerlink: '/x' },
        { modul: 'Y', rolle: 'ADMIN', kategorie: 'Sonstiges', routerlink: '/y' },
        { modul: 'Z', rolle: 'ADMIN', kategorie: 'Dokumentation', routerlink: '/z' },
      ];
      component['meine_rollen'] = ['ADMIN'];
      const result = (component as any)['buildCategories'](items);
      const names = result.map((c: any) => c.name);
      expect(names.indexOf('Dokumentation')).toBeLessThan(names.indexOf('Sonstiges'));
      expect(names.indexOf('Sonstiges')).toBeLessThan(names.indexOf('Geplant'));
    });

    it('should keep Geplant last even with mixed input order', () => {
      const items = [
        { modul: 'A', rolle: 'ADMIN', kategorie: 'Geplant', routerlink: '/a' },
        { modul: 'B', rolle: 'ADMIN', kategorie: 'Verwaltung', routerlink: '/b' },
      ];
      const result = (component as any)['buildCategories'](items);
      const names = result.map((c: any) => c.name);
      expect(names[names.length - 1]).toBe('Geplant');
    });
  });
});
