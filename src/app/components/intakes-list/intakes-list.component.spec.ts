import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of, throwError } from 'rxjs';
import { IntakesListComponent } from './intakes-list.component';
import { IntakeService, IntakeAlert } from '../../services/intake.service';

function buildIntakes(): IntakeAlert[] {
    return [
        {
            id: 1,
            callerName: 'מירי אברהם',
            phone: '0501234567',
            urgency: 'CRITICAL',
            createdAt: new Date('2026-08-01T10:00:00.000Z'),
            contactedOtherCenter: 'לא',
            caseDescription: 'תיאור מקרה ראשון',
            status: 'NEW',
            expiresAt: new Date('2026-08-15T10:00:00.000Z'),
            callReport: {
                id: 10, email: 'miri@example.com', region: 'תל אביב', reportingDuty: 'yes_practical',
                magenContactHistory: 'first_time', callerType: 'victim', summaryNotes: 'סיכום שיחה ראשון'
            }
        },
        {
            id: 2,
            callerName: 'יוסי כהן',
            phone: '0529876543',
            urgency: 'LOW',
            createdAt: new Date('2026-08-02T10:00:00.000Z'),
            contactedOtherCenter: 'כן',
            caseDescription: 'תיאור מקרה שני',
            status: 'ACTIVE',
            expiresAt: new Date('2026-08-16T10:00:00.000Z'),
            callReport: null
        }
    ];
}

