import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Shared overlay/backdrop/panel mechanics for every modal in the app (blurred backdrop,
 * click-outside-to-close, pop-in animation). Each modal projects its own header/body/footer
 * content — the shell owns none of that, only the chrome around it.
 */
@Component({
    selector: 'app-modal-shell',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './modal-shell.component.html',
    styleUrls: ['./modal-shell.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalShellComponent {
    @Input() isOpen = false;
    @Input() maxWidth = '440px';

    @Output() backdropClick = new EventEmitter<void>();

    onBackdropClick(): void {
        this.backdropClick.emit();
    }

    onPanelClick(event: Event): void {
        event.stopPropagation();
    }
}
