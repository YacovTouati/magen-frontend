import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserManagementService, User } from '../../services/user-management.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { ROLE_OPTIONS, UserRole, getRoleLabel } from '../../shared/role-labels';

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmModalComponent],
    templateUrl: './user-management.component.html',
    styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
    readonly roleOptions = ROLE_OPTIONS;

    users: User[] = [];
    isLoading = false;
    formError = '';
    formSuccess = '';

    newUser: Omit<User, 'id'> = {
        name: '',
        email: '',
        password: '',
        role: 'VOLUNTEER'
    };

    private pendingDeleteId: number | string | null = null;
    pendingDeleteName = '';

    /** id of the user with an in-flight role-change request, if any */
    pendingRoleChangeId: number | string | null = null;

    constructor(private userService: UserManagementService) { }

    ngOnInit(): void {
        this.loadUsers();
    }

    getRoleLabel(role: string | undefined): string {
        return getRoleLabel(role);
    }

    isPendingRoleChange(user: User): boolean {
        return user.id !== undefined && this.pendingRoleChangeId === user.id;
    }

    // Pessimistic update, same convention as IntakeAlertsComponent's status <select>:
    // user.role only changes once the server confirms it, so the one-way [ngModel]
    // binding naturally snaps back to the current value on its own if this fails.
    onRoleChange(user: User, newRole: string): void {
        if (!user.id || this.pendingRoleChangeId !== null) {
            return;
        }

        this.pendingRoleChangeId = user.id;
        this.formError = '';
        this.formSuccess = '';

        this.userService.updateUserRole(user.id, newRole as UserRole).subscribe({
            next: (updated) => {
                user.role = updated.role;
                this.pendingRoleChangeId = null;
                this.formSuccess = `התפקיד של ${user.name} עודכן ל${getRoleLabel(updated.role)}.`;
            },
            error: (err: HttpErrorResponse) => {
                this.pendingRoleChangeId = null;
                this.formError = this.extractServerErrorMessage(err, 'עדכון התפקיד נכשל. נסה שוב.');
            }
        });
    }

    loadUsers(): void {
        this.isLoading = true;
        this.formError = '';
        this.userService.getUsers().subscribe({
            next: (users) => {
                this.users = users;
                this.isLoading = false;
            },
            error: () => {
                this.formError = 'לא ניתן לטעון משתמשים מהשרת כרגע.';
                this.isLoading = false;
            }
        });
    }

    addUser(event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();

        if (!this.newUser.name || !this.newUser.email || !this.newUser.password) {
            this.formError = 'יש למלא שם, אימייל וסיסמה.';
            this.formSuccess = '';
            return;
        }

        this.formError = '';
        this.formSuccess = '';

        this.userService.addUser(this.newUser).subscribe({
            next: () => {
                this.formSuccess = 'המשתמש נוסף בהצלחה.';
                this.newUser = { name: '', email: '', password: '', role: 'VOLUNTEER' };
                this.loadUsers();
            },
            error: (err: HttpErrorResponse) => {
                this.formError = this.extractServerErrorMessage(err, 'הוספת המשתמש נכשלה. נסה שוב.');
            }
        });
    }

    // Field-validation failures (400) come back as { success: false, errors: [{ field, message }] } —
    // show the backend's exact message instead of a generic one.
    private extractServerErrorMessage(error: HttpErrorResponse, fallback: string): string {
        const errors = error?.error?.errors;
        if (Array.isArray(errors) && errors.length > 0 && typeof errors[0]?.message === 'string') {
            return errors[0].message;
        }
        return fallback;
    }

    deleteUser(user: User): void {
        if (!user.id) {
            return;
        }

        this.pendingDeleteId = user.id;
        this.pendingDeleteName = user.name || 'משתמש זה';
    }

    get isDeleteConfirmOpen(): boolean {
        return this.pendingDeleteId !== null;
    }

    get deleteConfirmMessage(): string {
        return `האם אתה בטוח שברצונך למחוק את ${this.pendingDeleteName}? פעולה זו אינה הפיכה.`;
    }

    onConfirmDelete(): void {
        const id = this.pendingDeleteId;
        this.pendingDeleteId = null;

        if (!id) {
            return;
        }

        this.userService.deleteUser(id).subscribe({
            next: () => {
                this.loadUsers();
            },
            error: () => {
                this.formError = 'מחיקת המשתמש נכשלה. נסה שוב.';
            }
        });
    }

    onCancelDelete(): void {
        this.pendingDeleteId = null;
    }
}
