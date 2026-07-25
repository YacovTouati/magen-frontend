import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    beforeEach(() => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'isSessionExpired', 'logout']);
        authServiceSpy.isSessionExpired.and.returnValue(false);

        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [{ provide: AuthService, useValue: authServiceSpy }]
        });

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
    });

    function runGuard() {
        return TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    }

    it('should allow navigation when the user is logged in', () => {
        authServiceSpy.isLoggedIn.and.returnValue(true);

        expect(runGuard()).toBeTrue();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should block navigation and redirect to /login when the user is not logged in', () => {
        authServiceSpy.isLoggedIn.and.returnValue(false);

        expect(runGuard()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should log out and redirect with a session-expired message when the 24h client-side backstop trips, even if isLoggedIn would otherwise be true', () => {
        authServiceSpy.isSessionExpired.and.returnValue(true);
        authServiceSpy.isLoggedIn.and.returnValue(true);

        expect(runGuard()).toBeFalse();
        expect(authServiceSpy.logout).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/login'], jasmine.objectContaining({
            state: jasmine.objectContaining({ message: jasmine.any(String) })
        }));
    });
});
