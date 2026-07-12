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

    getRoleLabel(role: string | undefined): string {
        if (!role) {
            return 'לא ידוע';
        }

        return role === 'ADMIN' ? 'מנהל' : 'מתנדב';
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
