import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AnalyticsSummary {
    callerTypes: Record<string, number>;
    callPurposes: Record<string, number>;
}

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private readonly apiUrl = `${environment.apiBaseUrl}/api/analytics/summary`;

    constructor(private http: HttpClient) { }

    getSummary(): Observable<AnalyticsSummary> {
        return this.http.get<any>(this.apiUrl).pipe(
            map(response => this.normalize(response))
        );
    }

    private normalize(response: any): AnalyticsSummary {
        const payload = response?.data ?? response;

        return {
            callerTypes: payload?.callerTypes ?? {},
            callPurposes: payload?.callPurposes ?? {}
        };
    }
}
