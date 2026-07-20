import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';

@Component({
    selector: 'app-success-modal',
    standalone: true,
    imports: [CommonModule, ModalShellComponent],
    templateUrl: './success-modal.component.html',
    styleUrls: ['./success-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuccessModalComponent {
    @Input() isOpen = false;
    @Input() title = 'בוצע בהצלחה!';
    @Input() message = '';
    @Input() closeLabel = 'סגור';

    @Output() closed = new EventEmitter<void>();

    onClose(): void {
        this.closed.emit();
    }
}
