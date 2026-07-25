import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, SESSION_EXPIRED_MESSAGE } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Client-side 24h backstop, checked on every activation of the protected
    // route tree (including a fresh page load) — see AuthService.isSessionExpired.
    if (authService.isSessionExpired()) {
        authService.logout();
        router.navigate(['/login'], { state: { message: SESSION_EXPIRED_MESSAGE } });
        return false;
    }

    if (authService.isLoggedIn()) {
        return true;
    }

    router.navigate(['/login']);
    return false;
};
