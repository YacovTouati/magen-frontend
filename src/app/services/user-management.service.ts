import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
    id?: number | string;
    name: string;
    email: string;
    password?: string;
    role: 'ADMIN' | 'VOLUNTEER' | string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    userRole?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserManagementService {
    private readonly apiUrl = `${environment.apiBaseUrl}/api/users`;

    // Emits whenever the user list changes in a way that other views (e.g. the shift
    // calendar, whose assignments cascade-delete with their volunteer) need to know about.
    private readonly usersChangedSource = new Subject<void>();
    readonly usersChanged$ = this.usersChangedSource.asObservable();

    constructor(private http: HttpClient) { }

    getUsers(): Observable<User[]> {
        return this.http.get<any>(this.apiUrl).pipe(
            map(response => this.extractUsers(response))
        );
    }

    addUser(user: Omit<User, 'id'>): Observable<User> {
        return this.http.post<User>(this.apiUrl, user);
    }

    deleteUser(id: number | string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
            tap(() => this.usersChangedSource.next())
        );
    }

    private normalizeRole(role: unknown): 'ADMIN' | 'VOLUNTEER' {
        const normalized = String(role ?? '').trim().toUpperCase();
        return normalized === 'ADMIN' ? 'ADMIN' : 'VOLUNTEER';
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
}
