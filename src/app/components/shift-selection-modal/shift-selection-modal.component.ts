import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { ShiftRecord, ShiftType, ShiftVolunteer } from '../../services/schedule.service';

export interface AdminAssignment {
    shift: ShiftRecord;
    volunteerId: number;
}

@Component({
    selector: 'app-shift-selection-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalShellComponent],
    templateUrl: './shift-selection-modal.component.html',
    styleUrls: ['./shift-selection-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShiftSelectionModalComponent {
    @Input() isOpen = false;
    @Input() dayLabel = '';
    @Input() morningShift: ShiftRecord | null = null;
    @Input() eveningShift: ShiftRecord | null = null;
    @Input() isAdmin = false;
    // Only populated/consumed when isAdmin — the roster for the assignment dropdown.
    @Input() volunteers: ShiftVolunteer[] = [];
    @Input() currentUserId: number | null = null;

    // Volunteer flow: emits the chosen shift only — the caller owns the confirm step and
    // the actual claim HTTP call (self-claim, always the calling user).
    @Output() selectShift = new EventEmitter<ShiftRecord>();
    // Admin flow: emits the chosen shift AND the volunteer to assign it to — backed by
    // POST /shifts/:id/admin-assign, which can grab an OPEN shift or overwrite a LOCKED one.
    @Output() adminAssign = new EventEmitter<AdminAssignment>();
    @Output() releaseShift = new EventEmitter<ShiftRecord>();
    @Output() closeModal = new EventEmitter<void>();

    selectedType: ShiftType | null = null;
    selectedVolunteerId: number | null = null;

    // Admins face no lock restriction at all here — /admin-assign works whether the shift
    // is OPEN or LOCKED. Volunteers keep the original OPEN-only gate.
    get canSelectMorning(): boolean {
        return this.isAdmin || this.morningShift?.status === 'OPEN';
    }

    get canSelectEvening(): boolean {
        return this.isAdmin || this.eveningShift?.status === 'OPEN';
    }

    get canReleaseMorning(): boolean {
        return this.isAdmin && this.morningShift?.status === 'LOCKED';
    }

    get canReleaseEvening(): boolean {
        return this.isAdmin && this.eveningShift?.status === 'LOCKED';
    }

    get selectedShift(): ShiftRecord | null {
        if (this.selectedType === 'MORNING') {
            return this.morningShift;
        }
        if (this.selectedType === 'EVENING') {
            return this.eveningShift;
        }
        return null;
    }

    // Re-derives the dropdown default whenever the radio choice changes: the shift's
    // current occupant if it's LOCKED, otherwise the admin's own account.
    onTypeChange(): void {
        if (!this.isAdmin) {
            return;
        }

        const shift = this.selectedShift;
        this.selectedVolunteerId = shift?.status === 'LOCKED' && shift.volunteer
            ? shift.volunteer.id
            : this.currentUserId;
    }

    roleLabel(role: string | undefined): string {
        return role === 'ADMIN' ? 'מנהל' : 'מתנדב';
    }

    onConfirmSelection(): void {
        const shift = this.selectedShift;
        if (!shift) {
            return;
        }

        if (this.isAdmin) {
            if (this.selectedVolunteerId == null) {
                return;
            }
            this.adminAssign.emit({ shift, volunteerId: this.selectedVolunteerId });
        } else {
            if (shift.status !== 'OPEN') {
                return;
            }
            this.selectShift.emit(shift);
        }

        this.selectedType = null;
        this.selectedVolunteerId = null;
    }

    onRelease(type: ShiftType): void {
        const shift = type === 'MORNING' ? this.morningShift : this.eveningShift;
        if (!shift || shift.status !== 'LOCKED') {
            return;
        }

        this.releaseShift.emit(shift);
    }

    onCancel(): void {
        this.selectedType = null;
        this.selectedVolunteerId = null;
        this.closeModal.emit();
    }
}
