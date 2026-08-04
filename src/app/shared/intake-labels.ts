import { CallerType, IntakeStatus, IntakeUrgency, MagenContactHistory } from '../services/intake.service';

// Hebrew display labels for the Intakes Management view — mirrors the exact wording already
// used elsewhere in the app (report.component.ts's <select> options, IntakeAlertsComponent's
// status/urgency labels) so the same backend value always reads the same way everywhere.

const URGENCY_LABELS: Record<IntakeUrgency, string> = {
    CRITICAL: 'קריטית',
    HIGH: 'גבוהה',
    MEDIUM: 'בינונית',
    LOW: 'נמוכה'
};

const STATUS_LABELS: Record<IntakeStatus, string> = {
    NEW: 'חדש',
    NO_ANSWER: 'לא ענה - לנסות שוב',
    ACTIVE: 'בטיפול פעיל',
    CLOSED: 'נסגר בשיחה קצרה',
    LONG_TERM: 'המשך לטיפול ארוך'
};

const CALLER_TYPE_LABELS: Record<CallerType, string> = {
    victim: 'נפגע/ת ישיר/ה',
    family: 'בן/בת משפחה',
    friend: 'חבר/ה או מכר/ה',
    unknown: 'אנונימי'
};

const MAGEN_CONTACT_HISTORY_LABELS: Record<MagenContactHistory, string> = {
    first_time: 'פעם ראשונה',
    past: 'פנה בעבר',
    dont_remember: 'לא זוכר'
};

export function getUrgencyLabel(urgency: IntakeUrgency | null | undefined): string {
    return (urgency && URGENCY_LABELS[urgency]) ?? '—';
}

export function getStatusLabel(status: IntakeStatus | null | undefined): string {
    return (status && STATUS_LABELS[status]) ?? '—';
}

export function getCallerTypeLabel(callerType: CallerType | string | null | undefined): string {
    if (!callerType) {
        return '-';
    }
    return CALLER_TYPE_LABELS[callerType as CallerType] ?? callerType;
}

export function getMagenContactHistoryLabel(history: MagenContactHistory | string | null | undefined): string {
    if (!history) {
        return '-';
    }
    return MAGEN_CONTACT_HISTORY_LABELS[history as MagenContactHistory] ?? history;
}

export function getYesNoLabel(value: boolean | null | undefined): string {
    if (value === null || value === undefined) {
        return '-';
    }
    return value ? 'כן' : 'לא';
}
