import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { ShiftRecord } from '../../services/schedule.service';

const NOTE_MAX_LENGTH = 500;

// Same convention as IntakeDetailModalComponent: purely @Input-driven, makes no service
// calls of its own. The parent (ShiftBoardComponent) owns the actual PATCH/DELETE calls and
// reflects in-flight/error state back via [isSaving]/[saveError] so this only closes or
// leaves edit mode on real success. canManage gates edit/delete entirely — a volunteer
// opening a shift with a note only ever sees the read-only view.
@Component({
    selector: 'app-shift-note-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalShellComponent],
    templateUrl: './shift-note-modal.component.html',
    styleUrls: ['./shift-note-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShiftNoteModalComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() shift: ShiftRecord | null = null;
    @Input() canManage = false;
    @Input() isSaving = false;
    @Input() saveError = '';

    @Output() closed = new EventEmitter<void>();
    @Output() noteSaved = new EventEmitter<string>();
    @Output() noteDeleted = new EventEmitter<void>();

    readonly maxLength = NOTE_MAX_LENGTH;

    isEditing = false;
    isConfirmingDelete = false;
    draftNote = '';

    // A fresh shift (or the modal reopening) always starts from a clean state — straight
    // into edit mode when there's no note yet to show (an authorized user can only have
    // opened this to add one), otherwise the read-only view.
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['shift'] || (changes['isOpen'] && this.isOpen)) {
            this.isConfirmingDelete = false;
            this.draftNote = this.shift?.note ?? '';
            this.isEditing = this.canManage && !this.shift?.note;
        }
    }

    get shiftTypeLabel(): string {
        return this.shift?.type === 'EVENING' ? 'משמרת ערב' : 'משמרת בוקר';
    }

    onClose(): void {
        this.isConfirmingDelete = false;
        this.isEditing = false;
        this.closed.emit();
    }

    startEditing(): void {
        this.draftNote = this.shift?.note ?? '';
        this.isEditing = true;
    }

    // Backing out of "add" mode (no note existed before) has no view to fall back to, so
    // it closes the modal entirely rather than leaving it open on nothing.
    cancelEditing(): void {
        if (!this.shift?.note) {
            this.onClose();
            return;
        }
        this.isEditing = false;
    }

    saveNote(): void {
        const trimmed = this.draftNote.trim();
        if (!trimmed) {
            return;
        }
        this.noteSaved.emit(trimmed);
    }

    requestDeleteConfirmation(): void {
        this.isConfirmingDelete = true;
    }

    cancelDeleteConfirmation(): void {
        this.isConfirmingDelete = false;
    }

    confirmDelete(): void {
        this.noteDeleted.emit();
    }
}
