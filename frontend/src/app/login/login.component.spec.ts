import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { GlobalDataService } from '../_service/global-data.service';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let globalDataServiceSpy: jasmine.SpyObj<GlobalDataService>;

  const flushVersionRequest = (channel: string = 'test'): void => {
    const req = httpMock.expectOne('/assets/version.json');
    req.flush({ version: 'test', commit: 'abc123', channel });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.resolveTo(true);

    globalDataServiceSpy = jasmine.createSpyObj<GlobalDataService>('GlobalDataService', [
      'post',
      'errorAnzeigen',
      'erstelleMessage'
    ]);
    globalDataServiceSpy.post.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: GlobalDataService, useValue: globalDataServiceSpy }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushVersionRequest();
  });

  afterEach(() => {
    httpMock.verify();
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
    expect(globalDataServiceSpy.post).not.toHaveBeenCalled();
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
    globalDataServiceSpy.post.and.returnValue(of({}));

    component.anmelden();

    expect(globalDataServiceSpy.post).toHaveBeenCalledWith('auth/login', {
      username: 'demo',
      password: 'secret'
    }, false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/start']);
    expect(component.isSubmitting).toBeFalse();
  });

  it('should forward login errors to global error handler', () => {
    component.form.setValue({ user: 'demo', pwd: 'wrong' });
    globalDataServiceSpy.post.and.returnValue(throwError(() => ({ status: 401, error: { detail: 'unauthorized' } })));

    component.anmelden();

    expect(globalDataServiceSpy.errorAnzeigen).toHaveBeenCalled();
    expect(component.isSubmitting).toBeFalse();
  });

  it('should show screen resolution only for test versions', () => {
    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('Auflösung:');

    const freshFixture = TestBed.createComponent(LoginComponent);
    const freshComponent = freshFixture.componentInstance;
    freshFixture.detectChanges();

    const req = httpMock.expectOne('/assets/version.json');
    req.flush({ version: '1.0.0', commit: 'abc123', channel: 'release' });
    freshFixture.detectChanges();

    expect(freshComponent.isTestVersion).toBeFalse();
    expect(freshFixture.nativeElement.textContent || '').not.toContain('Auflösung:');
  });
});
