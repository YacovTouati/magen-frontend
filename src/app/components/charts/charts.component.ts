import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, MonthlyIntakeAnalytics } from '../../services/analytics.service';
import { IntakeStatus } from '../../services/intake.service';
import { getCallPurposeLabel, getStatusLabel } from '../../shared/intake-labels';

export interface ChartSegment {
    key: string;
    label: string;
    value: number;
    percent: number;
    color: string;
}

export interface DailyBar {
    date: string; // "YYYY-MM-DD"
    day: number;
    value: number;
}

// Fixed categorical slot order (blue, aqua, yellow, ...) — assigned by display order,
// never by value, so the same slot index always wears the same color across charts.
// Validated (CVD-safe adjacent pairs) via the dataviz skill's palette validator.
const CATEGORICAL_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'];

const CALLER_TYPE_ORDER = ['victim', 'family', 'friend'];
const CALLER_TYPE_LABELS: Record<string, string> = {
    victim: 'נפגע/ת',
    family: 'בן/בת משפחה',
    friend: 'חבר/ה'
};

const CALL_PURPOSE_ORDER = ['counseling', 'crisis', 'coercion'];
const CALL_PURPOSE_LABELS: Record<string, string> = {
    counseling: 'ייעוץ',
    crisis: 'משבר',
    coercion: 'כפייה/פגיעה'
};

const STATUS_ORDER: IntakeStatus[] = ['NEW', 'NO_ANSWER', 'ACTIVE', 'CLOSED', 'LONG_TERM'];

// Bucket label the backend uses for an intake with no linked CallReport — kept in sync
// with AnalyticsService.NO_CASE_TYPE_BUCKET (src/services/analyticsService.ts).
const NO_CASE_TYPE_BUCKET = 'ללא נושא';
const CASE_TYPE_ORDER = [...CALL_PURPOSE_ORDER, NO_CASE_TYPE_BUCKET];

// Categorical slots are capped at 8 validated colors — a reporter list longer than that
// folds the smallest tail into "אחר" rather than generating a 9th, uncontrolled hue.
const MAX_REPORTER_SLOTS = 7;
const OTHER_REPORTER_KEY = '__other__';

@Component({
    selector: 'app-charts',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './charts.component.html',
    styleUrls: ['./charts.component.css']
})
export class ChartsComponent implements OnInit {
    private analyticsService = inject(AnalyticsService);

    isLoading = false;
    loadError = '';
    isExporting = false;
    exportError = '';

    selectedYear = 0;
    selectedMonth = 0; // 1-12

    analytics: MonthlyIntakeAnalytics | null = null;

    reporterSegments: ChartSegment[] = [];
    statusSegments: ChartSegment[] = [];
    caseTypeSegments: ChartSegment[] = [];
    dailyBars: DailyBar[] = [];
    hoveredDay: DailyBar | null = null;

    // Kept from the previous all-time view — still meaningful alongside the new
    // monthly breakdowns below, since caller-type has no equivalent in monthly data.
    callerTypeSegments: ChartSegment[] = [];
    callPurposeSegments: ChartSegment[] = [];
    isLoadingSummary = false;
    summaryLoadError = '';

    ngOnInit(): void {
        const now = new Date();
        this.selectedYear = now.getFullYear();
        this.selectedMonth = now.getMonth() + 1;
        this.loadMonthlyAnalytics();
        this.loadSummary();
    }

    get monthLabel(): string {
        const date = new Date(this.selectedYear, this.selectedMonth - 1, 1);
        return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(date);
    }

    get isCurrentMonth(): boolean {
        const now = new Date();
        return this.selectedYear === now.getFullYear() && this.selectedMonth === now.getMonth() + 1;
    }

    goToPreviousMonth(): void {
        this.selectedMonth -= 1;
        if (this.selectedMonth < 1) {
            this.selectedMonth = 12;
            this.selectedYear -= 1;
        }
        this.loadMonthlyAnalytics();
    }

