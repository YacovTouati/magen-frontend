import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntakeService, IntakeAlert, IntakeStatus } from '../../services/intake.service';
import { IntakeDetailModalComponent } from '../intake-detail-modal/intake-detail-modal.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import {
    getCallerTypeLabel,
    getMagenContactHistoryLabel,
    getReportingDutyLabel
} from '../../shared/intake-labels';

// Same wire values/order/labels as IntakeAlertsComponent (the "old" table) — this column is
// meant to look and behave identically there, just inside the new management table.
const STATUS_OPTIONS: IntakeStatus[] = ['NEW', 'NO_ANSWER', 'ACTIVE', 'CLOSED', 'LONG_TERM'];

const STATUS_LABELS: Record<IntakeStatus, string> = {
    NEW: 'חדש',
    NO_ANSWER: 'לא ענה - לנסות שוב',
    ACTIVE: 'בטיפול פעיל',
    CLOSED: 'נסגר בשיחה קצרה',
    LONG_TERM: 'המשך לטיפול ארוך'
};

// Terminal statuses — per the 14-day retention policy, picking either of these means the
// case is done, so instead of just updating status and waiting for the retention cron to
// eventually sweep the row, we confirm and hard-delete the intake immediately.
const DELETION_TRIGGER_STATUSES: IntakeStatus[] = ['CLOSED', 'LONG_TERM'];

@Component({
    selector: 'app-intakes-list',
    standalone: true,
    imports: [CommonModule, FormsModule, IntakeDetailModalComponent, ConfirmModalComponent],
    templateUrl: './intakes-list.component.html',
    styleUrls: ['./intakes-list.component.css']
})
export class IntakesListComponent implements OnInit {
    private intakeService = inject(IntakeService);

    readonly statusOptions = STATUS_OPTIONS;

    intakes: IntakeAlert[] = [];
    isLoading = false;
    loadError = '';
    actionError = '';

    selectedIntake: IntakeAlert | null = null;
    isDetailOpen = false;

    /** id of the intake with an in-flight status-update request, if any */
    pendingActionId: number | null = null;

    // Row-level delete (trash icon, or picking CLOSED/LONG_TERM in the status <select>) —
    // confirmed via the shared ConfirmModalComponent, same convention as IntakeAlertsComponent's
    // delete flow. 'status' carries a selectEl so it can be reverted on cancel/failure.
    pendingDeletion: { intake: IntakeAlert; selectEl?: HTMLSelectElement; trigger: 'status' | 'button' } | null = null;

    // Detail-modal delete — the modal keeps its own confirm-prompt in its own view (see
    // IntakeDetailModalComponent), but the actual API call and list refresh happen here;
    // these two flow back down as inputs so the modal shows a spinner/error correctly and
    // only closes on real success.
    isDeletingFromModal = false;
    modalDeleteError = '';

    ngOnInit(): void {
        this.loadIntakes();
    }

    loadIntakes(): void {
        this.isLoading = true;
        this.loadError = '';

        this.intakeService.getIntakes().subscribe({
            next: (intakes) => {
                this.intakes = intakes;
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
                this.loadError = 'לא ניתן לטעון את רשימת האינטייקים כרגע.';
            }
        });
    }

    trackById(_index: number, intake: IntakeAlert): number {
        return intake.id;
    }

    openDetail(intake: IntakeAlert): void {
        this.selectedIntake = intake;
        this.isDetailOpen = true;
    }

    // Stops the row's own (click)="openDetail(...)" from also firing via bubbling — otherwise
    // clicking the button would open the modal twice (harmlessly, but pointlessly) per click.
    onViewDetailsClick(event: Event, intake: IntakeAlert): void {
        event.stopPropagation();
        this.openDetail(intake);
    }

    closeDetail(): void {
        this.isDetailOpen = false;
    }

    // --- Status column (inline <select>, matching IntakeAlertsComponent) ---

    statusLabel(status: IntakeStatus): string {
        return STATUS_LABELS[status];
    }

    isPendingAction(intake: IntakeAlert): boolean {
        return this.pendingActionId === intake.id;
    }

