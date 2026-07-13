import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserManagementComponent } from './user-management.component';
import { UserManagementService, User } from '../../services/user-management.service';

describe('UserManagementComponent', () => {
    let userServiceSpy: jasmine.SpyObj<UserManagementService>;

    const existingUsers: User[] = [
        { id: 1, name: 'Alice', email: 'alice@example.com', role: 'ADMIN' },
        { id: 2, name: 'Bob', email: 'bob@example.com', role: 'VOLUNTEER' }
    ];

    beforeEach(async () => {
        userServiceSpy = jasmine.createSpyObj('UserManagementService', ['getUsers', 'addUser', 'deleteUser']);
        userServiceSpy.getUsers.and.returnValue(of(existingUsers));

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

    describe('addUser', () => {
        it('should reject an empty form and never call the service', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.newUser = { name: '', email: '', password: '', role: 'VOLUNTEER' };

            comp.addUser();

            expect(comp.formError).toBe('יש למלא שם, אימייל וסיסמה.');
            expect(userServiceSpy.addUser).not.toHaveBeenCalled();
        });

        it('should submit, reset the form and reload the list on success', () => {
            userServiceSpy.addUser.and.returnValue(of({ id: 3, name: 'New', email: 'new@example.com', role: 'VOLUNTEER' }));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.newUser = { name: 'New', email: 'new@example.com', password: 'secret', role: 'VOLUNTEER' };
            userServiceSpy.getUsers.calls.reset();

            comp.addUser();

            expect(comp.formSuccess).toBe('המשתמש נוסף בהצלחה.');
            expect(comp.newUser).toEqual({ name: '', email: '', password: '', role: 'VOLUNTEER' });
            expect(userServiceSpy.getUsers).toHaveBeenCalledTimes(1);
        });

        it('should show the backend\'s exact validation message when the server returns a structured errors array', () => {
            const serverError = { error: { success: false, errors: [{ field: 'email', message: 'כתובת המייל שהוזנה אינה תקינה' }] } };
            userServiceSpy.addUser.and.returnValue(throwError(() => serverError));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.newUser = { name: 'New', email: 'not-an-email', password: 'secret', role: 'VOLUNTEER' };

            comp.addUser();

            expect(comp.formError).toBe('כתובת המייל שהוזנה אינה תקינה');
        });

        it('should fall back to a generic message when the server error has no errors array', () => {
            userServiceSpy.addUser.and.returnValue(throwError(() => new Error('network down')));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.newUser = { name: 'New', email: 'new@example.com', password: 'secret', role: 'VOLUNTEER' };

            comp.addUser();

            expect(comp.formError).toBe('הוספת המשתמש נכשלה. נסה שוב.');
        });
    });
});
