import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';

import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';

import { UserComponent } from './user.component';

const MOCK_ROLLEN = [
  { key: 'ADMIN', verbose_name: 'Administrator' },
  { key: 'MITGLIED', verbose_name: 'Mitglied' },
  { key: 'PROTOKOLL', verbose_name: 'Protokoll' },
];

const MOCK_BENUTZER = [
  { id: '1', username: 'user1', name: 'User One', first_name: 'User', last_name: 'One', is_active: true, password: '', roles: ['PROTOKOLL'] },
  { id: '2', username: 'admin', name: 'Admin User', first_name: 'Admin', last_name: 'User', is_active: true, password: '', roles: ['ADMIN'] },
];

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;
  let apiHttpServiceSpy: jasmine.SpyObj<ApiHttpService>;
  let authSessionServiceSpy: jasmine.SpyObj<AuthSessionService>;
  let collectionUtilsServiceSpy: jasmine.SpyObj<CollectionUtilsService>;
  let navigationServiceSpy: jasmine.SpyObj<NavigationService>;
  let uiMessageServiceSpy: jasmine.SpyObj<UiMessageService>;
  let breakpointObserverSpy: jasmine.SpyObj<BreakpointObserver>;

  beforeEach(async () => {
    apiHttpServiceSpy = jasmine.createSpyObj<ApiHttpService>('ApiHttpService', ['get', 'post', 'patch', 'delete']);
    authSessionServiceSpy = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['errorAnzeigen']);
    collectionUtilsServiceSpy = jasmine.createSpyObj<CollectionUtilsService>('CollectionUtilsService', ['arraySortByKey']);
    navigationServiceSpy = jasmine.createSpyObj<NavigationService>('NavigationService', ['ladeBreadcrumb']);
    uiMessageServiceSpy = jasmine.createSpyObj<UiMessageService>('UiMessageService', ['erstelleMessage']);
    breakpointObserverSpy = jasmine.createSpyObj<BreakpointObserver>('BreakpointObserver', ['observe']);

    navigationServiceSpy.ladeBreadcrumb.and.returnValue([]);
    collectionUtilsServiceSpy.arraySortByKey.and.callFake((array: any[]) => array);
    breakpointObserverSpy.observe.and.returnValue(of({ matches: false, breakpoints: {} } as any));
    apiHttpServiceSpy.get.and.callFake(((url: string) => {
      if (url === 'users/context') {
        return of({ data: { rollen: [] } });
      }
      return of({ data: [] });
    }) as any);

    await TestBed.configureTestingModule({
      imports: [UserComponent],
      providers: [
        { provide: ApiHttpService, useValue: apiHttpServiceSpy },
        { provide: AuthSessionService, useValue: authSessionServiceSpy },
        { provide: CollectionUtilsService, useValue: collectionUtilsServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: UiMessageService, useValue: uiMessageServiceSpy },
        { provide: BreakpointObserver, useValue: breakpointObserverSpy },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Rollenübersicht matrix', () => {
    beforeEach(() => {
      component['rollen'] = MOCK_ROLLEN;
      component['rollenOhne'] = MOCK_ROLLEN.filter((r) => r.key !== 'MITGLIED');
      component['rollenUebersichtSpalten'] = ['benutzer', 'ADMIN', 'PROTOKOLL'];
      component['benutzer'] = MOCK_BENUTZER as any;
      component.initRollenMatrix();
    });

    it('should initialize rollenMatrix from benutzer roles', () => {
      expect(component['rollenMatrix']['1']).toContain('PROTOKOLL');
      expect(component['rollenMatrix']['2']).toContain('ADMIN');
    });

    it('hasRoleInMatrix returns true when user has the role', () => {
      expect(component.hasRoleInMatrix('1', 'PROTOKOLL')).toBeTrue();
      expect(component.hasRoleInMatrix('1', 'ADMIN')).toBeFalse();
    });

    it('isAdminInMatrix returns true only for ADMIN users', () => {
      expect(component.isAdminInMatrix('2')).toBeTrue();
      expect(component.isAdminInMatrix('1')).toBeFalse();
    });

    it('isRoleDisabledInMatrix disables non-ADMIN roles when user is ADMIN', () => {
      expect(component.isRoleDisabledInMatrix('2', 'PROTOKOLL')).toBeTrue();
      expect(component.isRoleDisabledInMatrix('2', 'ADMIN')).toBeFalse();
      expect(component.isRoleDisabledInMatrix('1', 'PROTOKOLL')).toBeFalse();
    });

    it('rollenMatrixToggle adds role to user', () => {
      component.rollenMatrixToggle('1', 'PROTOKOLL', { checked: false });
      expect(component.hasRoleInMatrix('1', 'PROTOKOLL')).toBeFalse();
      expect(component['rollenMatrixDirty'].has('1')).toBeTrue();
    });

    it('rollenMatrixToggle selecting ADMIN clears other roles', () => {
      component.rollenMatrixToggle('1', 'ADMIN', { checked: true });
      expect(component['rollenMatrix']['1']).toEqual(['ADMIN']);
      expect(component['rollenMatrixDirty'].has('1')).toBeTrue();
    });

    it('rollenMatrixSpeichern shows info message when no changes', () => {
      component['rollenMatrixDirty'].clear();
      component.rollenMatrixSpeichern();
      expect(uiMessageServiceSpy.erstelleMessage).toHaveBeenCalledWith('info', jasmine.any(String));
    });
  });
});
