import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);

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

    it('should show an error message and not navigate when login fails', () => {
        authServiceSpy.login.and.returnValue(throwError(() => new Error('Unauthorized')));
        const fixture = TestBed.createComponent(LoginComponent);
        const comp = fixture.componentInstance;
        comp.email = 'bad@magen.org';
        comp.password = 'wrong';

        comp.onSubmit();

        expect(comp.errorMessage).toBeTruthy();
        expect(comp.isSubmitting).toBeFalse();
        expect(router.navigate).not.toHaveBeenCalled();
    });
});
