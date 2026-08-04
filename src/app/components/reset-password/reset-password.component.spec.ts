import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../services/auth.service';

describe('ResetPasswordComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    function configure(queryParams: Record<string, string>) {
        return TestBed.configureTestingModule({
            imports: [ResetPasswordComponent, RouterTestingModule],
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } }
            ]
        }).compileComponents();
    }

    beforeEach(() => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['resetPassword']);
    });

    it('should flag the link as invalid when the token query param is missing', async () => {
        await configure({});
        const fixture = TestBed.createComponent(ResetPasswordComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.linkInvalid).toBeTrue();
    });

    describe('with a valid token', () => {
        beforeEach(async () => {
            await configure({ token: 'raw-reset-token' });
        });

        it('should read the token from the query params', () => {
            const fixture = TestBed.createComponent(ResetPasswordComponent);
            fixture.detectChanges();

            expect(fixture.componentInstance.linkInvalid).toBeFalse();
            expect(fixture.componentInstance.token).toBe('raw-reset-token');
        });

        it('canSubmit should require a valid password and matching confirmation', () => {
            const fixture = TestBed.createComponent(ResetPasswordComponent);
            fixture.detectChanges();
            const comp = fixture.componentInstance;

            expect(comp.canSubmit).toBeFalse();

            comp.password = 'Str0ng!Pass';
            comp.confirmPassword = 'Different1!';
            expect(comp.canSubmit).toBeFalse();

            comp.confirmPassword = 'Str0ng!Pass';
            expect(comp.canSubmit).toBeTrue();
        });

        it('should not call the service when the form is invalid', () => {
            const fixture = TestBed.createComponent(ResetPasswordComponent);
            fixture.detectChanges();
            fixture.componentInstance.onSubmit();

            expect(authServiceSpy.resetPassword).not.toHaveBeenCalled();
        });

        it('should submit the token and password, and show the success state', () => {
            authServiceSpy.resetPassword.and.returnValue(of({ message: 'הסיסמה אופסה בהצלחה' }));
            const fixture = TestBed.createComponent(ResetPasswordComponent);
            fixture.detectChanges();
            const comp = fixture.componentInstance;
            comp.password = 'Str0ng!Pass';
            comp.confirmPassword = 'Str0ng!Pass';

            comp.onSubmit();

            expect(authServiceSpy.resetPassword).toHaveBeenCalledWith('raw-reset-token', 'Str0ng!Pass');
            expect(comp.isSuccess).toBeTrue();
            expect(comp.isSubmitting).toBeFalse();
        });

        it('should surface the backend\'s exact error message for an invalid/expired token', () => {
            const serverError = { error: { success: false, message: 'קישור איפוס הסיסמה אינו תקין או שפג תוקפו' } };
            authServiceSpy.resetPassword.and.returnValue(throwError(() => serverError));
            const fixture = TestBed.createComponent(ResetPasswordComponent);
            fixture.detectChanges();
            const comp = fixture.componentInstance;
            comp.password = 'Str0ng!Pass';
            comp.confirmPassword = 'Str0ng!Pass';

            comp.onSubmit();

            expect(comp.errorMessage).toBe('קישור איפוס הסיסמה אינו תקין או שפג תוקפו');
            expect(comp.isSuccess).toBeFalse();
            expect(comp.isSubmitting).toBeFalse();
        });

        describe('password auto-hide (security timer)', () => {
            it('should auto-hide the main password field 30 seconds after it is revealed', fakeAsync(() => {
                const fixture = TestBed.createComponent(ResetPasswordComponent);
                fixture.detectChanges();

                fixture.componentInstance.togglePasswordVisibility();
                expect(fixture.componentInstance.showPassword).toBeTrue();

                tick(29999);
                expect(fixture.componentInstance.showPassword).toBeTrue();
                tick(1);
                expect(fixture.componentInstance.showPassword).toBeFalse();
            }));

            it('should auto-hide the confirm-password field independently, 30 seconds after IT is revealed', fakeAsync(() => {
                const fixture = TestBed.createComponent(ResetPasswordComponent);
                fixture.detectChanges();

                fixture.componentInstance.toggleConfirmPasswordVisibility();
                expect(fixture.componentInstance.showConfirmPassword).toBeTrue();

                tick(30000);
                expect(fixture.componentInstance.showConfirmPassword).toBeFalse();
            }));

            it('revealing one field must not affect the other field\'s independent countdown', fakeAsync(() => {
                const fixture = TestBed.createComponent(ResetPasswordComponent);
                const comp = fixture.componentInstance;
                fixture.detectChanges();

                comp.togglePasswordVisibility(); // t=0
                tick(20000);
                comp.toggleConfirmPasswordVisibility(); // t=20000, its own countdown starts now

                tick(10000); // t=30000 overall: password's 30s is up, confirm's is only at 10s
                expect(comp.showPassword).toBeFalse();
                expect(comp.showConfirmPassword).toBeTrue();

                tick(20000); // confirm's own 30s (started at t=20000) is now up too
                expect(comp.showConfirmPassword).toBeFalse();
            }));

            it('manually hiding the main password before 30s should cancel its auto-hide timer', fakeAsync(() => {
                const fixture = TestBed.createComponent(ResetPasswordComponent);
                const comp = fixture.componentInstance;
                fixture.detectChanges();

                comp.togglePasswordVisibility(); // reveal
                tick(10000);
                comp.togglePasswordVisibility(); // hide manually, well before 30s

                tick(30000); // the old timer, if not cleared, would have fired long ago
                expect(comp.showPassword).toBeFalse();
            }));

            it('clicking the real toggle button in the DOM should also start the countdown', fakeAsync(() => {
                const fixture = TestBed.createComponent(ResetPasswordComponent);
                fixture.detectChanges();

                fixture.debugElement.query(By.css('#rp-password + .toggle-visibility')).triggerEventHandler('click', null);
                fixture.detectChanges();
                expect(fixture.componentInstance.showPassword).toBeTrue();

                tick(30000);
                expect(fixture.componentInstance.showPassword).toBeFalse();
            }));

            it('ngOnDestroy should clear both fields\' pending auto-hide timers', fakeAsync(() => {
                const fixture = TestBed.createComponent(ResetPasswordComponent);
                const comp = fixture.componentInstance;
                fixture.detectChanges();
                comp.togglePasswordVisibility();
                comp.toggleConfirmPasswordVisibility();
                const clearSpy1 = spyOn((comp as any).passwordRevealTimer, 'clear').and.callThrough();
                const clearSpy2 = spyOn((comp as any).confirmPasswordRevealTimer, 'clear').and.callThrough();

                comp.ngOnDestroy();

                expect(clearSpy1).toHaveBeenCalled();
                expect(clearSpy2).toHaveBeenCalled();
                tick(30000); // proves both timers were really cancelled — nothing left to fire
            }));
        });
    });
});
