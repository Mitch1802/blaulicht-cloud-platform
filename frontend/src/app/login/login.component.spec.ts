import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { UiMessageService } from '../_service/ui-message.service';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let apiHttpServiceSpy: jasmine.SpyObj<ApiHttpService>;
  let authSessionServiceSpy: jasmine.SpyObj<AuthSessionService>;
  let uiMessageServiceSpy: jasmine.SpyObj<UiMessageService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.resolveTo(true);

    apiHttpServiceSpy = jasmine.createSpyObj<ApiHttpService>('ApiHttpService', [
      'getURL',
      'get',
      'post',
    ]);
    authSessionServiceSpy = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['errorAnzeigen']);
    uiMessageServiceSpy = jasmine.createSpyObj<UiMessageService>('UiMessageService', ['erstelleMessage']);

    apiHttpServiceSpy.getURL.and.returnValue(of({ version: 'test', commit: 'abc123', channel: 'test' }));
    apiHttpServiceSpy.get.and.returnValue(of({ csrfToken: 'token' }));
    apiHttpServiceSpy.post.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ApiHttpService, useValue: apiHttpServiceSpy },
        { provide: AuthSessionService, useValue: authSessionServiceSpy },
        { provide: UiMessageService, useValue: uiMessageServiceSpy }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep submit button visible but disabled when form is invalid', () => {
    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(submitButton).toBeTruthy();
    expect(submitButton.hidden).toBeFalse();
    expect(submitButton.disabled).toBeTrue();
  });

  it('should show required errors after invalid submit attempt', () => {
    component.anmelden();
    fixture.detectChanges();

    const text = (fixture.nativeElement.textContent || '').replace(/\s+/g, ' ');
    expect(text).toContain('Benutzername ist erforderlich.');
    expect(text).toContain('Passwort ist erforderlich.');
    expect(apiHttpServiceSpy.post).not.toHaveBeenCalled();
  });

  it('should toggle password visibility', () => {
    const passwordInput = fixture.nativeElement.querySelector('input[formControlName="pwd"]') as HTMLInputElement;
    const toggleButton = fixture.nativeElement.querySelector('button[mat-icon-button]') as HTMLButtonElement;

    expect(passwordInput.type).toBe('password');

    toggleButton.click();
    fixture.detectChanges();

    expect(component.showPassword).toBeTrue();
    expect(passwordInput.type).toBe('text');
  });

  it('should submit login data and navigate on success', () => {
    component.form.setValue({ user: 'demo', pwd: 'secret' });
    apiHttpServiceSpy.get.and.returnValue(of({ csrfToken: 'token' }));
    apiHttpServiceSpy.post.and.returnValue(of({}));

    component.anmelden();

    expect(apiHttpServiceSpy.get).toHaveBeenCalledWith('auth/csrf');

    expect(apiHttpServiceSpy.post).toHaveBeenCalledWith('auth/login', {
      username: 'demo',
      password: 'secret'
    }, false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/start']);
    expect(component.isSubmitting).toBeFalse();
  });

  it('should forward login errors to global error handler', () => {
    component.form.setValue({ user: 'demo', pwd: 'wrong' });
    apiHttpServiceSpy.get.and.returnValue(of({ csrfToken: 'token' }));
    apiHttpServiceSpy.post.and.returnValue(throwError(() => ({ status: 401, error: { detail: 'unauthorized' } })));

    component.anmelden();

    expect(authSessionServiceSpy.errorAnzeigen).toHaveBeenCalled();
    expect(component.isSubmitting).toBeFalse();
  });

  it('should show screen resolution only for test versions', () => {
    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('Auflösung:');

    apiHttpServiceSpy.getURL.and.returnValue(of({ version: '1.0.0', commit: 'abc123', channel: 'release' }));

    const freshFixture = TestBed.createComponent(LoginComponent);
    const freshComponent = freshFixture.componentInstance;
    freshFixture.detectChanges();

    expect(freshComponent.isTestVersion).toBeFalse();
    expect(freshFixture.nativeElement.textContent || '').not.toContain('Auflösung:');
  });
});

