import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';
import { ShiftBoardComponent, ShiftBoardDay } from './shift-board.component';
import { AuthService } from '../../services/auth.service';
import { UserManagementService } from '../../services/user-management.service';
import { ScheduleService, ScheduleRecord, ShiftRecord } from '../../services/schedule.service';

// Note tests fix "today" inside the currently-selected month so isPast()/isCellClickable()
// never gate the note indicator's own click handling (which is deliberately independent of
// cell clickability — see the comment on onNoteIndicatorClick in the component).
const YEAR = 2026;
const MONTH0 = 7; // August, 0-indexed

function buildShift(overrides: Partial<ShiftRecord>): ShiftRecord {
    return {
        id: 1,
        date: `${YEAR}-08-16`,
        type: 'MORNING',
        status: 'OPEN',
        volunteer: null,
        note: null,
        ...overrides
    };
}

function buildSchedule(shifts: ShiftRecord[]): ScheduleRecord {
    return { id: 100, month: MONTH0 + 1, year: YEAR, status: 'OPEN', shifts };
}

describe('ShiftBoardComponent (shift notes)', () => {
    let scheduleServiceSpy: jasmine.SpyObj<ScheduleService>;
    let userManagementServiceSpy: jasmine.SpyObj<UserManagementService>;
    let authStub: Partial<AuthService>;

    function configure(canManage: boolean): void {
        authStub = {
            getUser: () => ({ email: 'admin@magen.org', role: canManage ? 'SUPER_ADMIN' : 'VOLUNTEER', id: 1 }),
            canManageSchedule: () => canManage
        };

        scheduleServiceSpy = jasmine.createSpyObj('ScheduleService', [
            'findForMonth', 'updateShiftNote', 'deleteShiftNote'
        ]);
        userManagementServiceSpy = jasmine.createSpyObj('UserManagementService', ['getUsers'], {
            usersChanged$: new Subject<void>()
        });
        userManagementServiceSpy.getUsers.and.returnValue(of([]));

        TestBed.configureTestingModule({
            imports: [ShiftBoardComponent],
            providers: [
                { provide: AuthService, useValue: authStub },
                { provide: ScheduleService, useValue: scheduleServiceSpy },
                { provide: UserManagementService, useValue: userManagementServiceSpy }
            ]
        });
    }

    function createWithSchedule(shifts: ShiftRecord[]): any {
        scheduleServiceSpy.findForMonth.and.returnValue(of(buildSchedule(shifts)));
        const fixture = TestBed.createComponent(ShiftBoardComponent);
        fixture.componentInstance.year = YEAR;
        fixture.componentInstance.month = MONTH0;
        fixture.detectChanges();
        return fixture;
    }

    describe('bottom-of-cell note indicator', () => {
        it('should show it when a day\'s shift has a note, for any user', () => {
            configure(false);
            const shift = buildShift({ note: 'מירי עבדה עד 18:00' });
            const fixture = createWithSchedule([shift]);

            const indicator = fixture.debugElement.query(By.css('.day-note-indicator'));
            expect(indicator).toBeTruthy();
        });

        it('should leave the cell empty (no indicator, no other buttons) when neither shift has a note', () => {
            configure(true);
            const shift = buildShift({ note: null });
            const fixture = createWithSchedule([shift]);

            expect(fixture.debugElement.query(By.css('.day-note-indicator'))).toBeFalsy();
        });

        it('should no longer show any icon/button inside the shift badges themselves', () => {
            configure(true);
            const shift = buildShift({ note: 'יש הערה' });
            const fixture = createWithSchedule([shift]);

            expect(fixture.debugElement.query(By.css('.shift-chip button'))).toBeFalsy();
        });
    });

    describe('existingNoteShift()', () => {
        it('should prefer the morning shift when both have a note', () => {
            configure(true);
            const fixture = createWithSchedule([]);
            const comp = fixture.componentInstance;
            const day = { dayNumber: 1, dateString: '1/8/2026', isToday: false, morning: buildShift({ id: 1, note: 'בוקר' }), evening: buildShift({ id: 2, note: 'ערב' }) };

            expect(comp.existingNoteShift(day)?.id).toBe(1);
        });

        it('should fall back to the evening shift when only it has a note', () => {
            configure(true);
            const fixture = createWithSchedule([]);
            const comp = fixture.componentInstance;
            const day = { dayNumber: 1, dateString: '1/8/2026', isToday: false, morning: buildShift({ id: 1, note: null }), evening: buildShift({ id: 2, note: 'ערב' }) };

            expect(comp.existingNoteShift(day)?.id).toBe(2);
        });

        it('should return null when neither shift has a note', () => {
            configure(true);
            const fixture = createWithSchedule([]);
            const comp = fixture.componentInstance;
            const day = { dayNumber: 1, dateString: '1/8/2026', isToday: false, morning: buildShift({ id: 1, note: null }), evening: buildShift({ id: 2, note: null }) };

            expect(comp.existingNoteShift(day)).toBeNull();
        });
    });

    describe('opening the note popup', () => {
        it('clicking the bottom-of-cell indicator should open the modal for the noted shift, bypassing day selection', () => {
            configure(true);
            const shift = buildShift({ note: 'הערה קיימת' });
            const fixture = createWithSchedule([shift]);
            const comp = fixture.componentInstance;
            spyOn(comp, 'onDayClick');

            const stopPropagationSpy = jasmine.createSpy('stopPropagation');
            fixture.debugElement.query(By.css('.day-note-indicator'))
                .triggerEventHandler('click', { stopPropagation: stopPropagationSpy });

            expect(stopPropagationSpy).toHaveBeenCalled();
            expect(comp.isNoteModalOpen).toBeTrue();
            expect(comp.pendingNoteShift?.id).toBe(shift.id);
            expect(comp.onDayClick).not.toHaveBeenCalled();
        });

        it('onEditNoteFromModal() should close the assignment modal and open the note modal for the given shift', () => {
            configure(true);
            const shift = buildShift({ id: 9, note: null });
            const fixture = createWithSchedule([shift]);
            const comp = fixture.componentInstance;
            comp.isShiftModalOpen = true;

            comp.onEditNoteFromModal(shift);

            expect(comp.isShiftModalOpen).toBeFalse();
            expect(comp.isNoteModalOpen).toBeTrue();
            expect(comp.pendingNoteShift?.id).toBe(9);
        });
    });

    describe('day/shift click still opens the standard assignment modal (unchanged)', () => {
        it('clicking a shift badge should open the shift-selection modal, even when that shift has a note (real DOM click, since badges no longer stop propagation)', () => {
            configure(true);
            const shift = buildShift({ note: 'יש הערה' });
            const fixture = createWithSchedule([shift]);
            const comp = fixture.componentInstance;

            // Scoped to a clickable (non-past) day cell — every badge renders unconditionally
            // regardless of whether that day actually has a shift, so an unscoped query could
            // otherwise land on an earlier, already-past day whose cell click is a no-op.
            fixture.debugElement.query(By.css('.day-cell.clickable .shift-chip.morning')).nativeElement.click();
            fixture.detectChanges();

            expect(comp.isShiftModalOpen).toBeTrue();
            expect(comp.isNoteModalOpen).toBeFalse();
        });

        it('clicking anywhere else on a clickable day cell should open the shift-selection modal, not the note modal', () => {
            configure(true);
            const shift = buildShift({ note: 'יש הערה' });
            const fixture = createWithSchedule([shift]);
            const comp = fixture.componentInstance;

            fixture.debugElement.query(By.css('.day-cell.clickable')).triggerEventHandler('click', null);

            expect(comp.isShiftModalOpen).toBeTrue();
            expect(comp.isNoteModalOpen).toBeFalse();
        });
    });

    describe('saving a note', () => {
        it('should PATCH via the service, update the shift locally, and close the modal on success', () => {
            configure(true);
            const shift = buildShift({ id: 42, note: null });
            const fixture = createWithSchedule([shift]);
            const comp = fixture.componentInstance;
            const updated = { ...shift, note: 'עבד עד מאוחר' };
            scheduleServiceSpy.updateShiftNote.and.returnValue(of(updated));

            comp.onNoteIndicatorClick({ stopPropagation: () => { } } as any, shift);
            comp.onNoteSaved('עבד עד מאוחר');

            expect(scheduleServiceSpy.updateShiftNote).toHaveBeenCalledWith(42, 'עבד עד מאוחר');
            expect(comp.isNoteModalOpen).toBeFalse();
            expect(comp.pendingNoteShift).toBeNull();
            expect(comp.schedule?.shifts.find((s: ShiftRecord) => s.id === 42)?.note).toBe('עבד עד מאוחר');
        });

        it('should surface an error and keep the modal open on failure', () => {
            configure(true);
            const shift = buildShift({ id: 42, note: null });
            const fixture = createWithSchedule([shift]);
            const comp = fixture.componentInstance;
            scheduleServiceSpy.updateShiftNote.and.returnValue(throwError(() => new Error('network')));

            comp.onNoteIndicatorClick({ stopPropagation: () => { } } as any, shift);
            comp.onNoteSaved('x');

            expect(comp.isNoteModalOpen).toBeTrue();
            expect(comp.isSavingNote).toBeFalse();
            expect(comp.noteSaveError).toBeTruthy();
        });
    });

    describe('deleting a note', () => {
        it('should DELETE via the service, clear the note locally, and close the modal on success', () => {
            configure(true);
            const shift = buildShift({ id: 42, note: 'קיים' });
            const fixture = createWithSchedule([shift]);
            const comp = fixture.componentInstance;
            const updated = { ...shift, note: null };
            scheduleServiceSpy.deleteShiftNote.and.returnValue(of(updated));

            comp.onNoteIndicatorClick({ stopPropagation: () => { } } as any, shift);
            comp.onNoteDeleted();

            expect(scheduleServiceSpy.deleteShiftNote).toHaveBeenCalledWith(42);
            expect(comp.isNoteModalOpen).toBeFalse();
            expect(comp.schedule?.shifts.find((s: ShiftRecord) => s.id === 42)?.note).toBeNull();
        });

        it('should surface an error and keep the modal open on failure', () => {
            configure(true);
            const shift = buildShift({ id: 42, note: 'קיים' });
            const fixture = createWithSchedule([shift]);
            const comp = fixture.componentInstance;
            scheduleServiceSpy.deleteShiftNote.and.returnValue(throwError(() => new Error('network')));

            comp.onNoteIndicatorClick({ stopPropagation: () => { } } as any, shift);
            comp.onNoteDeleted();

            expect(comp.isNoteModalOpen).toBeTrue();
            expect(comp.noteSaveError).toBeTruthy();
        });
    });

    it('closeNoteModal() should clear all pending note state', () => {
        configure(true);
        const shift = buildShift({ note: 'x' });
        const fixture = createWithSchedule([shift]);
        const comp = fixture.componentInstance;
        comp.onNoteIndicatorClick({ stopPropagation: () => { } } as any, shift);

        comp.closeNoteModal();

        expect(comp.isNoteModalOpen).toBeFalse();
        expect(comp.pendingNoteShift).toBeNull();
        expect(comp.noteSaveError).toBe('');
    });

    describe('isCellClickable / isPast (past-date shift editing)', () => {
        // Computed against the real clock (no jasmine.clock() mocking elsewhere in this
        // file/app) rather than a hardcoded date, so this stays correct no matter when the
        // suite actually runs. isPast()/isCellClickable() only look at day.dateString vs.
        // "now" — they don't read the component's selected year/month — so the fixed
        // YEAR/MONTH0 schedule fixture above is irrelevant here.
        function formatDate(date: Date): string {
            return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        function buildPastDay(morningStatus: 'OPEN' | 'LOCKED'): ShiftBoardDay {
            return {
                dayNumber: yesterday.getDate(),
                dateString: formatDate(yesterday),
                isToday: false,
                morning: buildShift({ id: 99, date: yesterday.toISOString().slice(0, 10), status: morningStatus }),
                evening: null
            };
        }

        it('isPast() should be true for a day before today', () => {
            configure(false);
            const fixture = createWithSchedule([]);

            expect(fixture.componentInstance.isPast(buildPastDay('OPEN'))).toBeTrue();
        });

        it('should block a volunteer from opening a past day even with an open slot', () => {
            configure(false);
            const fixture = createWithSchedule([]);

            expect(fixture.componentInstance.isCellClickable(buildPastDay('OPEN'))).toBeFalse();
        });

        it('should let an admin open a past day with an open slot', () => {
            configure(true);
            const fixture = createWithSchedule([]);

            expect(fixture.componentInstance.isCellClickable(buildPastDay('OPEN'))).toBeTrue();
        });

        it('should let an admin open a past day even when every slot is already LOCKED', () => {
            configure(true);
            const fixture = createWithSchedule([]);

            expect(fixture.componentInstance.isCellClickable(buildPastDay('LOCKED'))).toBeTrue();
        });

        it('should still block an admin while a save is in flight, past day or not', () => {
            configure(true);
            const fixture = createWithSchedule([]);
            fixture.componentInstance.isSaving = true;

            expect(fixture.componentInstance.isCellClickable(buildPastDay('OPEN'))).toBeFalse();
        });
    });
});
