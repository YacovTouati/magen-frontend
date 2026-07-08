import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserManagementService, User } from '../../services/user-management.service';

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-management.component.html',
    styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
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

    constructor(private userService: UserManagementService) { }

    ngOnInit(): void {
        this.loadUsers();
    }

    private normalizeRole(role: unknown): 'ADMIN' | 'VOLUNTEER' {
        const normalized = String(role ?? '').trim().toUpperCase();
        return normalized === 'ADMIN' ? 'ADMIN' : 'VOLUNTEER';
    }

    getRoleLabel(role: string | undefined): string {
        if (!role) {
            return 'לא ידוע';
        }

        return role === 'ADMIN' ? 'מנהל' : 'מתנדב';
    }

    private normalizeUser(rawUser: any): User {
        const firstName = rawUser?.firstName ?? rawUser?.first_name ?? rawUser?.firstname ?? '';
        const lastName = rawUser?.lastName ?? rawUser?.last_name ?? rawUser?.lastname ?? '';
        const fullName = rawUser?.name ?? rawUser?.fullName ?? rawUser?.full_name ?? rawUser?.displayName ?? rawUser?.display_name ?? [firstName, lastName].filter(Boolean).join(' ').trim();
        const email = rawUser?.email ?? rawUser?.emailAddress ?? rawUser?.email_address ?? '';
        const role = this.normalizeRole(rawUser?.role ?? rawUser?.userRole ?? rawUser?.roleName ?? rawUser?.role_name ?? rawUser?.type);

        return {
            id: rawUser?.id ?? rawUser?.userId ?? rawUser?.user_id ?? rawUser?._id ?? rawUser?.uuid,
            name: fullName || rawUser?.username || rawUser?.login || email || 'משתמש',
            email,
            password: rawUser?.password,
            role,
            firstName,
            lastName,
            fullName: fullName || [firstName, lastName].filter(Boolean).join(' ').trim()
        };
    }

    private extractUsers(response: any): User[] {
        const payload = response?.data ?? response?.users ?? response?.result ?? response?.items ?? response;

        if (Array.isArray(payload)) {
            return payload.map((item: any) => this.normalizeUser(item));
        }

        if (payload && typeof payload === 'object') {
            const nested = payload.data;
            if (Array.isArray(nested)) {
                return nested.map((item: any) => this.normalizeUser(item));
            }

            if (payload && payload.id) {
                return [this.normalizeUser(payload)];
            }
        }

        return [];
    }

    loadUsers(): void {
        this.isLoading = true;
        this.formError = '';
        this.userService.getUsers().subscribe({
            next: (response) => {
                this.users = this.extractUsers(response);
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
            error: () => {
                this.formError = 'הוספת המשתמש נכשלה. נסה שוב.';
            }
        });
    }

    deleteUser(id: number | string | undefined): void {
        if (!id) {
            return;
        }

        const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק משתמש זה?');
        if (!confirmed) {
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
}
