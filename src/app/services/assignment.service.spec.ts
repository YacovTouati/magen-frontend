import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AssignmentService } from './assignment.service';

describe('AssignmentService', () => {
    let service: AssignmentService;
    let httpMock: HttpTestingController;
    const apiUrl = 'http://localhost:3000/api/assignments';

    const rawAssignment = {
        id: 7,
        date: '2026-07-20T00:00:00.000Z',
        volunteerId: 3,
        volunteer: { id: 3, name: 'רבקה ס.', email: 'rivka@magen.org', role: 'ADMIN' }
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AssignmentService]
        });

        service = TestBed.inject(AssignmentService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getAssignments', () => {
        it('should GET with from/to query params and normalize the date to YYYY-MM-DD', () => {
            service.getAssignments('2026-07-01', '2026-07-31').subscribe(result => {
                expect(result.length).toBe(1);
                expect(result[0]).toEqual({
                    id: 7,
                    date: '2026-07-20',
                    volunteerId: 3,
                    volunteer: { id: 3, name: 'רבקה ס.', email: 'rivka@magen.org', role: 'ADMIN' }
                });
            });

            const req = httpMock.expectOne(r => r.url === apiUrl);
            expect(req.request.method).toBe('GET');
            expect(req.request.params.get('from')).toBe('2026-07-01');
            expect(req.request.params.get('to')).toBe('2026-07-31');
            req.flush({ success: true, data: [rawAssignment] });
        });

        it('should return an empty array when the response payload is not an array', () => {
            service.getAssignments('2026-07-01', '2026-07-31').subscribe(result => {
                expect(result).toEqual([]);
            });

            httpMock.expectOne(r => r.url === apiUrl).flush({ success: true, data: null });
        });
    });

    describe('assign', () => {
        it('should POST { date, volunteerId } and normalize the created/updated record', () => {
            service.assign('2026-07-20', 3).subscribe(result => {
                expect(result.date).toBe('2026-07-20');
                expect(result.volunteer.name).toBe('רבקה ס.');
            });

            const req = httpMock.expectOne(apiUrl);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ date: '2026-07-20', volunteerId: 3 });
            req.flush({ success: true, data: rawAssignment });
        });

        it('should propagate an HTTP error (e.g. unknown volunteer) as an observable error', () => {
            let capturedError: any = null;

            service.assign('2026-07-20', 999).subscribe({
                next: () => fail('expected an error'),
                error: (err) => { capturedError = err; }
            });

            httpMock.expectOne(apiUrl).flush(
                { success: false, message: 'המתנדב שצוין אינו קיים במערכת' },
                { status: 400, statusText: 'Bad Request' }
            );

            expect(capturedError.status).toBe(400);
        });
    });

    describe('unassign', () => {
        it('should DELETE /api/assignments/:date', () => {
            service.unassign('2026-07-20').subscribe();

            const req = httpMock.expectOne(`${apiUrl}/2026-07-20`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null, { status: 204, statusText: 'No Content' });
        });

        it('should treat a 404 as a successful unassign (day is already vacant, e.g. after a DB cascade delete)', () => {
            let completed = false;
            let errored = false;

            service.unassign('2026-07-21').subscribe({
                next: () => { completed = true; },
                error: () => { errored = true; }
            });

            httpMock.expectOne(`${apiUrl}/2026-07-21`).flush(
                { success: false, message: 'לא נמצא שיבוץ לתאריך זה' },
                { status: 404, statusText: 'Not Found' }
            );

            expect(completed).toBeTrue();
            expect(errored).toBeFalse();
        });

        it('should still propagate non-404 errors (e.g. server failure)', () => {
            let capturedError: any = null;

            service.unassign('2026-07-22').subscribe({
                next: () => fail('expected an error'),
                error: (err) => { capturedError = err; }
            });

            httpMock.expectOne(`${apiUrl}/2026-07-22`).flush(
                { success: false, message: 'Internal server error' },
                { status: 500, statusText: 'Internal Server Error' }
            );

            expect(capturedError.status).toBe(500);
        });
    });
});
