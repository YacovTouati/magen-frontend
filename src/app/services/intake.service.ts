import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export type IntakeUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IntakeStatus =
    | 'חדש'
    | 'לא ענה - לנסות שוב'
    | 'בטיפול פעיל'
    | 'נסגר בשיחה קצרה'
    | 'המשך לטיפול ארוך';

export interface IntakeAlert {
    id: number;
    callerName: string;
    phone: string;
    email: string;
    urgency: IntakeUrgency;
    createdAt: Date;
    reportingDuty: boolean;
    contactedOtherCenter: string;
    caseDescription: string;
    status: IntakeStatus;
    assignedTo: string | null;
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
            email: raw?.email ?? '',
            urgency: raw?.urgency ?? 'MEDIUM',
            createdAt: raw?.createdAt ? new Date(raw.createdAt) : new Date(),
            reportingDuty: !!raw?.reportingDuty,
            contactedOtherCenter: raw?.contactedOtherCenter ?? raw?.contacted_other_center ?? 'לא',
            caseDescription: raw?.caseDescription ?? raw?.case_description ?? '',
            status: raw?.status ?? 'חדש',
            assignedTo: raw?.assignedTo ?? raw?.assigned_to ?? null
        };
    }
}
