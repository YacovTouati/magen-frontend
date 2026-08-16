import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
    let service: ScheduleService;
    let httpMock: HttpTestingController;
    const apiUrl = 'http://localhost:3000/api';

    const rawShift = {
        id: 7,
        date: '2026-08-16T00:00:00.000Z',
        type: 'MORNING',
        status: 'LOCKED',
        volunteer: { id: 3, name: 'מירי', email: 'miri@example.com', role: 'VOLUNTEER' },
        note: 'מירי עבדה עד 18:00'
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ScheduleService]
        });

        service = TestBed.inject(ScheduleService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('updateShiftNote', () => {
        it('should PATCH /shifts/:id/note with the note body and normalize the response', () => {
            let result: any;
            service.updateShiftNote(7, 'מירי עבדה עד 18:00').subscribe(r => result = r);

            const req = httpMock.expectOne(`${apiUrl}/shifts/7/note`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({ note: 'מירי עבדה עד 18:00' });

            req.flush({ data: rawShift });

            expect(result.id).toBe(7);
            expect(result.note).toBe('מירי עבדה עד 18:00');
            expect(result.volunteer?.name).toBe('מירי');
        });
    });

    describe('deleteShiftNote', () => {
        it('should DELETE /shifts/:id/note and normalize the response with note cleared', () => {
            let result: any;
            service.deleteShiftNote(7).subscribe(r => result = r);

            const req = httpMock.expectOne(`${apiUrl}/shifts/7/note`);
            expect(req.request.method).toBe('DELETE');

            req.flush({ data: { ...rawShift, note: null } });

            expect(result.id).toBe(7);
            expect(result.note).toBeNull();
        });
    });

    describe('note normalization', () => {
        it('should default a missing note to null rather than undefined', () => {
            let result: any;
            service.updateShiftNote(7, 'x').subscribe(r => result = r);

            const req = httpMock.expectOne(`${apiUrl}/shifts/7/note`);
            req.flush({ data: { id: 7, date: '2026-08-16T00:00:00.000Z', type: 'MORNING', status: 'OPEN', volunteer: null } });

            expect(result.note).toBeNull();
        });
    });
});
