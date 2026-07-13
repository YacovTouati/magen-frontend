import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export type IntakeUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Must match the backend's IntakeStatus enum (src/types/intake.ts) exactly — these are wire
// values, not display text. Hebrew labels for these live in IntakeAlertsComponent.
export type IntakeStatus = 'NEW' | 'NO_ANSWER' | 'ACTIVE' | 'CLOSED' | 'LONG_TERM';

export interface IntakeAssignee {
    id: number;
    name: string;
    email: string;
    role: string;
}

// The Intake model has no email/reportingDuty columns of its own — they live on the linked
// CallReport (the volunteer's original submission), joined in via Intake.callReport.
export interface IntakeCallReport {
    id: number;
    email: string | null;
    reportingDuty: boolean | null;
}

export interface IntakeAlert {
    id: number;
    callerName: string;
    phone: string;
    urgency: IntakeUrgency;
    createdAt: Date;
    contactedOtherCenter: string;
    caseDescription: string;
    status: IntakeStatus;
    assignedTo: IntakeAssignee | null;
    callReport: IntakeCallReport | null;
}

@Injectable({
    providedIn: 'root'
})
export class IntakeService {
    private readonly apiUrl = 'http://localhost:3000/api/intakes';

    constructor(private http: HttpClient) { }

    getIntakes(): Observable<IntakeAlert[]> {
        return this.http.get<any>(this.apiUrl).pipe(
            map(response => this.extractList(response))
        );
    }

    claimOwnership(id: number): Observable<IntakeAlert> {
        return this.http.post<any>(`${this.apiUrl}/${id}/claim`, {}).pipe(
            map(response => this.normalizeIntake(this.extractOne(response)))
        );
    }

    undoClaim(id: number): Observable<IntakeAlert> {
        return this.http.post<any>(`${this.apiUrl}/${id}/undo-claim`, {}).pipe(
            map(response => this.normalizeIntake(this.extractOne(response)))
        );
    }

    takeOverCase(id: number): Observable<IntakeAlert> {
        return this.http.post<any>(`${this.apiUrl}/${id}/takeover`, {}).pipe(
            map(response => this.normalizeIntake(this.extractOne(response)))
        );
    }

    updateStatus(id: number, status: IntakeStatus): Observable<IntakeAlert> {
        return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { status }).pipe(
            map(response => this.normalizeIntake(this.extractOne(response)))
        );
    }

    private extractList(response: any): IntakeAlert[] {
        const payload = response?.data ?? response?.intakes ?? response?.result ?? response?.items ?? response;
        const list = Array.isArray(payload) ? payload : [];
        return list.map((item: any) => this.normalizeIntake(item));
    }

    private extractOne(response: any): any {
        return response?.data ?? response;
    }

    private normalizeIntake(raw: any): IntakeAlert {
        return {
            id: raw?.id,
            callerName: raw?.callerName ?? raw?.caller_name ?? '',
            phone: raw?.phone ?? '',
            urgency: raw?.urgency ?? 'MEDIUM',
            createdAt: raw?.createdAt ? new Date(raw.createdAt) : new Date(),
            contactedOtherCenter: raw?.contactedOtherCenter ?? raw?.contacted_other_center ?? '',
            caseDescription: raw?.caseDescription ?? raw?.case_description ?? '',
            status: raw?.status ?? 'NEW',
            assignedTo: this.normalizeAssignee(raw?.assignedTo ?? raw?.assigned_to),
            callReport: this.normalizeCallReport(raw?.callReport ?? raw?.call_report)
        };
    }

    private normalizeAssignee(raw: any): IntakeAssignee | null {
        if (!raw) {
            return null;
        }

        return {
            id: raw.id,
            name: raw.name ?? raw.email ?? 'משתמש',
            email: raw.email ?? '',
            role: raw.role ?? 'VOLUNTEER'
        };
    }

    private normalizeCallReport(raw: any): IntakeCallReport | null {
        if (!raw) {
            return null;
        }

        return {
            id: raw.id,
            email: raw.email ?? null,
            reportingDuty: raw.reportingDuty === undefined ? null : raw.reportingDuty
        };
    }
}
