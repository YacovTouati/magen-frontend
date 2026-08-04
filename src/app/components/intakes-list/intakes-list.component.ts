import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IntakeService, IntakeAlert } from '../../services/intake.service';
import { IntakeDetailModalComponent } from '../intake-detail-modal/intake-detail-modal.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import {
    getCallerTypeLabel,
    getMagenContactHistoryLabel,
    getReportingDutyLabel
} from '../../shared/intake-labels';

@Component({
    selector: 'app-intakes-list',
    standalone: true,
    imports: [CommonModule, IntakeDetailModalComponent, ConfirmModalComponent],
    templateUrl: './intakes-list.component.html',
    styleUrls: ['./intakes-list.component.css']
})
export class IntakesListComponent implements OnInit {
    private intakeService = inject(IntakeService);

    intakes: IntakeAlert[] = [];
    isLoading = false;
    loadError = '';
    actionError = '';

    selectedIntake: IntakeAlert | null = null;
    isDetailOpen = false;

    // Row-level delete (trash icon in the actions column) — confirmed via the shared
    // ConfirmModalComponent, same convention as IntakeAlertsComponent's delete flow.
    pendingDeleteIntake: IntakeAlert | null = null;

    // Detail-modal delete — the modal keeps its own confirm-prompt in its own view (see
    // IntakeDetailModalComponent), but the actual API call and list refresh happen here;
    // these two flow back down as inputs so the modal shows a spinner/error correctly and
    // only closes on real success.
    isDeletingFromModal = false;
    modalDeleteError = '';

    ngOnInit(): void {
        this.loadIntakes();
    }

    loadIntakes(): void {
        this.isLoading = true;
        this.loadError = '';

        this.intakeService.getIntakes().subscribe({
            next: (intakes) => {
                this.intakes = intakes;
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
                this.loadError = 'לא ניתן לטעון את רשימת האינטייקים כרגע.';
            }
        });
    }

    trackById(_index: number, intake: IntakeAlert): number {
        return intake.id;
    }

    openDetail(intake: IntakeAlert): void {
        this.selectedIntake = intake;
        this.isDetailOpen = true;
    }

    // Stops the row's own (click)="openDetail(...)" from also firing via bubbling — otherwise
    // clicking the button would open the modal twice (harmlessly, but pointlessly) per click.
    onViewDetailsClick(event: Event, intake: IntakeAlert): void {
        event.stopPropagation();
        this.openDetail(intake);
    }

    closeDetail(): void {
        this.isDetailOpen = false;
    }

    // --- Row-level delete (trash icon) ---

    get isRowDeleteConfirmOpen(): boolean {
        return this.pendingDeleteIntake !== null;
    }

    get rowDeleteConfirmMessage(): string {
        return this.pendingDeleteIntake
            ? `האם אתה בטוח שברצונך למחוק את התיק של ${this.pendingDeleteIntake.callerName}? פעולה זו אינה הפיכה.`
            : '';
    }

    requestRowDelete(event: Event, intake: IntakeAlert): void {
        event.stopPropagation(); // don't also trigger the row's own (click)="openDetail(...)"
        if (this.pendingDeleteIntake !== null) {
            return;
        }
        this.pendingDeleteIntake = intake;
    }

    onConfirmRowDelete(): void {
        const intake = this.pendingDeleteIntake;
        if (!intake) {
            return;
        }
        this.pendingDeleteIntake = null;
        this.actionError = '';

        this.intakeService.deleteIntake(intake.id).subscribe({
            next: () => this.loadIntakes(),
            error: (err) => {
                this.actionError = this.describeError(err);
            }
        });
    }

    onCancelRowDelete(): void {
        this.pendingDeleteIntake = null;
    }

    dismissActionError(): void {
        this.actionError = '';
    }

    // --- Detail-modal delete (confirmed inside IntakeDetailModalComponent's own view) ---

    onModalDeleteConfirmed(intake: IntakeAlert): void {
        this.isDeletingFromModal = true;
        this.modalDeleteError = '';

        this.intakeService.deleteIntake(intake.id).subscribe({
            next: () => {
                this.isDeletingFromModal = false;
                this.isDetailOpen = false;
                this.loadIntakes();
            },
            error: (err) => {
                this.isDeletingFromModal = false;
                this.modalDeleteError = this.describeError(err);
            }
        });
    }

    private describeError(err: any): string {
        if (err?.status === 0) {
            return 'לא ניתן להתחבר לשרת. בדוק/י את החיבור לאינטרנט ונסה/י שוב.';
        }
        return err?.error?.message || err?.message || 'הפעולה נכשלה. נסה/י שוב.';
    }

    callerTypeLabel(intake: IntakeAlert): string {
        return getCallerTypeLabel(intake.callReport?.callerType);
    }

    magenContactHistoryLabel(intake: IntakeAlert): string {
        return getMagenContactHistoryLabel(intake.callReport?.magenContactHistory);
    }

    reportingDutyLabel(intake: IntakeAlert): string {
        return getReportingDutyLabel(intake.callReport?.reportingDuty);
    }

    // Already an "כן"/"לא" display string from the backend (see reportService.ts), not a
    // boolean — shown as-is rather than re-derived from a truthy check (a non-empty "לא"
    // string is truthy in JS, so a naive ternary would show "כן" for every row).
    contactedOtherCenterLabel(intake: IntakeAlert): string {
        return intake.contactedOtherCenter || '-';
    }
}
