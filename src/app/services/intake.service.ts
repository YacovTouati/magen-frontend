import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type IntakeUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Must match the backend's IntakeStatus enum (src/types/intake.ts) exactly — these are wire
// values, not display text. Hebrew labels for these live in IntakeAlertsComponent.
export type IntakeStatus = 'NEW' | 'NO_ANSWER' | 'ACTIVE' | 'CLOSED' | 'LONG_TERM';

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
    // Data-retention deadline (14 days from creation, +7 per PATCH .../extend), not a
    // business date — see prisma/schema.prisma's Intake.expiresAt and the hourly
    // retention cron on the backend.
    expiresAt: Date;
    callReport: IntakeCallReport | null;
}

@Injectable({
    providedIn: 'root'
})
export class IntakeService {
    private readonly apiUrl = `${environment.apiBaseUrl}/api/intakes`;

    constructor(private http: HttpClient) { }

    getIntakes(): Observable<IntakeAlert[]> {
        return this.http.get<any>(this.apiUrl).pipe(
            map(response => this.extractList(response))
        );
    }

    updateStatus(id: number, status: IntakeStatus): Observable<IntakeAlert> {
        return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { status }).pipe(
            map(response => this.normalizeIntake(this.extractOne(response)))
        );
    }

    // Pushes expiresAt 7 days past its current value (not 7 days from now).
    extendExpiration(id: number): Observable<IntakeAlert> {
        return this.http.patch<any>(`${this.apiUrl}/${id}/extend`, {}).pipe(
            map(response => this.normalizeIntake(this.extractOne(response)))
        );
    }

    // Immediate hard delete — separate from the automatic 14-day retention sweep.
    deleteIntake(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
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
            expiresAt: raw?.expiresAt ? new Date(raw.expiresAt) : new Date(),
            callReport: this.normalizeCallReport(raw?.callReport ?? raw?.call_report)
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
