import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';

import { MitgliedComponent } from './mitglied.component';

describe('MitgliedComponent', () => {
  let component: MitgliedComponent;
  let fixture: ComponentFixture<MitgliedComponent>;
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
    apiHttpServiceSpy.get.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [MitgliedComponent],
      providers: [
        provideRouter([]),
        { provide: ApiHttpService, useValue: apiHttpServiceSpy },
        { provide: AuthSessionService, useValue: authSessionServiceSpy },
        { provide: CollectionUtilsService, useValue: collectionUtilsServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: UiMessageService, useValue: uiMessageServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MitgliedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
