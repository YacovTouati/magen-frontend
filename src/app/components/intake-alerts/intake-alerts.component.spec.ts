import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, Observable } from 'rxjs';
import { IntakeAlertsComponent } from './intake-alerts.component';
import { IntakeService, IntakeAlert, IntakeCallReport } from '../../services/intake.service';

function minutesAgo(minutes: number): Date {
    return new Date(Date.now() - minutes * 60 * 1000);
}

function hoursFromNow(hours: number): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
}

const MIRI_CALL_REPORT: IntakeCallReport = { id: 55, email: 'miri.a@example.com', reportingDuty: true };

function buildMockIntakes(): IntakeAlert[] {
    return [
        {
            id: 1,
            callerName: 'מירי אברהם',
            phone: '050-1234567',
            urgency: 'CRITICAL',
            createdAt: minutesAgo(12),
            contactedOtherCenter: 'לא',
            caseDescription: 'פנייה דחופה בנוגע לחשש ממצוקה מיידית.',
            status: 'NEW',
            expiresAt: hoursFromNow(24 * 13), // ~13 days left, not urgent
            callReport: MIRI_CALL_REPORT
        },
        {
            id: 2,
            callerName: 'דוד לוי',
            phone: '052-9876543',
            urgency: 'HIGH',
            createdAt: minutesAgo(35),
            contactedOtherCenter: 'כן - ער"ן',
            caseDescription: 'שיחת המשך לבירור מצב לאחר פנייה קודמת.',
            status: 'NEW',
            expiresAt: hoursFromNow(24 * 13),
            callReport: null
        },
        {
            id: 3,
            callerName: 'נועה שמעוני',
            phone: '054-5551234',
            urgency: 'MEDIUM',
            createdAt: minutesAgo(58),
            contactedOtherCenter: 'לא',
            caseDescription: 'בקשה למידע כללי על שירותי התמיכה.',
            status: 'NO_ANSWER',
            expiresAt: hoursFromNow(10), // within the 24h urgent window
            callReport: null
        },
        {
            id: 4,
            callerName: 'יוסי כהן',
            phone: '053-4443322',
            urgency: 'LOW',
            createdAt: minutesAgo(120),
            contactedOtherCenter: 'כן - עמותת "אחווה"',
            caseDescription: 'פנייה כללית, נסגרה בשיחה קצרה.',
            status: 'ACTIVE',
            expiresAt: hoursFromNow(24 * 5),
            callReport: null
        }
    ];
}

