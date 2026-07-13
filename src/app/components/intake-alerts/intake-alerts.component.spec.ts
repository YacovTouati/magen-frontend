import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, Observable } from 'rxjs';
import { IntakeAlertsComponent } from './intake-alerts.component';
import { AuthService } from '../../services/auth.service';
import { IntakeService, IntakeAlert, IntakeAssignee, IntakeCallReport } from '../../services/intake.service';

function minutesAgo(minutes: number): Date {
    return new Date(Date.now() - minutes * 60 * 1000);
}

const YAAKOV_ID = 101;
const MICHAL_ID = 202;
const RIVKA: IntakeAssignee = { id: 900, name: 'רבקה ס.', email: 'rivka@magen.org', role: 'ADMIN' };
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
            assignedTo: null,
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
            assignedTo: null,
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
            assignedTo: RIVKA,
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
            status: 'CLOSED',
            assignedTo: RIVKA,
            callReport: null
        },
        {
            id: 5,
            callerName: 'אלון גבע',
            phone: '058-7778899',
            urgency: 'HIGH',
            createdAt: minutesAgo(8),
            contactedOtherCenter: 'לא',
            caseDescription: 'שיחה רגישה שבטיפול פעיל כרגע.',
            status: 'ACTIVE',
            assignedTo: RIVKA,
            callReport: null
        }
    ];
}

