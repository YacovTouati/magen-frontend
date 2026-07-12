import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IntakeAlertsComponent } from './intake-alerts.component';
import { AuthService } from '../../services/auth.service';

describe('IntakeAlertsComponent', () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    function setup(userName: string = 'יעקב') {
        authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser']);
        authServiceSpy.getUser.and.returnValue({ email: `${userName}@magen.org`, role: 'ADMIN', name: userName });

        TestBed.configureTestingModule({
            imports: [IntakeAlertsComponent],
            providers: [{ provide: AuthService, useValue: authServiceSpy }]
        });

        const fixture = TestBed.createComponent(IntakeAlertsComponent);
        fixture.detectChanges();
        return fixture;
    }

    it('should create with seeded mock intakes', () => {
        const fixture = setup();
        expect(fixture.componentInstance).toBeTruthy();
        expect(fixture.componentInstance.intakes.length).toBeGreaterThan(0);
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
        expect(fixture.debugElement.query(By.css('.intake-panel')).nativeElement.classList).not.toContain('expanded');

        fixture.debugElement.query(By.css('.alert-strip')).triggerEventHandler('click', null);
        fixture.detectChanges();

        expect(comp.isExpanded).toBeTrue();
        expect(fixture.debugElement.query(By.css('.intake-panel')).nativeElement.classList).toContain('expanded');
    });

    it('should render one table row per mock intake including the new "contacted another center" column', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;
        const rows = fixture.debugElement.queryAll(By.css('tbody tr'));

        expect(rows.length).toBe(comp.intakes.length);

        const firstRowText = rows[0].nativeElement.textContent;
        expect(firstRowText).toContain(comp.intakes[0].callerName);
        expect(firstRowText).toContain(comp.intakes[0].phone);
        expect(firstRowText).toContain(comp.intakes[0].contactedOtherCenter);
    });

    it('the phone column cell should be styled to stay on a single line', () => {
        const fixture = setup();
        const cell = fixture.debugElement.query(By.css('.phone-cell'));
        expect(cell).toBeTruthy();
    });

    it('urgencyLabel() should map every urgency level to a Hebrew label', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;

        expect(comp.urgencyLabel('CRITICAL')).toBe('קריטית');
        expect(comp.urgencyLabel('HIGH')).toBe('גבוהה');
        expect(comp.urgencyLabel('MEDIUM')).toBe('בינונית');
        expect(comp.urgencyLabel('LOW')).toBe('נמוכה');
    });

    describe('ownership & edit-guard lifecycle', () => {
        it('an unassigned row should be locked ("claim" action) with the status dropdown disabled', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0]; // מירי אברהם — seeded unassigned
            expect(intake.assignedTo).toBeNull();

            expect(comp.getRowAction(intake)).toBe('claim');
            expect(comp.canEditStatus(intake)).toBeFalse();

            const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
            const fieldset: HTMLFieldSetElement = rows[0].query(By.css('.status-fieldset')).nativeElement;
            const select: HTMLSelectElement = rows[0].query(By.css('.status-select')).nativeElement;
            expect(fieldset.disabled).toBeTrue();
            expect(select.matches(':disabled')).toBeTrue();
        });

        it('onStatusChange() should be a no-op on an unassigned row, even called directly', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];

            comp.onStatusChange(intake, 'בטיפול פעיל');

            expect(intake.status).toBe('חדש');
        });

        it('claimOwnership() should assign the row to the current admin and unlock the status dropdown for them only', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];

            comp.claimOwnership(intake);
            fixture.detectChanges();

            expect(intake.assignedTo).toBe('יעקב');
            expect(comp.getRowAction(intake)).toBe('mine');
            expect(comp.canEditStatus(intake)).toBeTrue();

            const fieldset: HTMLFieldSetElement = fixture.debugElement.queryAll(By.css('tbody tr'))[0]
                .query(By.css('.status-fieldset')).nativeElement;
            expect(fieldset.disabled).toBeFalse();
        });

        it('claimOwnership() should be a no-op if the row is already assigned to someone', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[2]; // seeded assigned to 'רבקה ס.'

            comp.claimOwnership(intake);

            expect(intake.assignedTo).toBe('רבקה ס.');
        });

        it('the owner should be able to change status via onStatusChange()', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            comp.claimOwnership(intake);

            comp.onStatusChange(intake, 'בטיפול פעיל');

            expect(intake.status).toBe('בטיפול פעיל');
        });

        it('a non-owner admin should NOT be able to edit status, and the row should render as "locked" while status is "בטיפול פעיל"', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const lockedIntake = comp.intakes[4]; // seeded: assigned to 'רבקה ס.', status 'בטיפול פעיל'

            expect(comp.canEditStatus(lockedIntake)).toBeFalse();
            expect(comp.getRowAction(lockedIntake)).toBe('locked');

            const originalStatus = lockedIntake.status;
            comp.onStatusChange(lockedIntake, 'נסגר בשיחה קצרה');
            expect(lockedIntake.status).toBe(originalStatus);
        });

        it('takeOverCase() should be blocked while the row is actively locked ("בטיפול פעיל"), without opening the confirm modal', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const lockedIntake = comp.intakes[4];

            comp.takeOverCase(lockedIntake);

            expect(comp.isConfirmOpen).toBeFalse();
            expect(lockedIntake.assignedTo).toBe('רבקה ס.');
        });

        it('takeOverCase() should open the confirm modal once the owner releases the row to a non-active status', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const releasedIntake = comp.intakes[2]; // status 'לא ענה - לנסות שוב', assigned to 'רבקה ס.'
            expect(comp.getRowAction(releasedIntake)).toBe('takeover');

            comp.takeOverCase(releasedIntake);

            expect(comp.isConfirmOpen).toBeTrue();
            expect(comp.confirmMessage).toContain('רבקה ס.');
            expect(releasedIntake.assignedTo).toBe('רבקה ס.'); // not applied yet — only on confirm
        });

        it('onConfirmAccept() should apply the takeover once confirmed', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const releasedIntake = comp.intakes[2];
            comp.takeOverCase(releasedIntake);

            comp.onConfirmAccept();

            expect(releasedIntake.assignedTo).toBe('מיכל');
            expect(comp.getRowAction(releasedIntake)).toBe('mine');
            expect(comp.isConfirmOpen).toBeFalse();
        });

        it('onConfirmCancel() should leave the takeover unapplied', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const releasedIntake = comp.intakes[2];
            comp.takeOverCase(releasedIntake);

            comp.onConfirmCancel();

            expect(releasedIntake.assignedTo).toBe('רבקה ס.');
            expect(comp.isConfirmOpen).toBeFalse();
        });

        it('releaseOwnership() should open the confirm modal with the exact required Hebrew message, without changing state yet', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            comp.claimOwnership(intake);
            comp.onStatusChange(intake, 'בטיפול פעיל');

            comp.releaseOwnership(intake);

            expect(comp.isConfirmOpen).toBeTrue();
            expect(comp.confirmMessage).toBe('האם אתה בטוח שברצונך לבטל את שיוך התיק אליך?');
            expect(intake.assignedTo).toBe('יעקב'); // not applied yet — only on confirm
        });

        it('onConfirmAccept() should revert the row to unassigned/"חדש" after a release is confirmed', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            comp.claimOwnership(intake);
            comp.onStatusChange(intake, 'בטיפול פעיל');
            comp.releaseOwnership(intake);

            comp.onConfirmAccept();

            expect(intake.assignedTo).toBeNull();
            expect(intake.status).toBe('חדש');
            expect(comp.getRowAction(intake)).toBe('claim');
            expect(comp.isConfirmOpen).toBeFalse();
        });

        it('onConfirmCancel() should keep the assignment intact after cancelling a release', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            comp.claimOwnership(intake);

            comp.releaseOwnership(intake);
            comp.onConfirmCancel();

            expect(intake.assignedTo).toBe('יעקב');
            expect(comp.isConfirmOpen).toBeFalse();
        });

        it('releaseOwnership() should be a no-op for anyone other than the current owner (cannot un-assign someone else)', () => {
            const fixture = setup('מיכל');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[2]; // assigned to 'רבקה ס.', not the current admin

            comp.releaseOwnership(intake);

            expect(comp.isConfirmOpen).toBeFalse();
            expect(intake.assignedTo).toBe('רבקה ס.');
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
            comp.claimOwnership(comp.intakes[0]);
            fixture.detectChanges();

            fixture.debugElement.queryAll(By.css('tbody tr'))[0].query(By.css('.assign-btn.mine')).triggerEventHandler('click', null);
            fixture.detectChanges();

            const modal = fixture.debugElement.query(By.css('app-confirm-modal .confirm-overlay'));
            expect(modal).toBeTruthy();
            expect(modal.nativeElement.textContent).toContain('האם אתה בטוח שברצונך לבטל את שיוך התיק אליך?');
        });

        it('confirming via the modal button in the DOM should complete the release', () => {
            const fixture = setup('יעקב');
            const comp = fixture.componentInstance;
            const intake = comp.intakes[0];
            comp.claimOwnership(intake);
            fixture.detectChanges();
            fixture.debugElement.queryAll(By.css('tbody tr'))[0].query(By.css('.assign-btn.mine')).triggerEventHandler('click', null);
            fixture.detectChanges();

            fixture.debugElement.query(By.css('app-confirm-modal .btn-primary-action')).triggerEventHandler('click', null);
            fixture.detectChanges();

            expect(intake.assignedTo).toBeNull();
            expect(fixture.debugElement.query(By.css('app-confirm-modal .confirm-overlay'))).toBeFalsy();
        });
    });

    it('formatCreatedAt() should produce a non-empty formatted string', () => {
        const fixture = setup();
        const comp = fixture.componentInstance;

        expect(comp.formatCreatedAt(new Date()).length).toBeGreaterThan(0);
    });
});
