import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserManagementComponent } from './user-management.component';
import { UserManagementService, User, PendingInvite } from '../../services/user-management.service';

describe('UserManagementComponent', () => {
    let userServiceSpy: jasmine.SpyObj<UserManagementService>;

    const existingUsers: User[] = [
        { id: 1, name: 'Alice', email: 'alice@example.com', role: 'SUPER_ADMIN' },
        { id: 2, name: 'Bob', email: 'bob@example.com', role: 'VOLUNTEER' }
    ];

    beforeEach(async () => {
        userServiceSpy = jasmine.createSpyObj('UserManagementService', ['getUsers', 'inviteUser', 'listInvitations', 'deleteUser', 'updateUserRole']);
        userServiceSpy.getUsers.and.returnValue(of(existingUsers));
        userServiceSpy.listInvitations.and.returnValue(of([]));

        await TestBed.configureTestingModule({
            imports: [UserManagementComponent],
            providers: [{ provide: UserManagementService, useValue: userServiceSpy }]
        }).compileComponents();
    });

    function createComponent() {
        const fixture = TestBed.createComponent(UserManagementComponent);
        fixture.detectChanges();
        return fixture;
    }

    it('should create and load users on init', () => {
        const fixture = createComponent();
        const comp = fixture.componentInstance;

        expect(comp).toBeTruthy();
        expect(userServiceSpy.getUsers).toHaveBeenCalledTimes(1);
        expect(comp.users.length).toBe(2);
        expect(comp.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })))
            .toEqual(existingUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
        expect(comp.isLoading).toBeFalse();
    });

    it('should surface an error message when loading users fails, without touching the delete API', () => {
        userServiceSpy.getUsers.and.returnValue(throwError(() => new Error('network down')));

        const fixture = createComponent();
        const comp = fixture.componentInstance;

        expect(comp.formError).toBe('לא ניתן לטעון משתמשים מהשרת כרגע.');
        expect(comp.isLoading).toBeFalse();
        expect(userServiceSpy.deleteUser).not.toHaveBeenCalled();
    });

    describe('deleteUser', () => {
        it('should do nothing when id is missing, and never open the confirm modal', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            comp.deleteUser({ id: undefined, name: 'Ghost', email: 'x@example.com', role: 'VOLUNTEER' });

            expect(comp.isDeleteConfirmOpen).toBeFalse();
            expect(userServiceSpy.deleteUser).not.toHaveBeenCalled();
        });

        it('should open the styled confirm modal (not window.confirm) with the target user name, without calling the service yet', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            spyOn(window, 'confirm');

            comp.deleteUser(existingUsers[0]);

            expect(window.confirm).not.toHaveBeenCalled();
            expect(comp.isDeleteConfirmOpen).toBeTrue();
            expect(comp.deleteConfirmMessage).toContain('Alice');
            expect(userServiceSpy.deleteUser).not.toHaveBeenCalled();
        });

        it('should abort the delete and close the modal when cancelled', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            comp.deleteUser(existingUsers[0]);
            comp.onCancelDelete();

            expect(comp.isDeleteConfirmOpen).toBeFalse();
            expect(userServiceSpy.deleteUser).not.toHaveBeenCalled();
        });

        it('should call deleteUser with the exact id, close the modal, and reload the list on confirm', () => {
            userServiceSpy.deleteUser.and.returnValue(of(undefined));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            userServiceSpy.getUsers.calls.reset();

            comp.deleteUser(existingUsers[1]);
            comp.onConfirmDelete();

            expect(userServiceSpy.deleteUser).toHaveBeenCalledOnceWith(2);
            expect(userServiceSpy.deleteUser).not.toHaveBeenCalledWith(1);
            expect(userServiceSpy.getUsers).toHaveBeenCalledTimes(1);
            expect(comp.isDeleteConfirmOpen).toBeFalse();
        });

        it('should show an error and not crash when the delete request fails', () => {
            userServiceSpy.deleteUser.and.returnValue(throwError(() => new Error('forbidden')));
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            comp.deleteUser(existingUsers[0]);
            comp.onConfirmDelete();

            expect(comp.formError).toBe('מחיקת המשתמש נכשלה. נסה שוב.');
        });
    });

    describe('inviteUser', () => {
        it('should reject an empty email and never call the service', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.inviteEmail = '   ';

            comp.inviteUser();

            expect(userServiceSpy.inviteUser).not.toHaveBeenCalled();
        });

        it('should submit, reset the form, show the returned link, and reload invitations on success', () => {
            const invite = { email: 'new@example.com', role: 'VOLUNTEER' as const, expiresAt: '2026-08-01T00:00:00.000Z', registrationToken: 'raw-token' };
            userServiceSpy.inviteUser.and.returnValue(of(invite));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.inviteEmail = 'new@example.com';
            comp.inviteRole = 'VOLUNTEER';
            userServiceSpy.listInvitations.calls.reset();

            comp.inviteUser();

            expect(userServiceSpy.inviteUser).toHaveBeenCalledOnceWith('new@example.com', 'VOLUNTEER');
            expect(comp.formSuccess).toContain('new@example.com');
            expect(comp.inviteEmail).toBe('');
            expect(comp.lastInvite).toEqual(invite);
            expect(userServiceSpy.listInvitations).toHaveBeenCalledTimes(1);
        });

        it('should show the backend\'s exact validation message when the server returns a structured errors array', () => {
            const serverError = { error: { success: false, errors: [{ field: 'email', message: 'כתובת המייל שהוזנה אינה תקינה' }] } };
            userServiceSpy.inviteUser.and.returnValue(throwError(() => serverError));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.inviteEmail = 'not-an-email';

            comp.inviteUser();

            expect(comp.formError).toBe('כתובת המייל שהוזנה אינה תקינה');
        });

        it('should surface the backend\'s message for an already-registered email (409)', () => {
            const serverError = { error: { success: false, message: 'כתובת המייל כבר רשומה במערכת כמשתמש פעיל' } };
            userServiceSpy.inviteUser.and.returnValue(throwError(() => serverError));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.inviteEmail = 'alice@example.com';

            comp.inviteUser();

            expect(comp.formError).toBe('כתובת המייל כבר רשומה במערכת כמשתמש פעיל');
        });
    });

    describe('registrationLink', () => {
        it('should build a /register URL with the token and email as query params', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            const link = comp.registrationLink({ email: 'new@example.com', registrationToken: 'abc123' });

            expect(link).toContain('/register?');
            expect(link).toContain('token=abc123');
            expect(link).toContain('email=new%40example.com');
        });
    });

    describe('reinvite', () => {
        const pending: PendingInvite = {
            id: 1, email: 'pending@example.com', role: 'VOLUNTEER', expiresAt: '2026-08-01T00:00:00.000Z',
            createdAt: '2026-07-30T00:00:00.000Z', invitedBy: { id: 1, name: 'Admin', email: 'admin@example.com' }
        };

        it('should re-call inviteUser with the same email/role and show the fresh link', () => {
            const refreshed = { email: 'pending@example.com', role: 'VOLUNTEER' as const, expiresAt: '2026-08-03T00:00:00.000Z', registrationToken: 'new-token' };
            userServiceSpy.inviteUser.and.returnValue(of(refreshed));
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            comp.reinvite(pending);

            expect(userServiceSpy.inviteUser).toHaveBeenCalledOnceWith('pending@example.com', 'VOLUNTEER');
            expect(comp.lastInvite).toEqual(refreshed);
            expect(comp.pendingReinviteEmail).toBeNull();
        });

        it('should not start a second re-invite while one is already in flight', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.pendingReinviteEmail = 'pending@example.com';

            comp.reinvite(pending);

            expect(userServiceSpy.inviteUser).not.toHaveBeenCalled();
        });
    });

    describe('getRoleLabel', () => {
        it('should render a Hebrew label for each of the four known roles', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            expect(comp.getRoleLabel('SUPER_ADMIN')).toBe('מנהל/ת-על');
            expect(comp.getRoleLabel('INTAKE_ADMIN')).toBe('מנהל/ת אינטייק');
            expect(comp.getRoleLabel('SCHEDULER_ADMIN')).toBe('מנהל/ת שיבוץ');
            expect(comp.getRoleLabel('VOLUNTEER')).toBe('מתנדב/ת');
        });

        it('should return "לא ידוע" for a missing role', () => {
            const fixture = createComponent();
            expect(fixture.componentInstance.getRoleLabel(undefined)).toBe('לא ידוע');
        });
    });

    describe('role dropdown options', () => {
        it('should expose all four roles for the create-user and per-row role selects', () => {
            const fixture = createComponent();
            const values = fixture.componentInstance.roleOptions.map(o => o.value);

            expect(values).toEqual(['SUPER_ADMIN', 'INTAKE_ADMIN', 'SCHEDULER_ADMIN', 'VOLUNTEER']);
        });
    });

    describe('onRoleChange', () => {
        it('should do nothing when the user has no id', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            comp.onRoleChange({ id: undefined, name: 'Ghost', email: 'x@example.com', role: 'VOLUNTEER' }, 'SUPER_ADMIN');

            expect(userServiceSpy.updateUserRole).not.toHaveBeenCalled();
        });

        it('should call updateUserRole with the exact id and new role, then update the row in place on success', () => {
            userServiceSpy.updateUserRole.and.returnValue(of({ id: 2, name: 'Bob', email: 'bob@example.com', role: 'SCHEDULER_ADMIN' }));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            const bob = comp.users.find(u => u.id === 2)!;

            comp.onRoleChange(bob, 'SCHEDULER_ADMIN');

            expect(userServiceSpy.updateUserRole).toHaveBeenCalledOnceWith(2, 'SCHEDULER_ADMIN');
            expect(bob.role).toBe('SCHEDULER_ADMIN');
            expect(comp.formSuccess).toContain('Bob');
            expect(comp.pendingRoleChangeId).toBeNull();
        });

        it('should mark the row pending while the request is in flight', () => {
            userServiceSpy.updateUserRole.and.returnValue(of({ id: 2, name: 'Bob', email: 'bob@example.com', role: 'SCHEDULER_ADMIN' }));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            userServiceSpy.updateUserRole.and.callFake(() => {
                expect(comp.isPendingRoleChange(comp.users[1])).toBeTrue();
                return of({ id: 2, name: 'Bob', email: 'bob@example.com', role: 'SCHEDULER_ADMIN' });
            });

            comp.onRoleChange(comp.users[1], 'SCHEDULER_ADMIN');

            expect(comp.isPendingRoleChange(comp.users[1])).toBeFalse();
        });

        it('should show an error and leave the row unpending when the update fails', () => {
            userServiceSpy.updateUserRole.and.returnValue(throwError(() => new Error('forbidden')));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            const bob = comp.users.find(u => u.id === 2)!;

            comp.onRoleChange(bob, 'SCHEDULER_ADMIN');

            expect(comp.formError).toBe('עדכון התפקיד נכשל. נסה שוב.');
            expect(comp.pendingRoleChangeId).toBeNull();
        });

        it('should not start a second role change while one is already in flight for another row', () => {
            userServiceSpy.updateUserRole.and.returnValue(of({ id: 1, name: 'Alice', email: 'alice@example.com', role: 'VOLUNTEER' }));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.pendingRoleChangeId = 99;

            comp.onRoleChange(comp.users[0], 'VOLUNTEER');

            expect(userServiceSpy.updateUserRole).not.toHaveBeenCalled();
        });
    });
});
