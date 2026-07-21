import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
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
            error: (err: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.errorMessage = this.extractServerErrorMessage(err, 'אימייל או סיסמה שגויים, או שאין לך הרשאה להתחבר.');
            }
        });
    }

    // Field-validation failures (400) come back as { success: false, errors: [{ field, message }] } —
    // show the backend's exact message. Other failures (e.g. 401 wrong credentials) use a plain
    // { message } shape instead, so fall back to a generic message in that case.
    private extractServerErrorMessage(error: HttpErrorResponse, fallback: string): string {
        const errors = error?.error?.errors;
        if (Array.isArray(errors) && errors.length > 0 && typeof errors[0]?.message === 'string') {
            return errors[0].message;
        }
        return fallback;
    }
}
