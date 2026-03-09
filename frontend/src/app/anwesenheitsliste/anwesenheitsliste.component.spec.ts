import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { CollectionUtilsService } from '../_service/collection-utils.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';

import { AnwesenheitslisteComponent } from './anwesenheitsliste.component';

describe('AnwesenheitslisteComponent', () => {
  let component: AnwesenheitslisteComponent;
  let fixture: ComponentFixture<AnwesenheitslisteComponent>;
  let apiHttpServiceSpy: jasmine.SpyObj<ApiHttpService>;
  let authSessionServiceSpy: jasmine.SpyObj<AuthSessionService>;
  let collectionUtilsServiceSpy: jasmine.SpyObj<CollectionUtilsService>;
  let navigationServiceSpy: jasmine.SpyObj<NavigationService>;
  let uiMessageServiceSpy: jasmine.SpyObj<UiMessageService>;

  beforeEach(async () => {
    apiHttpServiceSpy = jasmine.createSpyObj<ApiHttpService>('ApiHttpService', ['get', 'post', 'patch', 'delete']);
    authSessionServiceSpy = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['errorAnzeigen']);
    collectionUtilsServiceSpy = jasmine.createSpyObj<CollectionUtilsService>('CollectionUtilsService', ['arraySortByKey']);
    navigationServiceSpy = jasmine.createSpyObj<NavigationService>('NavigationService', ['ladeBreadcrumb']);
    uiMessageServiceSpy = jasmine.createSpyObj<UiMessageService>('UiMessageService', ['erstelleMessage']);

    navigationServiceSpy.ladeBreadcrumb.and.returnValue([]);
    collectionUtilsServiceSpy.arraySortByKey.and.callFake((array: any[]) => array);
    apiHttpServiceSpy.get.and.callFake(((url: string) => {
      if (url === 'anwesenheitsliste/context') {
        return of({ mitglieder: [] });
      }
      return of([]);
    }) as any);

    await TestBed.configureTestingModule({
      imports: [AnwesenheitslisteComponent],
      providers: [
        provideRouter([]),
        { provide: ApiHttpService, useValue: apiHttpServiceSpy },
        { provide: AuthSessionService, useValue: authSessionServiceSpy },
        { provide: CollectionUtilsService, useValue: collectionUtilsServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: UiMessageService, useValue: uiMessageServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnwesenheitslisteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
