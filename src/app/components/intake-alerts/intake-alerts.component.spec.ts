import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, Observable } from 'rxjs';
import { IntakeAlertsComponent } from './intake-alerts.component';
import { AuthService } from '../../services/auth.service';
import { IntakeService, IntakeAlert } from '../../services/intake.service';

function minutesAgo(minutes: number): Date {
    return new Date(Date.now() - minutes * 60 * 1000);
}

function buildMockIntakes(): IntakeAlert[] {
    return [
        {
            id: 1,
            callerName: 'מירי אברהם',
            phone: '050-1234567',
            email: 'miri.a@example.com',
            urgency: 'CRITICAL',
            createdAt: minutesAgo(12),
            reportingDuty: true,
            contactedOtherCenter: 'לא',
            caseDescription: 'פנייה דחופה בנוגע לחשש ממצוקה מיידית.',
            status: 'חדש',
            assignedTo: null
        },
        {
            id: 2,
            callerName: 'דוד לוי',
            phone: '052-9876543',
            email: 'david.l@example.com',
            urgency: 'HIGH',
            createdAt: minutesAgo(35),
            reportingDuty: false,
            contactedOtherCenter: 'כן - ער"ן',
            caseDescription: 'שיחת המשך לבירור מצב לאחר פנייה קודמת.',
            status: 'חדש',
            assignedTo: null
        },
        {
            id: 3,
            callerName: 'נועה שמעוני',
            phone: '054-5551234',
            email: 'noa.s@example.com',
            urgency: 'MEDIUM',
            createdAt: minutesAgo(58),
            reportingDuty: true,
            contactedOtherCenter: 'לא',
            caseDescription: 'בקשה למידע כללי על שירותי התמיכה.',
            status: 'לא ענה - לנסות שוב',
            assignedTo: 'רבקה ס.'
        },
        {
            id: 4,
            callerName: 'יוסי כהן',
            phone: '053-4443322',
            email: 'yossi.c@example.com',
            urgency: 'LOW',
            createdAt: minutesAgo(120),
            reportingDuty: false,
            contactedOtherCenter: 'כן - עמותת "אחווה"',
            caseDescription: 'פנייה כללית, נסגרה בשיחה קצרה.',
            status: 'נסגר בשיחה קצרה',
            assignedTo: 'רבקה ס.'
        },
        {
            id: 5,
            callerName: 'אלון גבע',
            phone: '058-7778899',
            email: 'alon.g@example.com',
            urgency: 'HIGH',
            createdAt: minutesAgo(8),
            reportingDuty: true,
            contactedOtherCenter: 'לא',
            caseDescription: 'שיחה רגישה שבטיפול פעיל כרגע.',
            status: 'בטיפול פעיל',
            assignedTo: 'רבקה ס.'
        }
    ];
}

