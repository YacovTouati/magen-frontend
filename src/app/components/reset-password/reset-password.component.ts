import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PasswordRequirementsComponent } from '../password-requirements/password-requirements.component';
import { isPasswordValid } from '../../shared/password-policy';
import { extractServerErrorMessage } from '../../shared/http-error';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, PasswordRequirementsComponent],
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);

    token = '';
    password = '';
    confirmPassword = '';
    showPassword = false;
    showConfirmPassword = false;
    isSubmitting = false;
    errorMessage = '';
    isSuccess = false;

    // True when the link is missing its token query param entirely — the form isn't
    // rendered in that case, since there's nothing valid to submit.
    linkInvalid = false;

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
        this.linkInvalid = !this.token;
    }

    get passwordValid(): boolean {
        return isPasswordValid(this.password);
    }

    get passwordsMatch(): boolean {
        return this.password === this.confirmPassword;
    }

    get canSubmit(): boolean {
        return this.passwordValid && this.passwordsMatch && !this.isSubmitting;
    }

    onSubmit(): void {
        if (!this.canSubmit) {
            return;
        }

        this.isSubmitting = true;
        this.errorMessage = '';

        this.authService.resetPassword(this.token, this.password).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.isSuccess = true;
            },
            error: (err: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.errorMessage = extractServerErrorMessage(err, 'איפוס הסיסמה נכשל. ייתכן שהקישור אינו תקין או שפג תוקפו.');
            }
        });
    }
}