describe('IntakeAlertsComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let intakeServiceSpy: jasmine.SpyObj<IntakeService>;

    // Mirrors the real backend: login only returns { id, email, role } — no display name.
    function setup(userId: number = YAAKOV_ID, intakes: IntakeAlert[] = buildMockIntakes()) {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser']);
        authServiceSpy.getUser.and.returnValue({ id: userId, email: `admin${userId}@magen.org`, role: 'ADMIN' });

        intakeServiceSpy = jasmine.createSpyObj('IntakeService', [
            'getIntakes', 'claimOwnership', 'undoClaim', 'takeOverCase', 'updateStatus'
        ]);
        intakeServiceSpy.getIntakes.and.returnValue(of(intakes));

        TestBed.configureTestingModule({
            imports: [IntakeAlertsComponent],
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
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
        expect(fixture.componentInstance.intakes.length).toBe(5);
        expect(fixture.componentInstance.isLoadingIntakes).toBeFalse();
    });

    it('currentAdminId should read the id from AuthService even when no display name is present', () => {
        const fixture = setup(YAAKOV_ID);
        expect(fixture.componentInstance.currentAdminId).toBe(YAAKOV_ID);
    });

    it('should show a loading state, then an error message, if fetching intakes fails', () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser']);
        authServiceSpy.getUser.and.returnValue({ id: YAAKOV_ID, email: 'x@magen.org', role: 'ADMIN' });
        intakeServiceSpy = jasmine.createSpyObj('IntakeService', ['getIntakes', 'claimOwnership', 'undoClaim', 'takeOverCase', 'updateStatus']);
        intakeServiceSpy.getIntakes.and.returnValue(throwError(() => new Error('network down')));

        TestBed.configureTestingModule({
            imports: [IntakeAlertsComponent],
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                { provide: IntakeService, useValue: intakeServiceSpy }
            ]
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
        const fixture = setup(YAAKOV_ID, [{ ...buildMockIntakes()[0], assignedTo: { id: YAAKOV_ID, name: 'יעקב', email: 'y@magen.org', role: 'ADMIN' } }]);
        const select = fixture.debugElement.query(By.css('.status-select')).nativeElement as HTMLSelectElement;
        const options = Array.from(select.options);

        expect(options.some(o => o.value === 'ACTIVE' && o.textContent?.trim() === 'בטיפול פעיל')).toBeTrue();
    });

    describe('ownership & edit-guard lifecycle (wired to the API, compared by user id)', () => {
        it('an unassigned row should be locked ("claim" action) with the status dropdown disabled', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            expect(intake.assignedTo).toBeNull();
            expect(comp.getRowAction(intake)).toBe('claim');

            const fieldset: HTMLFieldSetElement = fixture.debugElement.queryAll(By.css('tbody tr'))[0]
                .query(By.css('.status-fieldset')).nativeElement;
            expect(fieldset.disabled).toBeTrue();
        });

        it('onStatusChange() should be a no-op on an unassigned row and never call the API', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];

            comp.onStatusChange(intake, 'ACTIVE');

            expect(intake.status).toBe('NEW');
            expect(intakeServiceSpy.updateStatus).not.toHaveBeenCalled();
        });

        it('claimOwnership() should POST via the service and apply the server response on success', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intakeServiceSpy.claimOwnership.and.returnValue(
                of({ ...intake, status: 'ACTIVE', assignedTo: { id: YAAKOV_ID, name: 'יעקב', email: 'y@magen.org', role: 'ADMIN' } })
            );

            comp.claimOwnership(intake);

            expect(intakeServiceSpy.claimOwnership).toHaveBeenCalledWith(1);
            expect(intake.assignedTo?.id).toBe(YAAKOV_ID);
            expect(comp.getRowAction(intake)).toBe('mine');
            expect(comp.pendingActionId).toBeNull();
        });

        it('claimOwnership() should surface a backend error and reload the list without applying any change', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intakeServiceSpy.claimOwnership.and.returnValue(
                throwError(() => ({ status: 400, error: { message: 'התיק כבר שויך למישהו אחר' } }))
            );
            intakeServiceSpy.getIntakes.calls.reset();
            intakeServiceSpy.getIntakes.and.returnValue(of(comp.intakes));

            comp.claimOwnership(intake);

            expect(intake.assignedTo).toBeNull();
            expect(comp.actionError).toBe('התיק כבר שויך למישהו אחר');
            expect(comp.pendingActionId).toBeNull();
            expect(intakeServiceSpy.getIntakes).toHaveBeenCalledTimes(1); // resynced with the server
        });

        it('claimOwnership() should show a friendly connectivity message (not the raw HttpErrorResponse) when the request never reaches the server', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intakeServiceSpy.claimOwnership.and.returnValue(
                throwError(() => ({ status: 0, message: 'Http failure response for http://localhost:3000/api/intakes/1/claim: 0 Unknown Error' }))
            );
            intakeServiceSpy.getIntakes.calls.reset();
            intakeServiceSpy.getIntakes.and.returnValue(of(comp.intakes));

            comp.claimOwnership(intake);

            expect(comp.actionError).toBe('לא ניתן להתחבר לשרת. בדוק/י את החיבור לאינטרנט ונסה/י שוב.');
            expect(comp.actionError).not.toContain('Http failure response');
        });

        it('claimOwnership() should be a no-op if the row is already assigned, without calling the API', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[2]; // already assigned to רבקה ס.

            comp.claimOwnership(intake);

            expect(intakeServiceSpy.claimOwnership).not.toHaveBeenCalled();
            expect(intake.assignedTo).toBe(RIVKA);
        });

        it('onStatusChange() should PATCH via the service with the raw enum value when the current admin owns the row', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intake.assignedTo = { id: YAAKOV_ID, name: 'יעקב', email: 'y@magen.org', role: 'ADMIN' }; // simulate already-claimed
            intakeServiceSpy.updateStatus.and.returnValue(of({ ...intake, status: 'ACTIVE' }));

            comp.onStatusChange(intake, 'ACTIVE');

            expect(intakeServiceSpy.updateStatus).toHaveBeenCalledWith(1, 'ACTIVE');
            expect(intake.status).toBe('ACTIVE');
        });

        it('onStatusChange() should surface a backend error without applying the new status', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intake.assignedTo = { id: YAAKOV_ID, name: 'יעקב', email: 'y@magen.org', role: 'ADMIN' };
            intakeServiceSpy.updateStatus.and.returnValue(
                throwError(() => ({ status: 403, error: { message: 'אין הרשאה לשנות סטטוס' } }))
            );

            comp.onStatusChange(intake, 'ACTIVE');

            expect(intake.status).toBe('NEW');
            expect(comp.actionError).toBe('אין הרשאה לשנות סטטוס');
        });

        it('a non-owner admin should NOT be able to edit status, and the row should render as "locked" while status is ACTIVE', () => {
            const fixture = setup(MICHAL_ID);
            const comp = fixture.componentInstance;
            const lockedIntake = comp.intakes[4]; // assigned to רבקה ס. (id 900), status ACTIVE

            expect(comp.canEditStatus(lockedIntake)).toBeFalse();
            expect(comp.getRowAction(lockedIntake)).toBe('locked');

            comp.onStatusChange(lockedIntake, 'CLOSED');
            expect(lockedIntake.status).toBe('ACTIVE');
            expect(intakeServiceSpy.updateStatus).not.toHaveBeenCalled();
        });

        it('takeOverCase() should be blocked while the row is actively locked, without opening the confirm modal or calling the API', () => {
            const fixture = setup(MICHAL_ID);
            const comp = fixture.componentInstance;
            const lockedIntake = comp.intakes[4];

            comp.takeOverCase(lockedIntake);

            expect(comp.isConfirmOpen).toBeFalse();
            expect(intakeServiceSpy.takeOverCase).not.toHaveBeenCalled();
        });

        it('takeOverCase() should open the confirm modal (mentioning the current owner by name) without calling the API until confirmed', () => {
            const fixture = setup(MICHAL_ID);
            const comp = fixture.componentInstance;
            const releasedIntake = comp.intakes[2]; // status NO_ANSWER, assigned to רבקה ס.
            expect(comp.getRowAction(releasedIntake)).toBe('takeover');

            comp.takeOverCase(releasedIntake);

            expect(comp.isConfirmOpen).toBeTrue();
            expect(comp.confirmMessage).toContain('רבקה ס.');
            expect(intakeServiceSpy.takeOverCase).not.toHaveBeenCalled();
        });

        it('onConfirmAccept() should call the takeover endpoint and apply the server response', () => {
            const fixture = setup(MICHAL_ID);
            const comp = fixture.componentInstance;
            const releasedIntake = comp.intakes[2];
            intakeServiceSpy.takeOverCase.and.returnValue(
                of({ ...releasedIntake, assignedTo: { id: MICHAL_ID, name: 'מיכל', email: 'm@magen.org', role: 'ADMIN' } })
            );
            comp.takeOverCase(releasedIntake);

            comp.onConfirmAccept();

            expect(intakeServiceSpy.takeOverCase).toHaveBeenCalledWith(3);
            expect(releasedIntake.assignedTo?.id).toBe(MICHAL_ID);
            expect(comp.isConfirmOpen).toBeFalse();
        });

        it('onConfirmAccept() should surface an error and reload the list if the takeover is rejected (e.g. 403 — already re-claimed)', () => {
            const fixture = setup(MICHAL_ID);
            const comp = fixture.componentInstance;
            const releasedIntake = comp.intakes[2];
            intakeServiceSpy.takeOverCase.and.returnValue(
                throwError(() => ({ status: 403, error: { message: 'התיק נלקח בינתיים' } }))
            );
            intakeServiceSpy.getIntakes.calls.reset();
            intakeServiceSpy.getIntakes.and.returnValue(of(comp.intakes));
            comp.takeOverCase(releasedIntake);

            comp.onConfirmAccept();

            expect(comp.actionError).toBe('התיק נלקח בינתיים');
            expect(releasedIntake.assignedTo).toBe(RIVKA); // unchanged
            expect(intakeServiceSpy.getIntakes).toHaveBeenCalledTimes(1);
        });

        it('onConfirmCancel() should leave the takeover unapplied and never call the API', () => {
            const fixture = setup(MICHAL_ID);
            const comp = fixture.componentInstance;
            const releasedIntake = comp.intakes[2];
            comp.takeOverCase(releasedIntake);

            comp.onConfirmCancel();

            expect(intakeServiceSpy.takeOverCase).not.toHaveBeenCalled();
            expect(comp.isConfirmOpen).toBeFalse();
        });

        it('releaseOwnership() should open the confirm modal with the exact required Hebrew message, without calling the API yet', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intake.assignedTo = { id: YAAKOV_ID, name: 'יעקב', email: 'y@magen.org', role: 'ADMIN' };

            comp.releaseOwnership(intake);

            expect(comp.isConfirmOpen).toBeTrue();
            expect(comp.confirmMessage).toBe('האם אתה בטוח שברצונך לבטל את שיוך התיק אליך?');
            expect(intakeServiceSpy.undoClaim).not.toHaveBeenCalled();
        });

        it('onConfirmAccept() should call undo-claim and apply the server response after a release is confirmed', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intake.assignedTo = { id: YAAKOV_ID, name: 'יעקב', email: 'y@magen.org', role: 'ADMIN' };
            intakeServiceSpy.undoClaim.and.returnValue(of({ ...intake, assignedTo: null, status: 'NEW' }));
            comp.releaseOwnership(intake);

            comp.onConfirmAccept();

            expect(intakeServiceSpy.undoClaim).toHaveBeenCalledWith(1);
            expect(intake.assignedTo).toBeNull();
            expect(intake.status).toBe('NEW');
            expect(comp.isConfirmOpen).toBeFalse();
        });

        it('releaseOwnership() should be a no-op for anyone other than the current owner, and never call the API', () => {
            const fixture = setup(MICHAL_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[2]; // assigned to רבקה ס. (id 900), not the current admin (202)

            comp.releaseOwnership(intake);

            expect(comp.isConfirmOpen).toBeFalse();
            expect(intakeServiceSpy.undoClaim).not.toHaveBeenCalled();
        });

        it('should render the correct action control in the DOM per row state', () => {
            const fixture = setup(MICHAL_ID);
            const rows = fixture.debugElement.queryAll(By.css('tbody tr'));

            expect(rows[0].query(By.css('.assign-btn:not(.mine):not(.takeover)'))).toBeTruthy(); // claim
            expect(rows[2].query(By.css('.assign-btn.takeover'))).toBeTruthy(); // takeover-eligible
            expect(rows[4].query(By.css('.locked-hint'))).toBeTruthy(); // locked
            expect(rows[4].query(By.css('.assign-btn'))).toBeFalsy();
        });

        it('clicking the "mine" button in the DOM should open the styled confirm modal, not the native browser dialog', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            comp.intakes[0].assignedTo = { id: YAAKOV_ID, name: 'יעקב', email: 'y@magen.org', role: 'ADMIN' };
            fixture.detectChanges();

            fixture.debugElement.queryAll(By.css('tbody tr'))[0].query(By.css('.assign-btn.mine')).triggerEventHandler('click', null);
            fixture.detectChanges();

            const modal = fixture.debugElement.query(By.css('app-confirm-modal .modal-shell-overlay'));
            expect(modal).toBeTruthy();
            expect(modal.nativeElement.textContent).toContain('האם אתה בטוח שברצונך לבטל את שיוך התיק אליך?');
        });

        it('confirming via the modal button in the DOM should call undo-claim and complete the release', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intake.assignedTo = { id: YAAKOV_ID, name: 'יעקב', email: 'y@magen.org', role: 'ADMIN' };
            intakeServiceSpy.undoClaim.and.returnValue(of({ ...intake, assignedTo: null, status: 'NEW' }));
            fixture.detectChanges();

            fixture.debugElement.queryAll(By.css('tbody tr'))[0].query(By.css('.assign-btn.mine')).triggerEventHandler('click', null);
            fixture.detectChanges();
            fixture.debugElement.query(By.css('app-confirm-modal .btn-primary-action')).triggerEventHandler('click', null);
            fixture.detectChanges();

            expect(intake.assignedTo).toBeNull();
            expect(fixture.debugElement.query(By.css('app-confirm-modal .modal-shell-overlay'))).toBeFalsy();
        });

        it('should disable the row and hide its action controls while a request is in flight', () => {
            const fixture = setup(YAAKOV_ID);
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            // never resolves — simulates an in-flight request
            intakeServiceSpy.claimOwnership.and.returnValue(new Observable(() => { }));

            comp.claimOwnership(intake);
            fixture.detectChanges();

            expect(comp.isPendingAction(intake)).toBeTrue();
            const row = fixture.debugElement.queryAll(By.css('tbody tr'))[0];
            expect(row.nativeElement.classList).toContain('row-pending');
            expect(row.query(By.css('.assign-btn'))).toBeFalsy();
            expect(row.query(By.css('.pending-hint'))).toBeTruthy();
        });
    });

    it('formatCreatedAt() should produce a non-empty formatted string', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;

        expect(comp.formatCreatedAt(new Date()).length).toBeGreaterThan(0);
    });

    it('dismissActionError() should clear the action error banner', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        comp.actionError = 'שגיאה כלשהי';

        comp.dismissActionError();

        expect(comp.actionError).toBe('');
    });
});
