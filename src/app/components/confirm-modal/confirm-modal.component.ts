import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-confirm-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './confirm-modal.component.html',
    styleUrls: ['./confirm-modal.component.css']
})
export class ConfirmModalComponent {
    @Input() isOpen = false;
    @Input() title = 'אישור פעולה';
    @Input() message = '';
    @Input() confirmLabel = 'אישור';
    @Input() cancelLabel = 'ביטול';

    @Output() confirmed = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    onBackdropClick(): void {
        this.cancelled.emit();
    }

    onPanelClick(event: Event): void {
        event.stopPropagation();
    }

    onConfirm(): void {
        this.confirmed.emit();
    }

    onCancel(): void {
        this.cancelled.emit();
    }
}
