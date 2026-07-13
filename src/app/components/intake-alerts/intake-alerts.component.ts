import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { IntakeService, IntakeAlert, IntakeUrgency, IntakeStatus } from '../../services/intake.service';

export type IntakeRowAction = 'claim' | 'mine' | 'takeover' | 'locked';

type PendingConfirmation =
    | { kind: 'release'; intake: IntakeAlert }
    | { kind: 'takeover'; intake: IntakeAlert };

const STATUS_OPTIONS: IntakeStatus[] = ['NEW', 'NO_ANSWER', 'ACTIVE', 'CLOSED', 'LONG_TERM'];

const STATUS_LABELS: Record<IntakeStatus, string> = {
    NEW: 'חדש',
    NO_ANSWER: 'לא ענה - לנסות שוב',
    ACTIVE: 'בטיפול פעיל',
    CLOSED: 'נסגר בשיחה קצרה',
    LONG_TERM: 'המשך לטיפול ארוך'
};

const ACTIVE_STATUS: IntakeStatus = 'ACTIVE';
const UNASSIGNED_STATUS: IntakeStatus = 'NEW';

const URGENCY_LABELS: Record<IntakeUrgency, string> = {
    CRITICAL: 'קריטית',
    HIGH: 'גבוהה',
    MEDIUM: 'בינונית',
    LOW: 'נמוכה'
};

const GENERIC_ACTION_ERROR = 'הפעולה נכשלה. ייתכן שמצב התיק השתנה בינתיים — רענן/י ונסה/י שוב.';

@Component({
    selector: 'app-intake-alerts',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmModalComponent],
    templateUrl: './intake-alerts.component.html',
    styleUrls: ['./intake-alerts.component.css']
})
export class IntakeAlertsComponent implements OnInit {
    private authService = inject(AuthService);
    private intakeService = inject(IntakeService);

    readonly statusOptions = STATUS_OPTIONS;

    intakes: IntakeAlert[] = [];
    isExpanded = false;
    isLoadingIntakes = false;
    loadError = '';

    /** id of the intake with an in-flight claim/undo/takeover/status request, if any */
    pendingActionId: number | null = null;
    actionError = '';

    private pendingConfirmation: PendingConfirmation | null = null;

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

    /** The login response only guarantees { id, email, role } — no display name — so ownership
     *  must be compared by id, not by a name string that may not even be available. */
    get currentAdminId(): number | null {
        const user = this.authService.getUser();
        return user?.['id'] ?? null;
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
        return new Intl.DateTimeFormat('he-IL', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    isOwner(intake: IntakeAlert): boolean {
        return intake.assignedTo !== null && intake.assignedTo.id === this.currentAdminId;
    }

    /** Only the current owner may edit status; an unowned case is locked until someone claims it. */
    canEditStatus(intake: IntakeAlert): boolean {
        return !!intake.assignedTo && this.isOwner(intake);
    }

    isPendingAction(intake: IntakeAlert): boolean {
        return this.pendingActionId === intake.id;
    }

    /**
     * Drives which action a row exposes:
     * - claim:    nobody owns it yet — anyone can take responsibility
     * - mine:     the current admin owns it — click again to release (with confirmation)
     * - locked:   someone else owns it and is actively working it — no handover possible
     * - takeover: someone else owns it but released it (status moved off "active") — open for handover
     */
    getRowAction(intake: IntakeAlert): IntakeRowAction {
        if (!intake.assignedTo) {
            return 'claim';
        }

        if (this.isOwner(intake)) {
            return 'mine';
        }

        return intake.status === ACTIVE_STATUS ? 'locked' : 'takeover';
    }

    onStatusChange(intake: IntakeAlert, newStatus: IntakeStatus): void {
        if (!this.canEditStatus(intake) || this.pendingActionId !== null) {
            return;
        }

        this.pendingActionId = intake.id;
        this.actionError = '';

        // Pessimistic update: intake.status only changes once the server confirms it, so the
        // one-way [ngModel] binding naturally snaps the <select> back to the current value on
        // its own if this request fails — no manual rollback needed.
        this.intakeService.updateStatus(intake.id, newStatus).subscribe({
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

    claimOwnership(intake: IntakeAlert): void {
        if (intake.assignedTo || this.pendingActionId !== null) {
            return;
        }

        this.pendingActionId = intake.id;
        this.actionError = '';

        this.intakeService.claimOwnership(intake.id).subscribe({
            next: (updated) => {
                Object.assign(intake, updated);
                this.pendingActionId = null;
            },
            error: (err) => {
                this.pendingActionId = null;
                this.actionError = this.describeError(err);
                this.loadIntakes(); // someone else likely claimed it first — resync with the server's truth
            }
        });
    }

    /** Opens the in-app confirmation modal; the actual API call happens in onConfirmAccept(). */
    releaseOwnership(intake: IntakeAlert): void {
        if (!this.isOwner(intake)) {
            return;
        }

        this.pendingConfirmation = { kind: 'release', intake };
    }

    /** Opens the in-app confirmation modal; the actual API call happens in onConfirmAccept(). */
    takeOverCase(intake: IntakeAlert): void {
        if (this.getRowAction(intake) !== 'takeover') {
            return;
        }

        this.pendingConfirmation = { kind: 'takeover', intake };
    }

    get isConfirmOpen(): boolean {
        return this.pendingConfirmation !== null;
    }

    get confirmMessage(): string {
        if (!this.pendingConfirmation) {
            return '';
        }

        if (this.pendingConfirmation.kind === 'release') {
            return 'האם אתה בטוח שברצונך לבטל את שיוך התיק אליך?';
        }

        const { intake } = this.pendingConfirmation;
        return `התיק של ${intake.callerName} משויך כרגע ל-${intake.assignedTo?.name}. להעביר את הטיפול אליך?`;
    }

    onConfirmAccept(): void {
        if (!this.pendingConfirmation) {
            return;
        }

        const { kind, intake } = this.pendingConfirmation;
        this.pendingConfirmation = null;
        this.pendingActionId = intake.id;
        this.actionError = '';

        const request$ = kind === 'release'
            ? this.intakeService.undoClaim(intake.id)
            : this.intakeService.takeOverCase(intake.id);

        request$.subscribe({
            next: (updated) => {
                Object.assign(intake, updated);
                this.pendingActionId = null;
            },
            error: (err) => {
                this.pendingActionId = null;
                this.actionError = this.describeError(err);
                this.loadIntakes(); // reconcile with the server's authoritative state after a failed handover/release
            }
        });
    }

    onConfirmCancel(): void {
        this.pendingConfirmation = null;
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
