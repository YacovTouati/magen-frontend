import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Intakes Management is SUPER_ADMIN/INTAKE_ADMIN-only — matches the backend's
// checkRole('SUPER_ADMIN', 'INTAKE_ADMIN') gate on the whole /intakes router.
// canManageIntakes() is the same check already used to gate the sidebar's tab itself.
export const intakesGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.canManageIntakes()) {
        return true;
    }

    router.navigate(authService.isLoggedIn() ? ['/'] : ['/login']);
    return false;
};
