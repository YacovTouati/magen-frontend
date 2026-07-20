import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserManagementService, User } from './user-management.service';

describe('UserManagementService', () => {
    let service: UserManagementService;
    let httpMock: HttpTestingController;
    const apiUrl = 'http://localhost:3000/api/users';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [UserManagementService]
        });

        service = TestBed.inject(UserManagementService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getUsers should issue a GET and normalize a flat array response', () => {
        const mockUsers = [
            { id: 1, name: 'Test User', email: 'test@example.com', role: 'VOLUNTEER' }
        ];

        service.getUsers().subscribe(users => {
            expect(users.length).toBe(1);
            expect(users[0].id).toBe(1);
            expect(users[0].name).toBe('Test User');
            expect(users[0].email).toBe('test@example.com');
            expect(users[0].role).toBe('VOLUNTEER');
        });

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('GET');
        req.flush(mockUsers);
    });

    it('getUsers should unwrap a { data: [...] } envelope from the backend', () => {
        const enveloped = { data: [{ id: 5, name: 'Wrapped User', email: 'wrapped@example.com', role: 'SUPER_ADMIN' }] };

        service.getUsers().subscribe(users => {
            expect(users.length).toBe(1);
            expect(users[0].name).toBe('Wrapped User');
            expect(users[0].role).toBe('SUPER_ADMIN');
        });

        httpMock.expectOne(apiUrl).flush(enveloped);
    });

    it('getUsers should normalize the legacy flat ADMIN role to SUPER_ADMIN', () => {
        service.getUsers().subscribe(users => {
            expect(users[0].role).toBe('SUPER_ADMIN');
        });

        httpMock.expectOne(apiUrl).flush([{ id: 1, name: 'Legacy Admin', email: 'legacy@example.com', role: 'ADMIN' }]);
    });

    it('getUsers should pass INTAKE_ADMIN and SCHEDULER_ADMIN through unchanged', () => {
        service.getUsers().subscribe(users => {
            expect(users[0].role).toBe('INTAKE_ADMIN');
            expect(users[1].role).toBe('SCHEDULER_ADMIN');
        });

        httpMock.expectOne(apiUrl).flush([
            { id: 1, name: 'Intake Admin', email: 'intake@example.com', role: 'INTAKE_ADMIN' },
            { id: 2, name: 'Scheduler Admin', email: 'scheduler@example.com', role: 'SCHEDULER_ADMIN' }
        ]);
    });

    it('getUsers should normalize an unrecognized role to VOLUNTEER', () => {
        service.getUsers().subscribe(users => {
            expect(users[0].role).toBe('VOLUNTEER');
        });

        httpMock.expectOne(apiUrl).flush([{ id: 1, name: 'Mystery User', email: 'mystery@example.com', role: 'BOGUS' }]);
    });

    it('getUsers should return an empty array for an unrecognized response shape', () => {
        service.getUsers().subscribe(users => {
            expect(users).toEqual([]);
        });

        httpMock.expectOne(apiUrl).flush({ message: 'no users field here' });
    });

    it('addUser should issue a POST with the new user payload', () => {
        const newUser: Omit<User, 'id'> = {
            name: 'New User',
            email: 'new@example.com',
            password: 'secret',
            role: 'VOLUNTEER'
        };
        const created: User = { id: 2, ...newUser };

        service.addUser(newUser).subscribe(user => {
            expect(user).toEqual(created);
        });

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(newUser);
        req.flush(created);
    });

    describe('updateUserRole', () => {
        it('should issue a PATCH to /users/:id/role with the new role and normalize the response', () => {
            service.updateUserRole(5, 'SCHEDULER_ADMIN').subscribe(user => {
                expect(user.id).toBe(5);
                expect(user.role).toBe('SCHEDULER_ADMIN');
            });

            const req = httpMock.expectOne(`${apiUrl}/5/role`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({ role: 'SCHEDULER_ADMIN' });
            req.flush({ success: true, data: { id: 5, name: 'Test User', email: 'test@example.com', role: 'SCHEDULER_ADMIN' } });
        });

        it('should unwrap a bare (non-enveloped) response too', () => {
            service.updateUserRole(5, 'VOLUNTEER').subscribe(user => {
                expect(user.role).toBe('VOLUNTEER');
            });

            httpMock.expectOne(`${apiUrl}/5/role`).flush({ id: 5, name: 'Test User', email: 'test@example.com', role: 'VOLUNTEER' });
        });

        it('should emit on usersChanged$ after a successful role update', () => {
            let emitCount = 0;
            service.usersChanged$.subscribe(() => emitCount++);

            service.updateUserRole(5, 'INTAKE_ADMIN').subscribe();
            httpMock.expectOne(`${apiUrl}/5/role`).flush({ id: 5, name: 'Test User', email: 'test@example.com', role: 'INTAKE_ADMIN' });

            expect(emitCount).toBe(1);
        });

        it('should not emit on usersChanged$ when the role update fails', () => {
            let emitCount = 0;
            service.usersChanged$.subscribe(() => emitCount++);

            service.updateUserRole(5, 'INTAKE_ADMIN').subscribe({ error: () => { } });
            httpMock.expectOne(`${apiUrl}/5/role`).flush(
                { success: false, message: 'forbidden' },
                { status: 403, statusText: 'Forbidden' }
            );

            expect(emitCount).toBe(0);
        });
    });

    it('deleteUser should issue a DELETE to the user-specific endpoint and not touch other users', () => {
        service.deleteUser(2).subscribe(response => {
            expect(response).toBeNull();
        });

        const req = httpMock.expectOne(`${apiUrl}/2`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    it('deleteUser should target the exact id requested, encoded in the URL only', () => {
        service.deleteUser('abc-123').subscribe();

        const req = httpMock.expectOne(`${apiUrl}/abc-123`);
        expect(req.request.method).toBe('DELETE');
        expect(req.request.body).toBeNull();
    });

    describe('usersChanged$', () => {
        it('should emit after a successful deleteUser (so other views, e.g. the calendar, know to refetch)', () => {
            let emitCount = 0;
            service.usersChanged$.subscribe(() => emitCount++);

            service.deleteUser(3).subscribe();
            httpMock.expectOne(`${apiUrl}/3`).flush(null);

            expect(emitCount).toBe(1);
        });

        it('should not emit when deleteUser fails', () => {
            let emitCount = 0;
            service.usersChanged$.subscribe(() => emitCount++);

            service.deleteUser(3).subscribe({ error: () => { } });
            httpMock.expectOne(`${apiUrl}/3`).flush(
                { message: 'forbidden' },
                { status: 403, statusText: 'Forbidden' }
            );

            expect(emitCount).toBe(0);
        });
    });
});
