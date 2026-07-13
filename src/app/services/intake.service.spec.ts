import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { IntakeService } from './intake.service';

describe('IntakeService', () => {
    let service: IntakeService;
    let httpMock: HttpTestingController;
    const apiUrl = 'http://localhost:3000/api/intakes';

    const rawIntake = {
        id: 1,
        callerName: 'מירי אברהם',
        phone: '050-1234567',
        email: 'miri.a@example.com',
        urgency: 'CRITICAL',
        createdAt: '2026-07-12T10:00:00.000Z',
        reportingDuty: true,
        contactedOtherCenter: 'לא',
        caseDescription: 'תיאור מקרה',
        status: 'חדש',
        assignedTo: null
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [IntakeService]
        });

        service = TestBed.inject(IntakeService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getIntakes', () => {
        it('should GET /api/intakes and normalize a flat array response, parsing createdAt into a Date', () => {
            service.getIntakes().subscribe(intakes => {
                expect(intakes.length).toBe(1);
                expect(intakes[0].id).toBe(1);
                expect(intakes[0].callerName).toBe('מירי אברהם');
                expect(intakes[0].createdAt instanceof Date).toBeTrue();
                expect(intakes[0].createdAt.toISOString()).toBe('2026-07-12T10:00:00.000Z');
            });

            const req = httpMock.expectOne(apiUrl);
            expect(req.request.method).toBe('GET');
            req.flush([rawIntake]);
        });

        it('should unwrap a { data: [...] } envelope from the backend', () => {
            service.getIntakes().subscribe(intakes => {
                expect(intakes.length).toBe(1);
                expect(intakes[0].callerName).toBe('מירי אברהם');
            });

            httpMock.expectOne(apiUrl).flush({ data: [rawIntake] });
        });

        it('should return an empty array for an unrecognized response shape', () => {
            service.getIntakes().subscribe(intakes => {
                expect(intakes).toEqual([]);
            });

            httpMock.expectOne(apiUrl).flush({ message: 'nothing here' });
        });
    });

    describe('claimOwnership', () => {
        it('should POST to /api/intakes/:id/claim with an empty body', () => {
            service.claimOwnership(1).subscribe(intake => {
                expect(intake.assignedTo).toBe('יעקב');
            });

            const req = httpMock.expectOne(`${apiUrl}/1/claim`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({});
            req.flush({ ...rawIntake, assignedTo: 'יעקב' });
        });

        it('should propagate an HTTP error (e.g. 400 from the state-machine guard) as an observable error', () => {
            let capturedError: any = null;

            service.claimOwnership(1).subscribe({
                next: () => fail('expected an error'),
                error: (err) => { capturedError = err; }
            });

            httpMock.expectOne(`${apiUrl}/1/claim`).flush(
                { message: 'התיק כבר שויך' },
                { status: 400, statusText: 'Bad Request' }
            );

            expect(capturedError).toBeTruthy();
            expect(capturedError.status).toBe(400);
        });
    });

    describe('undoClaim', () => {
        it('should POST to /api/intakes/:id/undo-claim', () => {
            service.undoClaim(1).subscribe(intake => {
                expect(intake.assignedTo).toBeNull();
                expect(intake.status).toBe('חדש');
            });

            const req = httpMock.expectOne(`${apiUrl}/1/undo-claim`);
            expect(req.request.method).toBe('POST');
            req.flush({ ...rawIntake, assignedTo: null, status: 'חדש' });
        });
    });

    describe('takeOverCase', () => {
        it('should POST to /api/intakes/:id/takeover', () => {
            service.takeOverCase(1).subscribe(intake => {
                expect(intake.assignedTo).toBe('מיכל');
            });

            const req = httpMock.expectOne(`${apiUrl}/1/takeover`);
            expect(req.request.method).toBe('POST');
            req.flush({ ...rawIntake, assignedTo: 'מיכל' });
        });

        it('should propagate a 403 from the backend when the case is actively locked by someone else', () => {
            let capturedError: any = null;

            service.takeOverCase(1).subscribe({
                next: () => fail('expected an error'),
                error: (err) => { capturedError = err; }
            });

            httpMock.expectOne(`${apiUrl}/1/takeover`).flush(
                { message: 'התיק נעול לטיפול פעיל' },
                { status: 403, statusText: 'Forbidden' }
            );

            expect(capturedError.status).toBe(403);
            expect(capturedError.error.message).toBe('התיק נעול לטיפול פעיל');
        });
    });

    describe('updateStatus', () => {
        it('should PATCH /api/intakes/:id/status with a { status } body', () => {
            service.updateStatus(1, 'בטיפול פעיל').subscribe(intake => {
                expect(intake.status).toBe('בטיפול פעיל');
            });

            const req = httpMock.expectOne(`${apiUrl}/1/status`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({ status: 'בטיפול פעיל' });
            req.flush({ ...rawIntake, status: 'בטיפול פעיל' });
        });
    });
});
