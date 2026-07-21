import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserRole, normalizeRole } from '../shared/role-labels';

export interface AuthUser {
    email: string;
    role: UserRole | string;
    [key: string]: any;
}

export interface LoginResponse {
    token: string;
    user: AuthUser;
}

export interface RegisterPayload {
    email: string;
    password: string;
    name: string;
    phone: string;
    token: string;
}

const TOKEN_KEY = 'magen_auth_token';
const USER_KEY = 'magen_auth_user';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly apiUrl = `${environment.apiBaseUrl}/api/auth`;

    // no reactive consumers exist today (every caller reads getUser() synchronously) —
    // a plain field is enough; reach for a BehaviorSubject again if that changes.
    private currentUser: AuthUser | null = this.readStoredUser();

    constructor(private http: HttpClient) { }

    login(email: string, password: string): Observable<LoginResponse> {
        return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
            map(response => this.normalizeLoginResponse(response)),
            tap(response => this.setSession(response))
        );
    }

    // Invite-only: the backend requires both a whitelisted email AND a matching raw
    // token (see magen-backend AuthService.register). Returns a JWT just like login,
    // so a successful registration logs the user straight in.
    register(payload: RegisterPayload): Observable<LoginResponse> {
        return this.http.post<any>(`${this.apiUrl}/register`, payload).pipe(
            map(response => this.normalizeLoginResponse(response)),
            tap(response => this.setSession(response))
        );
    }

    // Always resolves with the same generic message regardless of whether the email is
    // registered — the backend deliberately can't be used to enumerate accounts, so
    // there's no "not found" error case to handle here.
    forgotPassword(email: string): Observable<{ message: string }> {
        return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email }).pipe(
            map(response => ({ message: response?.message ?? '' }))
        );
    }

    // No session is created here — reset-password returns only a confirmation message,
    // not a token (see magen-backend AuthController.resetPassword). The user logs in
    // separately with their new password afterward.
    resetPassword(token: string, password: string): Observable<{ message: string }> {
        return this.http.post<any>(`${this.apiUrl}/reset-password`, { token, password }).pipe(
            map(response => ({ message: response?.message ?? '' }))
        );
    }

    logout(): void {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        this.currentUser = null;
    }

    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }

    getUser(): AuthUser | null {
        return this.currentUser;
    }

    isLoggedIn(): boolean {
        return !!this.getToken() && !!this.getUser();
    }

    // True for any of the three admin roles — use this for generic "is some kind of
    // admin" gating (e.g. the sidebar's role badge). For anything that should only be
    // available to a specific admin type, use the narrower isSuperAdmin()/isIntakeAdmin()/
    // isSchedulerAdmin() (or the canManage*() convenience methods below) instead.
    isAdmin(): boolean {
        return this.isSuperAdmin() || this.isIntakeAdmin() || this.isSchedulerAdmin();
    }

    isSuperAdmin(): boolean {
        return this.getUser()?.role === 'SUPER_ADMIN';
    }

    isIntakeAdmin(): boolean {
        return this.getUser()?.role === 'INTAKE_ADMIN';
    }

    isSchedulerAdmin(): boolean {
        return this.getUser()?.role === 'SCHEDULER_ADMIN';
    }

    // Matches the backend's checkRole('SUPER_ADMIN', 'SCHEDULER_ADMIN') gate on
    // /schedules, /shifts/:id/admin-assign and /shifts/:id/admin-release.
    canManageSchedule(): boolean {
        return this.isSuperAdmin() || this.isSchedulerAdmin();
    }

    // Matches the backend's checkRole('SUPER_ADMIN', 'INTAKE_ADMIN') gate on POST /intakes.
    canManageIntakes(): boolean {
        return this.isSuperAdmin() || this.isIntakeAdmin();
    }

    private setSession(response: LoginResponse): void {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        this.currentUser = response.user;
    }

    private normalizeLoginResponse(response: any): LoginResponse {
        // the backend wraps some endpoints' payloads in a `data` envelope (see report/user-management responses)
        const payload = response?.data ?? response;
        const token = payload?.token ?? payload?.accessToken ?? payload?.jwt;
        const rawUser = payload?.user ?? payload?.account ?? payload?.profile;

        if (!token || !rawUser) {
            throw new Error('Invalid login response received from server');
        }

        const role = rawUser?.role ?? rawUser?.userRole ?? rawUser?.roleName ?? rawUser?.role_name;

        return {
            token,
            user: {
                ...rawUser,
                role: normalizeRole(role)
            }
        };
    }

    private readStoredUser(): AuthUser | null {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw);
            // Re-normalize on every restore, not just at login — a session cached before
            // this role split still has the legacy 'ADMIN' string sitting in localStorage
            // until the user logs out and back in.
            return { ...parsed, role: normalizeRole(parsed?.role) };
        } catch {
            return null;
        }
    }
}
