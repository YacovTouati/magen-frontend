import { TestBed } from '@angular/core/testing';
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
    });
});
