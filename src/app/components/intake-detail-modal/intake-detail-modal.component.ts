import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { IntakeAlert } from '../../services/intake.service';
import {
    getCallerTypeLabel,
    getMagenContactHistoryLabel,
    getReportingDutyLabel,
    getStatusLabel,
    getUrgencyLabel
} from '../../shared/intake-labels';

// Presentational detail view for a single intake — purely @Input-driven, same convention
// as ConfirmModalComponent/SuccessModalComponent/ShiftSelectionModalComponent. It still
// makes no service calls of its own: the delete confirmation prompt lives inside this
// modal's own view (swapped in for the detail view, not a second stacked modal-shell), but
// the actual DELETE call and list refresh are the parent's job — this only emits
// deleteConfirmed once the user has confirmed, and reflects the parent's in-flight/error
// state back via [isDeleting]/[deleteError] so the modal only closes on real success.
@Component({
    selector: 'app-intake-detail-modal',
    standalone: true,
    imports: [CommonModule, ModalShellComponent],
    templateUrl: './intake-detail-modal.component.html',
    styleUrls: ['./intake-detail-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntakeDetailModalComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() intake: IntakeAlert | null = null;
    @Input() isDeleting = false;
    @Input() deleteError = '';

    @Output() closed = new EventEmitter<void>();
    @Output() deleteConfirmed = new EventEmitter<IntakeAlert>();

    isConfirmingDelete = false;

    private readonly dateTimeFormatter = new Intl.DateTimeFormat('he-IL', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // A fresh intake (or the modal reopening) always starts from the detail view, never
    // mid-confirmation from whatever the previous intake was showing.
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['intake'] || (changes['isOpen'] && this.isOpen)) {
            this.isConfirmingDelete = false;
        }
    }

    urgencyLabel(): string {
        return getUrgencyLabel(this.intake?.urgency);
    }

    statusLabel(): string {
        return getStatusLabel(this.intake?.status);
    }

    callerTypeLabel(): string {
        return getCallerTypeLabel(this.intake?.callReport?.callerType);
    }

    magenContactHistoryLabel(): string {
        return getMagenContactHistoryLabel(this.intake?.callReport?.magenContactHistory);
    }

    reportingDutyLabel(): string {
        return getReportingDutyLabel(this.intake?.callReport?.reportingDuty);
    }

    isDutyYes(): boolean {
        const duty = this.intake?.callReport?.reportingDuty;
        return duty === 'yes_practical' || duty === 'yes_principled';
    }

    // contactedOtherCenter arrives from the backend as an already-Hebrew display string
    // ("כן"/"לא"), not a boolean — see reportService.ts's ternary at intake-creation time —
    // so it's shown as-is rather than re-derived from a truthy check.
    contactedOtherCenterLabel(): string {
        return this.intake?.contactedOtherCenter || '-';
    }

    formatCreatedAt(): string {
        return this.intake ? this.dateTimeFormatter.format(this.intake.createdAt) : '';
    }

    formatExpiresAt(): string {
        return this.intake ? this.dateTimeFormatter.format(this.intake.expiresAt) : '';
    }

    // Only ONE conversation-text field is shown now — summaryNotes (the volunteer's actual
    // call summary) — falling back to caseDescription only when summaryNotes is genuinely
    // absent (null/undefined), per spec. `??` specifically, not `||`: an empty-but-present
    // summaryNotes string should still win over the fallback.
    contentText(): string {
        return this.intake?.callReport?.summaryNotes ?? this.intake?.caseDescription ?? '—';
    }

    onClose(): void {
        this.isConfirmingDelete = false;
        this.closed.emit();
    }

    requestDeleteConfirmation(): void {
        this.isConfirmingDelete = true;
    }

    cancelDeleteConfirmation(): void {
        this.isConfirmingDelete = false;
    }

    confirmDelete(): void {
        if (!this.intake) {
            return;
        }
        this.deleteConfirmed.emit(this.intake);
    }
}
