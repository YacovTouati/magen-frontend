import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserManagementService } from '../../services/user-management.service';
import { ScheduleService, ScheduleRecord, ShiftRecord, ShiftVolunteer } from '../../services/schedule.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { ShiftSelectionModalComponent, AdminAssignment } from '../shift-selection-modal/shift-selection-modal.component';

export interface ShiftBoardDay {
    dayNumber: number;
    dateString: string; // D/M/YYYY — same display convention as CalendarComponent
    isToday: boolean;
    morning: ShiftRecord | null;
    evening: ShiftRecord | null;
}

interface ShiftBoardCell {
    day: ShiftBoardDay;
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

const WEEKDAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS_BEFORE = 12;
const MONTHS_AFTER = 12;

@Component({
    selector: 'app-shift-board',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmModalComponent, ShiftSelectionModalComponent],
    templateUrl: './shift-board.component.html',
    styleUrls: ['./shift-board.component.css']
})
export class ShiftBoardComponent implements OnInit {
    private authService = inject(AuthService);
    private scheduleService = inject(ScheduleService);
    private userManagementService = inject(UserManagementService);
    private destroyRef = inject(DestroyRef);

    // Routed via <router-outlet> (see app.routes.ts), not embedded with template bindings
    // the way CalendarComponent is — so month state is owned internally here, same as
    // UserManagementComponent (the app's other routed tab) owns its own state.
    year: number = new Date().getFullYear();
    month: number = new Date().getMonth(); // 0-indexed

    // SUPER_ADMIN and SCHEDULER_ADMIN only — matches the backend's checkRole gate on
    // /schedules, /shifts/:id/admin-assign and /shifts/:id/admin-release. INTAKE_ADMIN
    // (and VOLUNTEER) get the same self-claim-only experience below.
    readonly canManageSchedule = this.authService.canManageSchedule();
    readonly weekdayLabels = WEEKDAY_LABELS;

    schedule: ScheduleRecord | null = null;
    days: ShiftBoardDay[] = [];
    // Derived from `days`, recomputed only when it actually changes (via setDays()) rather
    // than on every change-detection pass — this used to be a getter that allocated fresh
    // arrays/objects on every CD cycle, so *ngFor saw a new array reference each time and
    // tore down/rebuilt the entire grid continuously instead of diffing it.
    weeks: (ShiftBoardCell | null)[][] = [];
    // Invariant for the component's lifetime (depends only on "today" at construction, not
    // on year/month) — built once in ngOnInit instead of as a getter.
    monthOptions: MonthOption[] = [];
    isLoading = false;
    loadError = '';

    isCreatingSchedule = false;
    isPublishing = false;

    // Only ever populated/used for an admin — the roster for the assignment dropdown.
    volunteers: ShiftVolunteer[] = [];

    isShiftModalOpen = false;
    isConfirmOpen = false;
    isSaving = false;
    actionError = '';

    private pendingDay: ShiftBoardDay | null = null;
    private pendingShift: ShiftRecord | null = null;
    private pendingRelease: ShiftRecord | null = null;

