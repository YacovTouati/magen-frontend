import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { intakesGuard } from './intakes.guard';
import { AuthService } from '../services/auth.service';

describe('intakesGuard', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let router: Router;

    beforeEach(() => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['canManageIntakes', 'isLoggedIn']);

        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [{ provide: AuthService, useValue: authServiceSpy }]
        });

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
    });

    function runGuard() {
        return TestBed.runInInjectionContext(() => intakesGuard({} as any, {} as any));
    }

    it('should allow navigation for SUPER_ADMIN or INTAKE_ADMIN (canManageIntakes true)', () => {
        authServiceSpy.canManageIntakes.and.returnValue(true);

        expect(runGuard()).toBeTrue();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect a logged-in non-permitted user (SCHEDULER_ADMIN or VOLUNTEER) to the dashboard, not /login', () => {
        authServiceSpy.canManageIntakes.and.returnValue(false);
        authServiceSpy.isLoggedIn.and.returnValue(true);

        expect(runGuard()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should redirect an anonymous user to /login', () => {
        authServiceSpy.canManageIntakes.and.returnValue(false);
        authServiceSpy.isLoggedIn.and.returnValue(false);

        expect(runGuard()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
});
