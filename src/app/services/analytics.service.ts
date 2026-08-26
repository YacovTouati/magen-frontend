import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AnalyticsSummary {
    callerTypes: Record<string, number>;
    callPurposes: Record<string, number>;
}

export interface MonthlyIntakeAnalytics {
    year: number;
    month: number;
    totalIntakes: number;
    statusBreakdown: Record<string, number>;
    reporterBreakdown: Record<string, number>;
    callPurposeBreakdown: Record<string, number>;
    // Not yet visualized anywhere in ChartsComponent — available from the backend for
    // a future breakdown panel (caller type / support-elsewhere / prior-contact /
    // reporting-duty / region are all still just raw counts here).
    callerTypeBreakdown: Record<string, number>;
    receivedSupportBreakdown: Record<string, number>;
    magenContactHistoryBreakdown: Record<string, number>;
    reportingDutyBreakdown: Record<string, number>;
    regionBreakdown: Record<string, number>;
    // One entry per hour of the day ("00".."23"), zero-filled by the backend, bucketed
    // by Israel local time — replaces the old per-day dailyActivity shape.
    hourlyDistribution: Record<string, number>;
    resolutionStats: {
        resolvedCount: number;
        averageResolutionHours: number | null;
        completionRate: number; // 0..1
    };
}

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private readonly apiUrl = `${environment.apiBaseUrl}/api/analytics`;

    constructor(private http: HttpClient) { }

    getSummary(): Observable<AnalyticsSummary> {
        return this.http.get<any>(`${this.apiUrl}/summary`).pipe(
            map(response => this.normalizeSummary(response))
        );
    }

    getMonthlyAnalytics(year: number, month: number): Observable<MonthlyIntakeAnalytics> {
        return this.http.get<any>(`${this.apiUrl}/monthly`, { params: { year, month } }).pipe(
            map(response => this.normalizeMonthly(response, year, month))
        );
    }

    // responseType 'blob' so the interceptor-attached Authorization header still reaches
    // the endpoint — a plain <a href> download would bypass it entirely and get a 401.
    exportMonthlyCsv(year: number, month: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/export`, {
            params: { year, month, format: 'csv' },
            responseType: 'blob'
        });
    }

    private normalizeSummary(response: any): AnalyticsSummary {
        const payload = response?.data ?? response;

        return {
            callerTypes: payload?.callerTypes ?? {},
            callPurposes: payload?.callPurposes ?? {}
        };
    }

    private normalizeMonthly(response: any, year: number, month: number): MonthlyIntakeAnalytics {
        const payload = response?.data ?? response;

        return {
            year: payload?.year ?? year,
            month: payload?.month ?? month,
            totalIntakes: payload?.totalIntakes ?? 0,
            statusBreakdown: payload?.statusBreakdown ?? {},
            reporterBreakdown: payload?.reporterBreakdown ?? {},
            callPurposeBreakdown: payload?.callPurposeBreakdown ?? {},
            callerTypeBreakdown: payload?.callerTypeBreakdown ?? {},
            receivedSupportBreakdown: payload?.receivedSupportBreakdown ?? {},
            magenContactHistoryBreakdown: payload?.magenContactHistoryBreakdown ?? {},
            reportingDutyBreakdown: payload?.reportingDutyBreakdown ?? {},
            regionBreakdown: payload?.regionBreakdown ?? {},
            hourlyDistribution: payload?.hourlyDistribution ?? {},
            resolutionStats: {
                resolvedCount: payload?.resolutionStats?.resolvedCount ?? 0,
                averageResolutionHours: payload?.resolutionStats?.averageResolutionHours ?? null,
                completionRate: payload?.resolutionStats?.completionRate ?? 0
            }
        };
    }
}
