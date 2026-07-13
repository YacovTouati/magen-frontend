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
        const enveloped = { data: [{ id: 5, name: 'Wrapped User', email: 'wrapped@example.com', role: 'ADMIN' }] };

        service.getUsers().subscribe(users => {
            expect(users.length).toBe(1);
            expect(users[0].name).toBe('Wrapped User');
            expect(users[0].role).toBe('ADMIN');
        });

        httpMock.expectOne(apiUrl).flush(enveloped);
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
