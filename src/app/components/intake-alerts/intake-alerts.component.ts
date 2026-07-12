import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';

export type IntakeUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IntakeStatus =
    | 'חדש'
    | 'לא ענה - לנסות שוב'
    | 'בטיפול פעיל'
    | 'נסגר בשיחה קצרה'
    | 'המשך לטיפול ארוך';

export type IntakeRowAction = 'claim' | 'mine' | 'takeover' | 'locked';

type PendingConfirmation =
    | { kind: 'release'; intake: IntakeAlert }
    | { kind: 'takeover'; intake: IntakeAlert };

export interface IntakeAlert {
    id: number;
    callerName: string;
    phone: string;
    email: string;
    urgency: IntakeUrgency;
    createdAt: Date;
    reportingDuty: boolean;
    contactedOtherCenter: string;
    caseDescription: string;
    status: IntakeStatus;
    assignedTo: string | null;
}

const STATUS_OPTIONS: IntakeStatus[] = [
    'חדש',
    'לא ענה - לנסות שוב',
    'בטיפול פעיל',
    'נסגר בשיחה קצרה',
    'המשך לטיפול ארוך'
];

const ACTIVE_STATUS: IntakeStatus = 'בטיפול פעיל';
const UNASSIGNED_STATUS: IntakeStatus = 'חדש';

const URGENCY_LABELS: Record<IntakeUrgency, string> = {
    CRITICAL: 'קריטית',
    HIGH: 'גבוהה',
    MEDIUM: 'בינונית',
    LOW: 'נמוכה'
};

function minutesAgo(minutes: number): Date {
    return new Date(Date.now() - minutes * 60 * 1000);
}

// TODO: replace with a real intake-reports API call once the Prisma models/endpoints land
function seedIntakes(): IntakeAlert[] {
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
            caseDescription: 'פנייה דחופה בנוגע לחשש ממצוקה מיידית, מבקשת ליווי טלפוני עוד היום.',
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
            caseDescription: 'שיחת המשך לבירור מצב לאחר פנייה קודמת, אין חובת דיווח.',
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
            caseDescription: 'בקשה למידע כללי על שירותי התמיכה, ללא מצוקה מיידית.',
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
            caseDescription: 'פנייה כללית, נסגרה בשיחה קצרה עם מענה ראשוני.',
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
            caseDescription: 'שיחה רגישה שבטיפול פעיל כרגע, לא לפצל בין מטפלים.',
            status: 'בטיפול פעיל',
            assignedTo: 'רבקה ס.'
        }
    ];
}

@Component({
    selector: 'app-intake-alerts',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmModalComponent],
    templateUrl: './intake-alerts.component.html',
    styleUrls: ['./intake-alerts.component.css']
})
export class IntakeAlertsComponent {
    private authService = inject(AuthService);

    readonly statusOptions = STATUS_OPTIONS;

    intakes: IntakeAlert[] = seedIntakes();
    isExpanded = false;
    private pendingConfirmation: PendingConfirmation | null = null;

    get pendingCount(): number {
        return this.intakes.filter(intake => intake.status === UNASSIGNED_STATUS).length;
    }

    get currentAdminName(): string {
        const user = this.authService.getUser();
        return user?.['name'] ?? user?.['fullName'] ?? (user?.email ? user.email.split('@')[0] : 'מנהל');
    }

    togglePanel(): void {
        this.isExpanded = !this.isExpanded;
    }

    urgencyLabel(urgency: IntakeUrgency): string {
        return URGENCY_LABELS[urgency];
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
        return intake.assignedTo === this.currentAdminName;
    }

    /** Only the current owner may edit status; an unowned case is locked until someone claims it. */
    canEditStatus(intake: IntakeAlert): boolean {
        return !!intake.assignedTo && this.isOwner(intake);
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
        if (!this.canEditStatus(intake)) {
            return;
        }

        intake.status = newStatus;
    }

    claimOwnership(intake: IntakeAlert): void {
        if (intake.assignedTo) {
            return;
        }

        intake.assignedTo = this.currentAdminName;
    }

    /** Opens the in-app confirmation modal; the actual state change happens in onConfirmAccept(). */
    releaseOwnership(intake: IntakeAlert): void {
        if (!this.isOwner(intake)) {
            return;
        }

        this.pendingConfirmation = { kind: 'release', intake };
    }

    /** Opens the in-app confirmation modal; the actual state change happens in onConfirmAccept(). */
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
        return `התיק של ${intake.callerName} משויך כרגע ל-${intake.assignedTo}. להעביר את הטיפול אליך?`;
    }

    onConfirmAccept(): void {
        if (!this.pendingConfirmation) {
            return;
        }

        const { kind, intake } = this.pendingConfirmation;

        if (kind === 'release') {
            intake.assignedTo = null;
            intake.status = UNASSIGNED_STATUS;
        } else {
            intake.assignedTo = this.currentAdminName;
        }

        this.pendingConfirmation = null;
    }

    onConfirmCancel(): void {
        this.pendingConfirmation = null;
    }
}
