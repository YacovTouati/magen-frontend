import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// User/account management is SUPER_ADMIN-only — INTAKE_ADMIN and SCHEDULER_ADMIN are
// scoped to their own domains and don't get this route, matching the backend's
// userRoutes.ts (checkRole('SUPER_ADMIN') on the whole /users router).
export const adminGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isSuperAdmin()) {
        return true;
    }

    router.navigate(authService.isLoggedIn() ? ['/'] : ['/login']);
    return false;
};
