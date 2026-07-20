import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export type ScheduleStatus = 'DRAFT' | 'OPEN';
export type ShiftType = 'MORNING' | 'EVENING';
export type ShiftStatus = 'OPEN' | 'LOCKED';

export interface ShiftVolunteer {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface ShiftRecord {
    id: number;
    date: string; // YYYY-MM-DD
    type: ShiftType;
    status: ShiftStatus;
    volunteer: ShiftVolunteer | null;
}

// Returned by /schedules, /schedules/:id/publish — neither includes the shift rows.
export interface ScheduleSummary {
    id: number;
    month: number; // 1-12, natural — matches the backend wire format, not JS Date's 0-indexed convention
    year: number;
    status: ScheduleStatus;
}

// Returned by /schedules/:id/shifts — the summary fields plus every shift for the month.
export interface ScheduleRecord extends ScheduleSummary {
    shifts: ShiftRecord[];
}

@Injectable({
    providedIn: 'root'
})
export class ScheduleService {
    private readonly apiUrl = `${environment.apiBaseUrl}/api`;

    constructor(private http: HttpClient) { }

    // Resolves a schedule for a given calendar month, fully populated with its shifts.
    // Two requests under the hood (lookup-by-month, then fetch-with-shifts) because the
    // backend keeps those as separate resources — composed here so callers get one clean
    // result instead of juggling both calls themselves.
    findForMonth(year: number, month0Indexed: number): Observable<ScheduleRecord | null> {
        return this.findByMonthYear(year, month0Indexed).pipe(
            switchMap(summary => summary ? this.getScheduleWithShifts(summary.id) : of(null))
        );
    }

    // Admin only. The create response only contains a shift *count*, not the rows
    // themselves, so this chains a follow-up fetch to hand back a fully usable ScheduleRecord.
    createSchedule(year: number, month0Indexed: number): Observable<ScheduleRecord> {
        const body = { month: month0Indexed + 1, year };

        return this.http.post<any>(`${this.apiUrl}/schedules`, body).pipe(
            map(response => this.normalizeSummary((response?.data ?? response)?.schedule)),
            switchMap(summary => this.getScheduleWithShifts(summary.id))
        );
    }

    // Admin only. Publishing only flips DRAFT -> OPEN and touches no shift rows, so this
    // deliberately returns just the summary — callers patch their already-held
    // ScheduleRecord's status locally rather than re-fetching everything.
    publishSchedule(scheduleId: number): Observable<ScheduleSummary> {
        return this.http.post<any>(`${this.apiUrl}/schedules/${scheduleId}/publish`, {}).pipe(
            map(response => this.normalizeSummary(response?.data ?? response))
        );
    }

    claimShift(shiftId: number): Observable<ShiftRecord> {
        return this.http.post<any>(`${this.apiUrl}/shifts/${shiftId}/claim`, {}).pipe(
            map(response => this.normalizeShift(response?.data ?? response))
        );
    }

    // Admin only — the single path that can ever move a shift out of LOCKED.
    releaseShift(shiftId: number): Observable<ShiftRecord> {
        return this.http.post<any>(`${this.apiUrl}/shifts/${shiftId}/admin-release`, {}).pipe(
            map(response => this.normalizeShift(response?.data ?? response))
        );
    }

    // Admin only — unconditional on status, unlike claimShift: can grab an OPEN shift or
    // overwrite one already LOCKED by someone else.
    adminAssignShift(shiftId: number, volunteerId: number): Observable<ShiftRecord> {
        return this.http.post<any>(`${this.apiUrl}/shifts/${shiftId}/admin-assign`, { volunteerId }).pipe(
            map(response => this.normalizeShift(response?.data ?? response))
        );
    }

    private findByMonthYear(year: number, month0Indexed: number): Observable<ScheduleSummary | null> {
        const params = new HttpParams()
            .set('month', month0Indexed + 1)
            .set('year', year);

        return this.http.get<any>(`${this.apiUrl}/schedules`, { params }).pipe(
            map(response => this.normalizeSummary(response?.data ?? response)),
            catchError((error: HttpErrorResponse) => {
                // no schedule created yet for this month — not an error the caller needs to see
                if (error.status === 404) {
                    return of(null);
                }
                throw error;
            })
        );
    }

    private getScheduleWithShifts(scheduleId: number): Observable<ScheduleRecord> {
        return this.http.get<any>(`${this.apiUrl}/schedules/${scheduleId}/shifts`).pipe(
            map(response => this.normalizeRecord(response?.data ?? response))
        );
    }

    private normalizeSummary(raw: any): ScheduleSummary {
        return {
            id: raw?.id,
            month: raw?.month,
            year: raw?.year,
            status: raw?.status ?? 'DRAFT'
        };
    }

    private normalizeRecord(raw: any): ScheduleRecord {
        return {
            ...this.normalizeSummary(raw),
            shifts: Array.isArray(raw?.shifts) ? raw.shifts.map((s: any) => this.normalizeShift(s)) : []
        };
    }

    private normalizeShift(raw: any): ShiftRecord {
        return {
            id: raw?.id,
            date: this.toDateOnly(raw?.date),
            type: raw?.type,
            status: raw?.status ?? 'OPEN',
            volunteer: this.normalizeVolunteer(raw?.volunteer)
        };
    }

    private normalizeVolunteer(raw: any): ShiftVolunteer | null {
        if (!raw) {
            return null;
        }

        return {
            id: raw.id,
            name: raw.name ?? '',
            email: raw.email ?? '',
            role: raw.role ?? 'VOLUNTEER'
        };
    }

    // the backend returns a full ISO timestamp (UTC midnight) for `date` — keep just the YYYY-MM-DD part
    private toDateOnly(value: string): string {
        return typeof value === 'string' ? value.slice(0, 10) : '';
    }
}
