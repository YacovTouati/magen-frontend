import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { IntakeService, IntakeAlert, IntakeUrgency, IntakeStatus } from '../../services/intake.service';

const STATUS_OPTIONS: IntakeStatus[] = ['NEW', 'NO_ANSWER', 'ACTIVE', 'CLOSED', 'LONG_TERM'];

const STATUS_LABELS: Record<IntakeStatus, string> = {
    NEW: 'חדש',
    NO_ANSWER: 'לא ענה - לנסות שוב',
    ACTIVE: 'בטיפול פעיל',
    CLOSED: 'נסגר בשיחה קצרה',
    LONG_TERM: 'המשך לטיפול ארוך'
};

const UNASSIGNED_STATUS: IntakeStatus = 'NEW';

// Terminal statuses — per the 14-day retention policy, picking either of these means the
// case is done, so instead of just updating status and waiting for the retention cron to
// eventually sweep the row, we confirm and hard-delete the intake immediately.
const DELETION_TRIGGER_STATUSES: IntakeStatus[] = ['CLOSED', 'LONG_TERM'];

const EXPIRING_SOON_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const URGENCY_LABELS: Record<IntakeUrgency, string> = {
    CRITICAL: 'קריטית',
    HIGH: 'גבוהה',
    MEDIUM: 'בינונית',
    LOW: 'נמוכה'
};

const GENERIC_ACTION_ERROR = 'הפעולה נכשלה. ייתכן שמצב התיק השתנה בינתיים — רענן/י ונסה/י שוב.';

// Hoisted to module scope: constructing Intl.DateTimeFormat parses locale data and is
// comparatively expensive — formatDate() runs twice per row on every change-detection
// cycle (createdAt + expiresAt columns), so it must reuse one instance, not build a new
// one per call.
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
});

@Component({
    selector: 'app-intake-alerts',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmModalComponent],
    templateUrl: './intake-alerts.component.html',
    styleUrls: ['./intake-alerts.component.css']
})
export class IntakeAlertsComponent implements OnInit {
    private intakeService = inject(IntakeService);

    readonly statusOptions = STATUS_OPTIONS;

    intakes: IntakeAlert[] = [];
    isExpanded = false;
    isLoadingIntakes = false;
    loadError = '';

    /** id of the intake with an in-flight status/extend/delete request, if any */
    pendingActionId: number | null = null;
    actionError = '';

    private pendingDeletion: { intake: IntakeAlert; selectEl?: HTMLSelectElement } | null = null;

    ngOnInit(): void {
        this.loadIntakes();
    }

    loadIntakes(): void {
        this.isLoadingIntakes = true;
        this.loadError = '';

        this.intakeService.getIntakes().subscribe({
            next: (intakes) => {
                this.intakes = intakes;
                this.isLoadingIntakes = false;
            },
            error: () => {
                this.loadError = 'לא ניתן לטעון את דיווחי האינטייק כרגע.';
                this.isLoadingIntakes = false;
            }
        });
    }

    get pendingCount(): number {
        return this.intakes.filter(intake => intake.status === UNASSIGNED_STATUS).length;
    }

    togglePanel(): void {
        this.isExpanded = !this.isExpanded;
    }

    urgencyLabel(urgency: IntakeUrgency): string {
        return URGENCY_LABELS[urgency];
    }

    statusLabel(status: IntakeStatus): string {
        return STATUS_LABELS[status];
    }

    dutyLabel(intake: IntakeAlert): string {
        const duty = intake.callReport?.reportingDuty;

        if (duty === null || duty === undefined) {
            return '—';
        }

        return duty ? 'כן' : 'לא';
    }

    formatCreatedAt(date: Date): string {
        return this.formatDate(date);
    }

    formatExpiresAt(date: Date): string {
        return this.formatDate(date);
    }

    private formatDate(date: Date): string {
        return DATE_TIME_FORMATTER.format(date);
    }

    isPendingAction(intake: IntakeAlert): boolean {
        return this.pendingActionId === intake.id;
    }

    /** Highlights reports that haven't been touched yet, regardless of urgency. */
    isNewStatus(intake: IntakeAlert): boolean {
        return intake.status === UNASSIGNED_STATUS;
    }

    /** True once less than 24 hours remain before the retention cron would delete this
     *  intake (also true if it's already past its deadline but not yet swept). */
    isExpiringSoon(intake: IntakeAlert): boolean {
        return intake.expiresAt.getTime() - Date.now() < EXPIRING_SOON_THRESHOLD_MS;
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
            this.pendingDeletion = { intake, selectEl };
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

    extendIntake(intake: IntakeAlert): void {
        if (this.pendingActionId !== null) {
            return;
        }

        this.pendingActionId = intake.id;
        this.actionError = '';

        this.intakeService.extendExpiration(intake.id).subscribe({
            next: (updated) => {
                Object.assign(intake, updated);
                this.pendingActionId = null;
            },
            error: (err) => {
                this.pendingActionId = null;
                this.actionError = this.describeError(err);
            }
        });
    }

    get isDeleteConfirmOpen(): boolean {
        return this.pendingDeletion !== null;
    }

    onConfirmDelete(): void {
        if (!this.pendingDeletion) {
            return;
        }

        const { intake } = this.pendingDeletion;
        this.pendingDeletion = null;
        this.pendingActionId = intake.id;
        this.actionError = '';

        this.intakeService.deleteIntake(intake.id).subscribe({
            next: () => {
                this.intakes = this.intakes.filter(i => i.id !== intake.id);
                this.pendingActionId = null;
            },
            error: (err) => {
                this.pendingActionId = null;
                this.actionError = this.describeError(err);
            }
        });
    }

    // intake.status was never mutated while the delete confirmation was open, but the
    // native <select> already visually shows what the user clicked — revert it by hand
    // (see the comment on onStatusChange for why the [ngModel] binding alone won't do this).
    onCancelDelete(): void {
        if (this.pendingDeletion?.selectEl) {
            this.pendingDeletion.selectEl.value = this.pendingDeletion.intake.status;
        }
        this.pendingDeletion = null;
    }

    dismissActionError(): void {
        this.actionError = '';
    }

    private describeError(err: any): string {
        // status 0 means the request never reached the server (offline / CORS / server down) —
        // don't show the raw HttpErrorResponse string, it's meaningless to an end user.
        if (err?.status === 0) {
            return 'לא ניתן להתחבר לשרת. בדוק/י את החיבור לאינטרנט ונסה/י שוב.';
        }

        return err?.error?.message || err?.message || GENERIC_ACTION_ERROR;
    }
}
