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
        const mockResponse = { token: 'abc.def.ghi', user: { email: 'admin@magen.org', role: 'SUPER_ADMIN' } };

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
        const envelopedResponse = { data: { token: 'wrapped-tok', user: { email: 'admin@magen.org', role: 'SUPER_ADMIN' } } };

        service.login('admin@magen.org', 'secret').subscribe(response => {
            expect(response.token).toBe('wrapped-tok');
            expect(response.user.role).toBe('SUPER_ADMIN');
        });

        httpMock.expectOne(`${apiUrl}/login`).flush(envelopedResponse);

        expect(service.isLoggedIn()).toBeTrue();
        expect(service.isAdmin()).toBeTrue();
        expect(service.isSuperAdmin()).toBeTrue();
    });

    it('login should normalize each of the three admin roles and expose the matching role-check method', () => {
        const cases: { role: string; check: () => boolean }[] = [
            { role: 'SUPER_ADMIN', check: () => service.isSuperAdmin() },
            { role: 'INTAKE_ADMIN', check: () => service.isIntakeAdmin() },
            { role: 'SCHEDULER_ADMIN', check: () => service.isSchedulerAdmin() }
        ];

        for (const { role, check } of cases) {
            service.login('user@magen.org', 'secret').subscribe();
            httpMock.expectOne(`${apiUrl}/login`).flush({ token: 'tok', user: { email: 'user@magen.org', role } });

            expect(service.getUser()?.role).toBe(role);
            expect(check()).toBeTrue();
            expect(service.isAdmin()).toBeTrue();

            service.logout();
        }
    });

    it('canManageSchedule should be true only for SUPER_ADMIN and SCHEDULER_ADMIN', () => {
        for (const role of ['SUPER_ADMIN', 'SCHEDULER_ADMIN']) {
            service.login('user@magen.org', 'secret').subscribe();
            httpMock.expectOne(`${apiUrl}/login`).flush({ token: 'tok', user: { email: 'user@magen.org', role } });
            expect(service.canManageSchedule()).withContext(role).toBeTrue();
            service.logout();
        }

        for (const role of ['INTAKE_ADMIN', 'VOLUNTEER']) {
            service.login('user@magen.org', 'secret').subscribe();
            httpMock.expectOne(`${apiUrl}/login`).flush({ token: 'tok', user: { email: 'user@magen.org', role } });
            expect(service.canManageSchedule()).withContext(role).toBeFalse();
            service.logout();
        }
    });

    it('canManageIntakes should be true only for SUPER_ADMIN and INTAKE_ADMIN', () => {
        for (const role of ['SUPER_ADMIN', 'INTAKE_ADMIN']) {
            service.login('user@magen.org', 'secret').subscribe();
            httpMock.expectOne(`${apiUrl}/login`).flush({ token: 'tok', user: { email: 'user@magen.org', role } });
            expect(service.canManageIntakes()).withContext(role).toBeTrue();
            service.logout();
        }

        for (const role of ['SCHEDULER_ADMIN', 'VOLUNTEER']) {
            service.login('user@magen.org', 'secret').subscribe();
            httpMock.expectOne(`${apiUrl}/login`).flush({ token: 'tok', user: { email: 'user@magen.org', role } });
            expect(service.canManageIntakes()).withContext(role).toBeFalse();
            service.logout();
        }
    });

    it('should normalize the legacy flat ADMIN role (pre role-split) to SUPER_ADMIN rather than downgrading it', () => {
        service.login('admin@magen.org', 'secret').subscribe(response => {
            expect(response.user.role).toBe('SUPER_ADMIN');
        });

        httpMock.expectOne(`${apiUrl}/login`).flush({ token: 'tok', user: { email: 'admin@magen.org', role: 'ADMIN' } });

        expect(service.isSuperAdmin()).toBeTrue();
    });

    it('should normalize an unrecognized role string to VOLUNTEER rather than granting admin access', () => {
        service.login('user@magen.org', 'secret').subscribe();
        httpMock.expectOne(`${apiUrl}/login`).flush({ token: 'tok', user: { email: 'user@magen.org', role: 'SOMETHING_ELSE' } });

        expect(service.getUser()?.role).toBe('VOLUNTEER');
        expect(service.isAdmin()).toBeFalse();
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
        expect(service.isSuperAdmin()).toBeFalse();
        expect(service.isIntakeAdmin()).toBeFalse();
        expect(service.isSchedulerAdmin()).toBeFalse();
        expect(service.isLoggedIn()).toBeTrue();
    });

    it('logout should clear the token, user and localStorage', () => {
        const mockResponse = { token: 'tok', user: { email: 'admin@magen.org', role: 'SUPER_ADMIN' } };
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
        localStorage.setItem('magen_auth_user', JSON.stringify({ email: 'admin@magen.org', role: 'SUPER_ADMIN' }));

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AuthService]
        });
        const restoredService = TestBed.inject(AuthService);

        expect(restoredService.isLoggedIn()).toBeTrue();
        expect(restoredService.isAdmin()).toBeTrue();
        expect(restoredService.isSuperAdmin()).toBeTrue();
    });

    it('should upgrade a stale cached session (legacy ADMIN role, from before the role split) to SUPER_ADMIN on restore', () => {
        localStorage.setItem('magen_auth_token', 'persisted-token');
        localStorage.setItem('magen_auth_user', JSON.stringify({ email: 'admin@magen.org', role: 'ADMIN' }));

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AuthService]
        });
        const restoredService = TestBed.inject(AuthService);

        expect(restoredService.getUser()?.role).toBe('SUPER_ADMIN');
        expect(restoredService.isSuperAdmin()).toBeTrue();
    });

    describe('register', () => {
        const payload = { email: 'invitee@magen.org', password: 'Str0ng!Pass', name: 'Invitee', phone: '0501234567', token: 'raw-token' };

        it('should POST the payload to /auth/register and persist the returned session, same as login', () => {
            service.register(payload).subscribe(response => {
                expect(response.token).toBe('reg-tok');
                expect(response.user.role).toBe('VOLUNTEER');
            });

            const req = httpMock.expectOne(`${apiUrl}/register`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(payload);
            req.flush({ token: 'reg-tok', user: { email: payload.email, role: 'VOLUNTEER' } });

            expect(service.isLoggedIn()).toBeTrue();
            expect(service.getToken()).toBe('reg-tok');
        });

        it('should unwrap a { data: { token, user } } envelope from the backend', () => {
            service.register(payload).subscribe(response => {
                expect(response.token).toBe('wrapped-tok');
            });

            httpMock.expectOne(`${apiUrl}/register`).flush({ data: { token: 'wrapped-tok', user: { email: payload.email, role: 'VOLUNTEER' } } });

            expect(service.isLoggedIn()).toBeTrue();
        });

        it('should not persist a session when registration fails (e.g. expired/invalid invite)', () => {
            service.register(payload).subscribe({
                next: () => fail('expected an error'),
                error: () => { }
            });

            httpMock.expectOne(`${apiUrl}/register`).flush(
                { success: false, message: 'תוקף ההזמנה פג — יש לבקש הזמנה חדשה מהמנהל' },
                { status: 403, statusText: 'Forbidden' }
            );

            expect(service.isLoggedIn()).toBeFalse();
        });
    });

    describe('forgotPassword', () => {
        it('should POST the email to /auth/forgot-password and resolve with the backend message', () => {
            service.forgotPassword('someone@magen.org').subscribe(response => {
                expect(response.message).toBe('אם קיים חשבון המשויך לכתובת מייל זו, נשלח אליו קישור לאיפוס הסיסמה');
            });

            const req = httpMock.expectOne(`${apiUrl}/forgot-password`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ email: 'someone@magen.org' });
            req.flush({ success: true, message: 'אם קיים חשבון המשויך לכתובת מייל זו, נשלח אליו קישור לאיפוס הסיסמה' });
        });

        it('should not touch the stored session', () => {
            service.forgotPassword('someone@magen.org').subscribe();
            httpMock.expectOne(`${apiUrl}/forgot-password`).flush({ success: true, message: 'ok' });

            expect(service.isLoggedIn()).toBeFalse();
        });
    });

    describe('resetPassword', () => {
        it('should POST the token and new password to /auth/reset-password', () => {
            service.resetPassword('raw-reset-token', 'NewStr0ng!Pass').subscribe(response => {
                expect(response.message).toBe('הסיסמה אופסה בהצלחה');
            });

            const req = httpMock.expectOne(`${apiUrl}/reset-password`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ token: 'raw-reset-token', password: 'NewStr0ng!Pass' });
            req.flush({ success: true, message: 'הסיסמה אופסה בהצלחה' });
        });

        it('should not create a session on success — reset-password returns no token', () => {
            service.resetPassword('raw-reset-token', 'NewStr0ng!Pass').subscribe();
            httpMock.expectOne(`${apiUrl}/reset-password`).flush({ success: true, message: 'ok' });

            expect(service.isLoggedIn()).toBeFalse();
        });

        it('should propagate an error for an invalid/expired token', () => {
            let receivedError: any = null;

            service.resetPassword('bad-token', 'NewStr0ng!Pass').subscribe({
                next: () => fail('expected an error'),
                error: (err) => { receivedError = err; }
            });

            httpMock.expectOne(`${apiUrl}/reset-password`).flush(
                { success: false, message: 'קישור איפוס הסיסמה אינו תקין או שפג תוקפו' },
                { status: 400, statusText: 'Bad Request' }
            );

            expect(receivedError).toBeTruthy();
        });
    });
});
