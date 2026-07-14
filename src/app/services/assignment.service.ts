import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AssignmentVolunteer {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface ShiftAssignmentRecord {
    id: number;
    date: string; // YYYY-MM-DD — one assignment per calendar day
    volunteerId: number;
    volunteer: AssignmentVolunteer;
}

@Injectable({
    providedIn: 'root'
})
export class AssignmentService {
    private readonly apiUrl = `${environment.apiBaseUrl}/api/assignments`;

    constructor(private http: HttpClient) { }

    getAssignments(from: string, to: string): Observable<ShiftAssignmentRecord[]> {
        const params = new HttpParams().set('from', from).set('to', to);
        return this.http.get<any>(this.apiUrl, { params }).pipe(
            map(response => this.extractList(response))
        );
    }

    assign(date: string, volunteerId: number): Observable<ShiftAssignmentRecord> {
        return this.http.post<any>(this.apiUrl, { date, volunteerId }).pipe(
            map(response => this.normalize(response?.data ?? response))
        );
    }

    unassign(date: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${date}`).pipe(
            catchError((error: HttpErrorResponse) => {
                // the day is already vacant (e.g. its assignment was removed via DB cascade
                // when the volunteer was deleted) — treat that as a successful unassign
                if (error.status === 404) {
                    return of(undefined);
                }
                throw error;
            })
        );
    }

    private extractList(response: any): ShiftAssignmentRecord[] {
        const payload = response?.data ?? response;
        const list = Array.isArray(payload) ? payload : [];
        return list.map((item: any) => this.normalize(item));
    }

    private normalize(raw: any): ShiftAssignmentRecord {
        return {
            id: raw?.id,
            date: this.toDateOnly(raw?.date),
            volunteerId: raw?.volunteerId ?? raw?.volunteer?.id,
            volunteer: {
                id: raw?.volunteer?.id,
                name: raw?.volunteer?.name ?? '',
                email: raw?.volunteer?.email ?? '',
                role: raw?.volunteer?.role ?? 'VOLUNTEER'
            }
        };
    }

    // the backend returns a full ISO timestamp (UTC midnight) for `date` — keep just the YYYY-MM-DD part
    private toDateOnly(value: string): string {
        return typeof value === 'string' ? value.slice(0, 10) : '';
    }
}
