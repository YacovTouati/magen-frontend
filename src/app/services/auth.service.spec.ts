import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    const apiUrl = 'http://localhost:3000/api/auth';

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AuthService]
        });

        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    it('should start logged out when localStorage is empty', () => {
        expect(service.isLoggedIn()).toBeFalse();
        expect(service.getUser()).toBeNull();
        expect(service.getToken()).toBeNull();
    });

    it('login should POST credentials and persist the token and user on success', () => {
        const mockResponse = { token: 'abc.def.ghi', user: { email: 'admin@magen.org', role: 'ADMIN' } };

        service.login('admin@magen.org', 'secret').subscribe(response => {
            expect(response).toEqual(mockResponse);
        });

        const req = httpMock.expectOne(`${apiUrl}/login`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ email: 'admin@magen.org', password: 'secret' });
        req.flush(mockResponse);

        expect(service.isLoggedIn()).toBeTrue();
        expect(service.getToken()).toBe('abc.def.ghi');
        expect(service.getUser()).toEqual(mockResponse.user);
        expect(localStorage.getItem('magen_auth_token')).toBe('abc.def.ghi');
    });

    it('login should unwrap a { data: { token, user } } envelope from the backend', () => {
        const envelopedResponse = { data: { token: 'wrapped-tok', user: { email: 'admin@magen.org', role: 'ADMIN' } } };

        service.login('admin@magen.org', 'secret').subscribe(response => {
            expect(response.token).toBe('wrapped-tok');
            expect(response.user.role).toBe('ADMIN');
        });

        httpMock.expectOne(`${apiUrl}/login`).flush(envelopedResponse);

        expect(service.isLoggedIn()).toBeTrue();
        expect(service.isAdmin()).toBeTrue();
    });

    it('login should error out (not throw inside next) when the response has no token/user', () => {
        let receivedError: any = null;

        service.login('admin@magen.org', 'secret').subscribe({
            next: () => fail('expected an error, got a value'),
            error: (err) => { receivedError = err; }
        });

        httpMock.expectOne(`${apiUrl}/login`).flush({ message: 'ok but no token' });

        expect(receivedError).toBeTruthy();
        expect(service.isLoggedIn()).toBeFalse();
    });

    it('login should not persist any session when the request fails', () => {
        service.login('bad@magen.org', 'wrong').subscribe({
            next: () => fail('expected an error'),
            error: () => { }
        });

        const req = httpMock.expectOne(`${apiUrl}/login`);
        req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

        expect(service.isLoggedIn()).toBeFalse();
        expect(service.getToken()).toBeNull();
    });

    it('isAdmin should reflect the stored user role', () => {
        const mockResponse = { token: 'tok', user: { email: 'v@magen.org', role: 'VOLUNTEER' } };

        service.login('v@magen.org', 'secret').subscribe();
        httpMock.expectOne(`${apiUrl}/login`).flush(mockResponse);

        expect(service.isAdmin()).toBeFalse();
        expect(service.isLoggedIn()).toBeTrue();
    });

    it('logout should clear the token, user and localStorage', () => {
        const mockResponse = { token: 'tok', user: { email: 'admin@magen.org', role: 'ADMIN' } };
        service.login('admin@magen.org', 'secret').subscribe();
        httpMock.expectOne(`${apiUrl}/login`).flush(mockResponse);

        service.logout();

        expect(service.isLoggedIn()).toBeFalse();
        expect(service.getUser()).toBeNull();
        expect(service.getToken()).toBeNull();
        expect(localStorage.getItem('magen_auth_token')).toBeNull();
        expect(localStorage.getItem('magen_auth_user')).toBeNull();
    });

    it('should restore an existing session from localStorage on construction', () => {
        localStorage.setItem('magen_auth_token', 'persisted-token');
        localStorage.setItem('magen_auth_user', JSON.stringify({ email: 'admin@magen.org', role: 'ADMIN' }));

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AuthService]
        });
        const restoredService = TestBed.inject(AuthService);

        expect(restoredService.isLoggedIn()).toBeTrue();
        expect(restoredService.isAdmin()).toBeTrue();
    });
});
