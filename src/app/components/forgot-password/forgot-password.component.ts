import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { extractServerErrorMessage } from '../../shared/http-error';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
    private authService = inject(AuthService);

    email = '';
    isSubmitting = false;
    // True once the request completes successfully — the backend always returns the same
    // generic message regardless of whether the email is registered (anti-enumeration), so
    // there's no "email not found" error state to show, only this confirmation.
    submitted = false;
    errorMessage = '';

    onSubmit(): void {
        if (!this.email.trim() || this.isSubmitting) {
            return;
        }

        this.isSubmitting = true;
        this.errorMessage = '';

        this.authService.forgotPassword(this.email).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.submitted = true;
            },
            error: (err: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.errorMessage = extractServerErrorMessage(err, 'משהו השתבש. נסה/י שוב.');
            }
        });
    }
}
