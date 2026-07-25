import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService, SESSION_EXPIRED_MESSAGE } from '../services/auth.service';

describe('authInterceptor', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;
    let authService: AuthService;
    let router: Router;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        });

        httpClient = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService);
        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    it('should attach the Authorization header when a token exists', () => {
        localStorage.setItem('magen_auth_token', 'my-jwt-token');

        httpClient.get('/api/users').subscribe();

        const req = httpMock.expectOne('/api/users');
        expect(req.request.headers.get('Authorization')).toBe('Bearer my-jwt-token');
        req.flush({});
    });

    it('should not attach an Authorization header when there is no token', () => {
        expect(authService.getToken()).toBeNull();

        httpClient.get('/api/users').subscribe();

        const req = httpMock.expectOne('/api/users');
        expect(req.request.headers.has('Authorization')).toBeFalse();
        req.flush({});
    });

    it('should clear the session and redirect to /login with a message on a 401 from a protected endpoint', () => {
        localStorage.setItem('magen_auth_token', 'my-jwt-token');

        httpClient.get('/api/intakes').subscribe({ error: () => { } });

        httpMock.expectOne('/api/intakes').flush(
            { success: false, message: 'טוקן לא תקין או שפג תוקפו' },
            { status: 401, statusText: 'Unauthorized' }
        );

        expect(authService.getToken()).toBeNull();
        expect(router.navigate).toHaveBeenCalledWith(['/login'], { state: { message: SESSION_EXPIRED_MESSAGE } });
    });

    it('should NOT treat a 401 from /auth/login as a session invalidation (wrong credentials, not an expired session)', () => {
        httpClient.post('/api/auth/login', { email: 'a@a.com', password: 'wrong' }).subscribe({ error: () => { } });

        httpMock.expectOne('/api/auth/login').flush(
            { success: false, message: 'אימייל או סיסמה שגויים' },
            { status: 401, statusText: 'Unauthorized' }
        );

        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should NOT treat a 401 from /user/change-password as a session invalidation (wrong current password, not an expired session)', () => {
        localStorage.setItem('magen_auth_token', 'my-jwt-token');

        httpClient.post('/api/user/change-password', {}).subscribe({ error: () => { } });

        httpMock.expectOne('/api/user/change-password').flush(
            { success: false, message: 'הסיסמה הנוכחית שגויה' },
            { status: 401, statusText: 'Unauthorized' }
        );

        expect(authService.getToken()).toBe('my-jwt-token');
        expect(router.navigate).not.toHaveBeenCalled();
    });
});
