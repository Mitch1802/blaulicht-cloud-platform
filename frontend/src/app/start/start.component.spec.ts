import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';

import { StartComponent } from './start.component';

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
});
