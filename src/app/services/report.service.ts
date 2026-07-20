import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CallReportPayload {
    callDuration: number;
    callerType: string;
    callPurpose: string;
    summaryNotes: string;
    callerName: string;
    phone: string;
    email: string;
    region: string;
    gender: string;
    sector: string;
    receivedSupportAtOtherCenter: boolean;
    isFamilyMemberOrAcquaintance: boolean;
    magenContactHistory: string;
    reportingDuty: boolean;
}

export interface CallReportResult {
    id: number | string | null;
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {
    private readonly apiUrl = `${environment.apiBaseUrl}/api/reports`;

    constructor(private http: HttpClient) { }

    submitReport(payload: CallReportPayload): Observable<CallReportResult> {
        return this.http.post<any>(this.apiUrl, payload).pipe(
            // Backend nests the created row under data.report (alongside the auto-linked
            // Intake) rather than putting the id directly on data — see reportController.ts.
            map(response => ({ id: response?.data?.report?.id ?? response?.data?.id ?? response?.id ?? null }))
        );
    }
}
