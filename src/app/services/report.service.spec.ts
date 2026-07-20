import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReportService, CallReportPayload } from './report.service';

describe('ReportService', () => {
    let service: ReportService;
    let httpMock: HttpTestingController;
    const apiUrl = 'http://localhost:3000/api/reports';

    const payload: CallReportPayload = {
        callDuration: 15,
        callerType: 'victim',
        callPurpose: 'counseling',
        summaryNotes: 'סיכום שיחה',
        callerName: 'פונה לדוגמה',
        phone: '0501234567',
        email: 'caller@example.com',
        region: 'center',
        gender: 'unknown',
        sector: 'secular',
        receivedSupportAtOtherCenter: false,
        isFamilyMemberOrAcquaintance: false,
        magenContactHistory: 'first_time',
        reportingDuty: true
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ReportService]
        });

        service = TestBed.inject(ReportService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should POST the report payload to /api/reports and extract the created id from the nested report object', () => {
        service.submitReport(payload).subscribe(result => {
            expect(result.id).toBe(42);
        });

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(payload);
        // Real backend shape: data.report.id, alongside the auto-linked data.intake.
        req.flush({ success: true, data: { report: { id: 42 }, intake: { id: 42 } } });
    });

    it('should fall back to a flat data.id when present, for backward compatibility', () => {
        service.submitReport(payload).subscribe(result => {
            expect(result.id).toBe(7);
        });

        httpMock.expectOne(apiUrl).flush({ success: true, data: { id: 7 } });
    });

    it('should return a null id when the response has no recognizable id field', () => {
        service.submitReport(payload).subscribe(result => {
            expect(result.id).toBeNull();
        });

        httpMock.expectOne(apiUrl).flush({ success: true, data: {} });
    });

    it('should propagate an HTTP error as an observable error', () => {
        let capturedError: any = null;

        service.submitReport(payload).subscribe({
            next: () => fail('expected an error'),
            error: (err) => { capturedError = err; }
        });

        httpMock.expectOne(apiUrl).flush({ message: 'validation failed' }, { status: 400, statusText: 'Bad Request' });

        expect(capturedError.status).toBe(400);
    });
});
