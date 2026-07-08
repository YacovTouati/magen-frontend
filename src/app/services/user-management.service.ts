import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    private readonly apiUrl = 'http://localhost:3000/api/users';

    constructor(private http: HttpClient) { }

    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(this.apiUrl);
    }

    addUser(user: Omit<User, 'id'>): Observable<User> {
        return this.http.post<User>(this.apiUrl, user);
    }

    deleteUser(id: number | string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