    // selectEl is the native <select> DOM element (passed via a template reference). A
    // one-way [ngModel] binding only re-syncs the DOM when the bound *model* value actually
    // changes identity — if we deliberately leave intake.status untouched (cancelled
    // deletion, rejected PATCH), Angular has no reason to call writeValue() again, so the
    // native control is left showing whatever the user just clicked. Reverting selectEl.value
    // by hand is the only reliable fix for that case.
    onStatusChange(intake: IntakeAlert, newStatus: IntakeStatus, selectEl?: HTMLSelectElement): void {
        if (this.pendingActionId !== null) {
            if (selectEl) {
                selectEl.value = intake.status;
            }
            return;
        }

        if (DELETION_TRIGGER_STATUSES.includes(newStatus)) {
            this.pendingDeletion = { intake, selectEl, trigger: 'status' };
            return;
        }

        this.pendingActionId = intake.id;
        this.actionError = '';

        this.intakeService.updateStatus(intake.id, newStatus).subscribe({
            next: (updated) => {
                Object.assign(intake, updated);
                this.pendingActionId = null;
            },
            error: (err) => {
                this.pendingActionId = null;
                this.actionError = this.describeError(err);
                if (selectEl) {
                    selectEl.value = intake.status;
                }
            }
        });
    }

    // --- Row-level delete (trash icon, or a CLOSED/LONG_TERM status pick) ---

    get isRowDeleteConfirmOpen(): boolean {
        return this.pendingDeletion !== null;
    }

    get rowDeleteConfirmTitle(): string {
        return this.pendingDeletion?.trigger === 'button'
            ? 'מחיקת אינטייק'
            : 'האם למחוק את האינטייק מהאתר?';
    }

    get rowDeleteConfirmMessage(): string {
        if (!this.pendingDeletion) {
            return '';
        }
        return this.pendingDeletion.trigger === 'button'
            ? `האם אתה בטוח שברצונך למחוק את התיק של ${this.pendingDeletion.intake.callerName}? פעולה זו אינה הפיכה.`
            : 'שים לב שלחיצה על כפתור מחיקה תמחק את האינטייק לצמיתות ולא יהיה ניתן לשחזרו';
    }

    requestRowDelete(event: Event, intake: IntakeAlert): void {
        event.stopPropagation(); // don't also trigger the row's own (click)="openDetail(...)"
        if (this.pendingDeletion !== null) {
            return;
        }
        this.pendingDeletion = { intake, trigger: 'button' };
    }

    onConfirmRowDelete(): void {
        if (!this.pendingDeletion) {
            return;
        }
        const { intake } = this.pendingDeletion;
        this.pendingDeletion = null;
        this.actionError = '';

        this.intakeService.deleteIntake(intake.id).subscribe({
            next: () => this.loadIntakes(),
            error: (err) => {
                this.actionError = this.describeError(err);
            }
        });
    }

    // intake.status was never mutated while the delete confirmation was open, but the native
    // <select> already visually shows what the user clicked — revert it by hand (see the
    // comment on onStatusChange for why the [ngModel] binding alone won't do this).
    onCancelRowDelete(): void {
        if (this.pendingDeletion?.selectEl) {
            this.pendingDeletion.selectEl.value = this.pendingDeletion.intake.status;
        }
        this.pendingDeletion = null;
    }

    dismissActionError(): void {
        this.actionError = '';
    }

    // --- Detail-modal delete (confirmed inside IntakeDetailModalComponent's own view) ---

    onModalDeleteConfirmed(intake: IntakeAlert): void {
        this.isDeletingFromModal = true;
        this.modalDeleteError = '';

        this.intakeService.deleteIntake(intake.id).subscribe({
            next: () => {
                this.isDeletingFromModal = false;
                this.isDetailOpen = false;
                this.loadIntakes();
            },
            error: (err) => {
                this.isDeletingFromModal = false;
                this.modalDeleteError = this.describeError(err);
            }
        });
    }

    private describeError(err: any): string {
        if (err?.status === 0) {
            return 'לא ניתן להתחבר לשרת. בדוק/י את החיבור לאינטרנט ונסה/י שוב.';
        }
        return err?.error?.message || err?.message || 'הפעולה נכשלה. נסה/י שוב.';
    }

    callerTypeLabel(intake: IntakeAlert): string {
        return getCallerTypeLabel(intake.callReport?.callerType);
    }

    magenContactHistoryLabel(intake: IntakeAlert): string {
        return getMagenContactHistoryLabel(intake.callReport?.magenContactHistory);
    }

    reportingDutyLabel(intake: IntakeAlert): string {
        return getReportingDutyLabel(intake.callReport?.reportingDuty);
    }

    // Already an "כן"/"לא" display string from the backend (see reportService.ts), not a
    // boolean — shown as-is rather than re-derived from a truthy check (a non-empty "לא"
    // string is truthy in JS, so a naive ternary would show "כן" for every row).
    contactedOtherCenterLabel(intake: IntakeAlert): string {
        return intake.contactedOtherCenter || '-';
    }
}
