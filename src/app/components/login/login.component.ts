import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    email = '';
    password = '';
    isSubmitting = false;
    errorMessage = '';

    onSubmit() {
        if (!this.email || !this.password || this.isSubmitting) {
            return;
        }

        this.isSubmitting = true;
        this.errorMessage = '';

        this.authService.login(this.email, this.password).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.router.navigate(['/']);
            },
            error: () => {
                this.isSubmitting = false;
                this.errorMessage = 'אימייל או סיסמה שגויים, או שאין לך הרשאה להתחבר.';
            }
        });
    }
}
