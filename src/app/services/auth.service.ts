import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

export interface AuthUser {
    email: string;
    role: 'ADMIN' | 'VOLUNTEER' | string;
    [key: string]: any;
}

export interface LoginResponse {
    token: string;
    user: AuthUser;
}

const TOKEN_KEY = 'magen_auth_token';
const USER_KEY = 'magen_auth_user';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly apiUrl = 'http://localhost:3000/api/auth';

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

    isAdmin(): boolean {
        return this.getUser()?.role === 'ADMIN';
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
                role: String(role ?? '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'VOLUNTEER'
            }
        };
    }

    private readStoredUser(): AuthUser | null {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
}
