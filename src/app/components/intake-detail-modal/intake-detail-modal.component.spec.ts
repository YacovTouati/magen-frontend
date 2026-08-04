import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { IntakeDetailModalComponent } from './intake-detail-modal.component';
import { IntakeAlert } from '../../services/intake.service';

const BASE_INTAKE: IntakeAlert = {
    id: 12,
    callerName: 'מירי אברהם',
    phone: '0501234567',
    urgency: 'CRITICAL',
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    contactedOtherCenter: 'לא',
    caseDescription: 'תיאור מקרה מלא לבדיקה',
    status: 'NEW',
    expiresAt: new Date('2026-08-15T10:00:00.000Z'),
    callReport: {
        id: 5, email: 'miri@example.com', region: 'תל אביב', reportingDuty: 'yes_practical',
        magenContactHistory: 'first_time', callerType: 'victim', summaryNotes: 'תוכן מלא של השיחה'
    }
};

describe('IntakeDetailModalComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [IntakeDetailModalComponent] }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(IntakeDetailModalComponent);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render nothing (no overlay) when isOpen is false', () => {
        const fixture = TestBed.createComponent(IntakeDetailModalComponent);
        fixture.componentInstance.isOpen = false;
        fixture.componentInstance.intake = BASE_INTAKE;
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('.modal-shell-overlay'))).toBeFalsy();
    });

    it('should render all header/detail fields when open with an intake', () => {
        const fixture = TestBed.createComponent(IntakeDetailModalComponent);
        fixture.componentInstance.isOpen = true;
        fixture.componentInstance.intake = BASE_INTAKE;
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('מירי אברהם');
        expect(text).toContain('0501234567');
        expect(text).toContain('miri@example.com');
        expect(text).toContain('תל אביב');
        expect(text).toContain('נפגע/ת ישיר/ה'); // callerType label
        expect(text).toContain('חדש'); // status label
        expect(text).toContain('קריטית'); // urgency label
        expect(text).toContain('פעם ראשונה'); // magenContactHistory label
    });

    describe('contentText (single conversation-text field)', () => {
        it('should show only summaryNotes under "תוכן השיחה" when present, not caseDescription too', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            fixture.componentInstance.isOpen = true;
            fixture.componentInstance.intake = BASE_INTAKE;
            fixture.detectChanges();

            const text = fixture.nativeElement.textContent;
            expect(text).toContain('תוכן השיחה');
            expect(text).toContain('תוכן מלא של השיחה'); // summaryNotes
            expect(text).not.toContain('תיאור מקרה מלא לבדיקה'); // caseDescription must NOT also render
        });

        it('should fall back to caseDescription when summaryNotes is null', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            fixture.componentInstance.intake = {
                ...BASE_INTAKE,
                callReport: { ...BASE_INTAKE.callReport!, summaryNotes: null }
            };

            expect(fixture.componentInstance.contentText()).toBe('תיאור מקרה מלא לבדיקה');
        });

        it('should fall back to caseDescription when there is no linked callReport at all', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            fixture.componentInstance.intake = { ...BASE_INTAKE, callReport: null };

            expect(fixture.componentInstance.contentText()).toBe('תיאור מקרה מלא לבדיקה');
        });

        it('should show an empty-but-present summaryNotes rather than falling back (?? not ||)', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            fixture.componentInstance.intake = {
                ...BASE_INTAKE,
                callReport: { ...BASE_INTAKE.callReport!, summaryNotes: '' }
            };

            expect(fixture.componentInstance.contentText()).toBe('');
        });
    });

    it('should show dashes for missing callReport fields when callReport is null', () => {
        const fixture = TestBed.createComponent(IntakeDetailModalComponent);
        fixture.componentInstance.isOpen = true;
        fixture.componentInstance.intake = { ...BASE_INTAKE, callReport: null };
        fixture.detectChanges();

        expect(fixture.componentInstance.callerTypeLabel()).toBe('-');
        expect(fixture.componentInstance.magenContactHistoryLabel()).toBe('-');
        expect(fixture.componentInstance.reportingDutyLabel()).toBe('-');
    });

    it('should show contactedOtherCenter exactly as the backend sent it, not re-derived from a truthy check', () => {
        const fixture = TestBed.createComponent(IntakeDetailModalComponent);
        fixture.componentInstance.intake = { ...BASE_INTAKE, contactedOtherCenter: 'לא' };

        expect(fixture.componentInstance.contactedOtherCenterLabel()).toBe('לא');
    });

    it('should emit closed when the close button is clicked', () => {
        const fixture = TestBed.createComponent(IntakeDetailModalComponent);
        fixture.componentInstance.isOpen = true;
        fixture.componentInstance.intake = BASE_INTAKE;
        fixture.detectChanges();
        let closedCount = 0;
        fixture.componentInstance.closed.subscribe(() => closedCount++);

        fixture.debugElement.query(By.css('.modal-close')).triggerEventHandler('click', null);

        expect(closedCount).toBe(1);
    });

    it('should emit closed on backdrop click', () => {
        const fixture = TestBed.createComponent(IntakeDetailModalComponent);
        fixture.componentInstance.isOpen = true;
        fixture.componentInstance.intake = BASE_INTAKE;
        fixture.detectChanges();
        let closedCount = 0;
        fixture.componentInstance.closed.subscribe(() => closedCount++);

        fixture.debugElement.query(By.css('.modal-shell-overlay')).triggerEventHandler('click', null);

        expect(closedCount).toBe(1);
    });

    describe('delete flow', () => {
        function open(fixture: ReturnType<typeof TestBed.createComponent<IntakeDetailModalComponent>>) {
            fixture.componentInstance.isOpen = true;
            fixture.componentInstance.intake = BASE_INTAKE;
            fixture.detectChanges();
        }

        it('should show the detail view (not the confirm prompt) by default', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            open(fixture);

            expect(fixture.debugElement.query(By.css('.btn-delete'))).toBeTruthy();
            expect(fixture.debugElement.query(By.css('.btn-confirm-delete'))).toBeFalsy();
        });

        it('clicking "מחק אינטייק" should swap in the confirm prompt with the caller\'s name, without emitting anything yet', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            open(fixture);
            let emitted = false;
            fixture.componentInstance.deleteConfirmed.subscribe(() => emitted = true);

            fixture.debugElement.query(By.css('.btn-delete')).triggerEventHandler('click', null);
            fixture.detectChanges();

            expect(fixture.componentInstance.isConfirmingDelete).toBeTrue();
            expect(fixture.debugElement.query(By.css('.confirm-delete-message')).nativeElement.textContent).toContain('מירי אברהם');
            expect(emitted).toBeFalse();
        });

        it('cancelling the confirm prompt should return to the detail view without emitting', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            open(fixture);
            let emitted = false;
            fixture.componentInstance.deleteConfirmed.subscribe(() => emitted = true);

            fixture.debugElement.query(By.css('.btn-delete')).triggerEventHandler('click', null);
            fixture.detectChanges();
            fixture.debugElement.query(By.css('.btn-cancel-delete')).triggerEventHandler('click', null);
            fixture.detectChanges();

            expect(fixture.componentInstance.isConfirmingDelete).toBeFalse();
            expect(fixture.debugElement.query(By.css('.btn-delete'))).toBeTruthy();
            expect(emitted).toBeFalse();
        });

        it('confirming should emit deleteConfirmed with the current intake', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            open(fixture);
            let emittedIntake: any = null;
            fixture.componentInstance.deleteConfirmed.subscribe((intake) => emittedIntake = intake);

            fixture.debugElement.query(By.css('.btn-delete')).triggerEventHandler('click', null);
            fixture.detectChanges();
            fixture.debugElement.query(By.css('.btn-confirm-delete')).triggerEventHandler('click', null);

            expect(emittedIntake?.id).toBe(12);
        });

        // OnPush: mutating a field directly from a test (no originating @Input binding or
        // template event) never marks THIS component's own view dirty on its own —
        // fixture.changeDetectorRef is a different (host) view ref and doesn't reach it.
        // The component's own ChangeDetectorRef, resolved via its element injector, does.
        function markOwnViewDirty(fixture: ReturnType<typeof TestBed.createComponent<IntakeDetailModalComponent>>) {
            fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
        }

        it('should show "מוחק..." and disable both confirm-step buttons while isDeleting is true', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            open(fixture);
            fixture.debugElement.query(By.css('.btn-delete')).triggerEventHandler('click', null);
            fixture.detectChanges();

            fixture.componentInstance.isDeleting = true;
            markOwnViewDirty(fixture);
            fixture.detectChanges();

            const confirmBtn = fixture.debugElement.query(By.css('.btn-confirm-delete'));
            expect(confirmBtn.nativeElement.textContent.trim()).toBe('מוחק...');
            expect(confirmBtn.nativeElement.disabled).toBeTrue();
            expect(fixture.debugElement.query(By.css('.btn-cancel-delete')).nativeElement.disabled).toBeTrue();
        });

        it('should show a deleteError message inside the confirm prompt, keeping the modal open', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            open(fixture);
            fixture.debugElement.query(By.css('.btn-delete')).triggerEventHandler('click', null);
            fixture.detectChanges();

            fixture.componentInstance.deleteError = 'אין הרשאה למחוק';
            markOwnViewDirty(fixture);
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('.delete-error')).nativeElement.textContent).toContain('אין הרשאה למחוק');
        });

        it('ngOnChanges should reset isConfirmingDelete when the intake input changes (no stale confirm state on reopen)', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            open(fixture);
            fixture.componentInstance.isConfirmingDelete = true;

            fixture.componentInstance.intake = { ...BASE_INTAKE, id: 99 };
            fixture.componentInstance.ngOnChanges({ intake: {} as any });

            expect(fixture.componentInstance.isConfirmingDelete).toBeFalse();
        });

        it('closing the modal should also reset isConfirmingDelete', () => {
            const fixture = TestBed.createComponent(IntakeDetailModalComponent);
            open(fixture);
            fixture.componentInstance.isConfirmingDelete = true;

            fixture.componentInstance.onClose();

            expect(fixture.componentInstance.isConfirmingDelete).toBeFalse();
        });
    });
});
