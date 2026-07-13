import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, Observable } from 'rxjs';
import { ChartsComponent } from './charts.component';
import { AnalyticsService, AnalyticsSummary } from '../../services/analytics.service';

describe('ChartsComponent', () => {
    let analyticsServiceSpy: jasmine.SpyObj<AnalyticsService>;

    const mockSummary: AnalyticsSummary = {
        callerTypes: { victim: 8, family: 1, friend: 1 },
        callPurposes: { coercion: 2, counseling: 5, crisis: 3 }
    };

    function setup(summary: AnalyticsSummary = mockSummary) {
        analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary']);
        analyticsServiceSpy.getSummary.and.returnValue(of(summary));

        TestBed.configureTestingModule({
            imports: [ChartsComponent],
            providers: [{ provide: AnalyticsService, useValue: analyticsServiceSpy }]
        });

        const fixture = TestBed.createComponent(ChartsComponent);
        fixture.detectChanges();
        return fixture;
    }

    it('should create and fetch the analytics summary on init', () => {
        const fixture = setup();
        expect(fixture.componentInstance).toBeTruthy();
        expect(analyticsServiceSpy.getSummary).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.isLoading).toBeFalse();
    });

    it('should show the loading skeleton while the request is in flight', () => {
        analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary']);
        analyticsServiceSpy.getSummary.and.returnValue(new Observable(() => { }));
        TestBed.configureTestingModule({
            imports: [ChartsComponent],
            providers: [{ provide: AnalyticsService, useValue: analyticsServiceSpy }]
        });
        const fixture = TestBed.createComponent(ChartsComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.isLoading).toBeTrue();
        expect(fixture.debugElement.query(By.css('.analytics-loading'))).toBeTruthy();
        expect(fixture.debugElement.query(By.css('.analytics-grid'))).toBeFalsy();
    });

    it('should show a friendly error message and a retry button when the request fails', () => {
        analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary']);
        analyticsServiceSpy.getSummary.and.returnValue(throwError(() => ({ status: 500 })));
        TestBed.configureTestingModule({
            imports: [ChartsComponent],
            providers: [{ provide: AnalyticsService, useValue: analyticsServiceSpy }]
        });
        const fixture = TestBed.createComponent(ChartsComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.loadError).toBeTruthy();
        expect(fixture.debugElement.query(By.css('.analytics-error'))).toBeTruthy();
        expect(fixture.debugElement.query(By.css('.retry-btn'))).toBeTruthy();
    });

    it('should show a connectivity-specific message when the request never reaches the server', () => {
        analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary']);
        analyticsServiceSpy.getSummary.and.returnValue(throwError(() => ({ status: 0 })));
        TestBed.configureTestingModule({
            imports: [ChartsComponent],
            providers: [{ provide: AnalyticsService, useValue: analyticsServiceSpy }]
        });
        const fixture = TestBed.createComponent(ChartsComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.loadError).toContain('להתחבר לשרת');
    });

    it('retry button should call loadSummary() again', () => {
        analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary']);
        analyticsServiceSpy.getSummary.and.returnValue(throwError(() => ({ status: 500 })));
        TestBed.configureTestingModule({
            imports: [ChartsComponent],
            providers: [{ provide: AnalyticsService, useValue: analyticsServiceSpy }]
        });
        const fixture = TestBed.createComponent(ChartsComponent);
        fixture.detectChanges();

        fixture.debugElement.query(By.css('.retry-btn')).triggerEventHandler('click', null);

        expect(analyticsServiceSpy.getSummary).toHaveBeenCalledTimes(2);
    });

    describe('caller types (doughnut)', () => {
        it('should build segments in fixed order with Hebrew labels and correct percentages', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.callerTypeSegments.map(s => s.key)).toEqual(['victim', 'family', 'friend']);
            expect(comp.callerTypeSegments[0].label).toBe('נפגע/ת');
            expect(comp.callerTypeSegments[1].label).toBe('בן/בת משפחה');
            expect(comp.callerTypeSegments[2].label).toBe('חבר/ה');
            expect(comp.callerTypeTotal).toBe(10);
            expect(comp.callerTypeSegments[0].percent).toBeCloseTo(80, 0);
        });

        it('should assign colors by fixed display order, not by value', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            // family (1) and friend (1) tie in value but must keep their distinct fixed-slot colors
            expect(comp.callerTypeSegments[1].color).not.toBe(comp.callerTypeSegments[2].color);
        });

        it('should build a conic-gradient that sums to 100%', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            const gradient = comp.callerTypeGradient;
            expect(gradient).toContain('conic-gradient(');
            expect(gradient).toContain('100%');
        });

        it('should show the empty state and a neutral gradient when there is no data at all', () => {
            const fixture = setup({ callerTypes: { victim: 0, family: 0, friend: 0 }, callPurposes: {} });
            const comp = fixture.componentInstance;

            expect(comp.callerTypeTotal).toBe(0);
            expect(fixture.debugElement.query(By.css('.empty-chart-message'))).toBeTruthy();
            expect(fixture.debugElement.query(By.css('.donut'))).toBeFalsy();
        });

        it('should render the legend with values and percentages in the DOM', () => {
            const fixture = setup();
            const legendItems = fixture.debugElement.queryAll(By.css('.chart-legend li'));

            expect(legendItems.length).toBe(3);
            expect(legendItems[0].nativeElement.textContent).toContain('נפגע/ת');
            expect(legendItems[0].nativeElement.textContent).toContain('8');
            expect(legendItems[0].nativeElement.textContent).toContain('80%');
        });
    });

    describe('call purposes (bar chart)', () => {
        it('should build segments in fixed order with Hebrew labels', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.callPurposeSegments.map(s => s.key)).toEqual(['counseling', 'crisis', 'coercion']);
            expect(comp.callPurposeSegments[0].label).toBe('ייעוץ');
            expect(comp.callPurposeSegments[1].label).toBe('משבר');
            expect(comp.callPurposeSegments[2].label).toBe('כפייה/פגיעה');
        });

        it('should compute the max value for bar scaling', () => {
            const fixture = setup();
            expect(fixture.componentInstance.maxPurposeValue).toBe(5); // counseling: 5
        });

        it('should render one bar row per category with its value shown', () => {
            const fixture = setup();
            const rows = fixture.debugElement.queryAll(By.css('.bar-row'));

            expect(rows.length).toBe(3);
            expect(rows[0].nativeElement.textContent).toContain('ייעוץ');
            expect(rows[0].nativeElement.textContent).toContain('5');
        });

        it('the largest bar should be scaled to 100% width', () => {
            const fixture = setup();
            const fills = fixture.debugElement.queryAll(By.css('.bar-fill'));

            expect(fills[0].nativeElement.style.width).toBe('100%'); // counseling === max
        });

        it('should show the empty state when there is no data at all', () => {
            const fixture = setup({ callerTypes: {}, callPurposes: { counseling: 0, crisis: 0, coercion: 0 } });

            expect(fixture.componentInstance.maxPurposeValue).toBe(0);
            expect(fixture.debugElement.queryAll(By.css('.bar-row')).length).toBe(0);
        });
    });

    it('should render an accessible table view with all segments', () => {
        const fixture = setup();
        const tableRows = fixture.debugElement.queryAll(By.css('.analytics-table tbody tr'));

        expect(tableRows.length).toBe(6); // 3 caller types + 3 call purposes
    });
});
