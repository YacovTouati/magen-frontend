import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PasswordRequirementsComponent } from '../password-requirements/password-requirements.component';
import { isPasswordValid } from '../../shared/password-policy';
import { extractServerErrorMessage } from '../../shared/http-error';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, PasswordRequirementsComponent],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private authService = inject(AuthService);

    email = '';
    token = '';
    name = '';
    phone = '';
    password = '';
    confirmPassword = '';
    showPassword = false;
    showConfirmPassword = false;
    isSubmitting = false;
    errorMessage = '';

    // True when the invite link is missing its token/email query params entirely — the
    // form isn't even rendered in that case, since there's nothing valid to submit.
    linkInvalid = false;

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        this.email = params.get('email') ?? '';
        this.token = params.get('token') ?? '';
        this.linkInvalid = !this.email || !this.token;
    }

    get passwordValid(): boolean {
        return isPasswordValid(this.password);
    }

    get passwordsMatch(): boolean {
        return this.password === this.confirmPassword;
    }

    get canSubmit(): boolean {
        return !!this.name.trim() && !!this.phone.trim() && this.passwordValid && this.passwordsMatch && !this.isSubmitting;
    }

    onSubmit(): void {
        if (!this.canSubmit) {
            return;
        }

        this.isSubmitting = true;
        this.errorMessage = '';

        this.authService.register({
            email: this.email,
            password: this.password,
            name: this.name,
            phone: this.phone,
            token: this.token
        }).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.router.navigate(['/']);
            },
            error: (err: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.errorMessage = extractServerErrorMessage(err, 'ההרשמה נכשלה. נסה/י שוב או פנה/י למנהל/ת המערכת.');
            }
        });
    }

    onlyNumbers(event: KeyboardEvent): void {
        if (!/^[0-9]$/.test(event.key)) {
            event.preventDefault();
        }
    }
}
