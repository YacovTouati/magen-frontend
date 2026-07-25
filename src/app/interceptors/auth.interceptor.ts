import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService, SESSION_EXPIRED_MESSAGE } from '../services/auth.service';

// 401 from these two paths is a normal domain-level response, not a signal that
// the caller's own session/JWT is invalid — /auth/login rejects wrong
// credentials this way (and never carries a session token to begin with), and
// /user/change-password rejects a wrong *current* password this way (its JWT
// already passed the backend's authenticate middleware to even reach that
// check). Auto-logging out on either would be a false positive.
const SESSION_CHECK_EXCLUDED_PATHS = ['/auth/login', '/user/change-password'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.getToken();

    const authorizedReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    return next(authorizedReq).pipe(
        catchError((error: unknown) => {
            const isSessionInvalid =
                error instanceof HttpErrorResponse &&
                error.status === 401 &&
                !SESSION_CHECK_EXCLUDED_PATHS.some(path => req.url.includes(path));

            if (isSessionInvalid) {
                authService.logout();
                router.navigate(['/login'], { state: { message: SESSION_EXPIRED_MESSAGE } });
            }

            return throwError(() => error);
        })
    );
};
