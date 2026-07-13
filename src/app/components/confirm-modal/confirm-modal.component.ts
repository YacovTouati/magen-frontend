import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';

@Component({
    selector: 'app-confirm-modal',
    standalone: true,
    imports: [CommonModule, ModalShellComponent],
    templateUrl: './confirm-modal.component.html',
    styleUrls: ['./confirm-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmModalComponent {
    @Input() isOpen = false;
    @Input() title = 'אישור פעולה';
    @Input() message = '';
    @Input() confirmLabel = 'אישור';
    @Input() cancelLabel = 'ביטול';

    @Output() confirmed = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    onConfirm(): void {
        this.confirmed.emit();
    }

    onCancel(): void {
        this.cancelled.emit();
    }
}
