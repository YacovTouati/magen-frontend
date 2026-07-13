import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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
    contactedOtherCenterBefore: boolean;
    reportingDuty: boolean;
}

export interface CallReportResult {
    id: number | string | null;
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {
    private readonly apiUrl = 'http://localhost:3000/api/reports';

    constructor(private http: HttpClient) { }

    submitReport(payload: CallReportPayload): Observable<CallReportResult> {
        return this.http.post<any>(this.apiUrl, payload).pipe(
            map(response => ({ id: response?.data?.id ?? response?.id ?? null }))
        );
    }
}
