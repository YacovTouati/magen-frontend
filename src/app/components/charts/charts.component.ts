import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../services/analytics.service';

export interface ChartSegment {
    key: string;
    label: string;
    value: number;
    percent: number;
    color: string;
}

// Fixed categorical slot order (blue, aqua, yellow, ...) — assigned by display order,
// never by value, so the same category always wears the same color.
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

    callerTypeSegments: ChartSegment[] = [];
    callPurposeSegments: ChartSegment[] = [];

    ngOnInit(): void {
        this.loadSummary();
    }

    loadSummary(): void {
        this.isLoading = true;
        this.loadError = '';

        this.analyticsService.getSummary().subscribe({
            next: (summary) => {
                this.callerTypeSegments = this.buildSegments(summary.callerTypes, CALLER_TYPE_ORDER, CALLER_TYPE_LABELS);
                this.callPurposeSegments = this.buildSegments(summary.callPurposes, CALL_PURPOSE_ORDER, CALL_PURPOSE_LABELS);
                this.isLoading = false;
            },
            error: (err) => {
                this.loadError = err?.status === 0
                    ? 'לא ניתן להתחבר לשרת. בדוק/י את החיבור ונסה/י שוב.'
                    : 'לא ניתן לטעון את נתוני האנליטיקה כרגע.';
                this.isLoading = false;
            }
        });
    }

    get callerTypeTotal(): number {
        return this.callerTypeSegments.reduce((sum, seg) => sum + seg.value, 0);
    }

    get callerTypeGradient(): string {
        if (this.callerTypeTotal === 0) {
            return 'conic-gradient(#e1e0d9 0% 100%)';
        }

        let cursor = 0;
        const stops = this.callerTypeSegments
            .filter(seg => seg.value > 0)
            .map(seg => {
                const start = cursor;
                cursor += seg.percent;
                return `${seg.color} ${start}% ${cursor}%`;
            });

        return `conic-gradient(${stops.join(', ')})`;
    }

    get maxPurposeValue(): number {
        return Math.max(...this.callPurposeSegments.map(seg => seg.value), 0);
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
}
