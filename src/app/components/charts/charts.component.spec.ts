import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, Observable } from 'rxjs';
import { ChartsComponent } from './charts.component';
import { AnalyticsService, AnalyticsSummary, MonthlyIntakeAnalytics } from '../../services/analytics.service';

describe('ChartsComponent', () => {
    let analyticsServiceSpy: jasmine.SpyObj<AnalyticsService>;

    const mockSummary: AnalyticsSummary = {
        callerTypes: { victim: 8, family: 1, friend: 1 },
        callPurposes: { referral: 2, counseling: 5, crisis: 3 }
    };

    function buildHourlyDistribution(overrides: Record<string, number>): Record<string, number> {
        const hours: Record<string, number> = {};
        for (let hour = 0; hour < 24; hour++) {
            hours[String(hour).padStart(2, '0')] = 0;
        }
        return { ...hours, ...overrides };
    }

    const mockMonthly: MonthlyIntakeAnalytics = {
        year: 2026,
        month: 8,
        totalIntakes: 10,
        statusBreakdown: { NEW: 3, NO_ANSWER: 1, ACTIVE: 2, CLOSED: 3, LONG_TERM: 1 },
        reporterBreakdown: { 'דנה לוי': 6, 'יוסי כהן': 4 },
        callPurposeBreakdown: { counseling: 4, crisis: 2, referral: 1, 'לא צוין': 3 },
        callerTypeBreakdown: { victim: 8, family: 1, friend: 1 },
        receivedSupportBreakdown: { yes: 2, no: 5, unknown: 3 },
        magenContactHistoryBreakdown: { first_time: 6, past: 3, dont_remember: 1 },
        reportingDutyBreakdown: { no: 7, yes_practical: 2, yes_principled: 1 },
        regionBreakdown: { 'תל אביב': 4, 'ירושלים': 3, 'חיפה': 3 },
        hourlyDistribution: buildHourlyDistribution({ '09': 2, '14': 5, '18': 3 }),
        resolutionStats: { resolvedCount: 4, averageResolutionHours: 12.5, completionRate: 0.4 }
    };

    function setup(monthly: MonthlyIntakeAnalytics = mockMonthly, summary: AnalyticsSummary = mockSummary) {
        analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary', 'getMonthlyAnalytics', 'exportMonthlyCsv']);
        analyticsServiceSpy.getSummary.and.returnValue(of(summary));
        analyticsServiceSpy.getMonthlyAnalytics.and.returnValue(of(monthly));

        TestBed.configureTestingModule({
            imports: [ChartsComponent],
            providers: [{ provide: AnalyticsService, useValue: analyticsServiceSpy }]
        });

        const fixture = TestBed.createComponent(ChartsComponent);
        fixture.detectChanges();
        return fixture;
    }

    it('should create and fetch both the monthly analytics and the all-time summary on init', () => {
        const fixture = setup();
        expect(fixture.componentInstance).toBeTruthy();
        expect(analyticsServiceSpy.getMonthlyAnalytics).toHaveBeenCalledTimes(1);
        expect(analyticsServiceSpy.getSummary).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.isLoading).toBeFalse();
    });

    it('should default the month/year picker to the real current month', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        const now = new Date();

        expect(comp.selectedYear).toBe(now.getFullYear());
        expect(comp.selectedMonth).toBe(now.getMonth() + 1);
        expect(comp.isCurrentMonth).toBeTrue();
    });

    describe('month navigation', () => {
        it('goToPreviousMonth() should step back a month and reload', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            comp.selectedYear = 2026;
            comp.selectedMonth = 8;
            analyticsServiceSpy.getMonthlyAnalytics.calls.reset();

            comp.goToPreviousMonth();

            expect(comp.selectedMonth).toBe(7);
            expect(comp.selectedYear).toBe(2026);
            expect(analyticsServiceSpy.getMonthlyAnalytics).toHaveBeenCalledWith(2026, 7);
        });

        it('goToPreviousMonth() should roll back a year from January', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            comp.selectedYear = 2026;
            comp.selectedMonth = 1;

            comp.goToPreviousMonth();

            expect(comp.selectedMonth).toBe(12);
            expect(comp.selectedYear).toBe(2025);
        });

        it('goToNextMonth() should step forward a month and reload', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            comp.selectedYear = 2026;
            comp.selectedMonth = 1;
            analyticsServiceSpy.getMonthlyAnalytics.calls.reset();

            comp.goToNextMonth();

            expect(comp.selectedMonth).toBe(2);
            expect(analyticsServiceSpy.getMonthlyAnalytics).toHaveBeenCalledWith(2026, 2);
        });

        it('goToNextMonth() should be a no-op once already on the current month (no future data to show)', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            analyticsServiceSpy.getMonthlyAnalytics.calls.reset();

            comp.goToNextMonth();

            expect(analyticsServiceSpy.getMonthlyAnalytics).not.toHaveBeenCalled();
        });

        it('the "next month" button should be disabled on the current month', () => {
            const fixture = setup();
            const btn: HTMLButtonElement = fixture.debugElement.queryAll(By.css('.month-nav-btn'))[1].nativeElement;

            expect(btn.disabled).toBeTrue();
        });

        it('goToCurrentMonth() should jump back to today\'s month/year and reload', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            comp.selectedYear = 2020;
            comp.selectedMonth = 1;
            const now = new Date();

            comp.goToCurrentMonth();

            expect(comp.selectedYear).toBe(now.getFullYear());
            expect(comp.selectedMonth).toBe(now.getMonth() + 1);
        });

        it('the "current month" quick-reset button should be hidden while already on the current month', () => {
            const fixture = setup();

            expect(fixture.debugElement.query(By.css('.current-month-btn'))).toBeFalsy();
        });

        it('the "current month" quick-reset button should appear once navigated away', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            comp.goToPreviousMonth();
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.current-month-btn'))).toBeTruthy();
        });
    });

    describe('loading / error states (monthly)', () => {
        it('should show the loading skeleton while the monthly request is in flight', () => {
            analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary', 'getMonthlyAnalytics', 'exportMonthlyCsv']);
            analyticsServiceSpy.getSummary.and.returnValue(of(mockSummary));
            analyticsServiceSpy.getMonthlyAnalytics.and.returnValue(new Observable(() => { }));
            TestBed.configureTestingModule({
                imports: [ChartsComponent],
                providers: [{ provide: AnalyticsService, useValue: analyticsServiceSpy }]
            });
            const fixture = TestBed.createComponent(ChartsComponent);
            fixture.detectChanges();

            expect(fixture.componentInstance.isLoading).toBeTrue();
            expect(fixture.debugElement.query(By.css('.analytics-loading'))).toBeTruthy();
            expect(fixture.debugElement.query(By.css('.kpi-grid'))).toBeFalsy();
        });

        it('should show a friendly error and a retry button when the monthly request fails', () => {
            analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary', 'getMonthlyAnalytics', 'exportMonthlyCsv']);
            analyticsServiceSpy.getSummary.and.returnValue(of(mockSummary));
            analyticsServiceSpy.getMonthlyAnalytics.and.returnValue(throwError(() => ({ status: 500 })));
            TestBed.configureTestingModule({
                imports: [ChartsComponent],
                providers: [{ provide: AnalyticsService, useValue: analyticsServiceSpy }]
            });
            const fixture = TestBed.createComponent(ChartsComponent);
            fixture.detectChanges();

            expect(fixture.componentInstance.loadError).toBeTruthy();
            expect(fixture.debugElement.query(By.css('.analytics-error'))).toBeTruthy();
        });

        it('retry button should call loadMonthlyAnalytics() again', () => {
            analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary', 'getMonthlyAnalytics', 'exportMonthlyCsv']);
            analyticsServiceSpy.getSummary.and.returnValue(of(mockSummary));
            analyticsServiceSpy.getMonthlyAnalytics.and.returnValue(throwError(() => ({ status: 500 })));
            TestBed.configureTestingModule({
                imports: [ChartsComponent],
                providers: [{ provide: AnalyticsService, useValue: analyticsServiceSpy }]
            });
            const fixture = TestBed.createComponent(ChartsComponent);
            fixture.detectChanges();

            fixture.debugElement.query(By.css('.analytics-error .retry-btn')).triggerEventHandler('click', null);

            expect(analyticsServiceSpy.getMonthlyAnalytics).toHaveBeenCalledTimes(2);
        });
    });

    describe('KPI cards', () => {
        it('should show total intakes directly from the monthly payload', () => {
            const fixture = setup();
            expect(fixture.componentInstance.totalIntakes).toBe(10);
        });

        it('should derive total call reports as intakes minus the "no linked report" bucket', () => {
            const fixture = setup();
            // totalIntakes (10) - callPurposeBreakdown['לא צוין'] (3) = 7
            expect(fixture.componentInstance.totalCallReports).toBe(7);
        });

        it('should show completion rate as a percentage', () => {
            const fixture = setup();
            expect(fixture.componentInstance.completionRatePercent).toBe(40);
        });

        it('should format a sub-24h average resolution time in hours', () => {
            const fixture = setup();
            expect(fixture.componentInstance.averageResolutionLabel).toBe('12.5 שעות');
        });

        it('should format a 24h+ average resolution time in days', () => {
            const fixture = setup({ ...mockMonthly, resolutionStats: { resolvedCount: 2, averageResolutionHours: 50, completionRate: 0.2 } });
            expect(fixture.componentInstance.averageResolutionLabel).toBe('2.1 ימים');
        });

        it('should show an em dash when nothing has been resolved yet', () => {
            const fixture = setup({ ...mockMonthly, resolutionStats: { resolvedCount: 0, averageResolutionHours: null, completionRate: 0 } });
            expect(fixture.componentInstance.averageResolutionLabel).toBe('—');
        });

        it('should render all four KPI cards in the DOM', () => {
            const fixture = setup();
            const cards = fixture.debugElement.queryAll(By.css('.kpi-card'));

            expect(cards.length).toBe(4);
            expect(cards[0].nativeElement.textContent).toContain('10');
        });
    });

    describe('hourly distribution chart', () => {
        it('should build one zero-filled bar per hour of the day, in hour order', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.hourlyBars.length).toBe(24);
            expect(comp.hourlyBars.map(b => b.hour)).toEqual(Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')));
            expect(comp.hourlyBars.find(b => b.hour === '09')?.value).toBe(2);
            expect(comp.hourlyBars.find(b => b.hour === '14')?.value).toBe(5);
            expect(comp.hourlyBars.find(b => b.hour === '00')?.value).toBe(0);
        });

        it('should compute the max value for bar scaling', () => {
            const fixture = setup();
            expect(fixture.componentInstance.maxHourlyValue).toBe(5);
        });

        it('the tallest bar should scale to 100% height', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            const tallest = comp.hourlyBars.find(b => b.value === 5)!;

            expect(comp.barHeightPercent(tallest)).toBe(100);
        });

        it('should show the empty state when every hour is zero', () => {
            const fixture = setup({ ...mockMonthly, hourlyDistribution: buildHourlyDistribution({}) });

            expect(fixture.componentInstance.maxHourlyValue).toBe(0);
            expect(fixture.debugElement.query(By.css('.trend-chart'))).toBeFalsy();
            expect(fixture.debugElement.query(By.css('.empty-chart-message'))).toBeTruthy();
        });

        it('should render 24 columns (one per hour) in the DOM', () => {
            const fixture = setup();
            expect(fixture.debugElement.queryAll(By.css('.trend-bar-col')).length).toBe(24);
        });
    });

    describe('status breakdown (donut)', () => {
        it('should build segments in fixed status order with Hebrew labels', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.statusSegments.map(s => s.key)).toEqual(['NEW', 'NO_ANSWER', 'ACTIVE', 'CLOSED', 'LONG_TERM']);
            expect(comp.statusSegments[0].label).toBe('חדש');
            expect(comp.statusTotal).toBe(10);
        });
    });

    describe('case type breakdown (donut)', () => {
        it('should build segments including the "לא צוין" bucket for intakes with no linked report', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.caseTypeSegments.map(s => s.key)).toEqual(
                ['counseling', 'referral', 'legal_process', 'rights_advocacy', 'crisis', 'other', 'coercion', 'לא צוין']
            );
            expect(comp.caseTypeSegments[0].label).toBe('ייעוץ ותמיכה רגשית');
            expect(comp.caseTypeSegments[7].label).toBe('לא צוין');
            expect(comp.caseTypeTotal).toBe(10);
        });
    });

    describe('reporter breakdown (donut)', () => {
        it('should sort reporters by value descending, assigning colors by that order', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.reporterSegments.map(s => s.key)).toEqual(['דנה לוי', 'יוסי כהן']);
            expect(comp.reporterSegments[0].value).toBe(6);
            expect(comp.reporterTotal).toBe(10);
        });

        it('should fold anything past the 7th reporter into a single "אחר" segment', () => {
            const many: Record<string, number> = {};
            for (let i = 1; i <= 9; i++) {
                many[`מתנדב ${i}`] = i;
            }
            const fixture = setup({ ...mockMonthly, reporterBreakdown: many });
            const comp = fixture.componentInstance;

            expect(comp.reporterSegments.length).toBe(8); // 7 named + 1 "אחר"
            const other = comp.reporterSegments[7];
            expect(other.label).toBe('אחר');
            expect(other.value).toBe(1 + 2); // the two smallest (מתנדב 1, מתנדב 2) folded in
        });
    });

    describe('caller-type breakdown (monthly donut)', () => {
        it('should build segments in fixed order (victim, family, friend, unknown, general_inquiry, לא צוין) with Hebrew labels', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.monthlyCallerTypeSegments.map(s => s.key)).toEqual(['victim', 'family', 'friend', 'unknown', 'general_inquiry', 'לא צוין']);
            expect(comp.monthlyCallerTypeSegments[0].label).toBe('נפגע/ת ישיר/ה');
            expect(comp.monthlyCallerTypeTotal).toBe(10);
        });

        it('should build a conic-gradient for the caller-type donut', () => {
            const fixture = setup();
            expect(fixture.componentInstance.monthlyCallerTypeGradient).toContain('conic-gradient(');
        });
    });

    describe('support-elsewhere breakdown (donut)', () => {
        it('should build segments in fixed order (yes, no, unknown, לא צוין) with Hebrew labels', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.supportElsewhereSegments.map(s => s.key)).toEqual(['yes', 'no', 'unknown', 'לא צוין']);
            expect(comp.supportElsewhereSegments[0].label).toBe('כן');
            expect(comp.supportElsewhereTotal).toBe(10);
        });
    });

    describe('previous-contact breakdown (donut)', () => {
        it('should build segments in fixed order (first_time, past, dont_remember, לא צוין) with Hebrew labels', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.previousContactSegments.map(s => s.key)).toEqual(['first_time', 'past', 'dont_remember', 'לא צוין']);
            expect(comp.previousContactSegments[0].label).toBe('פעם ראשונה');
            expect(comp.previousContactTotal).toBe(10);
        });
    });

    describe('reporting-duty breakdown (donut)', () => {
        it('should build segments in fixed order (no, yes_practical, yes_principled, לא צוין) with Hebrew labels', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.reportingDutySegments.map(s => s.key)).toEqual(['no', 'yes_practical', 'yes_principled', 'לא צוין']);
            expect(comp.reportingDutySegments[0].label).toBe('לא');
            expect(comp.reportingDutyTotal).toBe(10);
        });
    });

    describe('region ranked list', () => {
        it('should sort regions by value descending', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.regionRows.map(r => r.key)).toEqual(['תל אביב', 'ירושלים', 'חיפה']);
            expect(comp.regionRows[0].value).toBe(4);
        });

        it('should fold anything past the 10th region into a single "אחר" row', () => {
            const many: Record<string, number> = {};
            for (let i = 1; i <= 12; i++) {
                many[`אזור ${i}`] = i;
            }
            const fixture = setup({ ...mockMonthly, regionBreakdown: many });
            const comp = fixture.componentInstance;

            expect(comp.regionRows.length).toBe(11); // 10 named + 1 "אחר"
            const other = comp.regionRows[10];
            expect(other.label).toBe('אחר');
            expect(other.value).toBe(1 + 2); // the two smallest (אזור 1, אזור 2) folded in
        });

        it('should scale bar width against the max region value', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.regionMaxValue).toBe(4);
            expect(comp.regionBarWidthPercent(comp.regionRows[0])).toBe(100);
        });

        it('should show the empty state when there is no region data', () => {
            const fixture = setup({ ...mockMonthly, regionBreakdown: {} });

            expect(fixture.componentInstance.regionRows.length).toBe(0);
            expect(fixture.debugElement.query(By.css('.region-list'))).toBeFalsy();
        });

        it('should render one region row per entry in the DOM', () => {
            const fixture = setup();
            expect(fixture.debugElement.queryAll(By.css('.region-row')).length).toBe(3);
        });
    });

    describe('CSV export', () => {
        it('exportCsv() should call the service with the selected year/month and trigger a download', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            comp.selectedYear = 2026;
            comp.selectedMonth = 8;
            const blob = new Blob(['a,b,c'], { type: 'text/csv' });
            analyticsServiceSpy.exportMonthlyCsv.and.returnValue(of(blob));
            spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
            spyOn(URL, 'revokeObjectURL');
            const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');

            comp.exportCsv();

            expect(analyticsServiceSpy.exportMonthlyCsv).toHaveBeenCalledOnceWith(2026, 8);
            expect(clickSpy).toHaveBeenCalled();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
            expect(comp.isExporting).toBeFalse();
        });

        it('should not start a second export while one is already in flight', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            comp.isExporting = true;

            comp.exportCsv();

            expect(analyticsServiceSpy.exportMonthlyCsv).not.toHaveBeenCalled();
        });

        it('should show an inline error and reset isExporting when the export fails', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            analyticsServiceSpy.exportMonthlyCsv.and.returnValue(throwError(() => ({ status: 500 })));

            comp.exportCsv();

            expect(comp.isExporting).toBeFalse();
            expect(comp.exportError).toBeTruthy();
        });

        it('the export button should show a busy label and be disabled while exporting', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            comp.isExporting = true;
            fixture.detectChanges();
            const btn: HTMLButtonElement = fixture.debugElement.query(By.css('.export-btn')).nativeElement;

            expect(btn.disabled).toBeTrue();
            expect(btn.textContent).toContain('מייצא');
        });
    });

    describe('all-time summary (unchanged from before)', () => {
        it('should build caller-type segments in fixed order with Hebrew labels and correct percentages', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.callerTypeSegments.map(s => s.key)).toEqual(['victim', 'family', 'friend', 'unknown', 'general_inquiry']);
            expect(comp.callerTypeTotal).toBe(10);
            expect(comp.callerTypeSegments[0].percent).toBeCloseTo(80, 0);
        });

        it('should build a conic-gradient that sums to 100%', () => {
            const fixture = setup();
            expect(fixture.componentInstance.callerTypeGradient).toContain('conic-gradient(');
        });

        it('should build call-purpose segments in fixed order with Hebrew labels', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.callPurposeSegments.map(s => s.key)).toEqual(
                ['counseling', 'referral', 'legal_process', 'rights_advocacy', 'crisis', 'other', 'coercion']
            );
            expect(comp.maxPurposeValue).toBe(5);
        });

        it('should show a friendly error for the all-time summary independent of the monthly section', () => {
            analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary', 'getMonthlyAnalytics', 'exportMonthlyCsv']);
            analyticsServiceSpy.getMonthlyAnalytics.and.returnValue(of(mockMonthly));
            analyticsServiceSpy.getSummary.and.returnValue(throwError(() => ({ status: 500 })));
            TestBed.configureTestingModule({
                imports: [ChartsComponent],
                providers: [{ provide: AnalyticsService, useValue: analyticsServiceSpy }]
            });
            const fixture = TestBed.createComponent(ChartsComponent);
            fixture.detectChanges();

            expect(fixture.componentInstance.summaryLoadError).toBeTruthy();
            expect(fixture.componentInstance.loadError).toBe(''); // monthly section unaffected
        });
    });

    it('should render an accessible table view with the monthly segments', () => {
        const fixture = setup();
        const tableRows = fixture.debugElement.queryAll(By.css('.analytics-table-wrap'))[0].queryAll(By.css('tbody tr'));

        // 2 reporters + 5 statuses + 8 case types (6 current + coercion legacy + לא צוין)
        // + 6 caller types (4 current + general_inquiry + לא צוין) + 4 support-elsewhere
        // + 4 previous-contact + 4 reporting-duty + 3 regions
        expect(tableRows.length).toBe(36);
    });
});
