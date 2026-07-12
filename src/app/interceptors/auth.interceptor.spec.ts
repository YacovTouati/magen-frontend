import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;
    let authService: AuthService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting()
            ]
        });

        httpClient = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService);
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
});
