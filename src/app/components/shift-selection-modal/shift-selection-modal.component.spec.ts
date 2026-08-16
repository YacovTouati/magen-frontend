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
});
