import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserManagementService, User } from '../../services/user-management.service';
import { AssignmentService } from '../../services/assignment.service';
import { AssignmentModalComponent } from '../assignment-modal/assignment-modal.component';
import { IntakeAlertsComponent } from '../intake-alerts/intake-alerts.component';

export interface CalendarDay {
    dayNumber: number;
    dateString: string;
    volunteer: string;
    isToday: boolean;
}

export interface ShiftAssignment {
    dayIndex: number;
    volunteerName: string;
}

interface CalendarCell {
    day: CalendarDay;
    index: number;
}

export interface MonthSelection {
    year: number;
    month: number; // 0-indexed, matches JS Date convention
}

interface MonthOption extends MonthSelection {
    key: string;
    label: string;
}

export const VACANT_LABEL = 'חלון פנוי';
const WEEKDAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS_BEFORE = 12;
const MONTHS_AFTER = 12;

@Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [CommonModule, FormsModule, AssignmentModalComponent, IntakeAlertsComponent],
    templateUrl: './calendar.component.html',
    styleUrls: ['./calendar.component.css']
})
export class CalendarComponent {
    private authService = inject(AuthService);
    private userService = inject(UserManagementService);
    private assignmentService = inject(AssignmentService);

    @Input() calendarDays: CalendarDay[] = [];
    @Input() year: number = new Date().getFullYear();
    @Input() month: number = new Date().getMonth();
    @Input() isLoadingCalendar = false;
    @Input() calendarError = '';
    @Output() assignVolunteer = new EventEmitter<ShiftAssignment>();
    @Output() unassignVolunteer = new EventEmitter<number>();
    @Output() navigateToTab = new EventEmitter<string>();
    @Output() monthChange = new EventEmitter<MonthSelection>();

    readonly isAdmin = this.authService.isAdmin();
    readonly weekdayLabels = WEEKDAY_LABELS;

    isAssignmentModalOpen = false;
    assignableUsers: User[] = [];
    isLoadingUsers = false;
    usersError = '';
    isSavingAssignment = false;
    assignmentActionError = '';
    private assignmentCell: CalendarCell | null = null;

    get weeks(): (CalendarCell | null)[][] {
        if (!this.calendarDays.length) {
            return [];
        }

        const cells: (CalendarCell | null)[] = [];
        const leadingBlanks = this.parseDate(this.calendarDays[0].dateString).getDay();

        for (let i = 0; i < leadingBlanks; i++) {
            cells.push(null);
        }

        this.calendarDays.forEach((day, index) => cells.push({ day, index }));

        while (cells.length % 7 !== 0) {
            cells.push(null);
        }

        const weeks: (CalendarCell | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) {
            weeks.push(cells.slice(i, i + 7));
        }

        return weeks;
    }

    /** Scrollable window of months for the picker: a couple of years back and forward from today. */
    get monthOptions(): MonthOption[] {
        const options: MonthOption[] = [];
        const today = new Date();

        for (let offset = -MONTHS_BEFORE; offset <= MONTHS_AFTER; offset++) {
            const date = new Date(today.getFullYear(), today.getMonth() + offset, 1);
            const year = date.getFullYear();
            const month = date.getMonth();
            options.push({ year, month, key: this.monthKeyFor(year, month), label: this.formatMonthLabel(year, month) });
        }

        return options;
    }

    get selectedMonthKey(): string {
        return this.monthKeyFor(this.year, this.month);
    }

    get headerLabel(): string {
        return this.formatMonthLabel(this.year, this.month);
    }

    onMonthSelect(key: string): void {
        const [yearStr, monthStr] = key.split('-');
        this.monthChange.emit({ year: Number(yearStr), month: Number(monthStr) });
    }

    /**
     * Smart year labeling: months within the real current calendar year show just the
     * Hebrew month name; months in any other year get the short (2-digit) year appended.
     */
    private formatMonthLabel(year: number, month: number): string {
        const monthName = new Intl.DateTimeFormat('he-IL', { month: 'long' }).format(new Date(year, month, 1));
        const currentYear = new Date().getFullYear();

        if (year === currentYear) {
            return monthName;
        }

        return `${monthName} ${String(year).slice(-2)}`;
    }