    // No-op past the current month — the backend has nothing to show for the future,
    // and the button is disabled in the template for the same reason.
    goToNextMonth(): void {
        if (this.isCurrentMonth) {
            return;
        }
        this.selectedMonth += 1;
        if (this.selectedMonth > 12) {
            this.selectedMonth = 1;
            this.selectedYear += 1;
        }
        this.loadMonthlyAnalytics();
    }

    goToCurrentMonth(): void {
        const now = new Date();
        this.selectedYear = now.getFullYear();
        this.selectedMonth = now.getMonth() + 1;
        this.loadMonthlyAnalytics();
    }

    loadMonthlyAnalytics(): void {
        this.isLoading = true;
        this.loadError = '';

        this.analyticsService.getMonthlyAnalytics(this.selectedYear, this.selectedMonth).subscribe({
            next: (data) => {
                this.analytics = data;
                this.reporterSegments = this.buildReporterSegments(data.reporterBreakdown);
                this.statusSegments = this.buildFixedOrderSegments(data.statusBreakdown, STATUS_ORDER, (key) => getStatusLabel(key as IntakeStatus));
                this.caseTypeSegments = this.buildFixedOrderSegments(data.caseTypeBreakdown, CASE_TYPE_ORDER, getCallPurposeLabel);
                this.dailyBars = this.buildDailyBars(data.dailyActivity);
                this.isLoading = false;
            },
            error: (err) => {
                this.loadError = this.describeError(err);
                this.isLoading = false;
            }
        });
    }

    loadSummary(): void {
        this.isLoadingSummary = true;
        this.summaryLoadError = '';

        this.analyticsService.getSummary().subscribe({
            next: (summary) => {
                this.callerTypeSegments = this.buildSegments(summary.callerTypes, CALLER_TYPE_ORDER, CALLER_TYPE_LABELS);
                this.callPurposeSegments = this.buildSegments(summary.callPurposes, CALL_PURPOSE_ORDER, CALL_PURPOSE_LABELS);
                this.isLoadingSummary = false;
            },
            error: (err) => {
                this.summaryLoadError = this.describeError(err);
                this.isLoadingSummary = false;
            }
        });
    }

    exportCsv(): void {
        if (this.isExporting) {
            return;
        }

        this.isExporting = true;
        this.exportError = '';

        this.analyticsService.exportMonthlyCsv(this.selectedYear, this.selectedMonth).subscribe({
            next: (blob) => {
                this.isExporting = false;
                this.downloadBlob(blob, `intakes-${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}.csv`);
            },
            error: (err) => {
                this.isExporting = false;
                this.exportError = this.describeError(err, 'ייצוא הקובץ נכשל. נסה/י שוב.');
            }
        });
    }

