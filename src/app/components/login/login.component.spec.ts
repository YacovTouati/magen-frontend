import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'getRememberedEmail']);
        authServiceSpy.getRememberedEmail.and.returnValue(null);

        await TestBed.configureTestingModule({
            imports: [LoginComponent, RouterTestingModule],
            providers: [{ provide: AuthService, useValue: authServiceSpy }]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(LoginComponent);
        const comp = fixture.componentInstance;
        expect(comp).toBeTruthy();
    });

    describe('remembered email', () => {
        it('should leave the email field blank when nothing is remembered', () => {
            authServiceSpy.getRememberedEmail.and.returnValue(null);
            const fixture = TestBed.createComponent(LoginComponent);

            expect(fixture.componentInstance.email).toBe('');
        });

        it('should pre-fill the email field from AuthService.getRememberedEmail() on init', () => {
            authServiceSpy.getRememberedEmail.and.returnValue('remembered@magen.org');
            const fixture = TestBed.createComponent(LoginComponent);

            expect(fixture.componentInstance.email).toBe('remembered@magen.org');
        });
    });

    it('should not call the service when email or password is missing', () => {
        const fixture = TestBed.createComponent(LoginComponent);
        const comp = fixture.componentInstance;
        comp.email = 'admin@magen.org';
        comp.password = '';

        comp.onSubmit();

        expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it('should redirect an ADMIN to / (the calendar) on successful login', () => {
        authServiceSpy.login.and.returnValue(of({ token: 'tok', user: { email: 'admin@magen.org', role: 'ADMIN' } }));
        const fixture = TestBed.createComponent(LoginComponent);
        const comp = fixture.componentInstance;
        comp.email = 'admin@magen.org';
        comp.password = 'secret';

        comp.onSubmit();

        expect(authServiceSpy.login).toHaveBeenCalledWith('admin@magen.org', 'secret');
        expect(router.navigate).toHaveBeenCalledWith(['/']);
        expect(comp.isSubmitting).toBeFalse();
    });

    it('should redirect a VOLUNTEER to / (the calendar) on successful login', () => {
        authServiceSpy.login.and.returnValue(of({ token: 'tok', user: { email: 'v@magen.org', role: 'VOLUNTEER' } }));
        const fixture = TestBed.createComponent(LoginComponent);
        const comp = fixture.componentInstance;
        comp.email = 'v@magen.org';
        comp.password = 'secret';

        comp.onSubmit();

        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should not crash and should still redirect if the service ever emits without a user', () => {
        authServiceSpy.login.and.returnValue(of({ token: 'tok', user: undefined } as any));
        const fixture = TestBed.createComponent(LoginComponent);
        const comp = fixture.componentInstance;
        comp.email = 'admin@magen.org';
        comp.password = 'secret';

        expect(() => comp.onSubmit()).not.toThrow();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should show a generic error message and not navigate when login fails with no structured errors array', () => {
        authServiceSpy.login.and.returnValue(throwError(() => new Error('Unauthorized')));
        const fixture = TestBed.createComponent(LoginComponent);
        const comp = fixture.componentInstance;
        comp.email = 'bad@magen.org';
        comp.password = 'wrong';

        comp.onSubmit();

        expect(comp.errorMessage).toBe('אימייל או סיסמה שגויים, או שאין לך הרשאה להתחבר.');
        expect(comp.isSubmitting).toBeFalse();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should show the backend\'s exact validation message when the server returns a structured errors array', () => {
        const serverError = { error: { success: false, errors: [{ field: 'email', message: 'כתובת המייל שהוזנה אינה תקינה' }] } };
        authServiceSpy.login.and.returnValue(throwError(() => serverError));
        const fixture = TestBed.createComponent(LoginComponent);
        const comp = fixture.componentInstance;
        comp.email = 'not-an-email';
        comp.password = 'wrong';

        comp.onSubmit();

        expect(comp.errorMessage).toBe('כתובת המייל שהוזנה אינה תקינה');
        expect(comp.isSubmitting).toBeFalse();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    describe('password visibility toggle', () => {
        it('should start masked (type="password")', () => {
            const fixture = TestBed.createComponent(LoginComponent);
            fixture.detectChanges();

            const input = fixture.debugElement.query(By.css('#login-password'));
            expect(input.nativeElement.type).toBe('password');
        });

        it('should reveal the password as plain text when the toggle is clicked, and mask it again on a second click', () => {
            const fixture = TestBed.createComponent(LoginComponent);
            fixture.detectChanges();
            const toggle = fixture.debugElement.query(By.css('.toggle-visibility'));

            toggle.triggerEventHandler('click', null);
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('#login-password')).nativeElement.type).toBe('text');
            expect(fixture.componentInstance.showPassword).toBeTrue();

            toggle.triggerEventHandler('click', null);
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('#login-password')).nativeElement.type).toBe('password');
            expect(fixture.componentInstance.showPassword).toBeFalse();
        });
    });

    describe('password auto-hide (security timer)', () => {
        it('should auto-hide the password 30 seconds after it is revealed', fakeAsync(() => {
            const fixture = TestBed.createComponent(LoginComponent);
            fixture.detectChanges();

            fixture.debugElement.query(By.css('.toggle-visibility')).triggerEventHandler('click', null);
            fixture.detectChanges();
            expect(fixture.componentInstance.showPassword).toBeTrue();

            tick(29999);
            expect(fixture.componentInstance.showPassword).toBeTrue();

            tick(1);
            expect(fixture.componentInstance.showPassword).toBeFalse();
        }));

        it('should clear the pending auto-hide timer when the user hides the password manually first', fakeAsync(() => {
            const fixture = TestBed.createComponent(LoginComponent);
            fixture.detectChanges();
            const toggle = fixture.debugElement.query(By.css('.toggle-visibility'));

            toggle.triggerEventHandler('click', null); // reveal
            fixture.detectChanges();
            tick(15000);
            toggle.triggerEventHandler('click', null); // hide manually, well before 30s
            fixture.detectChanges();

            tick(30000); // if the old timer weren't cleared, it would have fired by now
            expect(fixture.componentInstance.showPassword).toBeFalse();
        }));

        it('should restart the countdown from zero if the password is hidden and revealed again', fakeAsync(() => {
            const fixture = TestBed.createComponent(LoginComponent);
            fixture.detectChanges();
            const toggle = fixture.debugElement.query(By.css('.toggle-visibility'));

            toggle.triggerEventHandler('click', null); // reveal (t=0)
            fixture.detectChanges();
            tick(25000);
            toggle.triggerEventHandler('click', null); // hide manually (t=25000)
            fixture.detectChanges();
            toggle.triggerEventHandler('click', null); // reveal again (t=25000, fresh countdown)
            fixture.detectChanges();

            tick(25000); // t=50000 overall, but only 25s since the second reveal
            expect(fixture.componentInstance.showPassword).toBeTrue();

            tick(5000); // now 30s since the second reveal
            expect(fixture.componentInstance.showPassword).toBeFalse();
        }));

        it('ngOnDestroy should clear any pending auto-hide timer', fakeAsync(() => {
            const fixture = TestBed.createComponent(LoginComponent);
            fixture.detectChanges();
            fixture.debugElement.query(By.css('.toggle-visibility')).triggerEventHandler('click', null);
            const clearSpy = spyOn((fixture.componentInstance as any).passwordRevealTimer, 'clear').and.callThrough();

            fixture.componentInstance.ngOnDestroy();

            expect(clearSpy).toHaveBeenCalled();
            tick(30000); // proves the timer was really cancelled — nothing left to fire
        }));
    });
});