    private monthKeyFor(year: number, month: number): string {
        return `${year}-${month}`;
    }

    get assignmentDayLabel(): string {
        if (!this.assignmentCell) {
            return '';
        }

        return `יום ${this.assignmentCell.day.dayNumber} · ${this.assignmentCell.day.dateString}`;
    }

    get assignmentCurrentVolunteer(): string | null {
        if (!this.assignmentCell || this.isVacant(this.assignmentCell.day)) {
            return null;
        }

        return this.assignmentCell.day.volunteer;
    }

    isVacant(day: CalendarDay): boolean {
        return day.volunteer === VACANT_LABEL;
    }

    isPast(day: CalendarDay): boolean {
        const cellDate = this.parseDate(day.dateString);
        cellDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return cellDate.getTime() < today.getTime();
    }

    getCellHint(cell: CalendarCell): string {
        if (!this.isAdmin) {
            return 'לחץ לדיווח שיחה';
        }

        return this.isPast(cell.day) ? '' : 'לחץ לשיבוץ';
    }

    onCellClick(cell: CalendarCell): void {
        if (this.isAdmin) {
            this.openAssignmentModal(cell);
        } else {
            this.navigateToTab.emit('report');
        }
    }

    openAssignmentModal(cell: CalendarCell): void {
        // past shifts stay visible for history, but can no longer be (re)assigned
        if (!this.isAdmin || this.isPast(cell.day)) {
            return;
        }

        this.assignmentCell = cell;
        this.isAssignmentModalOpen = true;
        this.assignmentActionError = '';
        this.loadAssignableUsers();
    }

    closeAssignmentModal(): void {
        this.isAssignmentModalOpen = false;
        this.assignmentCell = null;
        this.assignableUsers = [];
        this.usersError = '';
        this.assignmentActionError = '';
    }

    selectUserForAssignment(user: User): void {
        if (!this.isAdmin || !this.assignmentCell || !user.id) {
            return;
        }

        const cell = this.assignmentCell;
        const dateIso = this.toIsoDate(cell.day.dateString);
        this.isSavingAssignment = true;
        this.assignmentActionError = '';

        this.assignmentService.assign(dateIso, Number(user.id)).subscribe({
            next: (record) => {
                this.isSavingAssignment = false;
                this.assignVolunteer.emit({ dayIndex: cell.index, volunteerName: record.volunteer?.name || user.name });
                this.closeAssignmentModal();
            },
            error: () => {
                this.isSavingAssignment = false;
                this.assignmentActionError = 'שיבוץ המתנדב נכשל. נסה/י שוב.';
            }
        });
    }

    unassignCurrent(): void {
        if (!this.isAdmin || !this.assignmentCell) {
            return;
        }

        const cell = this.assignmentCell;
        const dateIso = this.toIsoDate(cell.day.dateString);
        this.isSavingAssignment = true;
        this.assignmentActionError = '';

        this.assignmentService.unassign(dateIso).subscribe({
            next: () => {
                this.isSavingAssignment = false;
                this.unassignVolunteer.emit(cell.index);
                this.closeAssignmentModal();
            },
            error: () => {
                this.isSavingAssignment = false;
                this.assignmentActionError = 'ביטול השיבוץ נכשל. נסה/י שוב.';
            }
        });
    }

    private loadAssignableUsers(): void {
        this.isLoadingUsers = true;
        this.usersError = '';

        this.userService.getUsers().subscribe({
            next: (users) => {
                this.assignableUsers = users;
                this.isLoadingUsers = false;
            },
            error: () => {
                this.usersError = 'לא ניתן לטעון את רשימת המשתמשים כרגע.';
                this.isLoadingUsers = false;
            }
        });
    }

    goToReports(): void {
        this.navigateToTab.emit('report');
    }

    goToScenarios(): void {
        this.navigateToTab.emit('samples');
    }

    private parseDate(dateString: string): Date {
        const [day, month, year] = dateString.split('/').map(Number);
        return new Date(year, month - 1, day);
    }

    // dateString is "D/M/YYYY" (display format) — the backend needs zero-padded ISO "YYYY-MM-DD"
    private toIsoDate(dateString: string): string {
        const [day, month, year] = dateString.split('/').map(Number);
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
}