    private downloadBlob(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    // KPI cards

    get totalIntakes(): number {
        return this.analytics?.totalIntakes ?? 0;
    }

    // No dedicated "call reports this month" field exists on the backend — every
    // CallReport auto-creates exactly one Intake (Intake.callReportId is @unique), so
    // "intakes minus the ones with no linked report" is an exact count, not an estimate.
    get totalCallReports(): number {
        if (!this.analytics) {
            return 0;
        }
        const withoutReport = this.analytics.caseTypeBreakdown[NO_CASE_TYPE_BUCKET] ?? 0;
        return this.analytics.totalIntakes - withoutReport;
    }

    get completionRatePercent(): number {
        return (this.analytics?.resolutionStats?.completionRate ?? 0) * 100;
    }

    get averageResolutionLabel(): string {
        const hours = this.analytics?.resolutionStats?.averageResolutionHours;
        if (hours === null || hours === undefined) {
            return '—';
        }
        if (hours < 24) {
            return `${hours.toFixed(1)} שעות`;
        }
        return `${(hours / 24).toFixed(1)} ימים`;
    }

    // Daily trend chart

    get maxDailyValue(): number {
        return Math.max(...this.dailyBars.map(d => d.value), 0);
    }

    barHeightPercent(bar: DailyBar): number {
        return this.maxDailyValue > 0 ? (bar.value / this.maxDailyValue) * 100 : 0;
    }

    private buildDailyBars(dailyActivity: Record<string, number>): DailyBar[] {
        return Object.keys(dailyActivity)
            .sort()
            .map(date => ({
                date,
                day: Number(date.slice(8, 10)),
                value: dailyActivity[date]
            }));
    }

    // Segment builders

    get callerTypeTotal(): number {
        return this.callerTypeSegments.reduce((sum, seg) => sum + seg.value, 0);
    }

    get callerTypeGradient(): string {
        return this.buildGradient(this.callerTypeSegments, this.callerTypeTotal);
    }

    get maxPurposeValue(): number {
        return Math.max(...this.callPurposeSegments.map(seg => seg.value), 0);
    }

    get reporterTotal(): number {
        return this.reporterSegments.reduce((sum, seg) => sum + seg.value, 0);
    }

    get reporterGradient(): string {
        return this.buildGradient(this.reporterSegments, this.reporterTotal);
    }

    get statusTotal(): number {
        return this.statusSegments.reduce((sum, seg) => sum + seg.value, 0);
    }

    get statusGradient(): string {
        return this.buildGradient(this.statusSegments, this.statusTotal);
    }

    get caseTypeTotal(): number {
        return this.caseTypeSegments.reduce((sum, seg) => sum + seg.value, 0);
    }

    get caseTypeGradient(): string {
        return this.buildGradient(this.caseTypeSegments, this.caseTypeTotal);
    }

    private buildGradient(segments: ChartSegment[], total: number): string {
        if (total === 0) {
            return 'conic-gradient(#e1e0d9 0% 100%)';
        }

        let cursor = 0;
        const stops = segments
            .filter(seg => seg.value > 0)
            .map(seg => {
                const start = cursor;
                cursor += seg.percent;
                return `${seg.color} ${start}% ${cursor}%`;
            });

        return `conic-gradient(${stops.join(', ')})`;
    }

    private buildSegments(data: Record<string, number>, order: string[], labels: Record<string, string>): ChartSegment[] {
        const total = order.reduce((sum, key) => sum + (data[key] ?? 0), 0);

        return order.map((key, index) => {
            const value = data[key] ?? 0;
            return {
                key,
                label: labels[key] ?? key,
                value,
                percent: total > 0 ? (value / total) * 100 : 0,
                color: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
            };
        });
    }

    private buildFixedOrderSegments(data: Record<string, number>, order: string[], labelFor: (key: string) => string): ChartSegment[] {
        const total = order.reduce((sum, key) => sum + (data[key] ?? 0), 0);

        return order.map((key, index) => {
            const value = data[key] ?? 0;
            return {
                key,
                label: labelFor(key),
                value,
                percent: total > 0 ? (value / total) * 100 : 0,
                color: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
            };
        });
    }

    // reportedBy is free text (any volunteer's name) — unlike the fixed-key breakdowns
    // above, this can't use a known order. Sorted by value so the biggest contributors
    // get the first (most distinct) color slots; anything past MAX_REPORTER_SLOTS folds
    // into "אחר" rather than generating an unvalidated 9th+ hue.
    private buildReporterSegments(data: Record<string, number>): ChartSegment[] {
        const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
        const total = entries.reduce((sum, [, value]) => sum + value, 0);

        const head = entries.slice(0, MAX_REPORTER_SLOTS);
        const tailTotal = entries.slice(MAX_REPORTER_SLOTS).reduce((sum, [, value]) => sum + value, 0);

        const segments: ChartSegment[] = head.map(([key, value], index) => ({
            key,
            label: key,
            value,
            percent: total > 0 ? (value / total) * 100 : 0,
            color: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
        }));

        if (tailTotal > 0) {
            segments.push({
                key: OTHER_REPORTER_KEY,
                label: 'אחר',
                value: tailTotal,
                percent: total > 0 ? (tailTotal / total) * 100 : 0,
                color: CATEGORICAL_COLORS[MAX_REPORTER_SLOTS % CATEGORICAL_COLORS.length]
            });
        }

        return segments;
    }

    private describeError(err: any, fallback = 'לא ניתן לטעון את נתוני האנליטיקה כרגע.'): string {
        return err?.status === 0
            ? 'לא ניתן להתחבר לשרת. בדוק/י את החיבור ונסה/י שוב.'
            : fallback;
    }
}
