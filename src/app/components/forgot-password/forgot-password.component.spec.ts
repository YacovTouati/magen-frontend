import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../services/auth.service';

describe('ForgotPasswordComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['forgotPassword']);

        await TestBed.configureTestingModule({
            imports: [ForgotPasswordComponent, RouterTestingModule],
            providers: [{ provide: AuthService, useValue: authServiceSpy }]
        }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(ForgotPasswordComponent);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should not call the service when the email is blank', () => {
        const fixture = TestBed.createComponent(ForgotPasswordComponent);
        fixture.componentInstance.email = '   ';

        fixture.componentInstance.onSubmit();

        expect(authServiceSpy.forgotPassword).not.toHaveBeenCalled();
    });

    it('should show the generic confirmation on success, regardless of whether the email exists', () => {
        authServiceSpy.forgotPassword.and.returnValue(of({ message: 'אם קיים חשבון המשויך לכתובת מייל זו, נשלח אליו קישור לאיפוס הסיסמה' }));
        const fixture = TestBed.createComponent(ForgotPasswordComponent);
        const comp = fixture.componentInstance;
        comp.email = 'someone@magen.org';

        comp.onSubmit();

        expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('someone@magen.org');
        expect(comp.submitted).toBeTrue();
        expect(comp.isSubmitting).toBeFalse();
    });

    it('should surface an error message and stay on the form when the request fails outright', () => {
        authServiceSpy.forgotPassword.and.returnValue(throwError(() => new Error('network down')));
        const fixture = TestBed.createComponent(ForgotPasswordComponent);
        const comp = fixture.componentInstance;
        comp.email = 'someone@magen.org';

        comp.onSubmit();

        expect(comp.submitted).toBeFalse();
        expect(comp.errorMessage).toBe('משהו השתבש. נסה/י שוב.');
        expect(comp.isSubmitting).toBeFalse();
    });
});
