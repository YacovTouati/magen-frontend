import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
    let service: AnalyticsService;
    let httpMock: HttpTestingController;
    const apiUrl = 'http://localhost:3000/api/analytics/summary';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AnalyticsService]
        });

        service = TestBed.inject(AnalyticsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should GET /api/analytics/summary and unwrap the { success, data } envelope', () => {
        service.getSummary().subscribe(summary => {
            expect(summary.callerTypes).toEqual({ victim: 8, family: 1, friend: 1 });
            expect(summary.callPurposes).toEqual({ coercion: 2, counseling: 5, crisis: 3 });
        });

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('GET');
        req.flush({
            success: true,
            data: {
                callerTypes: { victim: 8, family: 1, friend: 1 },
                callPurposes: { coercion: 2, counseling: 5, crisis: 3 }
            }
        });
    });

    it('should default to empty objects when the response has an unrecognized shape', () => {
        service.getSummary().subscribe(summary => {
            expect(summary.callerTypes).toEqual({});
            expect(summary.callPurposes).toEqual({});
        });

        httpMock.expectOne(apiUrl).flush({ message: 'nothing here' });
    });

    it('should propagate an HTTP error as an observable error', () => {
        let capturedError: any = null;

        service.getSummary().subscribe({
            next: () => fail('expected an error'),
            error: (err) => { capturedError = err; }
        });

        httpMock.expectOne(apiUrl).flush({ message: 'server error' }, { status: 500, statusText: 'Internal Server Error' });

        expect(capturedError.status).toBe(500);
    });
});
