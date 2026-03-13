import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { CollectionUtilsService } from '../_service/collection-utils.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';

import { HomepageComponent } from './homepage.component';

describe('HomepageComponent', () => {
  let component: HomepageComponent;
  let fixture: ComponentFixture<HomepageComponent>;
  let apiHttpServiceSpy: jasmine.SpyObj<ApiHttpService>;
  let authSessionServiceSpy: jasmine.SpyObj<AuthSessionService>;
  let collectionUtilsServiceSpy: jasmine.SpyObj<CollectionUtilsService>;
  let navigationServiceSpy: jasmine.SpyObj<NavigationService>;
  let uiMessageServiceSpy: jasmine.SpyObj<UiMessageService>;

  beforeEach(async () => {
    apiHttpServiceSpy = jasmine.createSpyObj<ApiHttpService>('ApiHttpService', ['get', 'post', 'patch', 'delete'], {
      AppUrl: '/api/',
    });
    authSessionServiceSpy = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['errorAnzeigen']);
    collectionUtilsServiceSpy = jasmine.createSpyObj<CollectionUtilsService>('CollectionUtilsService', ['arraySortByKey']);
    navigationServiceSpy = jasmine.createSpyObj<NavigationService>('NavigationService', ['ladeBreadcrumb']);
    uiMessageServiceSpy = jasmine.createSpyObj<UiMessageService>('UiMessageService', ['erstelleMessage']);

    navigationServiceSpy.ladeBreadcrumb.and.returnValue([]);
    collectionUtilsServiceSpy.arraySortByKey.and.callFake((array: any[]) => array);

    apiHttpServiceSpy.get.and.callFake(((url: string) => {
      if (url === 'homepage/context') {
        return of({ mitglieder: [] });
      }
      if (url === 'homepage/public') {
        return of({ sections: [] });
      }
      return of([]);
    }) as any);

    await TestBed.configureTestingModule({
      imports: [HomepageComponent],
      providers: [
        provideRouter([]),
        { provide: ApiHttpService, useValue: apiHttpServiceSpy },
        { provide: AuthSessionService, useValue: authSessionServiceSpy },
        { provide: CollectionUtilsService, useValue: collectionUtilsServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: UiMessageService, useValue: uiMessageServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomepageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
