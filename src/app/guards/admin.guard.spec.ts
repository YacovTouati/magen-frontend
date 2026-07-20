import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    beforeEach(() => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['isSuperAdmin', 'isLoggedIn']);

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

    it('should allow navigation for a SUPER_ADMIN user', () => {
        authServiceSpy.isSuperAdmin.and.returnValue(true);

        expect(runGuard()).toBeTrue();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect a logged-in non-super-admin (INTAKE_ADMIN, SCHEDULER_ADMIN or VOLUNTEER) to the dashboard, not /login', () => {
        authServiceSpy.isSuperAdmin.and.returnValue(false);
        authServiceSpy.isLoggedIn.and.returnValue(true);

        expect(runGuard()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should redirect an anonymous user to /login', () => {
        authServiceSpy.isSuperAdmin.and.returnValue(false);
        authServiceSpy.isLoggedIn.and.returnValue(false);

        expect(runGuard()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
});
