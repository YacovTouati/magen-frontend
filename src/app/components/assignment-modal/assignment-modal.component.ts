import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../services/user-management.service';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';

@Component({
    selector: 'app-assignment-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalShellComponent],
    templateUrl: './assignment-modal.component.html',
    styleUrls: ['./assignment-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentModalComponent {
    @Input() isOpen = false;
    @Input() dayLabel = '';
    @Input() users: User[] = [];
    @Input() isLoading = false;
    @Input() errorMessage = '';

    @Output() selectUser = new EventEmitter<User>();
    @Output() closeModal = new EventEmitter<void>();

    searchTerm = '';

    get filteredUsers(): User[] {
        const term = this.searchTerm.trim().toLowerCase();
        if (!term) {
            return this.users;
        }

        return this.users.filter(user =>
            (user.name ?? '').toLowerCase().includes(term) ||
            (user.email ?? '').toLowerCase().includes(term)
        );
    }

    getRoleLabel(role: string | undefined): string {
        return role === 'ADMIN' ? 'מנהל' : 'מתנדב';
    }

    onSelect(user: User): void {
        this.selectUser.emit(user);
    }

    onCancel(): void {
        this.searchTerm = '';
        this.closeModal.emit();
    }
}
