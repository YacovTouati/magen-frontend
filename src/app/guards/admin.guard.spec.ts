import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    beforeEach(() => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'isLoggedIn']);

        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [{ provide: AuthService, useValue: authServiceSpy }]
        });

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
    });

    function runGuard() {
        return TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
    }

    it('should allow navigation for an admin user', () => {
        authServiceSpy.isAdmin.and.returnValue(true);

        expect(runGuard()).toBeTrue();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect a logged-in non-admin (volunteer) to the dashboard, not /login', () => {
        authServiceSpy.isAdmin.and.returnValue(false);
        authServiceSpy.isLoggedIn.and.returnValue(true);

        expect(runGuard()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should redirect an anonymous user to /login', () => {
        authServiceSpy.isAdmin.and.returnValue(false);
        authServiceSpy.isLoggedIn.and.returnValue(false);

        expect(runGuard()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
});
