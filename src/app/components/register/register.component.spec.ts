import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../services/auth.service';

describe('RegisterComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    function configure(queryParams: Record<string, string>) {
        return TestBed.configureTestingModule({
            imports: [RegisterComponent, RouterTestingModule],
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } }
            ]
        }).compileComponents();
    }

    beforeEach(() => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);
    });

    it('should flag the link as invalid and not render a form when token/email are missing', async () => {
        await configure({});
        const fixture = TestBed.createComponent(RegisterComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.linkInvalid).toBeTrue();
    });

    it('should flag the link as invalid when only the email is present (no token)', async () => {
        await configure({ email: 'invitee@magen.org' });
        const fixture = TestBed.createComponent(RegisterComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.linkInvalid).toBeTrue();
    });

    it('should read email and token from query params and consider the link valid', async () => {
        await configure({ email: 'invitee@magen.org', token: 'raw-token' });
        const fixture = TestBed.createComponent(RegisterComponent);
        fixture.detectChanges();
        const comp = fixture.componentInstance;

        expect(comp.linkInvalid).toBeFalse();
        expect(comp.email).toBe('invitee@magen.org');
        expect(comp.token).toBe('raw-token');
    });

    describe('with a valid link', () => {
        beforeEach(async () => {
            await configure({ email: 'invitee@magen.org', token: 'raw-token' });
            router = TestBed.inject(Router);
            spyOn(router, 'navigate');
        });

        it('canSubmit should require name, phone, a valid password, and matching confirmation', () => {
            const fixture = TestBed.createComponent(RegisterComponent);
            fixture.detectChanges();
            const comp = fixture.componentInstance;

            expect(comp.canSubmit).toBeFalse();

            comp.name = 'Invitee';
            comp.phone = '0501234567';
            comp.password = 'Str0ng!Pass';
            comp.confirmPassword = 'Str0ng!Pass';

            expect(comp.canSubmit).toBeTrue();
        });

        it('canSubmit should be false when passwords do not match', () => {
            const fixture = TestBed.createComponent(RegisterComponent);
            fixture.detectChanges();
            const comp = fixture.componentInstance;
            comp.name = 'Invitee';
            comp.phone = '0501234567';
            comp.password = 'Str0ng!Pass';
            comp.confirmPassword = 'Different1!';

            expect(comp.canSubmit).toBeFalse();
            expect(comp.passwordsMatch).toBeFalse();
        });

        it('should not call the service when the form is incomplete', () => {
            const fixture = TestBed.createComponent(RegisterComponent);
            fixture.detectChanges();
            fixture.componentInstance.onSubmit();

            expect(authServiceSpy.register).not.toHaveBeenCalled();
        });

        it('should submit the full payload including the URL-derived email/token, and navigate home on success', () => {
            authServiceSpy.register.and.returnValue(of({ token: 'tok', user: { email: 'invitee@magen.org', role: 'VOLUNTEER' } }));
            const fixture = TestBed.createComponent(RegisterComponent);
            fixture.detectChanges();
            const comp = fixture.componentInstance;
            comp.name = 'Invitee';
            comp.phone = '0501234567';
            comp.password = 'Str0ng!Pass';
            comp.confirmPassword = 'Str0ng!Pass';

            comp.onSubmit();

            expect(authServiceSpy.register).toHaveBeenCalledWith({
                email: 'invitee@magen.org',
                password: 'Str0ng!Pass',
                name: 'Invitee',
                phone: '0501234567',
                token: 'raw-token'
            });
            expect(router.navigate).toHaveBeenCalledWith(['/']);
            expect(comp.isSubmitting).toBeFalse();
        });

        it('should surface the backend\'s exact error message and not navigate on failure (e.g. expired invite)', () => {
            const serverError = { error: { success: false, message: 'תוקף ההזמנה פג — יש לבקש הזמנה חדשה מהמנהל' } };
            authServiceSpy.register.and.returnValue(throwError(() => serverError));
            const fixture = TestBed.createComponent(RegisterComponent);
            fixture.detectChanges();
            const comp = fixture.componentInstance;
            comp.name = 'Invitee';
            comp.phone = '0501234567';
            comp.password = 'Str0ng!Pass';
            comp.confirmPassword = 'Str0ng!Pass';

            comp.onSubmit();

            expect(comp.errorMessage).toBe('תוקף ההזמנה פג — יש לבקש הזמנה חדשה מהמנהל');
            expect(comp.isSubmitting).toBeFalse();
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });
});
