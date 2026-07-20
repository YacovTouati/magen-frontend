import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { IntakeService } from './intake.service';

describe('IntakeService', () => {
    let service: IntakeService;
    let httpMock: HttpTestingController;
    const apiUrl = 'http://localhost:3000/api/intakes';

    // Mirrors the real backend shape (Intake Prisma model, post data-retention rework):
    // no assignedTo/ownership fields anymore, expiresAt is a real column, and
    // email/reportingDuty live on the nested callReport relation, not directly on the row.
    const rawIntake = {
        id: 1,
        callerName: 'מירי אברהם',
        phone: '050-1234567',
        urgency: 'CRITICAL',
        createdAt: '2026-07-12T10:00:00.000Z',
        contactedOtherCenter: 'לא',
        caseDescription: 'תיאור מקרה',
        status: 'NEW',
        expiresAt: '2026-07-26T10:00:00.000Z'
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
        it('should GET /api/intakes and normalize a flat array response, parsing createdAt/expiresAt into Dates', () => {
            service.getIntakes().subscribe(intakes => {
                expect(intakes.length).toBe(1);
                expect(intakes[0].id).toBe(1);
                expect(intakes[0].callerName).toBe('מירי אברהם');
                expect(intakes[0].status).toBe('NEW');
                expect(intakes[0].createdAt instanceof Date).toBeTrue();
                expect(intakes[0].createdAt.toISOString()).toBe('2026-07-12T10:00:00.000Z');
                expect(intakes[0].expiresAt instanceof Date).toBeTrue();
                expect(intakes[0].expiresAt.toISOString()).toBe('2026-07-26T10:00:00.000Z');
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

            httpMock.expectOne(apiUrl).flush({ success: true, data: [rawIntake] });
        });

        it('should return an empty array for an unrecognized response shape', () => {
            service.getIntakes().subscribe(intakes => {
                expect(intakes).toEqual([]);
            });

            httpMock.expectOne(apiUrl).flush({ message: 'nothing here' });
        });

        it('should leave callReport null when the backend does not send it', () => {
            service.getIntakes().subscribe(intakes => {
                expect(intakes[0].callReport).toBeNull();
            });

            httpMock.expectOne(apiUrl).flush({ data: [rawIntake] });
        });

        it('should normalize a joined callReport into email/reportingDuty', () => {
            service.getIntakes().subscribe(intakes => {
                expect(intakes[0].callReport).toEqual({
                    id: 55,
                    email: 'volunteer-caller@example.com',
                    reportingDuty: true
                });
            });

            httpMock.expectOne(apiUrl).flush({
                data: [{ ...rawIntake, callReport: { id: 55, email: 'volunteer-caller@example.com', reportingDuty: true } }]
            });
        });
    });

    describe('updateStatus', () => {
        it('should PATCH /api/intakes/:id/status with a { status } body using the raw backend enum value', () => {
            service.updateStatus(1, 'ACTIVE').subscribe(intake => {
                expect(intake.status).toBe('ACTIVE');
            });

            const req = httpMock.expectOne(`${apiUrl}/1/status`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({ status: 'ACTIVE' });
            req.flush({ ...rawIntake, status: 'ACTIVE' });
        });
    });

    describe('extendExpiration', () => {
        it('should PATCH /api/intakes/:id/extend with an empty body and return the pushed-out expiresAt', () => {
            service.extendExpiration(1).subscribe(intake => {
                expect(intake.expiresAt.toISOString()).toBe('2026-08-02T10:00:00.000Z');
            });

            const req = httpMock.expectOne(`${apiUrl}/1/extend`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({});
            req.flush({ ...rawIntake, expiresAt: '2026-08-02T10:00:00.000Z' });
        });

        it('should propagate an HTTP error as an observable error', () => {
            let capturedError: any = null;

            service.extendExpiration(1).subscribe({
                next: () => fail('expected an error'),
                error: (err) => { capturedError = err; }
            });

            httpMock.expectOne(`${apiUrl}/1/extend`).flush(
                { message: 'אין הרשאה' },
                { status: 403, statusText: 'Forbidden' }
            );

            expect(capturedError.status).toBe(403);
        });
    });

    describe('deleteIntake', () => {
        it('should DELETE /api/intakes/:id', () => {
            service.deleteIntake(1).subscribe(response => {
                expect(response).toBeNull();
            });

            const req = httpMock.expectOne(`${apiUrl}/1`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });

        it('should propagate an HTTP error as an observable error', () => {
            let capturedError: any = null;

            service.deleteIntake(1).subscribe({
                next: () => fail('expected an error'),
                error: (err) => { capturedError = err; }
            });

            httpMock.expectOne(`${apiUrl}/1`).flush(
                { message: 'תיק לא נמצא' },
                { status: 404, statusText: 'Not Found' }
            );

            expect(capturedError.status).toBe(404);
        });
    });
});
