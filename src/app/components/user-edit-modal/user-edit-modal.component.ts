import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { User } from '../../services/user-management.service';
import { ROLE_OPTIONS, UserRole } from '../../shared/role-labels';

export interface UserEditPayload {
    name: string;
    email: string;
    role: UserRole;
}

// Same convention as ShiftNoteModalComponent: purely @Input-driven, makes no service
// calls of its own. The parent (UserManagementComponent) owns the actual PATCH call and
// reflects in-flight/error state back via [isSaving]/[saveError] (e.g. a 409 email
// conflict), so this only closes on real success.
@Component({
    selector: 'app-user-edit-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalShellComponent],
    templateUrl: './user-edit-modal.component.html',
    styleUrls: ['./user-edit-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserEditModalComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() user: User | null = null;
    @Input() isSaving = false;
    @Input() saveError = '';

    @Output() closed = new EventEmitter<void>();
    @Output() saved = new EventEmitter<UserEditPayload>();

    readonly roleOptions = ROLE_OPTIONS;

    draftName = '';
    draftEmail = '';
    draftRole: UserRole = 'VOLUNTEER';

    // A fresh user (or the modal reopening) always starts from that user's current
    // values — never carries a stale draft over from whichever row was edited last.
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['user'] || (changes['isOpen'] && this.isOpen)) {
            this.draftName = this.user?.name ?? '';
            this.draftEmail = this.user?.email ?? '';
            this.draftRole = (this.user?.role as UserRole) ?? 'VOLUNTEER';
        }
    }

    get isValid(): boolean {
        return !!this.draftName.trim() && !!this.draftEmail.trim();
    }

    onClose(): void {
        this.closed.emit();
    }

    onSave(): void {
        if (!this.isValid || this.isSaving) {
            return;
        }

        this.saved.emit({
            name: this.draftName.trim(),
            email: this.draftEmail.trim(),
            role: this.draftRole
        });
    }
}