    ngOnInit(): void {
        this.monthOptions = this.buildMonthOptions();
        this.loadSchedule();

        if (this.canManageSchedule) {
            this.loadVolunteers();
        }

        // A user update/delete can cascade-delete shift assignments server-side (e.g. a
        // deleted volunteer's locked shifts) — refresh so the grid, and for managers the
        // admin-assign roster, stay in sync instead of showing stale data until next reload.
        this.userManagementService.usersChanged$.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
            this.loadSchedule();
            if (this.canManageSchedule) {
                this.loadVolunteers();
            }
        });
    }

    private loadVolunteers(): void {
        this.userManagementService.getUsers().subscribe({
            next: (users) => {
                this.volunteers = users
                    .filter(u => u.id !== undefined && u.id !== null)
                    .map(u => ({ id: Number(u.id), name: u.name, email: u.email, role: u.role }));
            },
            error: () => {
                // Non-fatal: the admin-assign dropdown just stays empty; release/self-claim
                // and everything else on the board keeps working regardless.
            }
        });
    }

    private computeWeeks(days: ShiftBoardDay[]): (ShiftBoardCell | null)[][] {
        if (!days.length) {
            return [];
        }

        const cells: (ShiftBoardCell | null)[] = [];
        const leadingBlanks = this.parseDate(days[0].dateString).getDay();

        for (let i = 0; i < leadingBlanks; i++) {
            cells.push(null);
        }

        days.forEach((day, index) => cells.push({ day, index }));

        while (cells.length % 7 !== 0) {
            cells.push(null);
        }

        const weeks: (ShiftBoardCell | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) {
            weeks.push(cells.slice(i, i + 7));
        }

        return weeks;
    }

    trackByIndex(index: number): number {
        return index;
    }

    /** Scrollable window of months for the picker: a couple of years back and forward from
     *  today. Called once from ngOnInit — invariant for the component's lifetime. */
    private buildMonthOptions(): MonthOption[] {
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
        this.year = Number(yearStr);
        this.month = Number(monthStr);
        this.loadSchedule();
    }

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

    get currentUserId(): number | null {
        return this.authService.getUser()?.['id'] ?? null;
    }

    isMine(shift: ShiftRecord | null): boolean {
        return !!shift && shift.volunteer !== null && shift.volunteer.id === this.currentUserId;
    }

    isPast(day: ShiftBoardDay): boolean {
        const cellDate = this.parseDate(day.dateString);
        cellDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return cellDate.getTime() < today.getTime();
    }

    hasOpenSlot(day: ShiftBoardDay): boolean {
        return day.morning?.status === 'OPEN' || day.evening?.status === 'OPEN';
    }

    // Admins face no lock/draft restrictions when opening a day — they can inspect and
    // release any non-past day regardless of schedule status or whether both slots are
    // already LOCKED. Volunteers keep the original gate: only open, published days.
    isCellClickable(day: ShiftBoardDay): boolean {
        if (this.isPast(day) || this.isSaving) {
            return false;
        }

        if (this.canManageSchedule) {
            return true;
        }

        return this.schedule?.status === 'OPEN' && this.hasOpenSlot(day);
    }

    private loadSchedule(): void {
        this.isLoading = true;
        this.loadError = '';
        this.schedule = null;
        this.setDays([]);

        this.scheduleService.findForMonth(this.year, this.month).subscribe({
            next: (schedule) => {
                this.schedule = schedule;
                this.setDays(schedule ? this.buildDays(schedule) : []);
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
                this.loadError = 'לא ניתן לטעון את לוח המשמרות מהשרת כרגע.';
            }
        });
    }

    createSchedule(): void {
        if (!this.canManageSchedule || this.isCreatingSchedule) {
            return;
        }

        this.isCreatingSchedule = true;
        this.loadError = '';

        this.scheduleService.createSchedule(this.year, this.month).subscribe({
            next: (schedule) => {
                this.schedule = schedule;
                this.setDays(this.buildDays(schedule));
                this.isCreatingSchedule = false;
            },
            error: () => {
                this.isCreatingSchedule = false;
                this.loadError = 'יצירת לוח המשמרות נכשלה. נסה/י שוב.';
            }
        });
    }

    publishSchedule(): void {
        if (!this.canManageSchedule || !this.schedule || this.isPublishing) {
            return;
        }

        this.isPublishing = true;
        this.loadError = '';

        this.scheduleService.publishSchedule(this.schedule.id).subscribe({
            next: (summary) => {
                this.schedule = this.schedule ? { ...this.schedule, status: summary.status } : null;
                this.isPublishing = false;
            },
            error: () => {
                this.isPublishing = false;
                this.loadError = 'פרסום לוח המשמרות נכשל. נסה/י שוב.';
            }
        });
    }

    onDayClick(day: ShiftBoardDay): void {
        if (!this.isCellClickable(day)) {
            return;
        }

        this.pendingDay = day;
        this.isShiftModalOpen = true;
        this.actionError = '';
    }

    get pendingDayLabel(): string {
        if (!this.pendingDay) {
            return '';
        }

        return `יום ${this.pendingDay.dayNumber} · ${this.pendingDay.dateString}`;
    }

    get pendingMorningShift(): ShiftRecord | null {
        return this.pendingDay?.morning ?? null;
    }

    get pendingEveningShift(): ShiftRecord | null {
        return this.pendingDay?.evening ?? null;
    }

    onSelectShift(shift: ShiftRecord): void {
        this.pendingShift = shift;
        this.isShiftModalOpen = false;
        this.isConfirmOpen = true;
    }

    // Admins act immediately here — no confirmation step, unlike the volunteer
    // self-claim flow below. Deliberate: an admin explicitly picking a name from a
    // dropdown is already a confirmed, unambiguous choice, and this endpoint is
    // admin-only to begin with.
    onAdminAssign(assignment: AdminAssignment): void {
        this.isShiftModalOpen = false;
        this.pendingDay = null;
        this.performAdminAssign(assignment.shift.id, assignment.volunteerId);
    }

    get confirmTitle(): string {
        return this.pendingRelease ? 'אישור שיחרור משמרת' : 'אישור שיבוץ למשמרת';
    }

    get confirmButtonLabel(): string {
        return this.pendingRelease ? 'אשר שיחרור' : 'אשר שיבוץ';
    }

    get confirmMessage(): string {
        if (this.pendingRelease) {
            return 'האם אתה בטוח שברצונך לשחרר את המשמרת?';
        }

        return 'האם אתה בטוח שברצונך לשבץ את עצמך למשמרת זו? לאחר האישור לא ניתן יהיה לבטל את השיבוץ באופן עצמאי — רק מנהל/ת יכול/ה לשחרר משמרת נעולה.';
    }

    // Single confirm entry point for both flows that still require one — dispatches
    // on whichever pending state is set, since ConfirmModalComponent only exposes
    // one (confirmed) output.
    onConfirmAccept(): void {
        if (this.pendingShift) {
            this.performClaim(this.pendingShift.id);
        } else if (this.pendingRelease) {
            this.performRelease(this.pendingRelease.id);
        }
    }

    private performClaim(shiftId: number): void {
        // Close both modals immediately (optimistic dismissal) — the actual result is
        // reported via the page-level actionError banner, same pattern IntakeAlertsComponent
        // already uses for its claim/release confirm flow.
        this.isShiftModalOpen = false;
        this.isConfirmOpen = false;
        this.pendingDay = null;
        this.pendingShift = null;

        this.isSaving = true;
        this.actionError = '';

        this.scheduleService.claimShift(shiftId).subscribe({
            next: (updated) => {
                this.applyShiftLocally(updated);
                this.isSaving = false;
            },
            error: () => {
                this.isSaving = false;
                this.actionError = 'שיבוץ המשמרת נכשל. ייתכן שמתנדב/ת אחר/ת כבר תפס/ה אותה — הלוח רוענן עם הנתונים העדכניים.';
                this.loadSchedule(); // resync with the server's authoritative state after a lost race
            }
        });
    }

    private performAdminAssign(shiftId: number, volunteerId: number): void {
        this.isSaving = true;
        this.actionError = '';

        this.scheduleService.adminAssignShift(shiftId, volunteerId).subscribe({
            next: (updated) => {
                this.applyShiftLocally(updated);
                this.isSaving = false;
            },
            error: () => {
                this.isSaving = false;
                this.actionError = 'שיבוץ המתנדב/ת נכשל. נסה/י שוב.';
                this.loadSchedule();
            }
        });
    }

    private performRelease(shiftId: number): void {
        this.isConfirmOpen = false;
        this.pendingDay = null;
        this.pendingRelease = null;

        this.isSaving = true;
        this.actionError = '';

        this.scheduleService.releaseShift(shiftId).subscribe({
            next: (updated) => {
                this.applyShiftLocally(updated);
                this.isSaving = false;
            },
            error: () => {
                this.isSaving = false;
                this.actionError = 'שחרור המשמרת נכשל. נסה/י שוב.';
                this.loadSchedule();
            }
        });
    }

    onConfirmCancel(): void {
        this.isConfirmOpen = false;
        this.pendingShift = null;
        this.pendingRelease = null;
    }

    // Admin-only escape hatch (real backend capability, checkRole('ADMIN') enforced
    // server-side too). Routes through the same confirm modal as self-claim rather
    // than releasing immediately — releasing bumps whoever currently holds the shift,
    // which is exactly the kind of action worth a confirmation step.
    onReleaseShift(shift: ShiftRecord): void {
        this.pendingRelease = shift;
        this.isShiftModalOpen = false;
        this.isConfirmOpen = true;
    }

    closeShiftModal(): void {
        this.isShiftModalOpen = false;
        this.pendingDay = null;
    }

    dismissActionError(): void {
        this.actionError = '';
    }

    private buildDays(schedule: ScheduleRecord): ShiftBoardDay[] {
        const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
        const now = new Date();
        const days: ShiftBoardDay[] = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const isToday = this.year === now.getFullYear() && this.month === now.getMonth() && i === now.getDate();
            const dateIso = this.toIsoDate(i);

            days.push({
                dayNumber: i,
                dateString: `${i}/${this.month + 1}/${this.year}`,
                isToday,
                morning: schedule.shifts.find(s => s.date === dateIso && s.type === 'MORNING') ?? null,
                evening: schedule.shifts.find(s => s.date === dateIso && s.type === 'EVENING') ?? null
            });
        }

        return days;
    }

    private applyShiftLocally(updated: ShiftRecord): void {
        if (!this.schedule) {
            return;
        }

        const shifts = this.schedule.shifts.map(s => (s.id === updated.id ? updated : s));
        this.schedule = { ...this.schedule, shifts };
        this.setDays(this.buildDays(this.schedule));
    }

    private setDays(days: ShiftBoardDay[]): void {
        this.days = days;
        this.weeks = this.computeWeeks(days);
    }

    private toIsoDate(day: number): string {
        return `${this.year}-${String(this.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    private parseDate(dateString: string): Date {
        const [day, month, year] = dateString.split('/').map(Number);
        return new Date(year, month - 1, day);
    }
}