describe('IntakeAlertsComponent', () => {
    let intakeServiceSpy: jasmine.SpyObj<IntakeService>;

    function setup(intakes: IntakeAlert[] = buildMockIntakes()) {
        intakeServiceSpy = jasmine.createSpyObj('IntakeService', [
            'getIntakes', 'updateStatus', 'extendExpiration', 'deleteIntake'
        ]);
        intakeServiceSpy.getIntakes.and.returnValue(of(intakes));

        TestBed.configureTestingModule({
            imports: [IntakeAlertsComponent],
            providers: [
                { provide: IntakeService, useValue: intakeServiceSpy }
            ]
        });

        const fixture = TestBed.createComponent(IntakeAlertsComponent);
        fixture.detectChanges();
        return fixture;
    }

    it('should create and fetch intakes from IntakeService on init', () => {
        const fixture = setup();
        expect(fixture.componentInstance).toBeTruthy();
        expect(intakeServiceSpy.getIntakes).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.intakes.length).toBe(4);
        expect(fixture.componentInstance.isLoadingIntakes).toBeFalse();
    });

    it('should show a loading state, then an error message, if fetching intakes fails', () => {
        intakeServiceSpy = jasmine.createSpyObj('IntakeService', ['getIntakes', 'updateStatus', 'extendExpiration', 'deleteIntake']);
        intakeServiceSpy.getIntakes.and.returnValue(throwError(() => new Error('network down')));

        TestBed.configureTestingModule({
            imports: [IntakeAlertsComponent],
            providers: [{ provide: IntakeService, useValue: intakeServiceSpy }]
        });
        const fixture = TestBed.createComponent(IntakeAlertsComponent);
        fixture.detectChanges();

        expect(fixture.componentInstance.isLoadingIntakes).toBeFalse();
        expect(fixture.componentInstance.loadError).toBeTruthy();
        expect(fixture.debugElement.query(By.css('.intake-status-message.error'))).toBeTruthy();
    });

    it('pendingCount should reflect only intakes with status "NEW"', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        const expected = comp.intakes.filter(i => i.status === 'NEW').length;

        expect(comp.pendingCount).toBe(expected);
        expect(comp.pendingCount).toBeGreaterThan(0);
    });

    it('should show the pending count in the alert strip message', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        const strip = fixture.debugElement.query(By.css('.alert-strip'));

        expect(strip.nativeElement.textContent).toContain(String(comp.pendingCount));
        expect(strip.nativeElement.textContent).toContain('דיווחי אינטייק חדשים');
    });

    it('the panel should start collapsed and expand/collapse when the strip is clicked', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        expect(comp.isExpanded).toBeFalse();

        fixture.debugElement.query(By.css('.alert-strip')).triggerEventHandler('click', null);
        fixture.detectChanges();

        expect(comp.isExpanded).toBeTrue();
        expect(fixture.debugElement.query(By.css('.intake-panel')).nativeElement.classList).toContain('expanded');
    });

    it('should render one table row per fetched intake', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        const rows = fixture.debugElement.queryAll(By.css('tbody tr'));

        expect(rows.length).toBe(comp.intakes.length);
        const firstRowText = rows[0].nativeElement.textContent;
        expect(firstRowText).toContain(comp.intakes[0].callerName);
        expect(firstRowText).toContain(comp.intakes[0].phone);
    });

    it('should bind email and reporting-duty from the nested callReport when present', () => {
        const fixture = setup();
        const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
        const firstRowText = rows[0].nativeElement.textContent;

        expect(firstRowText).toContain(MIRI_CALL_REPORT.email);
        expect(firstRowText).toContain('כן'); // reportingDuty: true
    });

    it('should show "—" placeholders when an intake has no linked callReport', () => {
        const fixture = setup();
        const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
        const secondRowText = rows[1].nativeElement.textContent; // דוד לוי — callReport: null

        expect(secondRowText).toContain('—');
    });

    it('urgencyLabel() should map every urgency level to a Hebrew label', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;

        expect(comp.urgencyLabel('CRITICAL')).toBe('קריטית');
        expect(comp.urgencyLabel('HIGH')).toBe('גבוהה');
        expect(comp.urgencyLabel('MEDIUM')).toBe('בינונית');
        expect(comp.urgencyLabel('LOW')).toBe('נמוכה');
    });

    it('statusLabel() should map every backend status enum value to its Hebrew label', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;

        expect(comp.statusLabel('NEW')).toBe('חדש');
        expect(comp.statusLabel('NO_ANSWER')).toBe('לא ענה - לנסות שוב');
        expect(comp.statusLabel('ACTIVE')).toBe('בטיפול פעיל');
        expect(comp.statusLabel('CLOSED')).toBe('נסגר בשיחה קצרה');
        expect(comp.statusLabel('LONG_TERM')).toBe('המשך לטיפול ארוך');
    });

    it('the status dropdown should display Hebrew labels while its underlying value stays the raw enum', () => {
        const fixture = setup();
        const select = fixture.debugElement.query(By.css('.status-select')).nativeElement as HTMLSelectElement;
        const options = Array.from(select.options);

        expect(options.some(o => o.value === 'ACTIVE' && o.textContent?.trim() === 'בטיפול פעיל')).toBeTrue();
    });

    it('the status dropdown should be enabled for every row now that ownership no longer gates it', () => {
        const fixture = setup();
        const fieldsets = fixture.debugElement.queryAll(By.css('.status-fieldset'));

        fieldsets.forEach(fs => expect((fs.nativeElement as HTMLFieldSetElement).disabled).toBeFalse());
    });

    describe('row highlighting', () => {
        it('isNewStatus() should be true only for status === NEW, regardless of urgency', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.isNewStatus(comp.intakes[0])).toBeTrue();
            expect(comp.isNewStatus(comp.intakes[1])).toBeTrue();
            expect(comp.isNewStatus(comp.intakes[2])).toBeFalse();
            expect(comp.isNewStatus(comp.intakes[3])).toBeFalse();
        });

        it('should apply new-status-row to every row whose status is NEW, and to no others', () => {
            const fixture = setup();
            const rows = fixture.debugElement.queryAll(By.css('tbody tr'));

            expect(rows[0].nativeElement.classList).toContain('new-status-row');
            expect(rows[1].nativeElement.classList).toContain('new-status-row');
            expect(rows[2].nativeElement.classList).not.toContain('new-status-row');
            expect(rows[3].nativeElement.classList).not.toContain('new-status-row');
        });
    });

    describe('assignee/ownership UI has been fully removed', () => {
        it('should not render a "בטיפול של" column header', () => {
            const fixture = setup();
            const headerText = fixture.debugElement.query(By.css('thead')).nativeElement.textContent;

            expect(headerText).not.toContain('בטיפול של');
        });

        it('should not render any claim/mine/takeover buttons', () => {
            const fixture = setup();

            expect(fixture.debugElement.query(By.css('.assign-btn'))).toBeFalsy();
            expect(fixture.debugElement.query(By.css('.locked-hint'))).toBeFalsy();
        });
    });

    describe('expiration urgency (< 24h remaining)', () => {
        it('isExpiringSoon() should be true when less than 24 hours remain, false otherwise', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            expect(comp.isExpiringSoon(comp.intakes[2])).toBeTrue(); // 10h left
            expect(comp.isExpiringSoon(comp.intakes[0])).toBeFalse(); // ~13 days left
        });

        it('isExpiringSoon() should also be true for an intake already past its deadline', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            const overdue: IntakeAlert = { ...comp.intakes[0], expiresAt: minutesAgo(5) };

            expect(comp.isExpiringSoon(overdue)).toBeTrue();
        });

        it('should apply expiring-soon-row only to rows within the 24h window', () => {
            const fixture = setup();
            const rows = fixture.debugElement.queryAll(By.css('tbody tr'));

            expect(rows[2].nativeElement.classList).toContain('expiring-soon-row'); // id 3, 10h left
            expect(rows[0].nativeElement.classList).not.toContain('expiring-soon-row');
            expect(rows[1].nativeElement.classList).not.toContain('expiring-soon-row');
            expect(rows[3].nativeElement.classList).not.toContain('expiring-soon-row');
        });

        it('should only render the extend button on rows within the 24h window', () => {
            const fixture = setup();
            const rows = fixture.debugElement.queryAll(By.css('tbody tr'));

            expect(rows[2].query(By.css('.extend-btn'))).toBeTruthy();
            expect(rows[0].query(By.css('.extend-btn'))).toBeFalsy();
        });

        it('extendIntake() should PATCH via the service and apply the new expiresAt, clearing the urgent state', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            const intake = comp.intakes[2];
            const extended = { ...intake, expiresAt: hoursFromNow(24 * 7) };
            intakeServiceSpy.extendExpiration.and.returnValue(of(extended));

            comp.extendIntake(intake);

            expect(intakeServiceSpy.extendExpiration).toHaveBeenCalledWith(3);
            expect(comp.isExpiringSoon(intake)).toBeFalse();
            expect(comp.pendingActionId).toBeNull();
        });

        it('extendIntake() should surface a backend error and leave the intake unchanged', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            const intake = comp.intakes[2];
            intakeServiceSpy.extendExpiration.and.returnValue(
                throwError(() => ({ status: 403, error: { message: 'אין הרשאה להאריך תוקף' } }))
            );

            comp.extendIntake(intake);

            expect(comp.actionError).toBe('אין הרשאה להאריך תוקף');
            expect(comp.isExpiringSoon(intake)).toBeTrue();
            expect(comp.pendingActionId).toBeNull();
        });

        it('clicking the extend button in the DOM should call the service', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            intakeServiceSpy.extendExpiration.and.returnValue(of({ ...comp.intakes[2], expiresAt: hoursFromNow(24 * 7) }));

            fixture.debugElement.queryAll(By.css('tbody tr'))[2].query(By.css('.extend-btn')).triggerEventHandler('click', null);

            expect(intakeServiceSpy.extendExpiration).toHaveBeenCalledWith(3);
        });
    });

    describe('status change → deletion confirmation (CLOSED / LONG_TERM)', () => {
        it('onStatusChange() with a non-terminal status should PATCH directly, with no confirmation', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intakeServiceSpy.updateStatus.and.returnValue(of({ ...intake, status: 'ACTIVE' }));

            comp.onStatusChange(intake, 'ACTIVE');

            expect(intakeServiceSpy.updateStatus).toHaveBeenCalledWith(1, 'ACTIVE');
            expect(intake.status).toBe('ACTIVE');
            expect(comp.isDeleteConfirmOpen).toBeFalse();
        });

        it('onStatusChange() with CLOSED should open the delete-confirmation modal and NOT call updateStatus', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];

            comp.onStatusChange(intake, 'CLOSED');

            expect(comp.isDeleteConfirmOpen).toBeTrue();
            expect(intakeServiceSpy.updateStatus).not.toHaveBeenCalled();
            expect(intake.status).toBe('NEW'); // unchanged
        });

        it('onStatusChange() with LONG_TERM should also open the delete-confirmation modal', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];

            comp.onStatusChange(intake, 'LONG_TERM');

            expect(comp.isDeleteConfirmOpen).toBeTrue();
            expect(intakeServiceSpy.updateStatus).not.toHaveBeenCalled();
        });

        it('the delete confirmation modal should show the exact required heading and subheading', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;

            comp.onStatusChange(comp.intakes[0], 'CLOSED');
            fixture.detectChanges();

            const modal = fixture.debugElement.query(By.css('app-confirm-modal .modal-shell-overlay'));
            expect(modal.nativeElement.textContent).toContain('האם למחוק את האינטייק מהאתר?');
            expect(modal.nativeElement.textContent).toContain('שים לב שלחיצה על כפתור מחיקה תמחק את האינטייק לצמיתות ולא יהיה ניתן לשחזרו');
        });

        it('onConfirmDelete() should DELETE via the service and splice the intake out of local state', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intakeServiceSpy.deleteIntake.and.returnValue(of(undefined));
            comp.onStatusChange(intake, 'CLOSED');

            comp.onConfirmDelete();

            expect(intakeServiceSpy.deleteIntake).toHaveBeenCalledWith(1);
            expect(comp.intakes.find(i => i.id === 1)).toBeUndefined();
            expect(comp.isDeleteConfirmOpen).toBeFalse();
        });

        it('onConfirmDelete() should surface a backend error and keep the intake in the list', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intakeServiceSpy.deleteIntake.and.returnValue(throwError(() => ({ status: 403, error: { message: 'אין הרשאה למחוק' } })));
            comp.onStatusChange(intake, 'CLOSED');

            comp.onConfirmDelete();

            expect(comp.actionError).toBe('אין הרשאה למחוק');
            expect(comp.intakes.find(i => i.id === 1)).toBeTruthy();
        });

        it('onCancelDelete() should close the modal without calling the API, leaving the intake and its status untouched', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            comp.onStatusChange(intake, 'CLOSED');

            comp.onCancelDelete();

            expect(comp.isDeleteConfirmOpen).toBeFalse();
            expect(intakeServiceSpy.deleteIntake).not.toHaveBeenCalled();
            expect(intake.status).toBe('NEW');
            expect(comp.intakes.find(i => i.id === 1)).toBeTruthy();
        });

        it('cancelling in the real DOM should revert the native <select> element itself, not just the model — a one-way [ngModel] binding does not re-sync the DOM when the bound value never actually changes', async () => {
            const fixture = setup();
            await fixture.whenStable(); // template-driven forms finish registering controls via a resolved promise
            fixture.detectChanges();
            const select = fixture.debugElement.query(By.css('.status-select'));
            const selectEl = select.nativeElement as HTMLSelectElement;
            expect(selectEl.value).toBe('NEW');

            // Same pattern as the "confirming via the modal button" test below: triggerEventHandler
            // invokes the real compiled (ngModelChange) listener, which also resolves the #statusSelect
            // template-ref argument to the real native element — exactly as a genuine user pick would.
            select.triggerEventHandler('ngModelChange', 'CLOSED');
            fixture.detectChanges();

            expect(fixture.componentInstance.isDeleteConfirmOpen).toBeTrue();

            fixture.debugElement.query(By.css('app-confirm-modal .btn-secondary')).triggerEventHandler('click', null);
            fixture.detectChanges();

            expect(selectEl.value).toBe('NEW'); // must be reverted in the DOM, not just the model
        });

        it('a rejected PATCH should also revert the native <select> element, not just the model', async () => {
            const fixture = setup();
            await fixture.whenStable();
            fixture.detectChanges();
            const select = fixture.debugElement.query(By.css('.status-select'));
            const selectEl = select.nativeElement as HTMLSelectElement;
            intakeServiceSpy.updateStatus.and.returnValue(
                throwError(() => ({ status: 403, error: { message: 'אין הרשאה' } }))
            );

            select.triggerEventHandler('ngModelChange', 'ACTIVE');
            fixture.detectChanges();

            expect(selectEl.value).toBe('NEW');
        });

        it('confirming via the modal button in the DOM should delete and remove the row', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            intakeServiceSpy.deleteIntake.and.returnValue(of(undefined));

            const select = fixture.debugElement.query(By.css('.status-select'));
            select.triggerEventHandler('ngModelChange', 'CLOSED');
            fixture.detectChanges();

            fixture.debugElement.query(By.css('app-confirm-modal .btn-primary-action')).triggerEventHandler('click', null);
            fixture.detectChanges();

            expect(intakeServiceSpy.deleteIntake).toHaveBeenCalledWith(1);
            expect(fixture.debugElement.queryAll(By.css('tbody tr')).length).toBe(comp.intakes.length);
            expect(comp.intakes.length).toBe(3);
        });

        it('should not open a second confirmation while one status/extend/delete action is already in flight', () => {
            const fixture = setup();
            const comp = fixture.componentInstance;
            intakeServiceSpy.updateStatus.and.returnValue(new Observable(() => { })); // never resolves
            comp.onStatusChange(comp.intakes[0], 'ACTIVE'); // now pending

            comp.onStatusChange(comp.intakes[1], 'CLOSED');

            expect(comp.isDeleteConfirmOpen).toBeFalse();
        });
    });

    it('should disable the row and hide the extend button while a request is in flight', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        const intake = comp.intakes[2]; // expiring soon, has an extend button
        intakeServiceSpy.extendExpiration.and.returnValue(new Observable(() => { })); // never resolves

        comp.extendIntake(intake);
        fixture.detectChanges();

        expect(comp.isPendingAction(intake)).toBeTrue();
        const row = fixture.debugElement.queryAll(By.css('tbody tr'))[2];
        expect(row.nativeElement.classList).toContain('row-pending');
        expect(row.query(By.css('.extend-btn'))).toBeFalsy();
        expect(row.query(By.css('.pending-hint'))).toBeTruthy();
    });

    it('formatCreatedAt() and formatExpiresAt() should produce non-empty formatted strings', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;

        expect(comp.formatCreatedAt(new Date()).length).toBeGreaterThan(0);
        expect(comp.formatExpiresAt(new Date()).length).toBeGreaterThan(0);
    });

    it('dismissActionError() should clear the action error banner', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        comp.actionError = 'שגיאה כלשהי';

        comp.dismissActionError();

        expect(comp.actionError).toBe('');
    });
});
