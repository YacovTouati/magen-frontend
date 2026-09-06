import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ShiftSelectionModalComponent } from './shift-selection-modal.component';
import { ShiftRecord } from '../../services/schedule.service';

function buildShift(overrides: Partial<ShiftRecord>): ShiftRecord {
    return {
        id: 1,
        date: '2026-08-16',
        type: 'MORNING',
        status: 'OPEN',
        volunteer: null,
        note: null,
        holiday: null,
        observance: null,
        ...overrides
    };
}

describe('ShiftSelectionModalComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ShiftSelectionModalComponent] }).compileComponents();
    });

    function create(): any {
        const fixture = TestBed.createComponent(ShiftSelectionModalComponent);
        fixture.componentInstance.isOpen = true;
        return fixture;
    }

    it('should create', () => {
        const fixture = create();
        expect(fixture.componentInstance).toBeTruthy();
    });

    describe('the "✏️" note button', () => {
        it('should show for an admin when the shift exists, whether or not it has a note yet', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = true;
            comp.morningShift = buildShift({ note: null });
            comp.eveningShift = buildShift({ id: 2, type: 'EVENING', note: 'יש הערה' });
            fixture.detectChanges();

            expect(fixture.debugElement.queryAll(By.css('.btn-note')).length).toBe(2);
        });

        it('should not show for a non-admin (volunteer) at all', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = false;
            comp.morningShift = buildShift({ note: 'יש הערה' });
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.btn-note'))).toBeFalsy();
        });

        it('should not show when the corresponding shift does not exist', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = true;
            comp.morningShift = null;
            comp.eveningShift = buildShift({ id: 2, type: 'EVENING' });
            fixture.detectChanges();

            expect(fixture.debugElement.queryAll(By.css('.btn-note')).length).toBe(1);
        });

        it('clicking it should emit editNote with the corresponding shift, for morning and evening independently', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = true;
            const morning = buildShift({ id: 1, type: 'MORNING' });
            const evening = buildShift({ id: 2, type: 'EVENING' });
            comp.morningShift = morning;
            comp.eveningShift = evening;
            fixture.detectChanges();
            spyOn(comp.editNote, 'emit');

            const buttons = fixture.debugElement.queryAll(By.css('.btn-note'));
            buttons[0].triggerEventHandler('click', null);
            expect(comp.editNote.emit).toHaveBeenCalledWith(morning);

            buttons[1].triggerEventHandler('click', null);
            expect(comp.editNote.emit).toHaveBeenCalledWith(evening);
        });
    });

    describe('onEditNote()', () => {
        it('should do nothing if the requested shift does not exist', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.morningShift = null;
            spyOn(comp.editNote, 'emit');

            comp.onEditNote('MORNING');

            expect(comp.editNote.emit).not.toHaveBeenCalled();
        });
    });

    describe('normal day/shift selection flow (unaffected by the note button)', () => {
        it('selecting a shift and confirming should still emit selectShift for a volunteer', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = false;
            comp.morningShift = buildShift({ status: 'OPEN' });
            fixture.detectChanges();
            spyOn(comp.selectShift, 'emit');

            comp.selectedType = 'MORNING';
            comp.onConfirmSelection();

            expect(comp.selectShift.emit).toHaveBeenCalledWith(comp.morningShift);
        });
    });

    // August 7, 2026 is a Friday; August 8, 2026 is a Saturday.
    describe('Shabbat shift blocking (Friday evening / Saturday morning)', () => {
        it('canSelectMorning/Evening should be false for a Shabbat shift even for an admin', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = true;
            comp.morningShift = buildShift({ date: '2026-08-08', type: 'MORNING', status: 'OPEN' });
            comp.eveningShift = buildShift({ id: 2, date: '2026-08-07', type: 'EVENING', status: 'OPEN' });

            expect(comp.isShabbatMorning).toBeTrue();
            expect(comp.isShabbatEvening).toBeTrue();
            expect(comp.canSelectMorning).toBeFalse();
            expect(comp.canSelectEvening).toBeFalse();
        });

        it('canSelectMorning/Evening should stay normal for a non-Shabbat day', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = false;
            comp.morningShift = buildShift({ date: '2026-08-16', type: 'MORNING', status: 'OPEN' });
            comp.eveningShift = buildShift({ id: 2, date: '2026-08-16', type: 'EVENING', status: 'OPEN' });

            expect(comp.isShabbatMorning).toBeFalse();
            expect(comp.isShabbatEvening).toBeFalse();
            expect(comp.canSelectMorning).toBeTrue();
            expect(comp.canSelectEvening).toBeTrue();
        });

        it('canReleaseMorning/Evening should be false for a Shabbat shift even if somehow LOCKED', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = true;
            comp.morningShift = buildShift({ date: '2026-08-08', type: 'MORNING', status: 'LOCKED' });

            expect(comp.canReleaseMorning).toBeFalse();
        });

        it('should render the "שבת מנוחה" candle option instead of the normal shift-option for a Shabbat shift', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = false;
            comp.morningShift = buildShift({ date: '2026-08-08', type: 'MORNING', status: 'OPEN' });
            comp.eveningShift = buildShift({ id: 2, date: '2026-08-08', type: 'EVENING', status: 'OPEN' });
            fixture.detectChanges();

            const shabbatOptions = fixture.debugElement.queryAll(By.css('.shabbat-option'));
            expect(shabbatOptions.length).toBe(1); // only the morning shift is Shabbat here
            expect(shabbatOptions[0].nativeElement.textContent).toContain('שבת מנוחה');
            expect(fixture.debugElement.query(By.css('input[value="MORNING"]'))).toBeFalsy();
            expect(fixture.debugElement.query(By.css('input[value="EVENING"]'))).toBeTruthy();
        });

        it('onConfirmSelection() should never emit for a Shabbat shift, even if selectedType is forced programmatically', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = false;
            comp.morningShift = buildShift({ date: '2026-08-08', type: 'MORNING', status: 'OPEN' });
            fixture.detectChanges();
            spyOn(comp.selectShift, 'emit');

            // The radio for a Shabbat shift is removed from the DOM entirely (see the template
            // test above), but onConfirmSelection() re-checks isShabbatBlockedShift() itself too
            // — a stale/forced selectedType can never slip a claim through either path.
            comp.selectedType = 'MORNING';
            comp.onConfirmSelection();

            expect(comp.selectShift.emit).not.toHaveBeenCalled();
        });
    });

    // Yom Tov is computed server-side and arrives as `shift.holiday` — a non-Shabbat
    // weekday shift with `holiday` set should be blocked exactly like a Shabbat one.
    describe('Yom Tov shift blocking (server-supplied shift.holiday)', () => {
        const roshHashana = { emoji: '🍎', label: 'ראש השנה' };

        it('isBlockedMorning/Evening should be true when holiday is set, even on an ordinary weekday date', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.morningShift = buildShift({ date: '2026-09-22', type: 'MORNING', holiday: roshHashana });
            comp.eveningShift = buildShift({ id: 2, date: '2026-09-22', type: 'EVENING', holiday: null });

            expect(comp.isShabbatMorning).toBeFalse(); // not a Friday/Saturday
            expect(comp.isBlockedMorning).toBeTrue();
            expect(comp.isBlockedEvening).toBeFalse();
        });

        it('canSelectMorning should be false, even for an admin, when the shift has a holiday', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = true;
            comp.morningShift = buildShift({ date: '2026-09-22', type: 'MORNING', status: 'OPEN', holiday: roshHashana });

            expect(comp.canSelectMorning).toBeFalse();
        });

        it('morningBlockLabel should render the specific holiday emoji + label', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.morningShift = buildShift({ date: '2026-09-22', type: 'MORNING', holiday: roshHashana });
            comp.eveningShift = buildShift({ id: 2, date: '2026-09-22', type: 'EVENING', holiday: null });
            fixture.detectChanges();

            expect(comp.morningBlockLabel).toBe('🍎 ראש השנה');
            const shabbatOptions = fixture.debugElement.queryAll(By.css('.shabbat-option'));
            expect(shabbatOptions.length).toBe(1);
            expect(shabbatOptions[0].nativeElement.textContent).toContain('ראש השנה');
        });

        it('onConfirmSelection() should never emit for a shift with a holiday set', () => {
            const fixture = create();
            const comp = fixture.componentInstance;
            comp.isAdmin = false;
            comp.morningShift = buildShift({ date: '2026-09-22', type: 'MORNING', status: 'OPEN', holiday: roshHashana });
            fixture.detectChanges();
            spyOn(comp.selectShift, 'emit');

            comp.selectedType = 'MORNING';
            comp.onConfirmSelection();

            expect(comp.selectShift.emit).not.toHaveBeenCalled();
        });
    });
});