describe('IntakeAlertsComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let intakeServiceSpy: jasmine.SpyObj<IntakeService>;

    function setup(userName: string = 'יעקב', intakes: IntakeAlert[] = buildMockIntakes()) {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser']);
        authServiceSpy.getUser.and.returnValue({ email: `${userName}@magen.org`, role: 'ADMIN', name: userName });

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

    it('should show a loading state, then an error message, if fetching intakes fails', () => {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser']);
        authServiceSpy.getUser.and.returnValue({ email: 'x@magen.org', role: 'ADMIN', name: 'x' });
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

    it('pendingCount should reflect only intakes with status "חדש"', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        const expected = comp.intakes.filter(i => i.status === 'חדש').length;

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

    it('should render one table row per fetched intake including the "contacted another center" column', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        const rows = fixture.debugElement.queryAll(By.css('tbody tr'));

        expect(rows.length).toBe(comp.intakes.length);
        const firstRowText = rows[0].nativeElement.textContent;
        expect(firstRowText).toContain(comp.intakes[0].callerName);
        expect(firstRowText).toContain(comp.intakes[0].phone);
        expect(firstRowText).toContain(comp.intakes[0].contactedOtherCenter);
    });

    it('urgencyLabel() should map every urgency level to a Hebrew label', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;

        expect(comp.urgencyLabel('CRITICAL')).toBe('קריטית');
        expect(comp.urgencyLabel('HIGH')).toBe('גבוהה');
        expect(comp.urgencyLabel('MEDIUM')).toBe('בינונית');
        expect(comp.urgencyLabel('LOW')).toBe('נמוכה');
    });

    describe('ownership & edit-guard lifecycle (wired to the API)', () => {
        it('an unassigned row should be locked ("claim" action) with the status dropdown disabled', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            expect(intake.assignedTo).toBeNull();
            expect(comp.getRowAction(intake)).toBe('claim');

            const fieldset: HTMLFieldSetElement = fixture.debugElement.queryAll(By.css('tbody tr'))[0]
                .query(By.css('.status-fieldset')).nativeElement;
            expect(fieldset.disabled).toBeTrue();
        });

        it('onStatusChange() should be a no-op on an unassigned row and never call the API', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];

            comp.onStatusChange(intake, 'בטיפול פעיל');

            expect(intake.status).toBe('חדש');
            expect(intakeServiceSpy.updateStatus).not.toHaveBeenCalled();
        });

        it('claimOwnership() should POST via the service and apply the server response on success', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intakeServiceSpy.claimOwnership.and.returnValue(of({ ...intake, assignedTo: 'יעקב' }));

            comp.claimOwnership(intake);

            expect(intakeServiceSpy.claimOwnership).toHaveBeenCalledWith(1);
            expect(intake.assignedTo).toBe('יעקב');
            expect(comp.getRowAction(intake)).toBe('mine');
            expect(comp.pendingActionId).toBeNull();
        });

        it('claimOwnership() should surface a backend error and reload the list without applying any change', () => {
            const fixture = setup('יעקב');
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
            const fixture = setup('יעקב');
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
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[2]; // already assigned to 'רבקה ס.'

            comp.claimOwnership(intake);

            expect(intakeServiceSpy.claimOwnership).not.toHaveBeenCalled();
            expect(intake.assignedTo).toBe('רבקה ס.');
        });

        it('onStatusChange() should PATCH via the service when the current admin owns the row', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intake.assignedTo = 'יעקב'; // simulate already-claimed
            intakeServiceSpy.updateStatus.and.returnValue(of({ ...intake, status: 'בטיפול פעיל' }));

            comp.onStatusChange(intake, 'בטיפול פעיל');

            expect(intakeServiceSpy.updateStatus).toHaveBeenCalledWith(1, 'בטיפול פעיל');
            expect(intake.status).toBe('בטיפול פעיל');
        });

        it('onStatusChange() should surface a backend error without applying the new status', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intake.assignedTo = 'יעקב';
            intakeServiceSpy.updateStatus.and.returnValue(
                throwError(() => ({ status: 403, error: { message: 'אין הרשאה לשנות סטטוס' } }))
            );

            comp.onStatusChange(intake, 'בטיפול פעיל');

            expect(intake.status).toBe('חדש');
            expect(comp.actionError).toBe('אין הרשאה לשנות סטטוס');
        });

        it('a non-owner admin should NOT be able to edit status, and the row should render as "locked" while status is "בטיפול פעיל"', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const lockedIntake = comp.intakes[4]; // assigned to 'רבקה ס.', status 'בטיפול פעיל'

            expect(comp.canEditStatus(lockedIntake)).toBeFalse();
            expect(comp.getRowAction(lockedIntake)).toBe('locked');

            comp.onStatusChange(lockedIntake, 'נסגר בשיחה קצרה');
            expect(lockedIntake.status).toBe('בטיפול פעיל');
            expect(intakeServiceSpy.updateStatus).not.toHaveBeenCalled();
        });

        it('takeOverCase() should be blocked while the row is actively locked, without opening the confirm modal or calling the API', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const lockedIntake = comp.intakes[4];

            comp.takeOverCase(lockedIntake);

            expect(comp.isConfirmOpen).toBeFalse();
            expect(intakeServiceSpy.takeOverCase).not.toHaveBeenCalled();
        });

        it('takeOverCase() should open the confirm modal without calling the API until confirmed', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const releasedIntake = comp.intakes[2]; // status 'לא ענה - לנסות שוב', assigned to 'רבקה ס.'
            expect(comp.getRowAction(releasedIntake)).toBe('takeover');

            comp.takeOverCase(releasedIntake);

            expect(comp.isConfirmOpen).toBeTrue();
            expect(comp.confirmMessage).toContain('רבקה ס.');
            expect(intakeServiceSpy.takeOverCase).not.toHaveBeenCalled();
        });

        it('onConfirmAccept() should call the takeover endpoint and apply the server response', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const releasedIntake = comp.intakes[2];
            intakeServiceSpy.takeOverCase.and.returnValue(of({ ...releasedIntake, assignedTo: 'מיכל' }));
            comp.takeOverCase(releasedIntake);

            comp.onConfirmAccept();

            expect(intakeServiceSpy.takeOverCase).toHaveBeenCalledWith(3);
            expect(releasedIntake.assignedTo).toBe('מיכל');
            expect(comp.isConfirmOpen).toBeFalse();
        });

        it('onConfirmAccept() should surface an error and reload the list if the takeover is rejected (e.g. 403 — already re-claimed)', () => {
            const fixture = setup('מיכל');
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
            expect(releasedIntake.assignedTo).toBe('רבקה ס.'); // unchanged
            expect(intakeServiceSpy.getIntakes).toHaveBeenCalledTimes(1);
        });

        it('onConfirmCancel() should leave the takeover unapplied and never call the API', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const releasedIntake = comp.intakes[2];
            comp.takeOverCase(releasedIntake);

            comp.onConfirmCancel();

            expect(intakeServiceSpy.takeOverCase).not.toHaveBeenCalled();
            expect(comp.isConfirmOpen).toBeFalse();
        });

        it('releaseOwnership() should open the confirm modal with the exact required Hebrew message, without calling the API yet', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intake.assignedTo = 'יעקב';

            comp.releaseOwnership(intake);

            expect(comp.isConfirmOpen).toBeTrue();
            expect(comp.confirmMessage).toBe('האם אתה בטוח שברצונך לבטל את שיוך התיק אליך?');
            expect(intakeServiceSpy.undoClaim).not.toHaveBeenCalled();
        });

        it('onConfirmAccept() should call undo-claim and apply the server response after a release is confirmed', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intake.assignedTo = 'יעקב';
            intakeServiceSpy.undoClaim.and.returnValue(of({ ...intake, assignedTo: null, status: 'חדש' }));
            comp.releaseOwnership(intake);

            comp.onConfirmAccept();

            expect(intakeServiceSpy.undoClaim).toHaveBeenCalledWith(1);
            expect(intake.assignedTo).toBeNull();
            expect(intake.status).toBe('חדש');
            expect(comp.isConfirmOpen).toBeFalse();
        });

        it('releaseOwnership() should be a no-op for anyone other than the current owner, and never call the API', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[2]; // assigned to 'רבקה ס.'

            comp.releaseOwnership(intake);

            expect(comp.isConfirmOpen).toBeFalse();
            expect(intakeServiceSpy.undoClaim).not.toHaveBeenCalled();
        });

        it('should render the correct action control in the DOM per row state', () => {
            const fixture = setup('מיכל');
            const rows = fixture.debugElement.queryAll(By.css('tbody tr'));

            expect(rows[0].query(By.css('.assign-btn:not(.mine):not(.takeover)'))).toBeTruthy(); // claim
            expect(rows[2].query(By.css('.assign-btn.takeover'))).toBeTruthy(); // takeover-eligible
            expect(rows[4].query(By.css('.locked-hint'))).toBeTruthy(); // locked
            expect(rows[4].query(By.css('.assign-btn'))).toBeFalsy();
        });

        it('clicking the "mine" button in the DOM should open the styled confirm modal, not the native browser dialog', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            comp.intakes[0].assignedTo = 'יעקב';
            fixture.detectChanges();

            fixture.debugElement.queryAll(By.css('tbody tr'))[0].query(By.css('.assign-btn.mine')).triggerEventHandler('click', null);
            fixture.detectChanges();

            const modal = fixture.debugElement.query(By.css('app-confirm-modal .confirm-overlay'));
            expect(modal).toBeTruthy();
            expect(modal.nativeElement.textContent).toContain('האם אתה בטוח שברצונך לבטל את שיוך התיק אליך?');
        });

        it('confirming via the modal button in the DOM should call undo-claim and complete the release', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            intake.assignedTo = 'יעקב';
            intakeServiceSpy.undoClaim.and.returnValue(of({ ...intake, assignedTo: null, status: 'חדש' }));
            fixture.detectChanges();

            fixture.debugElement.queryAll(By.css('tbody tr'))[0].query(By.css('.assign-btn.mine')).triggerEventHandler('click', null);
            fixture.detectChanges();
            fixture.debugElement.query(By.css('app-confirm-modal .btn-primary-action')).triggerEventHandler('click', null);
            fixture.detectChanges();

            expect(intake.assignedTo).toBeNull();
            expect(fixture.debugElement.query(By.css('app-confirm-modal .confirm-overlay'))).toBeFalsy();
        });

        it('should disable the row and hide its action controls while a request is in flight', () => {
            const fixture = setup('יעקב');
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