describe('IntakesListComponent', () => {
    let intakeServiceSpy: jasmine.SpyObj<IntakeService>;

    beforeEach(async () => {
        intakeServiceSpy = jasmine.createSpyObj('IntakeService', ['getIntakes', 'deleteIntake', 'updateStatus']);
        intakeServiceSpy.getIntakes.and.returnValue(of(buildIntakes()));

        await TestBed.configureTestingModule({
            imports: [IntakesListComponent],
            providers: [{ provide: IntakeService, useValue: intakeServiceSpy }]
        }).compileComponents();
    });

    function createComponent() {
        const fixture = TestBed.createComponent(IntakesListComponent);
        fixture.detectChanges();
        return fixture;
    }

    it('should create and load intakes on init', () => {
        const fixture = createComponent();
        const comp = fixture.componentInstance;

        expect(comp).toBeTruthy();
        expect(intakeServiceSpy.getIntakes).toHaveBeenCalledTimes(1);
        expect(comp.intakes.length).toBe(2);
        expect(comp.isLoading).toBeFalse();
    });

    it('should show an error message when loading fails', () => {
        intakeServiceSpy.getIntakes.and.returnValue(throwError(() => new Error('network down')));

        const fixture = createComponent();
        const comp = fixture.componentInstance;

        expect(comp.loadError).toBe('לא ניתן לטעון את רשימת האינטייקים כרגע.');
        expect(comp.isLoading).toBeFalse();
    });

    it('should render one table row per intake, in the exact required column order', () => {
        const fixture = createComponent();

        const rows = fixture.debugElement.queryAll(By.css('tbody tr.intake-row'));
        expect(rows.length).toBe(2);

        const firstRowCells = rows[0].queryAll(By.css('td')).map(td => td.nativeElement.textContent.trim());
        expect(firstRowCells[0]).toBe('מירי אברהם');
        expect(firstRowCells[1]).toBe('0501234567');
        expect(firstRowCells[2]).toBe('miri@example.com');
        expect(firstRowCells[3]).toBe('תל אביב');
        expect(firstRowCells[4]).toBe('לא'); // contactedOtherCenter, shown as-is
        expect(firstRowCells[5]).toBe('כן מעשי'); // reportingDuty: 'yes_practical'
        expect(firstRowCells[6]).toBe('פעם ראשונה'); // magenContactHistory label
        expect(firstRowCells[7]).toBe('נפגע/ת ישיר/ה'); // callerType label
        expect(firstRowCells[9]).toContain('צפייה בפרטים'); // actions cell
        expect(rows.length && rows[0].queryAll(By.css('td')).length).toBe(10); // status column added
    });

    it('should not render a content/summary column at all', () => {
        const fixture = createComponent();

        const headers = fixture.debugElement.queryAll(By.css('th')).map(th => th.nativeElement.textContent.trim());
        expect(headers).not.toContain('תוכן / סיכום השיחה');
        expect(headers.length).toBe(10);
    });

    it('should show dashes/placeholders for a row with no linked callReport', () => {
        const fixture = createComponent();

        const rows = fixture.debugElement.queryAll(By.css('tbody tr.intake-row'));
        const secondRowCells = rows[1].queryAll(By.css('td')).map(td => td.nativeElement.textContent.trim());
        expect(secondRowCells[2]).toBe('-'); // email
        expect(secondRowCells[3]).toBe('-'); // region
        expect(secondRowCells[4]).toBe('כן'); // contactedOtherCenter still shown (Intake-level field)
        expect(secondRowCells[5]).toBe('-'); // reportingDuty: null -> dash, not "לא"
        expect(secondRowCells[6]).toBe('-'); // magenContactHistory
        expect(secondRowCells[7]).toBe('-'); // callerType
    });

    it('should not silently coerce contactedOtherCenter with a truthy check (regression guard)', () => {
        const fixture = createComponent();
        const comp = fixture.componentInstance;

        // A non-empty "לא" string is truthy in JS — a naive `contactedOtherCenter ? 'כן' : 'לא'`
        // would incorrectly show "כן" here. It must be displayed exactly as the backend sent it.
        expect(comp.contactedOtherCenterLabel(comp.intakes[0])).toBe('לא');
        expect(comp.contactedOtherCenterLabel(comp.intakes[1])).toBe('כן');
    });

    it('should show the empty state when there are no intakes', () => {
        intakeServiceSpy.getIntakes.and.returnValue(of([]));
        const fixture = createComponent();

        expect(fixture.debugElement.query(By.css('.empty-state'))).toBeTruthy();
        expect(fixture.debugElement.queryAll(By.css('tbody tr.intake-row')).length).toBe(0);
    });

    describe('detail modal', () => {
        it('should open with the clicked row\'s intake when a row is clicked', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            const rows = fixture.debugElement.queryAll(By.css('tbody tr.intake-row'));
            rows[1].triggerEventHandler('click', null);

            expect(comp.isDetailOpen).toBeTrue();
            expect(comp.selectedIntake?.id).toBe(2);
        });

        it('should open with the correct intake when the "צפייה בפרטים" button is clicked, without double-triggering', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            spyOn(comp, 'openDetail').and.callThrough();

            const button = fixture.debugElement.queryAll(By.css('.view-details-btn'))[0];
            button.triggerEventHandler('click', { stopPropagation: () => { } });

            expect(comp.openDetail).toHaveBeenCalledTimes(1);
            expect(comp.selectedIntake?.id).toBe(1);
        });

        it('closeDetail() should close the modal', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.openDetail(comp.intakes[0]);

            comp.closeDetail();

            expect(comp.isDetailOpen).toBeFalse();
        });
    });

    describe('row delete (trash icon)', () => {
        it('should render a delete button on every row', () => {
            const fixture = createComponent();

            expect(fixture.debugElement.queryAll(By.css('.delete-row-btn')).length).toBe(2);
        });

        it('clicking it should open the confirm modal with the caller\'s name, without calling the API yet', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            const btn = fixture.debugElement.queryAll(By.css('.delete-row-btn'))[0];
            btn.triggerEventHandler('click', { stopPropagation: () => { } });

            expect(comp.isRowDeleteConfirmOpen).toBeTrue();
            expect(comp.rowDeleteConfirmMessage).toContain('מירי אברהם');
            expect(intakeServiceSpy.deleteIntake).not.toHaveBeenCalled();
        });

        it('should not open a second confirmation while one is already pending', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            const fakeEvent = { stopPropagation: () => { } } as any;

            comp.requestRowDelete(fakeEvent, comp.intakes[0]);
            comp.requestRowDelete(fakeEvent, comp.intakes[1]);

            expect(comp.pendingDeletion?.intake.id).toBe(1);
        });

        it('confirming should DELETE via the service and reload the full list (not a local splice)', () => {
            intakeServiceSpy.deleteIntake.and.returnValue(of(undefined));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.requestRowDelete({ stopPropagation: () => { } } as any, comp.intakes[0]);
            intakeServiceSpy.getIntakes.calls.reset();

            comp.onConfirmRowDelete();

            expect(intakeServiceSpy.deleteIntake).toHaveBeenCalledWith(1);
            expect(comp.isRowDeleteConfirmOpen).toBeFalse();
            expect(intakeServiceSpy.getIntakes).toHaveBeenCalledTimes(1);
        });

        it('should show an error banner and keep the list untouched when the delete fails', () => {
            intakeServiceSpy.deleteIntake.and.returnValue(throwError(() => ({ status: 403, error: { message: 'אין הרשאה למחוק' } })));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.requestRowDelete({ stopPropagation: () => { } } as any, comp.intakes[0]);
            intakeServiceSpy.getIntakes.calls.reset();

            comp.onConfirmRowDelete();

            expect(comp.actionError).toBe('אין הרשאה למחוק');
            expect(intakeServiceSpy.getIntakes).not.toHaveBeenCalled();
        });

        it('cancelling should close the confirm modal without calling the API', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.requestRowDelete({ stopPropagation: () => { } } as any, comp.intakes[0]);

            comp.onCancelRowDelete();

            expect(comp.isRowDeleteConfirmOpen).toBeFalse();
            expect(intakeServiceSpy.deleteIntake).not.toHaveBeenCalled();
        });

        it('dismissActionError() should clear the error banner', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.actionError = 'משהו נכשל';

            comp.dismissActionError();

            expect(comp.actionError).toBe('');
        });
    });

    describe('status column', () => {
        it('should render a status <select> with every status option, on every row', () => {
            const fixture = createComponent();

            const selects = fixture.debugElement.queryAll(By.css('.status-select'));
            expect(selects.length).toBe(2);

            const options = Array.from(selects[0].nativeElement.options) as HTMLOptionElement[];
            expect(options.map(o => o.value)).toEqual(['NEW', 'NO_ANSWER', 'ACTIVE', 'CLOSED', 'LONG_TERM']);
            expect(options.some(o => o.value === 'ACTIVE' && o.textContent?.trim() === 'בטיפול פעיל')).toBeTrue();
        });

        it('picking a non-terminal status should PATCH via the service and update the row in place', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            const updated = { ...comp.intakes[0], status: 'ACTIVE' as const };
            intakeServiceSpy.updateStatus.and.returnValue(of(updated));

            comp.onStatusChange(comp.intakes[0], 'ACTIVE');

            expect(intakeServiceSpy.updateStatus).toHaveBeenCalledWith(1, 'ACTIVE');
            expect(comp.intakes[0].status).toBe('ACTIVE');
            expect(comp.pendingActionId).toBeNull();
        });

        it('picking CLOSED should open the delete confirmation instead of calling updateStatus', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            comp.onStatusChange(comp.intakes[0], 'CLOSED');

            expect(intakeServiceSpy.updateStatus).not.toHaveBeenCalled();
            expect(comp.isRowDeleteConfirmOpen).toBeTrue();
            expect(comp.pendingDeletion?.trigger).toBe('status');
        });

        it('confirming a CLOSED/LONG_TERM status pick should hard-delete via the service and reload', () => {
            intakeServiceSpy.deleteIntake.and.returnValue(of(undefined));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.onStatusChange(comp.intakes[0], 'LONG_TERM');
            intakeServiceSpy.getIntakes.calls.reset();

            comp.onConfirmRowDelete();

            expect(intakeServiceSpy.deleteIntake).toHaveBeenCalledWith(1);
            expect(comp.isRowDeleteConfirmOpen).toBeFalse();
            expect(intakeServiceSpy.getIntakes).toHaveBeenCalledTimes(1);
        });

        it('cancelling a status-triggered deletion should leave the intake status untouched', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.onStatusChange(comp.intakes[0], 'CLOSED');

            comp.onCancelRowDelete();

            expect(comp.isRowDeleteConfirmOpen).toBeFalse();
            expect(comp.intakes[0].status).toBe('NEW');
            expect(intakeServiceSpy.deleteIntake).not.toHaveBeenCalled();
        });

        it('clicking the status cell should not also open the detail modal', () => {
            const fixture = createComponent();
            const comp = fixture.componentInstance;

            const cell = fixture.debugElement.queryAll(By.css('td.status-cell'))[0];
            cell.triggerEventHandler('click', { stopPropagation: () => { } });

            expect(comp.isDetailOpen).toBeFalse();
        });
    });

    describe('delete from the detail modal', () => {
        it('should DELETE via the service, close the detail modal, and reload the list on success', () => {
            intakeServiceSpy.deleteIntake.and.returnValue(of(undefined));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.openDetail(comp.intakes[0]);
            intakeServiceSpy.getIntakes.calls.reset();

            comp.onModalDeleteConfirmed(comp.intakes[0]);

            expect(intakeServiceSpy.deleteIntake).toHaveBeenCalledWith(1);
            expect(comp.isDetailOpen).toBeFalse();
            expect(comp.isDeletingFromModal).toBeFalse();
            expect(intakeServiceSpy.getIntakes).toHaveBeenCalledTimes(1);
        });

        it('should keep the modal open and surface an error via modalDeleteError on failure', () => {
            intakeServiceSpy.deleteIntake.and.returnValue(throwError(() => ({ status: 403, error: { message: 'אין הרשאה למחוק' } })));
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.openDetail(comp.intakes[0]);

            comp.onModalDeleteConfirmed(comp.intakes[0]);

            expect(comp.isDetailOpen).toBeTrue();
            expect(comp.isDeletingFromModal).toBeFalse();
            expect(comp.modalDeleteError).toBe('אין הרשאה למחוק');
        });

        it('should set isDeletingFromModal synchronously before the response resolves', () => {
            intakeServiceSpy.deleteIntake.and.returnValue(new Observable(() => { })); // never resolves
            const fixture = createComponent();
            const comp = fixture.componentInstance;
            comp.openDetail(comp.intakes[0]);

            comp.onModalDeleteConfirmed(comp.intakes[0]);

            expect(comp.isDeletingFromModal).toBeTrue();
        });
    });
});
