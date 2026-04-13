import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { of } from 'rxjs';

import { IBenutzer } from 'src/app/_interface/benutzer';
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
  {
    id: '1',
    username: 'user1',
    name: 'User One',
    is_active: true,
    password: '',
    roles: ['PROTOKOLL'],
    last_invite_sent_at: '2026-04-13T10:30:00Z',
    password_set: false,
    invite_status: 'invite_pending',
    can_resend_invite: true,
  },
  {
    id: '2',
    username: 'admin',
    name: 'Admin User',
    is_active: true,
    password: '',
    roles: ['ADMIN'],
    last_invite_sent_at: null,
    password_set: true,
    invite_status: 'password_set',
    can_resend_invite: false,
  },
] satisfies IBenutzer[];

type UserCreateResponse = {
  user?: IBenutzer;
  invite_sent?: boolean;
};

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
    collectionUtilsServiceSpy.arraySortByKey.and.callFake(<T extends object>(array: T[]) => array);
    breakpointObserverSpy.observe.and.returnValue(of({ matches: false, breakpoints: {} as Record<string, boolean> }));
    apiHttpServiceSpy.get.and.callFake(<T>(url: string) => {
      if (url === 'users/context') {
        return of({ data: { rollen: [], mitglieder: [] } } as T);
      }
      return of({ data: [] } as T);
    });
    apiHttpServiceSpy.post.and.callFake(<T>(url: string) => {
      if (url.startsWith('users/resend_invite/')) {
        return of({ user: MOCK_BENUTZER[0], invite_sent: true } as T);
      }
      return of({} as T);
    });
    apiHttpServiceSpy.patch.and.returnValue(of({ data: MOCK_BENUTZER[0] }));
    apiHttpServiceSpy.delete.and.returnValue(of({}));

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
      component['benutzer'] = [...MOCK_BENUTZER];
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
      component.rollenMatrixToggle('1', 'PROTOKOLL', { checked: false } as MatCheckboxChange);
      expect(component.hasRoleInMatrix('1', 'PROTOKOLL')).toBeFalse();
      expect(component['rollenMatrixDirty'].has('1')).toBeTrue();
    });

    it('rollenMatrixToggle selecting ADMIN clears other roles', () => {
      component.rollenMatrixToggle('1', 'ADMIN', { checked: true } as MatCheckboxChange);
      expect(component['rollenMatrix']['1']).toEqual(['ADMIN']);
      expect(component['rollenMatrixDirty'].has('1')).toBeTrue();
    });

    it('rollenMatrixSpeichern shows info message when no changes', () => {
      component['rollenMatrixDirty'].clear();
      component.rollenMatrixSpeichern();
      expect(uiMessageServiceSpy.erstelleMessage).toHaveBeenCalledWith('info', jasmine.any(String));
    });
  });

  describe('Einladungsmodus', () => {
    it('aktiviert beim Anlegen standardmäßig den Einladungsmodus', () => {
      component.neueDetails();

      expect(component.sendInviteMode).toBeTrue();
      expect(component.formModul.controls.email.hasError('required')).toBeTrue();
    });

    it('sendet beim Speichern im Einladungsmodus das explizite Flag', () => {
      const createdUser = MOCK_BENUTZER[0];
      apiHttpServiceSpy.post.and.returnValue(of({ user: createdUser, invite_sent: true } satisfies UserCreateResponse));

      component.neueDetails();
      component.formModul.controls.username.setValue('neu');
      component.formModul.controls.email.setValue('neu@example.com');
      component.formModul.controls.roles.setValue(['PROTOKOLL']);

      component.datenSpeichern();

      expect(apiHttpServiceSpy.post).toHaveBeenCalledWith(
        'users/create',
        jasmine.objectContaining({
          send_invite: true,
          password1: '',
          password2: '',
        }),
        false,
      );
      expect(uiMessageServiceSpy.erstelleMessage).toHaveBeenCalledWith('success', jasmine.stringMatching(/Einladungs-E-Mail/));
    });

    it('fordert im Passwortmodus ein Initialpasswort an', () => {
      component.neueDetails();
      component.setInviteMode(false);
      component.formModul.controls.username.setValue('neu');
      component.formModul.controls.roles.setValue(['PROTOKOLL']);

      component.datenSpeichern();

      expect(apiHttpServiceSpy.post).not.toHaveBeenCalled();
      expect(uiMessageServiceSpy.erstelleMessage).toHaveBeenCalledWith('error', jasmine.stringMatching(/Initialpasswort/));
    });

    it('zeigt den Invite-Status eines Benutzers an', () => {
      expect(component.getInviteStatusLabel(MOCK_BENUTZER[0])).toBe('Einladung offen');
      expect(component.getInviteStatusLabel(MOCK_BENUTZER[1])).toBe('Passwort vergeben');
      expect(component.getInviteSentAtLabel(MOCK_BENUTZER[0])).not.toBe('Noch nicht versendet');
      expect(component.getInviteSentAtLabel(MOCK_BENUTZER[1])).toBe('Noch nicht versendet');
      expect(component.canResendInvite(MOCK_BENUTZER[0])).toBeTrue();
      expect(component.canResendInvite(MOCK_BENUTZER[1])).toBeFalse();
    });

    it('versendet einen Einladungslink erneut', () => {
      component['benutzer'] = [...MOCK_BENUTZER];
      component.dataSource.data = [...MOCK_BENUTZER];

      component.resendInvite(MOCK_BENUTZER[0]);

      expect(apiHttpServiceSpy.post).toHaveBeenCalledWith('users/resend_invite/1', {}, false);
      expect(uiMessageServiceSpy.erstelleMessage).toHaveBeenCalledWith('success', jasmine.stringMatching(/erneut versendet/));
    });
  });
});

